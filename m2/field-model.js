'use strict';
const NexusFields=(()=>{
 const M=typeof NexusMoney!=='undefined'?NexusMoney:require('./money-model.js');
 const types=Object.freeze(['text','number','date','select','money']);
 const id=x=>typeof x==='string'&&/^[a-zA-Z0-9:-]{1,100}$/.test(x),text=(x,n)=>typeof x==='string'&&x.length<=n;
 const own=(o,k)=>Object.hasOwn(o,k),plain=o=>!!o&&typeof o==='object'&&!Array.isArray(o),raw=x=>x===null||text(x,20000);
 const at=x=>typeof x==='string'&&x.length===24&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
 const value=(r,key)=>own(r.values||{},key)?r.values[key]:null;
 function validField(f){return !!f&&id(f.id)&&text(f.label,100)&&!!f.label.trim()&&text(f.type,32)&&!!f.type&&(f.deletedAt===null||at(f.deletedAt))&&(f.type!=='select'||Array.isArray(f.options)&&f.options.length>0&&f.options.length<=30&&new Set(f.options.map(o=>o?.id)).size===f.options.length&&new Set(f.options.map(o=>o?.label)).size===f.options.length&&f.options.every(o=>o&&id(o.id)&&text(o.label,100)&&!!o.label.trim()));}
 function validState(r,key='values'){try{return r.fieldStructureVersion===1&&Array.isArray(r.fields)&&r.fields.length<=100&&r.fields.filter(f=>!f?.deletedAt).length<=40&&r.fields.every(validField)&&new Set(r.fields.map(f=>f.id)).size===r.fields.length&&plain(r[key])&&Object.keys(r[key]).length<=200&&Object.entries(r[key]).every(([k,v])=>id(k)&&raw(v));}catch{return false;}}
 function parse(f,input){
  if(!types.includes(f.type))return {status:'invalid',reason:'不支援的欄位型別；原資料保留'};
  if(!raw(input))return {status:'invalid',reason:'原值格式不符或超過20,000字'};
  if(input===null||input===''||f.type!=='select'&&!input.trim())return {status:'missing',value:null};
  if(f.type==='text')return {status:'ok',value:input};
  const s=input.trim();
  if(f.type==='money'){const x=M.parse(input);return x.status==='ok'?{status:'ok',value:{minor:x.minor,currency:'TWD',scale:2}}:x;}
  if(f.type==='date'){const date=/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+'T00:00:00.000Z'):null;return date&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===s?{status:'ok',value:s}:{status:'invalid',reason:'請填寫有效YYYY-MM-DD日期；原值保留'};}
  if(f.type==='select')return f.options.some(o=>o.id===input)?{status:'ok',value:input}:{status:'invalid',reason:'選項已無法辨識；原值保留'};
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)||s.replace(/\D/g,'').length>30||(s.split('.')[1]||'').length>12)return {status:'invalid',reason:'數字最多30數字及12小數位，不使用科學記號；原值保留'};
  let [whole,fraction='']=s.replace(/^[+-]/,'').split('.');whole=(whole||'0').replace(/^0+(?=\d)/,'');fraction=fraction.replace(/0+$/,'');const n=whole+(fraction?'.'+fraction:'');return {status:'ok',value:(s[0]==='-'&&n!=='0'?'-':'')+n};
 }
 function format(f,input){const p=parse(f,input);if(p.status==='missing')return '未填';if(p.status!=='ok')return p.reason;if(f.type==='money')return 'TWD '+M.decimal(p.value.minor);if(f.type==='select')return f.options.find(o=>o.id===p.value).label;return p.value;}
 function promote(record){const r=structuredClone(record);if(r.schemaVersion===1){if(['fields','values','fieldStructureVersion'].some(k=>own(r,k)))throw Error('既有工作台含未辨識欄位結構，未覆寫；請先完整備份');Object.assign(r,{schemaVersion:2,fieldStructureVersion:1,fields:[],values:{}});}return r;}
 function change(record,operation,payload,{uid,now}){
  const key=record.id.startsWith('workbench-template:')?'defaults':'values',r=key==='values'?promote(record):structuredClone(record);
  if(!validState(r,key))throw Error('欄位結構不符，未變更');
  const f=r.fields.find(f=>f.id===payload.id);
  if(operation==='add'){
   const added={id:uid(),label:String(payload.label||'').trim(),type:payload.type,deletedAt:null,...(payload.type==='select'?{options:(payload.options||[]).map(label=>({id:uid(),label:String(label).trim()}))}:{})};
   if(!types.includes(added.type)||!validField(added))throw Error('欄位名稱、型別或單選選項不符');r.fields.push(added);
  }else if(operation==='values'){
   if(!plain(payload.values)||Object.entries(payload.values).some(([id,v])=>!r.fields.some(f=>f.id===id&&!f.deletedAt)||!raw(v)))throw Error('欄位值格式不符或欄位已移除；原資料未變更');r[key]={...r[key],...structuredClone(payload.values)};
  }else{
   if(!f)throw Error('找不到欄位');
   if(operation==='rename')f.label=String(payload.label||'').trim();
   else if(operation==='archive'){if(own(r[key],f.id)&&r[key][f.id]!==null&&r[key][f.id]!==''&&!payload.confirmed)throw Error('移除此含資料欄位需要確認；原值保留');f.deletedAt=now;}
   else if(operation==='restore')f.deletedAt=null;
   else if(operation==='move'){if(![-1,1].includes(payload.direction)||f.deletedAt)throw Error('排序參數不符');const active=r.fields.filter(f=>!f.deletedAt),other=active[active.findIndex(x=>x.id===f.id)+payload.direction];if(other){const a=r.fields.indexOf(f),b=r.fields.indexOf(other);[r.fields[a],r.fields[b]]=[r.fields[b],r.fields[a]];}}
   else throw Error('不支援的欄位操作');
  }
  if(!validState(r,key))throw Error('欄位設定超過上限或格式不符（最多40使用中、100含移除）');return r;
 }
 function capture(r){if(r.schemaVersion===1)return [];if(!validState(r))throw Error('欄位結構不符');if(Object.keys(r.values).some(k=>!r.fields.some(f=>f.id===k)))throw Error('含未辨識欄位值，請先完整備份；未清除原值');return r.fields.filter(f=>!f.deletedAt).map(f=>{const rawValue=value(r,f.id),p=parse(f,rawValue);if(p.status==='invalid')throw Error(f.label+'：'+p.reason);return {field:structuredClone(f),raw:rawValue,value:p.value};});}
 function equalValue(a,b){if(a===null||typeof a!=='object')return a===b;return plain(b)&&Object.keys(b).sort().join(',')==='currency,minor,scale'&&a.minor===b.minor&&a.currency===b.currency&&a.scale===b.scale;}
 function validCaptured(fields){try{return Array.isArray(fields)&&fields.length<=40&&new Set(fields.map(x=>x?.field?.id)).size===fields.length&&fields.every(x=>x&&validField(x.field)&&x.field.deletedAt===null&&raw(x.raw)&&parse(x.field,x.raw).status!=='invalid'&&equalValue(parse(x.field,x.raw).value,x.value));}catch{return false;}}
 function validTemplate(t){try{return !!t&&id(t.id)&&t.id.startsWith('workbench-template:')&&t.schemaVersion===1&&Number.isSafeInteger(t.rev)&&t.rev>0&&t.rev<Number.MAX_SAFE_INTEGER&&text(t.name,180)&&!!t.name.trim()&&at(t.createdAt)&&at(t.updatedAt)&&(t.deletedAt===null||at(t.deletedAt))&&validState(t,'defaults')&&Object.keys(t.defaults).every(k=>t.fields.some(f=>f.id===k))&&t.fields.every(f=>types.includes(f.type)&&(f.deletedAt||parse(f,own(t.defaults,f.id)?t.defaults[f.id]:null).status!=='invalid'));}catch{return false;}}
 function mapper(uid){const ids=new Map();return id=>{if(!ids.has(id))ids.set(id,uid());return ids.get(id);};}
 function remapState(record,map,key='values'){
  const r=structuredClone(record);r.fields=r.fields.map(f=>({...f,id:map(f.id),...(f.type==='select'?{options:f.options.map(o=>({...o,id:map(o.id)}))}:{})}));
  r[key]=Object.fromEntries(Object.entries(record[key]).map(([id,v])=>{const f=record.fields.find(f=>f.id===id);return [f?map(id):id,f?.type==='select'&&f.options.some(o=>o.id===v)?map(v):v];}));return r;
 }
 function remapCaptured(list,map){return list.map(x=>{const r=remapState({fields:[x.field],values:{[x.field.id]:x.raw}},map);const f=r.fields[0],raw=value(r,f.id);return {...structuredClone(x),field:f,raw,value:parse(f,raw).value};});}
 function makeTemplate(w,name,{uid,now}){
  if(w.schemaVersion===1&&['fields','values','fieldStructureVersion'].some(k=>own(w,k)))throw Error('未知結構不複製為範本');
  const fields=(w.fields||[]).filter(f=>!f.deletedAt).map(f=>({id:f.id,label:f.label,type:f.type,deletedAt:null,...(f.type==='select'?{options:f.options.map(o=>({id:o.id,label:o.label}))}:{})}));
  const t=remapState({id:'workbench-template:'+uid(),schemaVersion:1,fieldStructureVersion:1,rev:1,name:name.trim(),createdAt:now,updatedAt:now,deletedAt:null,fields,defaults:{}},mapper(uid),'defaults');if(!validTemplate(t))throw Error('範本名稱或欄位型別不符');return t;
 }
 function instantiate(t,name,{uid,now}){if(!validTemplate(t)||t.deletedAt)throw Error('範本不存在、已移除或不支援');const fields=t.fields.filter(f=>!f.deletedAt),keys=new Set(fields.map(f=>f.id));return remapState({id:'workbench:'+uid(),schemaVersion:2,fieldStructureVersion:1,rev:1,name:name.trim(),createdAt:now,updatedAt:now,deletedAt:null,modules:[],fields:structuredClone(fields),values:Object.fromEntries(Object.entries(t.defaults).filter(([key])=>keys.has(key)))},mapper(uid));}
 return Object.freeze({types,id,validField,validState,parse,format,value,promote,change,capture,validCaptured,validTemplate,mapper,remapState,remapCaptured,makeTemplate,instantiate});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=NexusFields;
