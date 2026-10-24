'use strict';
const NexusWorkbench=(()=>{
 const M=typeof NexusMoney!=='undefined'?NexusMoney:require('./money-model.js');
 const kinds=Object.freeze(['quotes','notes']),id=v=>typeof v==='string'&&/^[a-zA-Z0-9:-]{1,100}$/.test(v),text=(v,n)=>typeof v==='string'&&v.length<=n;
 const stamp=v=>typeof v==='string'&&v.length===24&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v,rev=v=>Number.isSafeInteger(v)&&v>0&&v<Number.MAX_SAFE_INTEGER;
 function valid(w){try{return !!w&&id(w.id)&&w.id.startsWith('workbench:')&&w.schemaVersion===1&&rev(w.rev)&&text(w.name,180)&&!!w.name.trim()&&stamp(w.createdAt)&&stamp(w.updatedAt)&&(w.deletedAt===null||stamp(w.deletedAt))&&Array.isArray(w.modules)&&w.modules.length<=2&&new Set(w.modules.map(x=>x?.kind)).size===w.modules.length&&new Set(w.modules.map(x=>x?.id)).size===w.modules.length&&w.modules.every(x=>x&&id(x.id)&&kinds.includes(x.kind)&&id(x.sourceId));}catch{return false;}}
 function readQuotes(file){
  const q=JSON.parse(file.data.drafts['work-quotes']||'null');if(!Array.isArray(q)||q.length!==2||!q.every(x=>x&&['name','base','delivery','extra','tax','scope','date','terms'].every(k=>text(x[k],100000))))throw Error('請先完成來源報價資料');
  return q;
 }
 function makeSnapshot(w,files,snapshotId,at){
  if(!valid(w)||w.deletedAt)throw Error('工作台不存在或已在垃圾桶');
  if(w.modules.length!==2||!kinds.every(k=>w.modules.some(m=>m.kind===k)))throw Error('請連結一份報價及一份備忘錄');
  const sources=w.modules.map(m=>{const f=files.find(f=>f.id===m.sourceId);if(!f||f.deletedAt||f.type!==m.kind)throw Error('來源不存在或在垃圾桶，請先還原或重新連結');return {module:m,file:f};});
  const quoteFile=sources.find(x=>x.module.kind==='quotes').file,noteFile=sources.find(x=>x.module.kind==='notes').file;
  const quotes=readQuotes(quoteFile).map((q,i)=>{const amount=M.quote(q);if(!q.name.trim())throw Error('請填寫廠商 '+(i+1)+' 名稱');if(amount.status!=='ok')throw Error('廠商 '+(i+1)+'：'+amount.reason);return {name:q.name,amounts:amount.amounts,totalMinor:amount.totalMinor,scope:q.scope,date:q.date,terms:q.terms};});
  const note=noteFile.data.note;if(!note||!text(note.text,100000)||!Array.isArray(note.checks))throw Error('備忘錄格式不符');if(!note.text.trim()&&!note.checks.some(x=>x.text.trim()))throw Error('請先填寫決策備忘');
  const snapshot={id:snapshotId,schemaVersion:1,workbenchId:w.id,workbenchRev:w.rev,name:w.name,createdAt:at,calculationVersion:'twd-minor-v1',currency:'TWD',scale:2,quotes,need:quoteFile.data.drafts['work-quote-need']||'',decision:quoteFile.data.drafts['work-quote-decision']||'',memo:{text:note.text,checks:note.checks.map(x=>({text:x.text,done:x.done})),omittedImages:note.images?.length||0},sourceVersions:sources.map(x=>({moduleId:x.module.id,kind:x.module.kind,fileId:x.file.id,rev:x.file.rev,name:x.file.name}))};
  if(!validSnapshot(snapshot))throw Error('成果超過範圍或格式不符');return snapshot;
 }
 function validSnapshot(s){try{return !!s&&id(s.id)&&s.id.startsWith('workbench-snapshot:')&&s.schemaVersion===1&&id(s.workbenchId)&&s.workbenchId.startsWith('workbench:')&&rev(s.workbenchRev)&&text(s.name,180)&&stamp(s.createdAt)&&s.calculationVersion==='twd-minor-v1'&&s.currency==='TWD'&&s.scale===2&&Array.isArray(s.quotes)&&s.quotes.length===2&&s.quotes.every(q=>q&&text(q.name,100000)&&!!q.name.trim()&&M.KEYS.every(k=>M.validMinor(q.amounts?.[k]))&&M.validMinor(q.totalMinor)&&BigInt(q.totalMinor)===M.KEYS.reduce((a,k)=>a+BigInt(q.amounts[k]),0n)&&['scope','date','terms'].every(k=>text(q[k],100000)))&&text(s.need,100000)&&text(s.decision,100000)&&s.memo&&text(s.memo.text,100000)&&Array.isArray(s.memo.checks)&&s.memo.checks.length<=200&&s.memo.checks.every(x=>x&&text(x.text,1000)&&typeof x.done==='boolean')&&Number.isInteger(s.memo.omittedImages)&&s.memo.omittedImages>=0&&s.memo.omittedImages<=8&&Array.isArray(s.sourceVersions)&&s.sourceVersions.length===2&&new Set(s.sourceVersions.map(x=>x.kind)).size===2&&s.sourceVersions.every(x=>x&&id(x.moduleId)&&id(x.fileId)&&kinds.includes(x.kind)&&rev(x.rev)&&text(x.name,180))&&JSON.stringify(s).length<=1000000;}catch{return false;}}
 function statusLabel(v){return v==='yes'?'已確認':v==='no'?'不符':'未確認';}
 function csv(s){if(!validSnapshot(s))throw Error('成果格式不符');const cell=v=>'"'+String(/^[\s\x00-\x1f]*[=+\-@]/.test(String(v))?"'"+v:v).replaceAll('"','""')+'"';const memo=[s.memo.text,...s.memo.checks.map(c=>(c.done?'[x] ':'[ ] ')+c.text)].join('\n');const rows=[['成果編號','建立時間','幣別','廠商','基本價','運送費','額外費用','稅額','總價','必要範圍','交期','付款與條件','需求','建議與待確認','決策備忘','來源版本'],...s.quotes.map(q=>[s.id,s.createdAt,s.currency,q.name,...M.KEYS.map(k=>M.decimal(q.amounts[k])),M.decimal(q.totalMinor),statusLabel(q.scope),statusLabel(q.date),q.terms,s.need,s.decision,memo,s.sourceVersions.map(x=>x.kind+':'+x.rev).join(' / ')])];return '\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n');}
 function json(s){if(!validSnapshot(s))throw Error('成果格式不符');return JSON.stringify({kind:'nexus-result',version:1,snapshot:s},null,2);}
 return Object.freeze({kinds,valid,readQuotes,makeSnapshot,validSnapshot,statusLabel,csv,json});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=NexusWorkbench;
