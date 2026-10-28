"use strict";
const DOCUMENT_FONTS = ["Arial", "Calibri", "Times New Roman", "Microsoft JhengHei", "DFKai-SB"];
function emptyDocument() {
  return { version: 1, content: { type: "doc", content: [{ type: "paragraph" }] }, settings: { paper: "A4", margin: 20, lineHeight: 1.5, spacing: 8, header: "", footer: "", pageNumbers: true } };
}
function safeDocumentLink(href) {
  return typeof href === "string" && href.length <= 2e3 && /^(https?:\/\/|mailto:|tel:)/i.test(href);
}
function validDocument(d) {
  if (!d || d.version !== 1 || !d.settings || d.content?.type !== "doc") return false;
  const s = d.settings;
  if (!["A4", "A5", "Letter"].includes(s.paper) || !Number.isFinite(s.margin) || s.margin < 10 || s.margin > 40 || ![1, 1.15, 1.5, 2].includes(s.lineHeight) || ![0, 4, 8, 12, 16].includes(s.spacing) || typeof s.header !== "string" || s.header.length > 200 || typeof s.footer !== "string" || s.footer.length > 200 || typeof s.pageNumbers !== "boolean") return false;
  let count = 0, chars = 0, images = 0;
  const walk = (n, depth = 0) => {
    if (!n || typeof n !== "object" || depth > 16 || ++count > 3e4) return false;
    if (!["doc", "paragraph", "heading", "text", "bulletList", "orderedList", "listItem", "hardBreak", "table", "tableRow", "tableHeader", "tableCell", "image", "pageBreak"].includes(n.type)) return false;
    const children = n.content || [], allowed = { doc: ["paragraph", "heading", "bulletList", "orderedList", "table", "image", "pageBreak"], paragraph: ["text", "hardBreak"], heading: ["text", "hardBreak"], bulletList: ["listItem"], orderedList: ["listItem"], listItem: ["paragraph", "heading", "bulletList", "orderedList", "image"], table: ["tableRow"], tableRow: ["tableCell", "tableHeader"], tableCell: ["paragraph", "heading", "bulletList", "orderedList", "image"], tableHeader: ["paragraph", "heading", "bulletList", "orderedList", "image"], text: [], hardBreak: [], image: [], pageBreak: [] }[n.type];
    if (!Array.isArray(children) || children.some((c) => !allowed.includes(c?.type))) return false;
    if (["doc", "listItem", "bulletList", "orderedList", "table", "tableRow", "tableCell", "tableHeader"].includes(n.type) && !children.length) return false;
    if (n.type === "table" && children.length > 100 || n.type === "tableRow" && children.length > 30) return false;
    if (n.attrs != null && (typeof n.attrs !== "object" || Array.isArray(n.attrs))) return false;
    const a = n.attrs || {};
    if (a.textAlign != null && !["left", "center", "right", "justify"].includes(a.textAlign)) return false;
    if (n.type === "heading" && ![1, 2, 3].includes(a.level)) return false;
    if (n.type === "orderedList" && a.start != null && (!Number.isInteger(a.start) || a.start < 1 || a.start > 1e4)) return false;
    if (["tableCell", "tableHeader"].includes(n.type)) {
      for (const key of ["colspan", "rowspan"]) if (a[key] != null && (!Number.isInteger(a[key]) || a[key] < 1 || a[key] > 30)) return false;
      if (a.colwidth != null && (!Array.isArray(a.colwidth) || a.colwidth.some((v) => !Number.isFinite(v) || v < 0 || v > 2e3))) return false;
    }
    if (n.type === "text") {
      if (typeof n.text !== "string" || n.text.length === 0 || (chars += n.text.length) > 1e6) return false;
    }
    if (n.type === "image") {
      if (++images > 8 || !validImageData(a.src) || typeof (a.alt || "") !== "string" || (a.alt || "").length > 500) return false;
      if (!Number.isFinite(a.width) || a.width < 1 || a.width > 1e3 || !Number.isFinite(a.height) || a.height < 1 || a.height > 4096) return false;
    }
    if (n.marks && (!Array.isArray(n.marks) || n.marks.some((m) => {
      if (!m || typeof m !== "object" || !["bold", "italic", "underline", "strike", "link", "textStyle"].includes(m.type)) return true;
      const z = m.attrs || {};
      if (m.type === "link" && !safeDocumentLink(z.href)) return true;
      if (m.type === "textStyle") {
        if (z.fontFamily != null && !DOCUMENT_FONTS.includes(z.fontFamily)) return true;
        if (z.fontSize != null && (!/^\d+(\.\d+)?px$/.test(z.fontSize) || parseFloat(z.fontSize) < 8 || parseFloat(z.fontSize) > 96)) return true;
        for (const key of ["color", "backgroundColor"]) if (z[key] != null && !/^#[0-9a-f]{6}$/i.test(z[key])) return true;
      }
      return false;
    }))) return false;
    return n.content == null || Array.isArray(n.content) && n.content.every((c) => walk(c, depth + 1));
  };
  return walk(d.content);
}
function documentText(node) {
  return node.type === "text" ? node.text : (node.content || []).map(documentText).join(["doc", "tableRow", "bulletList", "orderedList"].includes(node.type) ? "\n" : "");
}
function preflightDocx(buffer) {
  const data = new DataView(buffer);
  if (data.byteLength < 22) throw Error("DOCX 檔案不完整");
  let end = -1;
  for (let i = data.byteLength - 22; i >= Math.max(0, data.byteLength - 65557); i--) if (data.getUint32(i, true) === 101010256) {
    end = i;
    break;
  }
  if (end < 0) throw Error("不是有效的 DOCX 封裝");
  const count = data.getUint16(end + 10, true), size = data.getUint32(end + 12, true), offset = data.getUint32(end + 16, true);
  if (count > 2e3 || count === 65535 || offset + size > end) throw Error("DOCX 封裝超出支援範圍");
  let at = offset, total = 0, hasDocument = false, hasTypes = false;
  for (let i = 0; i < count; i++) {
    if (at + 46 > data.byteLength || data.getUint32(at, true) !== 33639248) throw Error("DOCX 封裝損毀");
    const flags = data.getUint16(at + 8, true), unpacked = data.getUint32(at + 24, true), nameLen = data.getUint16(at + 28, true), extra = data.getUint16(at + 30, true), comment = data.getUint16(at + 32, true);
    if (flags & 1 || unpacked === 4294967295 || (total += unpacked) > 5e7 || at + 46 + nameLen + extra + comment > data.byteLength) throw Error("DOCX 解壓後超過 50 MB 或使用不支援的加密格式");
    const name = new TextDecoder().decode(new Uint8Array(buffer, at + 46, nameLen));
    if (name === "word/document.xml") {
      hasDocument = true;
      if (unpacked > 1e7) throw Error("DOCX 正文超過 10 MB");
    }
    if (name === "[Content_Types].xml") hasTypes = true;
    at += 46 + nameLen + extra + comment;
  }
  if (!hasDocument || !hasTypes) throw Error("封裝缺少 DOCX 正文");
  return true;
}
