'use strict';
const NexusCategories=(()=>{
 const kinds=Object.freeze(['document','notes','tasks','budget','quotes','slides','report','minutes','time-records']);
 const id=x=>typeof x==='string'&&/^[a-zA-Z0-9:-]{1,100}$/.test(x),stamp=x=>typeof x==='string'&&x.length===24&&!Number.isNaN(Date.parse(x))&&new Date(x).toISOString()===x;
 const label=x=>typeof x==='string'&&x===x.trim()&&[...x].length>=1&&[...x].length<=40;
 const key=workbenchId=>'workbench-layout:'+workbenchId.slice('workbench:'.length);
 function valid(l){try{return !!l&&l.schemaVersion===1&&id(l.workbenchId)&&l.workbenchId.startsWith('workbench:')&&l.id===key(l.workbenchId)&&Number.isSafeInteger(l.rev)&&l.rev>0&&l.rev<Number.MAX_SAFE_INTEGER&&stamp(l.createdAt)&&stamp(l.updatedAt)&&Array.isArray(l.categories)&&l.categories.length<=20&&l.categories.every(c=>c&&id(c.id)&&label(c.name))&&new Set(l.categories.map(c=>c.id)).size===l.categories.length&&new Set(l.categories.map(c=>c.name)).size===l.categories.length&&Array.isArray(l.items)&&l.items.length<=100&&l.items.every(i=>i&&id(i.id)&&id(i.fileId)&&kinds.includes(i.toolType)&&l.categories.some(c=>c.id===i.categoryId))&&new Set(l.items.map(i=>i.id)).size===l.items.length&&new Set(l.items.map(i=>i.fileId)).size===l.items.length;}catch{return false;}}
 function create(workbenchId,at){const l={id:key(workbenchId),workbenchId,schemaVersion:1,rev:1,categories:[],items:[],createdAt:at,updatedAt:at};if(!valid(l))throw Error('分類配置格式不符');return l;}
 function change(current,operation,payload,{uid,now}){
  if(!valid(current))throw Error('分類配置格式未知，未改寫；請先完整備份');const l=structuredClone(current),c=l.categories.find(c=>c.id===payload.categoryId);
  const name=()=>{const value=typeof payload.name==='string'?payload.name.trim():'';if(!label(value))throw Error('分類名稱需為1至40字');if(l.categories.some(x=>x.id!==c?.id&&x.name===value))throw Error('這個工作台已有相同分類名稱');return value;};
  if(operation==='add-category'){if(l.categories.length>=20)throw Error('最多20個分類');l.categories.push({id:uid(),name:name()});}
  else if(operation==='rename-category'){if(!c)throw Error('分類不存在，請重新讀取');c.name=name();}
  else if(operation==='move-category'){const i=l.categories.findIndex(x=>x.id===payload.categoryId),j=i+payload.direction;if(i<0||![-1,1].includes(payload.direction)||j<0||j>=l.categories.length)throw Error('無法移動此分類');[l.categories[i],l.categories[j]]=[l.categories[j],l.categories[i]];}
  else if(operation==='add-item'){if(!c||!kinds.includes(payload.toolType)||!id(payload.fileId))throw Error('請選擇有效分類與工具');if(l.items.length>=100)throw Error('每工作台最多100個內容項目');if(l.items.some(i=>i.fileId===payload.fileId))throw Error('檔案已在此工作台');l.items.push({id:uid(),categoryId:c.id,fileId:payload.fileId,toolType:payload.toolType});}
  else throw Error('不支援的分類操作');
  l.rev++;l.updatedAt=now();if(!valid(l))throw Error('分類設定不符，未保存');return l;
 }
 function remap(l,workbenchId,fileMap,uid){if(!valid(l))throw Error('分類格式不符');const copy=structuredClone(l),categories=new Map(copy.categories.map(c=>[c.id,uid()]));copy.workbenchId=workbenchId;copy.id=key(workbenchId);copy.categories=copy.categories.map(c=>({...c,id:categories.get(c.id)}));copy.items=copy.items.map(i=>{if(!fileMap.has(i.fileId))throw Error('分類來源缺漏');return{...i,id:uid(),categoryId:categories.get(i.categoryId),fileId:fileMap.get(i.fileId)};});if(!valid(copy))throw Error('分類副本映射不符');return copy;}
 return Object.freeze({kinds,key,valid,create,change,remap});
})();
if(typeof module!=='undefined')module.exports=NexusCategories;
