'use strict';
const NexusAssembly=(()=>{
 const W=typeof NexusWorkbench!=='undefined'?NexusWorkbench:require('./workbench-model.js'),M=typeof NexusMoney!=='undefined'?NexusMoney:require('./money-model.js');
 const parts=Object.freeze({snapshot:{quotes:'報價表',need:'需求與建議',memo:'決策備忘',fields:'自訂欄位'},notes:{text:'文字',checks:'清單'}});
 const known=(x,keys)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!keys.includes(k)))throw Error('來源含不支援的資料，請修正或重新選擇；原資料未變更');};
 function validate(kind,s){
  if(kind==='snapshot'){
   if(!W.validSnapshot(s)||s.schemaVersion===1&&['customFields','fieldStructureVersion'].some(k=>Object.hasOwn(s,k)))throw Error('固定成果格式未知或金額無效，請修正或重新選擇');
   known(s,['id','schemaVersion','workbenchId','workbenchRev','name','createdAt','calculationVersion','currency','scale','quotes','need','decision','memo','sourceVersions','fieldStructureVersion','customFields']);
   known(s.memo,['text','checks','omittedImages']);s.memo.checks.forEach(c=>known(c,['text','done']));s.quotes.forEach(q=>{known(q,['name','amounts','totalMinor','scope','date','terms']);known(q.amounts,M.KEYS);if(!['','yes','no'].includes(q.scope)||!['','yes','no'].includes(q.date))throw Error('報價含未辨識確認狀態，請修正來源');});s.sourceVersions.forEach(v=>known(v,['moduleId','kind','fileId','rev','name']));
   (s.customFields||[]).forEach(c=>{known(c,['field','raw','value']);known(c.field,['id','label','type','options','deletedAt']);(c.field.options||[]).forEach(o=>known(o,['id','label']));});
  }else if(kind==='notes'){
   if(!s||s.type!=='notes'||s.deletedAt||!Number.isSafeInteger(s.rev)||!s.data?.note)throw Error('備忘錄不存在、已刪除或格式未知');
   known(s.data,['note']);known(s.data.note,['text','checks','images','tags','pinned']);const n=s.data.note;
   if(typeof n.text!=='string'||!Array.isArray(n.checks)||!Array.isArray(n.images)||n.checks.some(c=>typeof c.text!=='string'||typeof c.done!=='boolean'))throw Error('備忘錄內容格式未知');n.checks.forEach(c=>known(c,['id','text','done']));
  }else throw Error('不支援的來源種類');
 }
 const paragraph=text=>({type:'paragraph',...(text?{content:[{type:'text',text:String(text)}]}:{})});
 const lines=s=>String(s).split(/\r\n|\n|\r/).map(paragraph);
 const heading=(s,level=2)=>({type:'heading',attrs:{level},content:[{type:'text',text:s}]});
 const list=checks=>checks.length?[{type:'bulletList',content:checks.map(c=>({type:'listItem',content:lines((c.done?'已完成：':'待辦：')+c.text)}))}]:[paragraph('（清單未填）')];
 const cell=(s,header=false)=>({type:header?'tableHeader':'tableCell',content:lines(s)});
 function blocksFor(kind,source,part){
  if(!Object.hasOwn(parts[kind]||{},part)||part==='fields'&&source.schemaVersion!==2)throw Error('選取的區塊不支援此來源');
  const s=source,n=kind==='notes'?s.data.note:s.memo;
  if(part==='text')return lines(n.text||'（未填）');if(part==='checks')return list(n.checks);
  if(part==='need')return [heading('需求與交付範圍',3),...lines(s.need||'（未填）'),heading('建議與待確認',3),...lines(s.decision||'（未填）')];
  if(part==='memo')return [...lines(n.text||'（未填）'),...list(n.checks)];
  if(part==='fields')return s.customFields.length?s.customFields.flatMap(c=>{const f=c.field,v=c.value;const value=v===null?'（未填）':f.type==='money'?'TWD '+M.decimal(v.minor):f.type==='select'?f.options.find(o=>o.id===v).label:String(v);return[heading(f.label,3),...lines(value)];}):[paragraph('（沒有自訂欄位）')];
  const titles=['廠商','基本價 TWD','運送費 TWD','額外費用 TWD','稅額 TWD','總價 TWD','必要範圍','交期','付款與條件'];
  return[{type:'table',content:[{type:'tableRow',content:titles.map(x=>cell(x,true))},...s.quotes.map(q=>({type:'tableRow',content:[q.name,...M.KEYS.map(k=>M.decimal(q.amounts[k])),M.decimal(q.totalMinor),W.statusLabel(q.scope),W.statusLabel(q.date),q.terms||'（未填）'].map(x=>cell(x))}))]}];
 }
 function compose({name,blocks,sources,at,imageAcknowledged=false}){
  if(typeof name!=='string'||!name.trim()||name.trim().length>180)throw Error('請填寫180字內成果名稱');if(!Array.isArray(blocks)||!blocks.length||blocks.length>80)throw Error('請選擇1至80個內容區塊');
  const used=new Set(),content=[heading(name.trim(),1),paragraph('文字成果 · 凍結於 '+at+'。下列來源名稱與版本是文字紀錄，非活連結；來源後續修改不會同步。')];
  for(const b of blocks){const key=b.kind+':'+b.id+':'+b.part;if(used.has(key))throw Error('請勿重複加入同一區塊');used.add(key);const source=sources.find(s=>s.kind===b.kind&&s.record?.id===b.id)?.record;if(!source)throw Error('選中來源失效，請重新選擇');validate(b.kind,source);
   if((b.kind==='notes'?source.data.note.images.length:source.memo.omittedImages)>0&&!imageAcknowledged)throw Error('來源含圖片；本版只納入文字，請明確確認不納入圖片或取消');
   content.push(heading(source.name+' · '+parts[b.kind][b.part]),paragraph(b.kind==='notes'?'已保存備忘錄 '+source.id+' · rev '+source.rev:'固定成果 '+source.id+' · schema '+source.schemaVersion+' · 工作台 rev '+source.workbenchRev+' · 原建立時間 '+source.createdAt),...blocksFor(b.kind,source,b.part));
  }
  const model={version:1,settings:{paper:'A4',margin:20,lineHeight:1.5,spacing:8,header:'',footer:'',pageNumbers:true},content:{type:'doc',content}};
  return structuredClone(model);
 }
 return Object.freeze({parts,validate,compose});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=NexusAssembly;
