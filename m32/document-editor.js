"use strict";
let documentLibraryPromise;
function loadDocumentLibraries() {
  if (documentLibraryPromise) return documentLibraryPromise;
  documentLibraryPromise = Promise.all(["document-vendor.js", "docx-vendor.js", "mammoth-vendor.js", "purify-vendor.js"].map((src) => new Promise((ok, no) => {
    const e = document.createElement("script");
    e.src = src + "?v=" + encodeURIComponent(BRAND.version);
    e.onload = ok;
    e.onerror = () => {
      e.remove();
      no(Error("文件引擎載入失敗，請重新開啟；原資料未變更。"));
    };
    document.head.appendChild(e);
  }))).catch((e) => {
    documentLibraryPromise = null;
    throw e;
  });
  return documentLibraryPromise;
}
async function savedDocumentForExport(fileId){
 await flush();const record=await NexusStore.get('files',fileId);
 if(!record||record.deletedAt||record.type!=='document'||activeFile?.id!==fileId||record.rev!==activeFile.rev)throw Error('文件版本已變更或失效，請保留輸入並重新開啟後匯出');
 const copy=structuredClone(record);if(!validDocument(copy.data.document))throw Error('已保存文件格式不符，未匯出');return copy;
}
function documentHTMLFromModel(model){
 const frozen=new NexusDocumentLib.Editor({element:document.createElement('div'),extensions:documentExtensions(),content:structuredClone(model.content),editable:false});
 try{return frozen.getHTML();}finally{frozen.destroy();}
}
function documentView() {
  const s = state.document.settings;
  const btn = (id, label) => '<button type="button" id="' + id + '">' + label + "</button>";
  return '<div class="document-workbench"><p id="document-loading" role="status">正在載入文件引擎…</p><fieldset id="document-controls" disabled><div class="actions doc-file-actions">' + btn("doc-save", "保存（Ctrl+S）") + btn("doc-docx", "匯出 DOCX") + btn("doc-html", "匯出 HTML") + btn("doc-pdf", "下載 PDF") + '<label>PDF 方向<select id="doc-pdf-orientation"><option value="portrait">A4 直式</option><option value="landscape">A4 橫式</option></select></label><button id="doc-pdf-cancel" type="button" hidden>取消 PDF</button><span id="doc-pdf-status" role="status" aria-live="polite"></span>' + btn("doc-print", "列印／另存 PDF") + btn("doc-import", "匯入 DOCX 副本") + '<input type="file" id="doc-import-input" accept=".docx" hidden></div><div class="doc-format" role="toolbar" aria-label="文字格式"><select id="doc-block" aria-label="段落樣式"><option value="paragraph">本文</option><option value="1">標題 1</option><option value="2">標題 2</option><option value="3">標題 3</option></select><select id="doc-font" aria-label="字型"><option value="">預設字體</option>' + DOCUMENT_FONTS.map((f) => "<option>" + f + "</option>").join("") + '</select><select id="doc-size" aria-label="字級"><option value="">預設字級</option>' + [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72].map((n) => '<option value="' + n + '">' + n + " px</option>").join("") + "</select>" + [["bold", "粗體"], ["underline", "底線"], ["bulletList", "項目清單"], ["orderedList", "編號清單"]].map(([cmd, label]) => '<button type="button" data-doc-command="' + cmd + '" aria-pressed="false">' + label + "</button>").join("") + '<select id="doc-align" aria-label="對齊"><option value="left">靠左</option><option value="center">置中</option><option value="right">靠右</option><option value="justify">左右對齊</option></select><label class="doc-color">文字色<input type="color" id="doc-color" value="#111111"></label>' + btn("doc-clear", "清除格式") + btn("doc-undo", "復原") + btn("doc-redo", "重做") + '</div><div class="doc-options"><details><summary>插入與表格</summary><div class="actions">' + btn("doc-image", "圖片") + '<input id="doc-image-input" type="file" accept="image/png,image/jpeg,image/webp" hidden>' + btn("doc-link", "連結") + btn("doc-unlink", "移除連結") + btn("doc-break", "分頁符號") + '<label>表格列數<input type="number" id="doc-table-rows" min="1" max="20" value="3"></label><label>欄數<input type="number" id="doc-table-cols" min="1" max="10" value="3"></label>' + btn("doc-table", "插入表格") + '</div><div class="actions doc-table-commands">' + [["addRowAfter", "加一列"], ["deleteRow", "刪除列"], ["addColumnAfter", "加一欄"], ["deleteColumn", "刪除欄"], ["mergeCells", "合併儲存格"], ["splitCell", "分割儲存格"], ["deleteTable", "刪除表格"]].map(([cmd, label]) => '<button type="button" data-table-command="' + cmd + '">' + label + "</button>").join("") + '</div><div class="actions"><label>圖片寬度（px）<input id="doc-image-width" type="number" min="20" max="1000" value="320"></label>' + btn("doc-resize-image", "調整選取圖片") + '</div></details><details><summary>頁面設定</summary><div class="actions"><label>紙張<select id="doc-paper">' + ["A4", "A5", "Letter"].map((x) => "<option " + (s.paper === x ? "selected" : "") + ">" + x + "</option>").join("") + '</select></label><label>邊界（mm）<input id="doc-margin" type="number" min="10" max="40" value="' + s.margin + '"></label><label>行距<select id="doc-line">' + [1, 1.15, 1.5, 2].map((n) => "<option " + (n === s.lineHeight ? "selected" : "") + ">" + n + "</option>").join("") + '</select></label><label>段後距（px）<select id="doc-spacing">' + [0, 4, 8, 12, 16].map((n) => "<option " + (n === s.spacing ? "selected" : "") + ">" + n + "</option>").join("") + '</select></label></div><div class="grid"><label>頁首<input id="doc-header" maxlength="200" value="' + esc(s.header) + '"></label><label>頁尾<input id="doc-footer" maxlength="200" value="' + esc(s.footer) + '"></label></div><label><input id="doc-page-numbers" type="checkbox" ' + (s.pageNumbers ? "checked" : "") + '>DOCX 頁碼</label></details><details><summary>尋找與取代</summary><div class="actions"><label>尋找<input id="doc-find" maxlength="500"></label><label>取代為<input id="doc-replace" maxlength="500"></label>' + btn("doc-find-next", "找下一個") + btn("doc-replace-one", "取代選取") + btn("doc-replace-all", "全部取代") + '<span id="doc-find-result" role="status"></span></div></details></div></fieldset><p class="tiny muted doc-limit">連續頁面編輯；實際分頁以 Word 或列印預覽為準。DOCX 匯入保留基本圖文與表格，不還原原版型、頁首頁尾或註解。</p><div class="doc-scroll"><article class="document-paper" id="document-paper"><div class="paper-header" id="paper-header"></div><div id="document-editor"></div><div class="paper-footer" id="paper-footer"></div></article></div><p class="tiny muted" id="document-count" role="status"></p></div>';
}
function colorHex(value) {
  if (/^#[0-9a-f]{6}$/i.test(value || "")) return value;
  const m = /^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/.exec(value || "");
  return m ? "#" + m.slice(1, 4).map((n) => Math.max(0, Math.min(255, +n)).toString(16).padStart(2, "0")).join("") : null;
}
function normalizeDocumentContent(node) {
  const n = structuredClone(node);
  const visit = (n2) => {
    if (n2.type === "text") n2.marks = (n2.marks || []).filter((m) => ["bold", "italic", "underline", "strike", "link", "textStyle"].includes(m.type) && !(m.type === "link" && !safeDocumentLink(m.attrs?.href))).map((m) => {
      if (m.type !== "textStyle") return m;
      const a = m.attrs || {}, font = (a.fontFamily || "").replace(/["']/g, "").split(",")[0].trim(), size = parseFloat(a.fontSize);
      return { type: "textStyle", attrs: { fontFamily: DOCUMENT_FONTS.includes(font) ? font : null, fontSize: Number.isFinite(size) ? Math.min(96, Math.max(8, size)) + "px" : null, color: colorHex(a.color) } };
    });
    if (n2.type === "image") {
      n2.attrs.width = Number(n2.attrs.width) || 320;
      n2.attrs.height = Number(n2.attrs.height) || 200;
    }
    for (const c of n2.content || []) visit(c);
  };
  visit(n);
  return n;
}
function cleanDocumentHTML(html) {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: ["p", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "span", "a", "ul", "ol", "li", "br", "table", "tbody", "thead", "tr", "td", "th", "img", "div"], ALLOWED_ATTR: ["style", "href", "src", "alt", "width", "height", "colspan", "rowspan", "start"], ALLOW_DATA_ATTR: false });
  const t = document.createElement("template");
  t.innerHTML = clean;
  t.content.querySelectorAll("img").forEach((im) => {
    if (!validImageData(im.getAttribute("src"))) im.remove();
  });
  t.content.querySelectorAll("a").forEach((a) => {
    if (!safeDocumentLink(a.getAttribute("href"))) a.removeAttribute("href");
  });
  t.content.querySelectorAll("[style]").forEach((el) => {
    const old = el.style, font = old.fontFamily, size = parseFloat(old.fontSize), color = colorHex(old.color), align = old.textAlign, weight = old.fontWeight, italic = old.fontStyle, decoration = old.textDecoration;
    el.removeAttribute("style");
    if (font) el.style.fontFamily = DOCUMENT_FONTS.find((x) => font.includes(x)) || "Arial";
    if (Number.isFinite(size)) el.style.fontSize = Math.min(96, Math.max(8, size)) + "px";
    if (color) el.style.color = color;
    if (["left", "center", "right", "justify"].includes(align)) el.style.textAlign = align;
    if (weight === "bold" || Number(weight) >= 600) el.style.fontWeight = "bold";
    if (italic === "italic") el.style.fontStyle = "italic";
    if (decoration.includes("underline")) el.style.textDecoration = "underline";
  });
  return t.innerHTML;
}
function documentExtensions() {
  const L = NexusDocumentLib;
  const PageBreak = L.Node.create({ name: "pageBreak", group: "block", atom: true, selectable: true, parseHTML: () => [{ tag: "hr[data-page-break]" }], renderHTML: () => ["hr", { "data-page-break": "true", class: "page-break" }] });
  const LocalImage = L.Image.extend({ addAttributes() {
    return { ...this.parent?.(), textAlign: { default: "left", parseHTML: (e) => e.style.display === "block" && e.style.marginLeft === "auto" ? "center" : "left", renderHTML: (a) => ({ style: "display:block;max-width:100%;height:auto;" + (a.textAlign === "center" ? "margin-left:auto;margin-right:auto" : a.textAlign === "right" ? "margin-left:auto" : "") }) } };
  }, parseHTML() {
    return [{ tag: "img[src]", getAttrs: (e) => validImageData(e.getAttribute("src")) ? {} : false }];
  } }).configure({ allowBase64: true });
  const Limits = L.Extension.create({ name: "documentLimits", addProseMirrorPlugins() {
    return [new L.Plugin({ filterTransaction: (tr) => {
      if (!tr.docChanged) return true;
      const good = validDocument({ ...state.document, content: normalizeDocumentContent(tr.doc.toJSON()) });
      if (!good) toast("操作超出文件限制（100 萬字元／8 張圖片），未套用。");
      return good;
    } })];
  } });
  return [Limits, L.StarterKit.configure({ heading: { levels: [1, 2, 3] }, blockquote: false, code: false, codeBlock: false, horizontalRule: false, link: { openOnClick: false, autolink: false, linkOnPaste: false, isAllowedUri: safeDocumentLink } }), L.TableKit.configure({ table: { resizable: true, allowTableNodeSelection: true } }), LocalImage, L.TextStyleKit.configure({ backgroundColor: false, lineHeight: false }), L.TextAlign.configure({ types: ["heading", "paragraph", "image"] }), PageBreak];
}
async function bindDocument() {
  const fileId = activeFile.id;
  let editor = null, cancelled = false;
  // Tiptap focus() defers view.focus() to requestAnimationFrame. Toolbar
  // selection must be visible now, and must not refocus after later input.
  const syncTextSelection = () => {
    // Native keyboard selectionchange may still be queued when a toolbar
    // control fires. Preserve the visible range before focus restores state.
    const view=editor.view,selection=window.getSelection(),model=editor.state.selection;
    if(!model.node&&!model.$anchorCell&&selection?.anchorNode&&selection?.focusNode&&view.dom.contains(selection.anchorNode)&&view.dom.contains(selection.focusNode)){
      const anchor=view.posAtDOM(selection.anchorNode,selection.anchorOffset),head=view.posAtDOM(selection.focusNode,selection.focusOffset);
      if(anchor!==model.anchor||head!==model.head)editor.commands.setTextSelection({from:anchor,to:head});
    }
  };
  const focusedChain = () => { syncTextSelection();editor.view.focus();return editor.chain(); };
  let pdfController;
  viewCleanup = () => {
    pdfController?.abort();
    cancelled = true;
    editor?.destroy();
  };
  try {
    await loadDocumentLibraries();
    if (cancelled || activeFile?.id !== fileId) return;
    const updatePaper = () => {
      const s = state.document.settings, p = $("#document-paper");
      p.style.setProperty("--paper-width", { A4: 210, A5: 148, Letter: 216 }[s.paper] + "mm");
      p.style.setProperty("--paper-height", { A4: 297, A5: 210, Letter: 279 }[s.paper] + "mm");
      p.style.setProperty("--paper-margin", s.margin + "mm");
      p.style.setProperty("--doc-line", s.lineHeight);
      p.style.setProperty("--doc-spacing", s.spacing + "px");
      $("#paper-header").textContent = s.header;
      $("#paper-footer").textContent = s.footer;
    };
    const controls = () => {
      if (cancelled) return;
      for (const b of $$("[data-doc-command]")) b.setAttribute("aria-pressed", String(editor.isActive(b.dataset.docCommand)));
      $("#doc-undo").disabled = !editor.can().undo();
      $("#doc-redo").disabled = !editor.can().redo();
      $$("[data-table-command]").forEach((b) => b.disabled = !editor.isActive("table"));
      $("#doc-block").value = editor.isActive("heading") ? String(editor.getAttributes("heading").level) : "paragraph";
      const ts = editor.getAttributes("textStyle");
      $("#doc-font").value = ts.fontFamily || "";
      $("#doc-size").value = ts.fontSize ? String(parseFloat(ts.fontSize)) : "";
      $("#doc-align").value = editor.getAttributes("image").textAlign || editor.getAttributes("heading").textAlign || editor.getAttributes("paragraph").textAlign || "left";
    };
    const changed = () => {
      const value = { ...state.document, content: normalizeDocumentContent(editor.getJSON()) };
      if (!validDocument(value)) {
        setSaveStatus("未保存：內容超出文件限制，請復原或下載目前內容。", true);
        return;
      }
      state.document = value;
      saveSoon();
      $("#document-count").textContent = editor.getText().length.toLocaleString() + " 字元";
      controls();
    };
    editor = new NexusDocumentLib.Editor({ element: $("#document-editor"), extensions: documentExtensions(), content: state.document.content, editorProps: { attributes: { role: "textbox", "aria-label": "文件內容", "aria-multiline": "true", spellcheck: "false" }, transformPastedHTML: cleanDocumentHTML, handleDOMEvents: { keyup: (_view, event) => {
      // Native caret movement completes before keyup, but selectionchange may
      // still be suppressed by ProseMirror's focus handling. Synchronize now:
      // a pending focus update must not put an old AllSelection back into DOM.
      if (/^(Arrow(Left|Right|Up|Down)|Home|End|PageUp|PageDown)$/.test(event.key)) syncTextSelection();
      return false;
    } }, handlePaste: (view, event) => {
      const image = Array.from(event.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
      if (!image) return false;
      event.preventDefault();
      insertImage(image.getAsFile()).catch((e) => toast(e.message));
      return true;
    }, handleKeyDown: (view, event) => {
      // Operation retired by product decision; keep the italic mark for old/imported documents.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") { event.preventDefault(); return true; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        flush().then(() => toast("已保存至此瀏覽器")).catch((e) => toast(e.message));
        return true;
      }
      return false;
    } }, onUpdate: changed, onSelectionUpdate: controls });
    const insertImage = async (file) => {
      const count = JSON.stringify(editor.getJSON()).split('"type":"image"').length - 1;
      if (count >= 8) throw Error("每份文件最多 8 張圖片");
      const im = await readMedia(file);
      if (cancelled || activeFile?.id !== fileId) return;
      const w = Math.min(im.width, 560);
      focusedChain().setImage({ src: im.source, alt: im.name, width: w, height: Math.max(1, Math.round(im.height * w / im.width)) }).run();
    };
    $("#document-controls").disabled = false;
    if(typeof runAssemblyDownload==='function')runAssemblyDownload(fileId);
    $("#document-loading").hidden = true;
    updatePaper();
    controls();
    $("#document-count").textContent = editor.getText().length.toLocaleString() + " 字元";
    $$(".doc-format button,[data-table-command],#doc-table,#doc-break").forEach((b) => b.onmousedown = (e) => e.preventDefault());
    $$("[data-doc-command]").forEach((b) => b.onclick = () => {
      const cmd = { bold: "toggleBold", underline: "toggleUnderline", bulletList: "toggleBulletList", orderedList: "toggleOrderedList" }[b.dataset.docCommand];
      focusedChain()[cmd]().run();
    });
    $("#doc-block").onchange = (e) => { const value=e.target.value;value === "paragraph" ? focusedChain().setParagraph().run() : focusedChain().setHeading({ level: Number(value) }).run(); };
    $("#doc-font").onchange = (e) => { const value=e.target.value;value ? focusedChain().setFontFamily(value).run() : focusedChain().unsetFontFamily().run(); };
    $("#doc-size").onchange = (e) => { const value=e.target.value;value ? focusedChain().setFontSize(value + "px").run() : focusedChain().unsetFontSize().run(); };
    $("#doc-color").oninput = (e) => { const value=e.target.value;focusedChain().setColor(value).run(); };
    $("#doc-align").onchange = (e) => { const value=e.target.value;focusedChain().setTextAlign(value).run(); };
    $("#doc-clear").onclick = () => focusedChain().unsetAllMarks().clearNodes().run();
    $("#doc-undo").onclick = () => focusedChain().undo().run();
    $("#doc-redo").onclick = () => focusedChain().redo().run();
    $("#doc-image").onclick = () => $("#doc-image-input").click();
    $("#doc-image-input").onchange = safeAction(async (e) => {
      if (e.target.files[0]) await insertImage(e.target.files[0]);
      e.target.value = "";
    });
    $("#doc-table").onclick = () => {
      const rows = Number($("#doc-table-rows").value), cols = Number($("#doc-table-cols").value);
      if (!Number.isInteger(rows) || rows < 1 || rows > 20 || !Number.isInteger(cols) || cols < 1 || cols > 10) {
        toast("表格限 1–20 列、1–10 欄");
        return;
      }
      focusedChain().insertTable({ rows, cols, withHeaderRow: true }).run();
    };
    $$("[data-table-command]").forEach((b) => b.onclick = () => {
      const success = focusedChain()[b.dataset.tableCommand]().run();
      if (!success) toast("請先選取適用的儲存格；合併需選取相鄰儲存格。");
    });
    $("#doc-break").onclick = () => focusedChain().insertContent({ type: "pageBreak" }).run();
    $("#doc-resize-image").onclick = () => {
      if (!editor.isActive("image")) return toast("先點選文件中的圖片");
      const width = Number($("#doc-image-width").value), a = editor.getAttributes("image");
      if (!Number.isFinite(width) || width < 20 || width > 1e3) return toast("圖片寬度需為 20–1000 px");
      focusedChain().updateAttributes("image", { width, height: Math.round(a.height * width / a.width) }).run();
    };
    $("#doc-link").onclick = safeAction(async () => {
      const href = await askName(editor.getAttributes("link").href || "https://", "連結網址");
      if (href === null || cancelled) return;
      if (!safeDocumentLink(href)) throw Error("連結限 http、https、mailto 或 tel");
      focusedChain().extendMarkRange("link").setLink({ href }).run();
    });
    $("#doc-unlink").onclick = () => focusedChain().unsetLink().run();
    for (const [id, key] of [["paper", "paper"], ["margin", "margin"], ["line", "lineHeight"], ["spacing", "spacing"], ["header", "header"], ["footer", "footer"], ["page-numbers", "pageNumbers"]]) {
      $("#doc-" + id).oninput = (e) => {
        let value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        if (["margin", "line", "spacing"].includes(id)) value = Number(value);
        const settings = { ...state.document.settings, [key]: value };
        if (!validDocument({ ...state.document, settings })) return toast("頁面設定無效；邊界需為 10–40 mm");
        state.document.settings = settings;
        updatePaper();
        saveSoon();
      };
    }
    const matches = () => {
      const q = $("#doc-find").value, result = [];
      if (q) editor.state.doc.descendants((n, pos) => {
        if (!n.isTextblock) return;
        let text = "", map = [];
        n.descendants((child, offset) => {
          if (child.isText) {
            for (let i = 0; i < child.text.length; i++) {
              text += child.text[i];
              map.push(pos + 1 + offset + i);
            }
          } else if (child.type.name === "hardBreak") {
            text += "\n";
            map.push(pos + 1 + offset);
          }
        });
        let at = 0;
        while ((at = text.indexOf(q, at)) >= 0) {
          result.push({ from: map[at], to: map[at + q.length - 1] + 1 });
          at += q.length;
        }
        return false;
      });
      return result;
    };
    $("#doc-find-next").onclick = () => {
      const list = matches(), m = list.find((x) => x.from >= editor.state.selection.to) || list[0];
      $("#doc-find-result").textContent = list.length + " 處";
      if (m) focusedChain().setTextSelection(m).scrollIntoView().run();
    };
    $("#doc-replace-one").onclick = () => {
      const q = $("#doc-find").value, { from, to } = editor.state.selection;
      if (q && editor.state.doc.textBetween(from, to) === q) focusedChain().insertContentAt({ from, to }, [{ type: "text", text: $("#doc-replace").value }].filter((n) => n.text)).run();
      else $("#doc-find-next").click();
    };
    $("#doc-replace-all").onclick = () => {
      const list = matches();
      if (!list.length) return toast("找不到文字");
      const text = $("#doc-replace").value;
      let tr = editor.state.tr;
      for (const m of list.reverse()) tr = text ? tr.insertText(text, m.from, m.to) : tr.delete(m.from, m.to);
      editor.view.dispatch(tr);
      toast("已取代 " + list.length + " 處，可按復原還原。");
    };
    $("#doc-save").onclick = safeAction(async () => {
      await flush();
      toast("已保存至此瀏覽器");
    });
    $("#doc-docx").onclick = safeAction(async () => {
      const record=await savedDocumentForExport(fileId);
      const model=record.data.document,name=record.name;
      $("#doc-docx").disabled = true;
      try {
        const blob = await documentDocx(model, name);
        if (activeFile?.id === fileId) download(name + ".docx", blob, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      } finally {
        if (!cancelled) $("#doc-docx").disabled = false;
      }
    });
    $("#doc-html").onclick = safeAction(async () => {
      const record=await savedDocumentForExport(fileId);
      download(record.name + ".html", documentHTMLShell(record.name,documentHTMLFromModel(record.data.document),record.data.document.settings), "text/html;charset=utf-8");
    });
    $("#doc-pdf-cancel").onclick=()=>pdfController?.abort();
    $("#doc-pdf").onclick=async()=>{
      if(pdfController)return;
      const controller=pdfController=new AbortController(),status=$("#doc-pdf-status"),button=$("#doc-pdf"),cancel=$("#doc-pdf-cancel"),orientation=$("#doc-pdf-orientation").value;
      button.disabled=true;cancel.hidden=false;status.textContent='正在保存文件並準備 PDF…';
      try{
        const record=await savedDocumentForExport(fileId);
        if(controller.signal.aborted)throw new DOMException('已取消 PDF；未下載','AbortError');
        status.textContent='正在生成 PDF；可以繼續編輯，這次只輸出已保存版本 '+record.rev;
        const result=await generateDocumentPDF(record.data.document,{orientation,name:record.name},controller.signal);
        if(controller.signal.aborted||cancelled||activeFile?.id!==fileId)return;
        download(record.name+'.pdf',result.blob,'application/pdf');
        status.textContent='PDF 已下載 · rev '+record.rev+' · 載入 '+result.stats.loadMs+'ms · 生成 '+result.stats.generationMs+'ms · '+result.stats.bytes+' bytes';
        status.dataset.stats=JSON.stringify({...result.stats,fileId:record.id,rev:record.rev});
      }catch(e){if(!cancelled)status.textContent=(e.name==='AbortError'?'已取消':'PDF 未輸出：')+e.message;}
      finally{pdfController=null;if(!cancelled){button.disabled=false;cancel.hidden=true;}}
    };
    $("#doc-print").onclick = safeAction(async () => {
      const record=await savedDocumentForExport(fileId);
      await printDocument(record.name,documentHTMLFromModel(record.data.document),record.data.document.settings);
    });
    $("#doc-import").onclick = () => $("#doc-import-input").click();
    $("#doc-import-input").onchange = safeAction(async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      e.target.value = "";
      if (!/\.docx$/i.test(f.name) || f.size > 1e7) throw Error("請選擇 10 MB 內的 DOCX 檔案");
      const inputBuffer = await f.arrayBuffer();
      preflightDocx(inputBuffer);
      await flush();
      $("#doc-import").disabled = true;
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: inputBuffer }, { externalFileAccess: false, convertImage: mammoth.images.imgElement(async (image) => {
          const type = image.contentType;
          if (!["image/png", "image/jpeg", "image/webp"].includes(type)) return {};
          const source = "data:" + type + ";base64," + await image.read("base64");
          return validImageData(source) ? { src: source } : {};
        }) });
        if (cancelled) return;
        const holder = document.createElement("div");
        holder.innerHTML = cleanDocumentHTML(result.value);
        for (const im of holder.querySelectorAll("img")) {
          const decoded = await decodeImage(im.src), width = Math.min(560, decoded.naturalWidth);
          im.width = width;
          im.height = Math.round(decoded.naturalHeight * width / decoded.naturalWidth);
        }
        const temp = new NexusDocumentLib.Editor({ element: document.createElement("div"), extensions: documentExtensions(), content: holder.innerHTML });
        let content;
        try {
          content = normalizeDocumentContent(temp.getJSON());
        } finally {
          temp.destroy();
        }
        const model = { ...emptyDocument(), content };
        if (!validDocument(model)) throw Error("文件內容超出支援範圍；未建立檔案。");
        if (cancelled) return;
        const item = await NexusStore.create("document", f.name.replace(/\.docx$/i, ""), { document: model }, activeFile.folderId);
        await refresh();
        location.hash = "file/" + item.id;
        toast("已匯入基本內容為副本。" + (result.messages.length ? "部分格式未支援，請核對內容。" : ""));
      } finally {
        if (!cancelled) $("#doc-import").disabled = false;
      }
    });
  } catch (e) {
    if (!cancelled) {
      $("#document-loading").textContent = e.message;
      toast(e.message);
    }
  }
}
