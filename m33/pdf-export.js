'use strict';
// A disposable worker keeps normal editing responsive; cancellation terminates all output work.
function generateDocumentPDF(model,options,signal){return new Promise((resolve,reject)=>{
 if(signal?.aborted)return reject(new DOMException('已取消 PDF 輸出','AbortError'));
 const worker=new Worker('pdf-worker.js?v='+encodeURIComponent(DEPLOYMENT.commit||BRAND.version));let done=false;
 const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
 const abort=()=>finish(new DOMException('已取消 PDF 輸出；未下載半成品','AbortError'));
 const timer=setTimeout(()=>finish(Error('PDF 生成超過120秒；已停止，可重試或減少內容')),120000);
 signal?.addEventListener('abort',abort,{once:true});worker.onerror=e=>{e.preventDefault();finish(Error('PDF 引擎／字型載入失敗，未下載；請重試：'+e.message));};
 worker.onmessage=({data})=>data.error?finish(Error(data.error)):finish(null,{blob:new Blob([data.buffer],{type:'application/pdf'}),stats:data.stats});
 worker.postMessage({model,options});
 });}
