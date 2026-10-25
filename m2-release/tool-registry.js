'use strict';
const TOOL_CATEGORIES=Object.freeze(['專案','財務','文件','行政']);
const RETIRED_TOOLS=[{id:'asset',name:'舊版素材（已停用）'}];
function toolMeta(id){return WORK_TOOLS.find(t=>t.id===id)||RETIRED_TOOLS.find(t=>t.id===id);}
const WORK_TOOLS=[
{id:'document',name:'文件編輯器',group:'文件',desc:'編輯圖文、表格與正式文件。',icon:'<path d="M5 2h10l4 4v16H5zM14 2v5h5M8 11h8M8 15h8M8 19h5"/>'},
{id:'notes',name:'備忘錄',group:'行政',desc:'記錄文字、清單與圖片。',icon:'<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/>'},
{id:'tasks',name:'任務管理',group:'專案',desc:'安排任務、負責人與期限。',icon:'<path d="M9 6h11M9 12h11M9 18h11M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/>'},
{id:'budget',name:'預算試算',group:'財務',desc:'計算成本、利潤與兩平人數。',icon:'<rect x="5" y="2" width="14" height="20" rx="1"/><path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2"/>'},
{id:'quotes',name:'報價比較',group:'財務',desc:'比較費用、範圍與交期。',icon:'<path d="M5 3h5v18H5zM14 3h5v18h-5zM7 7h1m-1 4h1m-1 4h1m8-8h1m-1 4h1m-1 4h1"/>'},
{id:'slides',name:'簡報大綱',group:'文件',desc:'整理提案結論與支持證據。',icon:'<path d="M3 4h18v13H3zM12 17v5m-4 0 4-5 4 5M7 9h10M7 13h6"/>'},
{id:'report',name:'工作報告',group:'行政',desc:'說清現況、影響與所需決策。',icon:'<path d="M4 3h16v14H9l-5 4zM8 7h8M8 11h6"/>'},
{id:'minutes',name:'會議紀錄',group:'行政',desc:'留下決議、待確認與行動。',icon:'<path d="M8 3H4v19h16V3h-4M8 2h8v4H8zM8 11h8M8 15h8M8 19h5"/>'}];
