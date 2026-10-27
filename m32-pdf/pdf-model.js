'use strict';
// Pure, deliberately bounded document -> pdfmake mapping. No live editor or source mutation.
(function(root){
 function definition(model,{orientation='portrait',name='文件',coverage}={}){
  if(!['portrait','landscape'].includes(orientation)||model?.version!==1||model.settings?.paper!=='A4')throw Error('直接 PDF 首版只支援 A4 直式／橫式；請改用 DOCX 或列印');
  const known=(value,keys)=>{if(!value||typeof value!=='object'||Object.keys(value).some(k=>!keys.includes(k)))throw Error('PDF 含未辨識格式，已停止輸出；原文件保留');};
  known(model,['version','settings','content']);known(model.settings,['paper','margin','lineHeight','spacing','header','footer','pageNumbers']);
  const attributes={doc:[],paragraph:['textAlign'],heading:['textAlign','level'],text:[],hardBreak:[],bulletList:[],orderedList:['start','type'],listItem:[],table:[],tableRow:[],tableCell:['colspan','rowspan','colwidth','align'],tableHeader:['colspan','rowspan','colwidth','align'],pageBreak:[]};
  function node(n){known(n,['type','content','text','attrs','marks']);known(n.attrs||{},attributes[n.type]||[]);if(n.type!=='text'&&n.marks?.length)throw Error('PDF 不支援區塊格式標記，未輸出');if(n.type==='orderedList'&&n.attrs?.type!=null&&n.attrs.type!=='1')throw Error('PDF 首版只支援十進位編號清單，未輸出');}
  node(model.content);
  let chars=0;const glyphs=coverage?new Set(coverage):null;
  function check(text){for(const c of text){if(++chars>150000)throw Error('PDF 超過15萬字元的可靠輸出上限；未截短，請拆分文件');if(glyphs&&!/[\n\r\t]/.test(c)&&!glyphs.has(c.codePointAt(0)))throw Error('PDF 字型缺少字元 U+'+c.codePointAt(0).toString(16).toUpperCase()+'；未輸出，請使用其他格式');}return text;}
  function inline(n){node(n);if(n.type==='hardBreak')return {text:'\n'};if(n.type!=='text')throw Error('PDF 不支援此行內內容：'+n.type);const r={text:check(n.text)};for(const m of n.marks||[]){known(m,['type','attrs']);known(m.attrs||{},m.type==='textStyle'?['fontFamily','fontSize','color','backgroundColor']:m.type==='link'?['href','target','rel','class']:[]);if(m.type==='bold')r.bold=true;else if(m.type==='underline')r.decoration=r.decoration?[].concat(r.decoration,'underline'):'underline';else if(m.type==='strike')r.decoration=r.decoration?[].concat(r.decoration,'lineThrough'):'lineThrough';else if(m.type==='link')r.link=m.attrs.href;else if(m.type==='textStyle'){const a=m.attrs||{};if(a.fontFamily)throw Error('PDF 使用內嵌 Noto Sans TC；自訂字型無法保真，未輸出');if(a.fontSize)r.fontSize=parseFloat(a.fontSize)*.75;if(a.color)r.color=a.color;if(a.backgroundColor)r.background=a.backgroundColor;}else throw Error('PDF 首版不支援格式：'+m.type+'；原文件保留，請使用 DOCX／HTML');}return r;}
  function block(n){node(n);const a=n.attrs||{};if(n.type==='paragraph'||n.type==='heading')return {text:(n.content||[]).map(inline),fontSize:n.type==='heading'?[22,18,14][a.level-1]:10,bold:n.type==='heading'?true:undefined,alignment:a.textAlign||undefined,margin:[0,0,0,model.settings.spacing*.75]};
   if(['bulletList','orderedList'].includes(n.type)){const r={[n.type==='bulletList'?'ul':'ol']:(n.content||[]).map(x=>{node(x);return {stack:x.content.map(block)};}),margin:[0,0,0,6]};if(n.type==='orderedList')r.start=a.start||1;return r;}
   if(n.type==='table'){
    const count=n.content[0]?.content.length;if(!count||count>12||n.content.some(r=>r.content.length!==count))throw Error('PDF 表格須為規則矩形、最多12欄；未裁切輸出');
    const body=n.content.map(row=>{node(row);return row.content.map(cell=>{node(cell);const z=cell.attrs||{};if(z.align!=null&&!['left','center','right','justify'].includes(z.align))throw Error('PDF 儲存格對齊格式未知，未輸出');if((z.colspan||1)!==1||(z.rowspan||1)!==1)throw Error('PDF 首版不支援合併儲存格；未輸出');return {stack:cell.content.map(block),alignment:z.align||undefined,bold:cell.type==='tableHeader',fillColor:cell.type==='tableHeader'?'#eeeeee':undefined};});});
    return {table:{headerRows:1,widths:Array(count).fill('*'),body},layout:{paddingLeft:()=>3,paddingRight:()=>3,paddingTop:()=>4,paddingBottom:()=>4},fontSize:9,margin:[0,4,0,10]};
   }
   if(n.type==='pageBreak')return {text:'',pageBreak:'before'};
   throw Error('PDF 首版不支援內容：'+n.type+'；未省略，請使用 DOCX／HTML');
  }
  const content=model.content.content.map(block),s=model.settings,margin=s.margin*72/25.4;check(name);check(s.header||'');check(s.footer||'');check('第 / 頁0123456789');check('•');
  return {pageSize:'A4',pageOrientation:orientation,pageMargins:[margin,margin,margin,margin],defaultStyle:{font:'NotoTC',fontSize:10,lineHeight:s.lineHeight},info:{title:name,creator:'NEXUS'},content,header:s.header?{text:s.header,font:'NotoTC',fontSize:9,margin:[margin,15,margin,0]}:undefined,footer:(page,pages)=>({text:[s.footer||'','第 '+page+' / '+pages+' 頁'].filter(Boolean).join('　'),font:'NotoTC',fontSize:9,alignment:'center',margin:[margin,12,margin,0]})};
 }
 root.NexusPDF={definition};if(typeof module!=='undefined')module.exports=root.NexusPDF;
})(typeof self!=='undefined'?self:globalThis);
