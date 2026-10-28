# NEXUS M3.4 交付與 Work 有界複驗（開發者驗證）

候選3.8.0-rc.1；產品／工具Head c712bd62c7a77d812542d1138f2edd2ef0045f00。
PR https://github.com/lrqrll/practical-thinking-studio/pull/27
Base #26 / af4d6b6bb399ac8eef47a0856d8135754b8dc870；#26仍未合併。原#24/#25/#26不改，不把新功能視為正式發布。
正式main仍78e90aec61ca825d45534c93515df4d8f949a431，未合併／正式部署／auto-merge。

操作預覽 https://lrqrll.github.io/practical-thinking-studio-preview/m34/
namespace m34-visual；DB nexus-preview-m34-visual-workspace。原m33／m33-organize不變；不同路徑共用origin，資料命名空間不是權限隔離。

## 實際功能

日本傳統九色原碼與語意tokens、暖白／炭灰藍深色／系統模式；232px桌面側欄與收合、手機選單與鍵盤焦點；繼續工作首頁真實最近文件／最近更新工作台／原工具最近與最愛，所有資料與工具中心分開入口。工作台卡片、內容列表與分類管理沿用M3.3；九工具頁首、來源及保存狀態、DOM不重建的專注模式、手機文件格式收合及頁首操作換行。沒有重新製作工具或清空草稿。

DB2／layout schema1／v1-v4備份不變；僅既有settings.theme支援system值，交易合併保護未知屬性，quota失敗不套用假偏好。外觀仍是本瀏覽器偏好，不冒稱隨內容備份。卡片排序／隱藏持久配置未做（需先定義相容契約並獲批准），不放假入口。Excel取消／斜體入口撤下決定保留，預算與XLSX及舊italic資料格式保留。

## 最終原始證據

CI https://github.com/lrqrll/practical-thinking-studio/actions/runs/40658910604
Artifact https://github.com/lrqrll/practical-thinking-studio/actions/runs/40658910604/artifacts/12802169599
GitHub ZIP digest（非本機重算）：e53ab86a78f5a5df09d2e01ab6138e7ba032f4141c85e2d3f2b4eccc12b6b051。

44單元pass；全站140pass／5條件skip；原生文件選取15pass；真正HTTPS36pass，0fail／0retry。51公開資產逐bytes對應自己的Head；36取證索引、2748資源回應、30真下載完整性通過，錯誤集合0。完整HTML/JS/CSS/font原始bytes、下載檔及SHA、PNG與trace在artifact。

此目錄四張PNG為上述最終HTTPS run原始截圖，從原artifact直接複製，沒有改圖。manifest.json逐檔SHA-256及原路徑可重算；candidate-assets.json是原始公開資產manifest，m34-integrity.json是原始監測完整性結果。已檢視中文淺深畫面，沒有以textContent或axe代替視覺檢視。所有截圖只含合成資料。

另本機曾在390/1440逐一開啟九工具，18畫面皆無整頁overflow／pageerror；不是實機或正式HTTPS證明，不取代上列CI。

## 歷史失敗與修正，不寫成單輪全綠

- 本機初次4pass/1fail：設定可見名稱與ARIA不一致，已改一致。
- 本機137pass/3fail/5skip：版號、新側欄定位及hash導航未重載的測試契約更新，3案針對性通過；資料斷言保留。
- CI40656270375：139pass/1fail/5skip，主題背景transition瞬間對比4.18:1，已移除背景動畫，保留4.5:1標準；原主題操作有限重複6次通過。
- CI40657088901：M2來源fixture在main仍inert時fill第一筆名稱，原trace確認該值未進入欄位，產品正確拒絕缺值成果。helper等待原有ready條件並逐欄斷言；完整範本隔離3次通過。原trace在codex/nexus-m34-evidence分支，未混入產品PR。
- CI40657585034：全站與原生選取通過；HTTPS35pass/1timeout。新外觀案例doc-save後未等保存就reload，觸發正常beforeunload；改等待已保存與pending解除，不改產品保存機制／確認／timeout。
- 中間40658352044在候選已換成新SHA後由Visual preview SHA not ready gate拒絕；不是新增功能失敗，不用它代替最終結果。
- 最後c712bd6重新完整執行結果如上，沒有刪案例、弱化資料比較或忽略TLS。

## 可重跑／獨立複驗邊界

checkout完整c712bd6，npm ci --ignore-scripts；npm run test:unit；node scripts/qa/m33-legacy.cjs；NEXUS_CHROMIUM=/usr/bin/chromium npx playwright test。PDF解析需poppler；CI Ubuntu24.04／Node24、既有Chrome與固定CJK環境見.github/workflows/m34-visual.yml。HTTPS環境／namespace／source及逐資產綁定完整命令也在該workflow，不以本機檔案替換站點、不降低TLS，retries0。

請Work針對差異檢查：三主題偏好保存與quota拒絕、編輯中切主題／專注後DOM與格式／正文重開、桌面收合／手機選單鍵盤、首頁真實最近資料跳轉、M3.3加入／移動／解除、選取備份與完整v4副本還原、九工具代表匯出。開發者通過不是Work獨立操作通過。

M2-NAV-01完整獨立操作缺口、舊失敗與5個條件skip保留；真手機觸控、Safari/Firefox、完整讀屏、OS原生選檔及Office/Calc未測。沒有新已知P0/P1，未宣稱完全無缺陷或正式發布。本輪不合併、不部署正式站、不開後續里程碑。
