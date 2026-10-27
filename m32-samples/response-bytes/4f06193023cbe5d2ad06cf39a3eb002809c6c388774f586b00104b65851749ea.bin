'use strict';
self.onmessage=async({data})=>{const started=performance.now();try{
 const revision=new URL(self.location.href).search;
 importScripts('pdfmake-vendor.js'+revision,'pdf-model.js'+revision);
 const files=['pdf-noto-tc-regular.ttf','pdf-noto-tc-bold.ttf','pdf-font-coverage.json'];
 const values=await Promise.all(files.map(async url=>{const r=await fetch(url+revision);if(!r.ok)throw Error('PDF 資源載入失敗：'+url+' ('+r.status+')');return url.endsWith('.json')?r.json():r.arrayBuffer();}));
 const vfs={};for(let i=0;i<2;i++){let s='';const b=new Uint8Array(values[i]);for(let at=0;at<b.length;at+=16384)s+=String.fromCharCode(...b.subarray(at,at+16384));vfs[files[i]]=btoa(s);}
 pdfMake.vfs=vfs;pdfMake.fonts={NotoTC:{normal:files[0],bold:files[1],italics:files[0],bolditalics:files[1]}};
 const def=NexusPDF.definition(data.model,{...data.options,coverage:values[2]}),loaded=performance.now();
 const output=pdfMake.createPdf(def);
 // Pinned pdfmake 0.2.23 layout contract: inspect the SAME generated pages/buffer before download.
 if(typeof output._createDoc!=='function'||typeof output._flushDoc!=='function')throw Error('PDF 引擎版面檢查介面不符，已停止輸出');
 output._createDoc({},doc=>output._flushDoc(doc,(buffer,pages)=>{try{
  if(!pages?.length)throw Error('PDF 沒有可驗證頁面');
  let lines=0;
  for(const page of pages){const {width,height}=page.pageSize;
   for(const entry of page.items){const item=entry.item;
    if(entry.type==='line'){lines++;for(const run of item.inlines){const x=item.x+run.x,y=item.y;if(x<0||x+run.width>width+.2||y<0||y+item.getHeight()>height+.2)throw Error('PDF 內容超出頁面，未下載；請減少字級或改用橫式／DOCX');}}
    if(entry.type==='vector'&&item.type==='line'&&[item.x1,item.x2].some(x=>x<def.pageMargins[0]-2||x>width-def.pageMargins[2]+2))throw Error('PDF 表格超出頁面安全範圍，未下載；請改用橫式／DOCX');
   }
  }
  const bytes=new Uint8Array(buffer),copy=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);self.postMessage({buffer:copy,stats:{loadMs:Math.round(loaded-started),generationMs:Math.round(performance.now()-loaded),bytes:bytes.length,pages:pages.length,checkedLines:lines}},[copy]);
 }catch(e){self.postMessage({error:e.message});}}));
 }catch(e){self.postMessage({error:e.message||String(e)});}};
