'use strict';
// Handles live only in this session; no silent writes or persisted permissions.
const localFileHandles=new Map();
async function saveLocalFile(){
  const id=activeFile.id;
  let handle=localFileHandles.get(id);
  try{
    if(window.showSaveFilePicker&&!handle){
      handle=await window.showSaveFilePicker({suggestedName:activeFile.name.replace(/[<>:"\\/|?*]/g,'_')+'.nexus.json',types:[{description:'NEXUS 工作檔',accept:{'application/json':['.json']}}]});
    }
    let browserSaveFailed=false;
    try{await flush();}catch{browserSaveFailed=true;}
    if(activeFile?.id!==id)throw Error('目前檔案已變更，請重新選擇儲存');
    const text=JSON.stringify({kind:'nexus-workspace',version:1,files:[{...activeFile,folderId:null,data:extractData(activeFile.type)}],folders:[],archives:[]},null,2);
    if(new Blob([text]).size>100000000)throw Error('工作檔超過 100 MB');
    if(!handle){download(activeFile.name+'.nexus.json',text,'application/json');toast(browserSaveFailed?'已產生最新草稿下載；瀏覽器仍未保存，請確認下載。':'已產生工作檔下載；請確認下載位置。');return;}
    const writable=await handle.createWritable();
    try{await writable.write(text);await writable.close();}
    catch(error){try{await writable.abort();}catch{}throw error;}
    localFileHandles.set(id,handle);
    toast(browserSaveFailed?'最新草稿已寫入所選位置；瀏覽器仍未保存。':'工作檔已寫入你選擇的位置。瀏覽器自動保存仍只更新瀏覽器。');
  }catch(error){if(error.name==='AbortError'){toast('已取消，未寫入檔案。');return;}throw error;}
}
async function openLocalFile(){
  if(!window.showOpenFilePicker){$('#local-file-input').click();return;}
  try{
    const [handle]=await window.showOpenFilePicker({multiple:false,types:[{description:'NEXUS 工作檔／備份',accept:{'application/json':['.json']}}]});
    await importLocalFile(await handle.getFile());
  }catch(error){if(error.name!=='AbortError')throw error;}
}
async function importLocalFile(file){
  if(!file)return;
  if(file.size>100000000)throw Error('工作檔超過 100 MB');
  const backup=JSON.parse(await file.text());
  await flush();
  await NexusStore.importBackup(backup);
  await refresh();
  location.hash='work';
  await render();
  toast('已匯入為獨立副本，原檔案與本機來源保留。');
}
function bindLocalFiles(){
  $('#save-local-file').onclick=safeAction(saveLocalFile);
  $('#open-local-file').onclick=safeAction(openLocalFile);
  $('#local-file-input').onchange=safeAction(async e=>{const file=e.target.files[0];e.target.value='';await importLocalFile(file);});
}
async function showFileHistory(){
  await flush();
  const file=activeFile,history=await NexusStore.get('meta','history:'+file.id);
  const dialog=document.createElement('dialog');dialog.className='name-dialog';
  dialog.innerHTML='<h2>歷史版本</h2><p>最多保留最近 10 次修改前版本，保存在此瀏覽器。還原會建立副本。</p><div class="history-list"></div><button class="close-history">關閉</button>';
  for(const version of [...(history?.versions||[])].reverse()){
    const button=document.createElement('button');button.textContent='版本 '+version.rev+' · '+new Date(version.at).toLocaleString('zh-TW')+' · 還原為副本';
    button.onclick=safeAction(async()=>{const copy=await NexusStore.create(file.type,version.name+' 歷史復原',version.data,file.folderId);dialog.close();dialog.remove();await refresh();location.hash='file/'+copy.id;});
    dialog.querySelector('.history-list').appendChild(button);
  }
  if(!history?.versions.length)dialog.querySelector('.history-list').textContent='尚無歷史版本；從此版本起的成功修改才會保留。';
  dialog.querySelector('.close-history').onclick=()=>{dialog.close();dialog.remove();};
  dialog.oncancel=e=>{e.preventDefault();dialog.close();dialog.remove();};document.body.appendChild(dialog);dialog.showModal();
}
