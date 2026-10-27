'use strict';
// Integer minutes and row identities are scoped to one file. Copy/restore retain
// row IDs; their new file ID makes the resulting identities independent.
const NexusTime=(()=>{
 const fields=['date','project','task','minutes','notes'];
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const keys=(x,allowed)=>object(x)&&Object.keys(x).every(k=>allowed.includes(k));
 function validDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [y,m,d]=value.split('-').map(Number),days=[31,y%4===0&&(y%100!==0||y%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  return y>=1&&m>=1&&m<=12&&d>=1&&d<=days[m-1];
 }
 const validMinutes=n=>Number.isSafeInteger(n)&&n>=1&&n<=1440;
 const empty=()=>({schemaVersion:1,rows:[]});
 const emptyDraft=()=>({editingId:null,date:'',project:'',task:'',minutes:'',notes:''});
 function errors(raw){const out={};if(!validDate(raw?.date))out.date='請填有效日期 YYYY-MM-DD。';if(typeof raw?.minutes!=='string'||!/^\d+$/.test(raw.minutes)||!validMinutes(Number(raw.minutes)))out.minutes='分鐘須為 1 至 1440 的整數，不能空白。';return out;}
 function valid(value){
  if(!keys(value,['schemaVersion','rows','draft'])||value.schemaVersion!==1||!Array.isArray(value.rows)||value.rows.length>500)return false;
  const ids=new Set();for(const row of value.rows){if(!keys(row,['id',...fields])||typeof row.id!=='string'||!row.id||row.id.length>100||ids.has(row.id)||!validDate(row.date)||!validMinutes(row.minutes)||!['project','task','notes'].every(k=>typeof row[k]==='string'))return false;ids.add(row.id);}
  if(value.draft!==undefined){const d=value.draft;if(!keys(d,['editingId',...fields])||!fields.every(k=>typeof d[k]==='string')||d.editingId!==null&&!ids.has(d.editingId))return false;}
  return true;
 }
 function requireValid(value){if(!valid(value))throw Error('工時資料格式或版本不符，未忽略未知資料。');}
 function rowFromDraft(d,id){if(Object.keys(errors(d)).length)throw Error('請修正日期與分鐘。');return {id,date:d.date,project:d.project,task:d.task,minutes:Number(d.minutes),notes:d.notes};}
 const draftFromRow=r=>({editingId:r.id,date:r.date,project:r.project,task:r.task,minutes:String(r.minutes),notes:r.notes});
 function pending(value){const d=value.draft;if(!d)return false;if(!d.editingId)return fields.some(k=>d[k]!=='');const row=value.rows.find(r=>r.id===d.editingId);return Object.keys(errors(d)).length>0||fields.some(k=>k==='minutes'?row[k]!==Number(d[k]):row[k]!==d[k]);}
 function rangeLabel(range={}){return !range.from&&!range.to?'全部日期':(range.from||'最早')+' 至 '+(range.to||'最晚');}
 function selected(value,range={}){requireValid(value);if(range.from&&!validDate(range.from)||range.to&&!validDate(range.to)||range.from&&range.to&&range.from>range.to)throw Error('請填有效日期範圍，開始日期不能晚於結束日期。');return value.rows.filter(r=>(!range.from||r.date>=range.from)&&(!range.to||r.date<=range.to));}
 function totals(rows){let minutes=0;const projects=new Map();for(const row of rows){if(!validMinutes(row.minutes))throw Error('工時分鐘不合法');minutes+=row.minutes;if(!Number.isSafeInteger(minutes))throw Error('工時合計超過安全整數');const sum=(projects.get(row.project)||0)+row.minutes;if(!Number.isSafeInteger(sum))throw Error('專案合計超過安全整數');projects.set(row.project,sum);}return {minutes,projects:[...projects].map(([project,minutes])=>({project,minutes}))};}
 const duration=minutes=>Math.floor(minutes/60)+' 小時 '+minutes%60+' 分鐘';
 function adapter(file,range={}){if(!file||file.type!=='time-records'||typeof file.id!=='string'||!file.id||!Number.isSafeInteger(file.rev)||file.rev<1||!keys(file.data,['timeRecords']))throw Error('工時檔案格式不符');requireValid(file.data.timeRecords);if(pending(file.data.timeRecords))throw Error('尚有未完成工時輸入，請先完成或清除草稿。');const rows=structuredClone(selected(file.data.timeRecords,range));return {fileId:file.id,rev:file.rev,schemaVersion:1,range:{from:range.from||null,to:range.to||null},rows,totals:totals(rows)};}
 function cell(value){let s=String(value??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
 function csv(file,range={}){const data=adapter(file,range),rows=[['日期範圍',rangeLabel(range)],['日期','專案／分類','工作項目','分鐘','備註','列 ID'],...data.rows.map(r=>[r.date,r.project,r.task,r.minutes,r.notes,r.id]),['合計分鐘',data.totals.minutes],['合計時間',duration(data.totals.minutes)],['專案／分類','合計分鐘'],...data.totals.projects.map(p=>[p.project,p.minutes])];return '\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n');}
 return {empty,emptyDraft,valid,validDate,validMinutes,errors,rowFromDraft,draftFromRow,pending,selected,totals,duration,rangeLabel,adapter,csv};
})();
