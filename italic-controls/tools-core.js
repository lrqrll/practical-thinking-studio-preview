'use strict';
const $=s=>document.querySelector(s);const $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',2600);}
function download(name,text,type='text/plain;charset=utf-8'){if(activeFile&&!name.endsWith('.json')){const extension=name.slice(name.lastIndexOf('.'));name=activeFile.name.replace(/[<>:"\\/|?*]/g,'_')+extension;}const a=document.createElement('a');const u=URL.createObjectURL(new Blob([text],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function go(route){location.hash=route;}

function reportText(){return ['目前結果','影響與未知','建議與決策'].map((t,i)=>t+'\n'+(state.drafts['report-'+['result','impact','request'][i]]||'（未填寫）')).join('\n\n');}
function blankState(){return {theme:'light',budget:{fixed:0,price:0,variable:0,people:0,rows:[]},tasks:[],drafts:{},note:emptyNote(),asset:emptyAsset(),document:emptyDocument()};}
let state=blankState(),activeFile=null,files=[],folders=[],saveQueue=Promise.resolve(),saveError=null;
function extractData(type,s=state){if(type==='document')return {document:structuredClone(s.document||emptyDocument())};if(type==='notes')return {note:structuredClone(s.note||emptyNote())};if(type==='asset')return {asset:structuredClone(s.asset||emptyAsset())};if(type==='budget')return {budget:structuredClone(s.budget)};if(type==='tasks')return {tasks:structuredClone(s.tasks)};const prefixes={report:['report-'],quotes:['work-quote'],slides:['work-slide'],minutes:['work-meeting']}[type]||[];return {drafts:Object.fromEntries(Object.entries(s.drafts||{}).filter(([k])=>prefixes.some(p=>k.startsWith(p))))};}
function blankData(type){return extractData(type,blankState());}
function setSaveStatus(text,failed=false){const invalid=activeFile?.type==='budget'&&$$('#main input[type=number]').some(x=>x.value===''||!x.checkValidity());if(invalid&&!failed)text='有無效或空白數字，該項修改未保存';const el=$('#save-status');if(el){el.textContent=text;el.classList.toggle('error',failed||invalid);}const recovery=$('#recover-draft');if(recovery)recovery.hidden=!failed;const retry=$('#retry-save');if(retry)retry.hidden=!failed;}
let pendingSaveTimer=null, pendingWrites=0, dirty=false, recoveryError=null;
// A tab must never remove another tab's unsaved recovery snapshot.
const recoveryTab=crypto.randomUUID();
function recoveryKey(id){return RECOVERY_PREFIX+id+':'+recoveryTab;}
function protectDraft(id,data){
  try{localStorage.setItem(recoveryKey(id),JSON.stringify({id,data,at:new Date().toISOString()}));recoveryError=null;}
  catch(error){recoveryError=error;setSaveStatus('草稿備援空間不足；請立即下載目前內容備份',true);}
}
function saveSoon(){
  if(!activeFile)return;
  dirty=true;
  protectDraft(activeFile.id,extractData(activeFile.type));
  if(pendingSaveTimer)clearTimeout(pendingSaveTimer);
  setSaveStatus(recoveryError?'草稿備援失敗，正在嘗試保存…':'正在保存…',!!recoveryError);
  pendingSaveTimer=setTimeout(()=>{pendingSaveTimer=null;save();},350);
}
function save(){
  if(pendingSaveTimer){clearTimeout(pendingSaveTimer);pendingSaveTimer=null;}
  if(!activeFile)return saveQueue;
  const id=activeFile.id,data=extractData(activeFile.type);
  dirty=true;protectDraft(id,data);pendingWrites++;
  setSaveStatus('正在保存…');
  // Each attempt runs even after a previous rejection. Revisions still prevent
  // a retry from overwriting a change made in another tab.
  saveQueue=saveQueue.catch(()=>{}).then(async()=>{
    const current=files.find(f=>f.id===id);
    if(!current)throw Error('檔案不在工作空間，請下載目前內容備份');
    const updated=await NexusStore.update(id,current.rev,{data});
    files=files.map(f=>f.id===id?updated:f);
    if(activeFile?.id===id)activeFile=updated;
    saveError=null;
    if(pendingWrites===1&&!pendingSaveTimer){
      dirty=false;
      try{localStorage.removeItem(recoveryKey(id));}catch{}
      setSaveStatus('已保存至此瀏覽器');
    }
  }).catch(error=>{
    saveError=error;
    setSaveStatus('未保存：'+error.message,true);
    toast('未保存，請重試或下載目前內容備份。');
  }).finally(()=>{pendingWrites--;});
  return saveQueue;
}
async function flush(){
  // Edits may arrive while an IndexedDB write is in flight. Drain those too
  // before navigation/export may replace state or destroy the editor.
  while(true){
    if(pendingSaveTimer){clearTimeout(pendingSaveTimer);pendingSaveTimer=null;save();}
    else if(saveError&&dirty&&!pendingWrites)save();
    const queue=saveQueue;
    await queue;
    if(saveError)throw saveError;
    if(queue===saveQueue&&!pendingSaveTimer&&!pendingWrites)return;
  }
}
let viewCleanup=()=>{};
function bindTool(type){if(type==='notes')bindNotes();if(type==='asset')bindRetiredAsset();if(type==='document')bindDocument();if(type==='budget')bindBudget();if(type==='tasks')bindTasks();if(['quotes','slides','minutes'].includes(type))bindWorkbench(type);if(type==='report'){$('#report-preview').textContent=reportText();for(const k of ['result','impact','request'])$('#report-'+k).oninput=e=>{state.drafts['report-'+k]=e.target.value;save();$('#report-preview').textContent=reportText();};$('#exportreport').onclick=()=>download('工作報告.txt',reportText());}}
function toolView(file){const view=({document:documentView,notes:notesView,asset:retiredAssetView,budget:budgetView,tasks:tasksView,report:reportView,quotes:quotesView,slides:slidesView,minutes:minutesView}[file.type])();return '<div class="tool-page-head"><a class="back" href="#work">← 返回工作空間</a><div class="document-heading"><h1>'+esc(file.name)+'</h1><div class="document-actions"><button id="tool-favorite" aria-pressed="'+toolPrefs.favorites.includes(file.type)+'">'+(toolPrefs.favorites.includes(file.type)?'取消工具最愛':'加入工具最愛')+'</button><button id="rename-current">重新命名</button><button id="file-history">歷史版本</button><button id="save-local-file">儲存工作檔到電腦…</button><button id="open-local-file">開啟電腦工作檔…</button><input id="local-file-input" type="file" accept="application/json,.json" hidden></div></div><p class="save-status"><span>'+toolMeta(file.type).name+'</span> · <span id="save-status">已保存至此瀏覽器</span></p><button id="retry-save" hidden>重試保存</button><button id="recover-draft" hidden>下載目前內容備份</button></div><div class="tool-body">'+(['notes','asset','document'].includes(file.type)?view:professionalView(file.type,view))+'</div>';}
function budgetView(){const b=state.budget;return '<div class="grid"><section><h2>先算每多一人，留下多少</h2><p class="muted">教學條件：單一票種、成本線性、不含未輸入的稅費。所有金額均為新台幣。</p><div class="grid"><div><label for="price">每人售價</label><input id="price" type="number" min="0" value="'+b.price+'"></div><div><label for="variable">每人變動成本</label><input id="variable" type="number" min="0" value="'+b.variable+'"></div><div><label for="people">預估人數（整數）</label><input id="people" type="number" min="0" step="1" value="'+b.people+'"></div></div><h3 style="margin-top:25px">固定成本</h3><div class="tablewrap"><table><thead><tr><th>項目</th><th>金額</th><th>操作</th></tr></thead><tbody>'+b.rows.map((r,i)=>'<tr><td><input class="budgetname" aria-label="成本項目 '+(i+1)+'" data-cost-name="'+i+'" value="'+esc(r[0])+'"></td><td><input aria-label="成本金額 '+(i+1)+'" data-cost-value="'+i+'" type="number" min="0" value="'+r[1]+'"></td><td><button data-remove-cost="'+i+'" aria-label="刪除成本 '+(i+1)+'">×</button></td></tr>').join('')+'</tbody></table></div><button id="addcost">＋ 加一項</button></section><section class="panel"><span class="label">LIVE CALCULATION</span><div id="budgetresult"></div><div class="actions"><button id="exportbudgetxlsx" class="primary">下載 Excel（含公式）</button><button id="exportbudget">匯出 CSV</button></div><details><summary>帶到 Excel：公式與檢查</summary><p>下載的 Excel 中，B5 售價、B6 每人成本、B7 人數；固定成本明細從第 21 列開始。<br>核心兩平公式：<code>=IF(B11&gt;0,ROUNDUP(B10/B11,0),&quot;無法兩平&quot;)</code><br>利潤：<code>=B13-B15</code></p><p>Excel 檔包含公式與目前數值；CSV 只有資料與計算值。修改 Excel 後若沒有更新，確認計算選項為「自動」，或按 F9。</p></details><details><summary>實作任務</summary><p>把人數改成 90，再想兩個方案：提高票價或降低固定成本。每個方案對銷售與品質有什麼影響？不要只追求表上正數。</p></details></section></div>';}
function calcBudget(){const b=state.budget,c=b.price-b.variable,f=b.rows.reduce((a,r)=>a+r[1],0);return {fixed:f,contribution:c,breakEven:c>0?Math.ceil(f/c):null,revenue:b.people*b.price,profit:b.people*c-f};}
function budgetResult(){if($$('#main input[type=number]').some(x=>x.value===''||!x.checkValidity())){$('#budgetresult').innerHTML='<p role="alert">請填入有效數字後查看結果。</p>';return;}const r=calcBudget();$('#budgetresult').innerHTML='<p class="muted">預估利潤</p><div class="metric">'+r.profit.toLocaleString('zh-TW')+'</div><p class="muted">收入 '+r.revenue.toLocaleString()+' − 固定成本 '+r.fixed.toLocaleString()+' − 變動成本 '+(state.budget.people*state.budget.variable).toLocaleString()+'</p><hr><p>每人貢獻　<strong>'+r.contribution.toLocaleString()+' 元</strong><br>損益兩平　<strong>'+(r.breakEven===null?'每人貢獻未大於零，無法靠增量兩平':r.breakEven+' 人')+'</strong></p><p class="tiny muted">這是依輸入條件的估算，並非實際利潤或收款。</p>';}
function tasksView(){return '<h2>每一項工作，都要有人接得住</h2><p class="muted">先寫可驗收成果，再填負責人、截止與前置工作。日期可排序，依賴關係由你檢查。</p><div class="tablewrap"><table><thead><tr><th>交付成果</th><th>負責人</th><th>截止</th><th>前置條件</th><th>狀態</th><th></th></tr></thead><tbody>'+state.tasks.map((t,i)=>'<tr>'+['name','owner','due','depends'].map(k=>'<td><input aria-label="'+({name:'交付成果',owner:'負責人',due:'截止',depends:'前置條件'}[k])+' '+(i+1)+'" data-task="'+i+'" data-field="'+k+'" type="'+(k==='due'?'date':'text')+'" value="'+esc(t[k])+'"></td>').join('')+'<td><select aria-label="狀態 '+(i+1)+'" data-task="'+i+'" data-field="status">'+['未開始','進行中','待驗收','完成'].map(s=>'<option '+(s===t.status?'selected':'')+'>'+s+'</option>').join('')+'</select></td><td><button data-remove-task="'+i+'" aria-label="刪除任務 '+(i+1)+'">×</button></td></tr>').join('')+'</tbody></table></div><div class="actions"><button id="addtask">＋ 加入工作</button><button id="sorttask">按截止排序</button><button id="exporttasks">匯出 CSV</button></div><details><summary>拆解任務的例子</summary><div class="method"><strong>週五交付客戶提案</strong><p>拆成需求確認、架構確認、成本查核、初稿與驗收。不要只寫「做簡報」。每項成果都要能判斷是否完成。</p></div></details>';}
function reportView(){return '<div class="grid"><section><h2>讓對方知道要決定什麼</h2><p class="muted">先整理三件事，再組成可直接帶走的回報。</p>'+[['result','目前結果','已完成什麼？與原訂有什麼差距？'],['impact','影響與未知','會影響誰、何時？哪些還沒確認？'],['request','建議與需要的決定','推薦方案、取捨、誰應在何時決定？']].map(([id,l,p])=>'<label for="report-'+id+'">'+l+'</label><textarea id="report-'+id+'" placeholder="'+p+'">'+esc(state.drafts['report-'+id]||'')+'</textarea>').join('')+'<div class="actions"><button id="exportreport" class="primary">下載回報文字</button></div></section><section class="panel"><span class="label">SELF REVIEW / 不自動評分</span><h2>送出前，自己檢查</h2><div class="checklist">'+['第一句就看得懂現況。','事實附時間，未知沒有裝成確定。','建議在資源與權限內可執行。','對方知道要決定什麼、何時回覆。'].map(t=>'<label><input type="checkbox">'+t+'</label>').join('')+'</div><details><summary>看專業示範</summary><p>音響預計晚到 40 分鐘，14:00 彩排無法如期。建議先做走位，保留完整音檢；若 14:30 前仍未到貨，啟用已詢價的備援。請製作人 13:50 前確認是否授權備援費用 3,000 元。</p></details><details><summary>把回報擴成五頁提案</summary><ol><li>問題與證據：為何現在要處理。</li><li>目標與驗收：怎樣算成功。</li><li>方案比較：推薦什麼、犧牲什麼。</li><li>執行與費用：誰在何時交什麼。</li><li>決策：請誰核准哪些範圍。</li></ol><p>正式書面加上交付、修改與驗收條件；不要只留漂亮的簡報。</p></details></section></div>';}

function csv(v){let t=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';}function csvFile(name,rows){download(name,'﻿'+rows.map(r=>r.map(csv).join(',')).join('\r\n'),'text/csv;charset=utf-8');}
function bindBudget(){budgetResult();$('#exportbudgetxlsx').onclick=exportBudgetXlsx;['price','variable','people'].forEach(k=>$('#'+k).oninput=e=>{if(e.target.value===''||!e.target.checkValidity()){setSaveStatus('有無效或空白數字，該項修改未保存');$('#budgetresult').innerHTML='<p role="alert">請填入有效數字後查看結果。</p>';return;}const n=Number(e.target.value);if(!Number.isFinite(n)||n<0)return;state.budget[k]=n;save();budgetResult();});$$('[data-cost-name]').forEach(x=>x.oninput=()=>{state.budget.rows[Number(x.dataset.costName)][0]=x.value;save();});$$('[data-cost-value]').forEach(x=>x.oninput=()=>{if(x.value===''||!x.checkValidity()){setSaveStatus('有無效或空白數字，該項修改未保存');$('#budgetresult').innerHTML='<p role="alert">請填入有效數字後查看結果。</p>';return;}state.budget.rows[Number(x.dataset.costValue)][1]=Number(x.value);save();budgetResult();});$$('[data-remove-cost]').forEach(x=>x.onclick=()=>{state.budget.rows.splice(Number(x.dataset.removeCost),1);save();render();});$('#addcost').onclick=()=>{state.budget.rows.push(['',0]);save();render();};$('#exportbudget').onclick=()=>{if(!budgetInputsReady())return;const b=state.budget,r=calcBudget();csvFile('預算.csv',[['項目','金額或數量'],...b.rows,['每人售價',b.price],['每人變動成本',b.variable],['預估人數',b.people],['固定成本合計',r.fixed],['預估收入',r.revenue],['預估利潤',r.profit],['兩平人數',r.breakEven??'無法兩平']]);};}
function bindTasks(){$$('[data-task]').forEach(x=>x.oninput=()=>{state.tasks[Number(x.dataset.task)][x.dataset.field]=x.value;save();});$$('[data-remove-task]').forEach(x=>x.onclick=()=>{state.tasks.splice(Number(x.dataset.removeTask),1);save();render();});$('#addtask').onclick=()=>{state.tasks.push({name:'',owner:'',due:'',depends:'',status:'未開始'});save();render();};$('#sorttask').onclick=()=>{state.tasks.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));save();render();};$('#exporttasks').onclick=()=>csvFile('工作時程.csv',[['交付成果','負責人','截止','前置條件','狀態'],...state.tasks.map(t=>[t.name,t.owner,t.due,t.depends,t.status])]);}
function professionalView(type,html){const template=document.createElement('template');template.innerHTML=html;const root=template.content;const first=root.querySelector('h2');if(first)first.remove();root.querySelectorAll('section.panel').forEach(x=>{if(x.querySelector('.label')?.textContent.includes('SELF REVIEW'))x.remove();});root.querySelectorAll('details,.method,.label,.checklist').forEach(x=>x.remove());const intro=root.querySelector('p.muted');if(intro){const descriptions={budget:'金額為新臺幣。單一售價、成本線性；稅費與退費須自行列入成本。',tasks:'前置條件不會自動排程或檢查。',quotes:'金額為新臺幣。空白表示未確認；確定不收費才填 0。',minutes:'尚未核准的事項請填入待確認。'};if(descriptions[type])intro.textContent=descriptions[type];else intro.remove();}root.querySelectorAll('[placeholder]').forEach(x=>{if(!x.hasAttribute('type')||!['number','date'].includes(x.type))x.removeAttribute('placeholder');});if(type==='budget'){const p=document.createElement('p');p.className='tiny muted';p.textContent='Excel 含公式；CSV 僅含目前數值。';root.querySelector('#exportbudget').parentElement.after(p);}if(type==='report'){const grid=root.querySelector('.grid');grid.classList.add('report-editor');const preview=document.createElement('section');preview.className='panel';preview.innerHTML='<h2>報告預覽</h2><div id="report-preview" class="preserve"></div>';grid.appendChild(preview);root.querySelector('#exportreport').textContent='下載報告 TXT';}if(type==='quotes'){const need=root.querySelector('label[for="work-quote-need"]');if(need)need.textContent='需求與交付範圍';root.querySelector('label[for="work-quote-decision"]').textContent='建議與待確認事項';root.querySelectorAll('[data-key="name"]').forEach((x,i)=>{root.querySelector('label[for="'+x.id+'"]').textContent='廠商 '+(i+1)+' 名稱';});}if(type==='slides'){root.querySelectorAll('input[data-work]').forEach(x=>root.querySelector('label[for="'+x.id+'"]').textContent='頁面標題');root.querySelectorAll('textarea[data-work]').forEach(x=>root.querySelector('label[for="'+x.id+'"]').textContent='內容');const p=root.querySelector('p.tiny.muted');if(p)p.textContent='匯出 HTML 大綱，可列印；不是 PPTX。';}if(type==='minutes'){const oldTitle=root.querySelector('#work-meeting-title'),title=document.createElement('input');title.id=oldTitle.id;title.dataset.work=oldTitle.dataset.work;title.value=oldTitle.value;title.setAttribute('value',oldTitle.value);oldTitle.replaceWith(title);const action=root.querySelector('#work-meeting-action');action.setAttribute('placeholder','交付成果｜負責人｜截止時間｜驗收者');root.querySelector('label[for="work-meeting-title"]').textContent='會議名稱與日期';root.querySelector('#previewminutes')?.remove();const p=root.querySelector('p.tiny.muted');if(p)p.textContent='匯出 HTML，可列印或以 Word 開啟；不是 DOCX。';}return template.innerHTML;}
