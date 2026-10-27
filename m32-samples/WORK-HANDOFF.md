Work 有界複驗：NEXUS M3.2 候選3.6.0-rc.1，尚未合併／正式部署。

請核對PR20 PDF與PR21 UX各自完整head及base（PR正文），整合站 https://lrqrll.github.io/practical-thinking-studio-preview/m32/ ，namespace=m32-integrated，DB=nexus-preview-m32-integrated-workspace；原m31/的2eee4dc候選及正式main M78e90aec保持不變。依賴是程式相依，不是授權依序合併；main更新會自動觸發Pages，未取得發布批准不得合併。

建議限於以下操作：
1. 下載公開合成fixture（PR中的m32-samples連結），在新context開整合站「備份與還原」匯入獨立副本。沒有真實私人資料；fixture保留來源、關聯、歷史、圖片、M2欄位／範本與舊快照。僅將原fixture的QA專用未知欄位屬性移除，以構成可組裝的已知結構副本；原始fixture不改。
2. 在合成工作台「組裝成果」，選schema2固定成果的報價表／自訂欄位，再選備忘文字。勾選即加入，不預設全選；用鍵盤上下移動，檢視所選來源。圖片明確確認不納入（來源保留），建立前不應產生文件。
3. 建立後確認工作空間／根目錄保存位置。按「下載PDF」會先開普通可編輯文件、flush保存、取得指定fileId/rev深拷貝，再真正下載PDF；檢查九欄、中文、頁碼，文字可選取搜尋、字型內嵌。PDF是文字／向量，不是整頁圖片或列印對話框。A4直／橫另有UI選項。
4. 新增文字並保存、離開、重開。保留DOCX／HTML；來源／固定快照不變。PDF生成時繼續編輯，不應混入此次固定版本；失敗（缺字、字型503、quota）、取消與重試詳新專項原始trace，負控制獨立標籤，不能當產品故障或獨立QA通過。
5. 組裝設定中修改來源，再建立應拒絕舊rev；重新讀取只比較，需另確認才套用；名稱／排序保留，失效區塊不會默默移除。取消比較保留原選擇。390px主操作不水平溢出；紙張預覽保留獨立捲動。

下載／渲染材料：公開樣本提供真PDF、逐頁PNG、原始文字、完整保存模型文字對照、來源不變結果、實際輸出SHA256、環境、監測index和實際response bytes。CI artifact另包含單頁、65列九欄六頁、freeze、retry、DOCX／HTML、還原、所有context/page原始bytes及下載雜湊。重跑命令見PR／docs/M32-PDF.md與docs/M32-ASSEMBLY-UX.md；retries=0、TLS驗證開啟、隔離合成資料。PDF文字比較只去除生成頁碼及排版空白，對整份保存documentText逐字核對，原raw/layout均保留；沒有刪除內容斷言。

界線：以上均為開發者驗證，請勿改稱Work已獨立重演。M2-NAV-01完整獨立操作缺口保留；不是目前已證實未修的產品P1或無限期阻擋。未測Safari／Firefox、真手機觸控、完整讀屏、OS原生選檔、Office／Calc。PDF首版只A4、15萬字元／12欄規則表格；圖片、合併儲存格、italic、指定其他字型及未知格式會明確拒絕，原格式仍在，DOCX／HTML／既有列印相容不變。原36+1、補驗1、舊41與環境失敗紀錄保留。沒有開M3.3／AI／同步，不恢復Excel或斜體入口，不碰真實資料。
