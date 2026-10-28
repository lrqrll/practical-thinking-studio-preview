"use strict";
async function documentDocx(model, title) {
  const D = docx, s = model.settings;
  const sizes = { A4: [11906, 16838], A5: [8391, 11906], Letter: [12240, 15840] }, page = sizes[s.paper], images = /* @__PURE__ */ new Map();
  const imageNodes = [];
  const collect = (n) => {
    if (n.type === "image") imageNodes.push(n);
    (n.content || []).forEach(collect);
  };
  collect(model.content);
  for (const n of imageNodes) {
    if (images.has(n.attrs.src)) continue;
    const im = await decodeImage(n.attrs.src), c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    c.getContext("2d").drawImage(im, 0, 0);
    images.set(n.attrs.src, Uint8Array.from(atob(c.toDataURL("image/png").split(",")[1]), (x) => x.charCodeAt(0)));
  }
  const align = (a) => ({ left: D.AlignmentType.LEFT, center: D.AlignmentType.CENTER, right: D.AlignmentType.RIGHT, justify: D.AlignmentType.JUSTIFIED })[a] || D.AlignmentType.LEFT;
  const inline = (n, base = 24, heading = false) => {
    if (n.type === "hardBreak") return new D.TextRun({ break: 1 });
    const marks = n.marks || [], style = marks.find((m) => m.type === "textStyle")?.attrs || {};
    const run = new D.TextRun({ text: n.text || "", bold: heading || marks.some((m) => m.type === "bold") || void 0, italics: marks.some((m) => m.type === "italic") || void 0, underline: marks.some((m) => m.type === "underline") ? {} : void 0, strike: marks.some((m) => m.type === "strike"), font: style.fontFamily || "Microsoft JhengHei", size: style.fontSize ? Math.round(parseFloat(style.fontSize) * 1.5) : base, color: style.color?.slice(1) });
    const link = marks.find((m) => m.type === "link");
    return link ? new D.ExternalHyperlink({ link: link.attrs.href, children: [run] }) : run;
  };
  const paragraph = (n, numbering) => new D.Paragraph({ children: (n.content || []).map((child) => inline(child, n.type === "heading" ? [0, 28, 24, 20][n.attrs.level] * 1.5 : 24, n.type === "heading")), heading: n.type === "heading" ? D.HeadingLevel["HEADING_" + n.attrs.level] : void 0, alignment: align(n.attrs?.textAlign), spacing: { line: Math.round(s.lineHeight * 240), after: Math.round(s.spacing * 15) }, numbering });
  const numberingConfigs = [];
  let listIndex = 0;
  const blocks = (nodes, depth = 0) => nodes.flatMap((n) => {
    if (n.type === "paragraph" || n.type === "heading") return [paragraph(n)];
    if (n.type === "pageBreak") return [new D.Paragraph({ children: [new D.PageBreak()] })];
    if (n.type === "image") {
      const a = n.attrs, max = (page[0] - s.margin * 56.693 * 2) / 15, ratio = Math.min(1, max / a.width);
      return [new D.Paragraph({ alignment: align(a.textAlign), children: [new D.ImageRun({ type: "png", data: images.get(a.src), transformation: { width: Math.round(a.width * ratio), height: Math.round(a.height * ratio) }, altText: { title: a.alt || "圖片", description: a.alt || "圖片", name: a.alt || "圖片" } })] })];
    }
    if (n.type === "bulletList" || n.type === "orderedList") {
      const reference = "nexus-list-" + ++listIndex;
      numberingConfigs.push({ reference, levels: levels(n.type === "bulletList" ? "bullet" : "number", n.attrs?.start || 1) });
      return (n.content || []).flatMap((li) => (li.content || []).flatMap((child, i) => ["paragraph", "heading"].includes(child.type) ? [paragraph(child, i === 0 ? { reference, level: Math.min(depth, 7) } : void 0)] : blocks([child], depth + 1)));
    }
    if (n.type === "table") return [new D.Table({
      width: { size: 100, type: D.WidthType.PERCENTAGE },
      rows: n.content.map((row) => new D.TableRow({
        children: row.content.map((cell) => new D.TableCell({
          columnSpan: cell.attrs?.colspan || 1,
          rowSpan: cell.attrs?.rowspan || 1,
          shading: cell.type === "tableHeader" ? { fill: "EEEEEE" } : void 0,
          children: blocks(cell.content || [])
        }))
      }))
    })];
    return blocks(n.content || [], depth);
  });
  const levels = (kind, start = 1) => Array.from({ length: 8 }, (_, level) => ({ level, start, format: kind === "bullet" ? D.LevelFormat.BULLET : D.LevelFormat.DECIMAL, text: kind === "bullet" ? "•" : "%" + (level + 1) + ".", alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } }));
  const children = blocks(model.content.content);
  const footerChildren = [new D.TextRun(s.footer)];
  if (s.pageNumbers) footerChildren.push(new D.TextRun({ children: ["  ", D.PageNumber.CURRENT] }));
  const file = new D.Document({ creator: "NEXUS", title, styles: { default: { document: { run: { font: "Microsoft JhengHei", size: 24 }, paragraph: { spacing: { line: Math.round(s.lineHeight * 240), after: Math.round(s.spacing * 15) } } } } }, numbering: { config: numberingConfigs }, sections: [{ properties: { page: { size: { width: page[0], height: page[1] }, margin: { top: s.margin * 56.693, bottom: s.margin * 56.693, left: s.margin * 56.693, right: s.margin * 56.693, header: 360, footer: 360 } } }, headers: { default: new D.Header({ children: [new D.Paragraph(s.header)] }) }, footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: footerChildren })] }) }, children }] });
  return D.Packer.toBlob(file);
}
function documentHTMLShell(title, body, s) {
  return '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>' + esc(title) + "</title><style>@page{size:" + s.paper + ";margin:" + s.margin + 'mm}body{font:12pt "Microsoft JhengHei",Arial,sans-serif;color:#111;line-height:' + s.lineHeight + ";margin:0}p{margin:0 0 " + s.spacing + "px}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{border:1px solid #777;padding:7px;vertical-align:top;overflow-wrap:anywhere}img{max-width:100%;height:auto}a{color:#174d83}.page-break{break-after:page;border:0}header,footer{font-size:10pt;color:#666;white-space:pre-wrap}header{margin-bottom:16px}footer{margin-top:16px}h1,h2,h3{break-after:avoid}@media print{.page-break{break-after:page}tr,img{break-inside:avoid}}</style></head><body><header>" + esc(s.header) + "</header>" + body + "<footer>" + esc(s.footer) + "</footer></body></html>";
}
async function printDocument(title, body, s) {
  document.querySelector("#document-print-frame")?.remove();
  const frame = document.createElement("iframe");
  frame.id = "document-print-frame";
  frame.className = "document-print-frame";
  frame.title = "文件列印";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(documentHTMLShell(title, body, s));
  doc.close();
  await Promise.all(Array.from(doc.images).map((im) => im.decode().catch(() => {
  })));
  await doc.fonts.ready;
  frame.contentWindow.focus();
  frame.contentWindow.print();
  toast("請在列印視窗選擇印表機或另存 PDF；頁碼由列印設定控制。");
}
