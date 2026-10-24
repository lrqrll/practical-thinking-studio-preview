'use strict';
// Transport only: chunks contain the exact UTF-8 bytes of one complete v1/v2 backup.
const NexusBackup=(()=>{
 const SINGLE_BYTES=100000000,PART_BYTES=16000000,HEADER_BYTES=4096;
 const hash=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
 async function pack(value){
  const blob=new Blob([JSON.stringify(value)],{type:'application/json'});
  if(blob.size<=SINGLE_BYTES)return [{name:'NEXUS-backup.json',blob}];
  const setId=crypto.randomUUID(),count=Math.ceil(blob.size/PART_BYTES),sha256=await hash(blob),result=[];
  for(let index=0;index<count;index++){
   const payload=blob.slice(index*PART_BYTES,(index+1)*PART_BYTES);
   const header={kind:'nexus-backup-part',version:1,setId,index,count,totalBytes:blob.size,sha256,partBytes:payload.size,partSha256:await hash(payload)};
   result.push({name:`NEXUS-${setId}-${String(index+1).padStart(3,'0')}-of-${count}.nexuspart`,blob:new Blob([JSON.stringify(header)+'\n',payload],{type:'application/octet-stream'})});
  }
  return result;
 }
 async function unpack(files){
  if(!files.length)throw Error('請選取備份檔');
  if(files.length===1&&!files[0].name.endsWith('.nexuspart'))return JSON.parse(await files[0].text());
  const parts=[];let reference;
  for(const file of files){
   const prefix=new Uint8Array(await file.slice(0,HEADER_BYTES).arrayBuffer()),end=prefix.indexOf(10);
   if(end<0)throw Error('備份分包標頭不符，原資料未變更');
   let h;try{h=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(prefix.slice(0,end)));}catch{throw Error('備份分包標頭不符，原資料未變更');}
   if(h.kind!=='nexus-backup-part'||h.version!==1||typeof h.setId!=='string'||!/^[0-9a-f-]{36}$/.test(h.setId)||!Number.isSafeInteger(h.count)||h.count<2||!Number.isSafeInteger(h.index)||h.index<0||h.index>=h.count||!Number.isSafeInteger(h.totalBytes)||h.totalBytes<=SINGLE_BYTES||!Number.isSafeInteger(h.partBytes)||h.partBytes<1||h.partBytes>PART_BYTES||!(/^[a-f0-9]{64}$/).test(h.sha256)||!(/^[a-f0-9]{64}$/).test(h.partSha256)||h.count!==Math.ceil(h.totalBytes/PART_BYTES)||h.partBytes!==Math.min(PART_BYTES,h.totalBytes-h.index*PART_BYTES))throw Error('備份分包規格不符，原資料未變更');
   if(reference&&['setId','count','totalBytes','sha256'].some(k=>h[k]!==reference[k]))throw Error('混入不同備份集合，原資料未變更');
   reference=h;
   if(parts[h.index])throw Error('重複的備份分包，原資料未變更');
   const payload=file.slice(end+1);
   if(payload.size!==h.partBytes||await hash(payload)!==h.partSha256)throw Error('備份分包損毀或遭截斷，原資料未變更');
   parts[h.index]=payload;
  }
  if(files.length!==reference.count||Array.from({length:reference.count},(_,i)=>!parts[i]).some(Boolean))throw Error('備份分包不齊，請同時選取全部分包；原資料未變更');
  const blob=new Blob(parts);
  if(blob.size!==reference.totalBytes||await hash(blob)!==reference.sha256)throw Error('完整備份驗證失敗，原資料未變更');
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await blob.arrayBuffer()));
 }
 return Object.freeze({SINGLE_BYTES,PART_BYTES,pack,unpack});
})();
if(typeof module!=='undefined')module.exports=NexusBackup;
