# Harmony — 專案完整技術文件

> 最後更新：2026-09-10（v0.1.0）
> 目的：讓新 Agent 不需掃描原始碼即可完全掌握此專案

---

## 目錄

1. [專案概述](#1-專案概述)
2. [技術架構](#2-技術架構)
3. [專案結構](#3-專案結構)
4. [設定與 Token 系統](#4-設定與-token-系統)
5. [資料庫 Schema](#5-資料庫-schema)
6. [認證流程](#6-認證流程)
7. [核心模組](#7-核心模組)
8. [聊天室與機器人模擬](#8-聊天室與機器人模擬)
9. [AI 協助面板](#9-ai-協助面板)
10. [多國語系 i18n](#10-多國語系-i18n)
11. [CSS 設計系統](#11-css-設計系統)
12. [部署與運維](#12-部署與運維)
13. [開發者指南](#13-開發者指南)

---

## 1. 專案概述

| 項目 | 內容 |
|------|------|
| 專案名稱 | Harmony - AIEduChat 自然語言機械手臂控制平台 |
| 版本 | v0.1.0 (測試版 MVP) |
| 目標 | 讓學生透過自然語言控制模擬機械手臂，學習機器人指令設計 |
| 技術棧 | HTML/CSS/JS (Vanilla, 無框架) + Supabase + Azure OpenAI / GitHub Models |
| 部署方式 | Vercel (自動部署) |
| 使用者 | 學生、教師、管理員 |
| 核心特色 | 模擬視覺偵測、LLM 指令解析、文字日誌輸出 |

### 核心功能

- **三大核心模組**：
  - 模組一：視覺與座標轉換器 (Mock Vision + Pixel-to-World Mapping)
  - 模組二：指令解析器 (LLM 自然語言 → 標準動作序列)
  - 模組三：模擬日誌記錄器 (Dummy Logger → 文字檔輸出)
- **聊天室介面**：即時訊息、工作階段管理、圖片上傳
- **AI 協助面板**：四種模式 (指令設計師、任務規劃師、座標除錯器、代碼生成器)
- **完整認證系統**：Email/Password、訪客登入、角色導向 UI
- **多國語系**：English、繁體中文、简体中文

---

## 2. 技術架構

### 前端
- **無框架**：純 HTML5 + CSS3 + Vanilla JavaScript
- **單頁面應用**：`index.html` 透過 `showPage()` / `switchView()` 切換視圖
- **響應式設計**：支援手機 (max-width: 768px，側欄改為抽屜式)
- **CSS 變數設計系統**：Robotics 主題色系，支援深色模式

### 後端 (Supabase)
- **PostgreSQL**：完整關聯式資料庫
- **Auth**：Email/Password + 匿名登入
- **Realtime**：messages、robot_objects 表即時訂閱
- **Storage**：robot-images bucket 儲存測試圖片
- **Edge Functions** (Deno)：
  - `ai-proxy`：AI API 代理 (JWT 驗證 + API Key 伺服器端管理)
  - `robot-commands`：模擬指令記錄 (可選)

### AI 整合
- **主要**：Azure OpenAI (GPT-5.4-mini / DeepSeek-V4-Flash)
- **備援**：GitHub Models (GPT-4o, 免費額度 50 req/day)
- **架構**：前端 → Edge Function (ai-proxy) → Azure/GitHub
- **API Key**：僅存在 Supabase Secrets，前端永不暴露

### 部署
- **Vercel 自動部署**：push 到 main 分支自動觸發
- **快取破壞**：CSS/JS 檔名以 `?v=YYYYMMDDx` 控管版本

---

## 3. 專案結構

```
Harmony/
│
├── index.html                     # 單一入口頁面 (所有 UI)
├── .nojekyll                      # GitHub Pages 相容
├── .gitignore
├── projectdocument.md             # 本文件
│
├── js/
│   ├── config.js                  # Supabase URL/Key、AI 端點、視覺校準參數
│   ├── config.local.js            # 本機 GitHub Token 覆蓋 (.gitignore 已排除)
│   ├── app.js                     # Core：auth、sessions、chat、共用狀態
│   ├── i18n.js                    # 翻譯引擎 (init/t/setLanguage/renderDOM)
│   ├── db.js                      # Supabase 存取包裝
│   ├── render.js                  # 訊息渲染 (Markdown、機器人指令、日誌)
│   ├── ai-transport.js            # AI 傳輸層 (callAiViaProxy / callGithubAi)
│   ├── robot-vision.js            # 模組一：視覺與座標轉換器
│   ├── robot-parser.js            # 模組二：指令解析器
│   ├── robot-logger.js            # 模組三：模擬日誌記錄器
│   ├── robot-simulator.js         # 整合協調器
│   └── locales/
│       ├── en.js
│       ├── zh-TW.js
│       └── zh-CN.js
│
├── styles/
│   ├── main.css                   # 核心樣式、CSS 變數、通用元件
│   └── harmony-theme.css          # 機器人主題專用樣式
│
├── supabase/
│   ├── schema.sql                 # 完整 DDL + RLS + Trigger + Functions
│   ├── config.toml                # Supabase CLI 設定
│   └── functions/
│       ├── _shared/
│       │   ├── cors.ts
│       │   ├── auth.ts
│       │   └── rate-limit.ts
│       ├── ai-proxy/
│       │   └── index.ts           # Edge Function：AI API 代理
│       └── robot-commands/
│           └── index.ts           # Edge Function：機器人指令記錄
│
└── backups/                       # 版本備份 (gitignored)
    └── harmony-v0.1_20260910/
```

### 載入順序 (index.html)

```html
<!-- 外部 SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://unpkg.com/lucide@0.469.0"></script>
<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>

<!-- 設定檔 -->
<script src="js/config.js"></script>
<script src="js/config.local.js" onerror="..."></script>

<!-- i18n -->
<script src="js/locales/en.js"></script>
<script src="js/locales/zh-TW.js"></script>
<script src="js/locales/zh-CN.js"></script>
<script src="js/i18n.js"></script>

<!-- 核心函式庫 -->
<script src="js/db.js"></script>
<script src="js/render.js"></script>
<script src="js/ai-transport.js"></script>

<!-- 機器人模組 -->
<script src="js/robot-vision.js"></script>
<script src="js/robot-parser.js"></script>
<script src="js/robot-logger.js"></script>
<script src="js/robot-simulator.js"></script>

<!-- 主程式 (最後) -->
<script src="js/app.js"></script>

<!-- Inline init -->
<script> ... </script>
```

---

## 4. 設定與 Token 系統

### 設定檔階層

| 層級 | 檔案 | 用途 | 是否上傳 |
|------|------|------|----------|
| 1 | `js/config.js` | Supabase URL/Key、AI 端點、視覺校準 | ✅ 上傳 |
| 2 | `js/config.local.js` | 本機 GitHub Token | ❌ .gitignore |
| 3 | `localStorage` | `harmony_github_token` 鍵 | ❌ 使用者瀏覽器 |
| 4 | Supabase Secrets | `AZURE_OPENAI_API_KEY`、`GITHUB_TOKEN` | ❌ 伺服器端 |

### 重要設定值 (config.js)

```javascript
// Supabase
SUPABASE_URL = 'https://your-project.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOi...'

// AI
AI_CONFIG_DEFAULTS = {
  provider: 'azure',
  azureModel: 'gpt-5.4-mini',
  githubModel: 'gpt-4o',
  temperature: 0.3,
  maxTokens: 2000,
  systemPrompt: '機械手臂指令解析器系統提示詞...'
}

// 視覺校準
ROBOT_VISION_CONFIG = {
  imageWidth: 640,
  imageHeight: 480,
  pixelToMeter: 0.005,      // 1px = 0.5cm
  fixedZHeight: 0.05,       // 固定 Z = 5cm
  mockObjects: { ... }      // 測試用預設物件位置
}
```

### GitHub Token 取得優先順序

```javascript
getGithubToken() {
  1. window.LOCAL_GITHUB_TOKEN (config.local.js)
  2. localStorage.getItem('harmony_github_token')
  3. 回傳空字串 (fallback 時會報錯)
}
```

---

## 5. 資料庫 Schema

### 5.1 `profiles` — 使用者設定檔
| 欄位 | 型態 | 說明 |
|------|------|------|
| id | UUID | PK → auth.users(id) CASCADE |
| display_name | TEXT | 顯示名稱 |
| role | TEXT | student/teacher/admin |
| avatar_url | TEXT | 大頭照網址 |
| created_at | TIMESTAMPTZ | 建立時間 |

### 5.2 `robot_sessions` — 工作階段
| 欄位 | 型態 | 說明 |
|------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → profiles |
| name | TEXT | 階段名稱 |
| description | TEXT | 說明 |
| image_url | TEXT | 測試圖片網址 |
| image_width/height | INTEGER | 影像尺寸 |
| status | TEXT | idle/detecting/detected/parsing/running/completed/error |
| calibration | JSONB | 校準參數 |
| created_at | TIMESTAMPTZ | 建立時間 |

### 5.3 `robot_objects` — 偵測物件
| 欄位 | 型態 | 說明 |
|------|------|------|
| id | UUID | PK |
| session_id | UUID | FK → robot_sessions CASCADE |
| name | TEXT | 物件名稱 |
| pixel_u, pixel_v | INTEGER | 像素座標中心點 |
| world_x, world_y, world_z | NUMERIC(10,6) | 世界座標 (公尺) |
| confidence | NUMERIC(4,3) | 信心度 |
| color | TEXT | 標記顏色 |
| bbox_* | INTEGER | 邊界框 |

### 5.4 `messages` — 聊天訊息 + 機器人日誌
| 欄位 | 型態 | 說明 |
|------|------|------|
| id | BIGINT | PK IDENTITY |
| session_id | UUID | FK → robot_sessions CASCADE |
| user_id | UUID | FK → profiles CASCADE |
| content | TEXT | 訊息內容 |
| message_type | TEXT | text/robot_command/robot_log/robot_result/system |
| metadata | JSONB | 額外資料 (actions, downloadUrl 等) |
| created_at | TIMESTAMPTZ | 時間 |

### 5.5 `simulation_logs` — 完整模擬記錄
| 欄位 | 型態 | 說明 |
|------|------|------|
| id | UUID | PK |
| session_id | UUID | FK |
| log_content | TEXT | 完整文字日誌 |
| actions | JSONB | 動作序列 |
| detected_objects | JSONB | 偵測物件快照 |
| duration_seconds | NUMERIC | 執行時間 |

### 5.6 `system_settings` — 全站設定
| 欄位 | 說明 |
|------|------|
| key/value | ai_provider, ai_model, allow_signup 等 |

### Realtime 出版表
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.robot_objects;
```

---

## 6. 認證流程

### 支援方式
| 方式 | 實作 |
|------|------|
| Email/Password | `signInWithPassword` / `signUp` |
| 匿名訪客 | `signInAnonymously()` |
| 訪客續用 | 偵測 `is_anonymous` + `Guest#` prefix |

### 角色導向 UI
| 角色 | 導覽列分頁 |
|------|------------|
| Admin | Chat / Admin / Teacher |
| Teacher | Chat / Teacher |
| Student | Chat only |

### 重要邊界情況
- **訪客名稱**：格式 `{自訂名稱}_Guest#XXXXXX`，prefix 硬編碼避免 i18n 影響邏輯
- **自行註冊開關**：`system_settings.allow_signup` (anon 可讀)，Admin Panel 控制
- **登出**：清除狀態 + 取消所有 realtime subscription

---

## 7. 核心模組

### 7.1 模組一：視覺與座標轉換器 (`robot-vision.js`)

**主要函數**：
```javascript
// 處理上傳圖片
await robotVision.processImage(file)
// 回傳 { width, height, dataUrl }

// 模擬物件偵測
const detections = await robotVision.detectObjects(targetNames)
// 回傳 [{ name, pixel:[u,v], world:[x,y,z], confidence, color, bbox }, ...]

// 像素轉世界座標
const [x, y, z] = robotVision.pixelToWorld(u, v)
// 公式：x = (u - cx) * 0.005, y = (cy - v) * 0.005, z = 0.05

// 取得標記後圖片
const annotatedUrl = robotVision.getAnnotatedImage(detections)
```

**校準參數** (config.js)：
- 影像尺寸：640×480 (中心點 320, 240)
- 1 pixel = 0.005 m (0.5 cm)
- 固定 Z = 0.05 m (桌面高度)
- 模擬物件：預設 6 個 (蘋果、紅色積木、藍色盒子/籃子、綠色球、黃色立方體)

### 7.2 模組二：指令解析器 (`robot-parser.js`)

**核心流程**：
```javascript
const actions = await robotParser.parseCommand(naturalLanguage, detectedObjects, sessionContext)
// 1. 呼叫 aiTransport.parseRobotCommand (LLM)
// 2. 解析 JSON 回應
// 3. 後處理：補充 detect、確保 reset_home
// 4. 驗證參數完整性
```

**標準動作庫**：
| 動作 | 參數 | 說明 |
|------|------|------|
| `detect` | `{target_name}` | 視覺偵測，回傳座標 |
| `pick` | `{x, y, z}` | 移動至座標並夾取 |
| `place` | `{x, y, z}` | 移動至座標並放置 |
| `reset_home` | `{}` | 回到安全位置 |

**LLM Prompt 關鍵點**：
- 輸出 JSON 陣列
- pick/place 初始座標為 0，系統自動填入實際偵測座標
- 溫度設為 0.1 (低隨機性)

### 7.3 模組三：模擬日誌記錄器 (`robot-logger.js`)

**輸出格式範例**：
```
========================================
Harmony Robot Arm Simulation Log
Session ID: uuid
Start Time: 2026-09-10T10:30:00.000Z
========================================

[DETECTED OBJECTS]
  蘋果:
    Pixel: [400, 300]
    World: [0.4000, -0.3000, 0.0500]
    Confidence: 95.0%

[EXECUTION SEQUENCE]
步驟 1: 視覺辨識 '蘋果' 成功，座標為 X:0.4000, Y:-0.3000, Z:0.0500 (耗時 0.82s)
步驟 2: 執行 pick 動作，目標位置 -> [0.4000, -0.3000, 0.0500] (耗時 1.52s)
步驟 3: 執行 place 動作，目標位置 -> [-0.2000, 0.4000, 0.0500] (耗時 1.48s)
步驟 4: 執行 reset_home 動作，機械手臂復位 (耗時 1.01s)

========================================
End Time: 2026-09-10T10:30:05.830Z
Total Duration: 5.83s
Status: COMPLETED
========================================
```

**功能**：
- 模擬執行延遲 (detect: 800ms, pick/place: 1500ms, reset: 1000ms)
- 產生文字檔供下載 (`robot_command_log_{sessionId}_{timestamp}.txt`)
- 同步存入 `simulation_logs` 表
- 可解析日誌生成 Python 代碼 (給 AI Assist 代碼生成器)

### 7.4 整合協調器 (`robot-simulator.js`)

**狀態管理**：
```javascript
state = {
  currentSessionId, currentSession,
  detectedObjects: [],
  parsedActions: [],
  isRunning: false,
  simulationLog: [],
  annotatedImageUrl: null
}
```

**主要 API**：
- `initSession(sessionData)` - 初始化
- `runVision(targetNames?)` - 執行視覺偵測
- `parseCommand(naturalLanguage)` - 解析指令
- `runSimulation()` - 執行完整模擬
- `exportResults(format)` - 匯出 json/txt/python

---

## 8. 聊天室與機器人模擬

### UI 佈局
```
┌─────────────────────────────────────────────────────────────┐
│ Topbar: Harmony | 用戶 | 語言 | 選單 | Chat/Admin/Teacher   │
├──────────────┬──────────────────────────────────────────────┤
│ Sessions     │ Chat Area                                    │
│ ──────────   │ ─────────                                    │
│ 📷 Session 1 │ [User] 夾起紅色積木放到藍色盒子             │
│    Active    │ [AI] 解析為 4 步驟...                       │
│ 📷 Session 2 │ [Robot Log] 步驟 1: 偵測 紅色積木...        │
│    Completed │ [Robot Log] 步驟 2: Pick...                 │
│ + New        │ [Download Log]                               │
│              │                                              │
│ [Upload Img] │ [輸入框] [📷] [🤖] [發送]                    │
└──────────────┴──────────────────────────────────────────────┘
```

### 工作階段流程
1. **建立**：上傳測試圖片 → 儲存到 Storage → 建立 `robot_sessions` 記錄
2. **偵測**：點擊/自動執行 `robotVision.detectObjects()` → 儲存到 `robot_objects` → 顯示標記圖
3. **指令**：使用者輸入自然語言 → `robotParser.parseCommand()` → 顯示動作序列
4. **模擬**：`robotLogger.executeSimulation()` → 即時顯示日誌 → 下載文字檔
5. **協作**：Realtime 同步訊息與物件偵測結果

### 訊息類型
| 類型 | 樣式 | 用途 |
|------|------|------|
| `text` | 一般氣泡 | 一般聊天 |
| `robot_command` | 藍色資訊框 | 解析後的動作序列 + 執行按鈕 |
| `robot_log` | 終端機風格 | 模擬執行日誌 (等寬字體、語法高亮) |
| `robot_result` | 綠色成功框 | 模擬完成摘要 |
| `system` | 黃色通知 | 系統提示 (偵測完成、錯誤等) |

---

## 9. AI 協助面板

右側抽屜式面板，四種模式：

| 模式 | 圖示 | 系統提示詞重點 |
|------|------|----------------|
| 指令設計師 | ✏️ | 協助優化自然語言，使用標準動作詞彙 |
| 任務規劃師 | 📋 | 分解複雜任務為可執行步驟序列 |
| 座標除錯器 | 🐛 | 解釋 pixel→world 轉換、校準參數 |
| 代碼生成器 | 💻 | 從模擬日誌生成 Python/ROS 代碼 |

**使用方式**：
1. 點擊頂部 🤖 按鈕開啟面板
2. 選擇模式分頁
3. 輸入問題，AI 根據當前工作階段上下文回應
4. 代碼生成器模式會自動讀取當前模擬日誌

---

## 10. 多國語系 i18n

### 架構
- `js/i18n.js`：核心引擎 (70 行)
- `js/locales/*.js`：語系資料 (全域變數 `LOCALE_EN/ZH_TW/ZH_CN`)
- 三層支援：English / 繁體中文 / 简体中文

### 使用方式
```html
<!-- 靜態文字 -->
<span data-i18n="chat.placeholder">輸入訊息...</span>

<!-- Placeholder -->
<input data-i18n-placeholder="auth.login.email">

<!-- JS 動態 -->
t('robot.vision.calibration')  // "校準: 1px = 0.5cm, Z=0.05m"
t('notification.sessionCreated', sessionName)  // 參數取代
```

### 語言切換事件
```javascript
window.addEventListener('languagechange', (e) => {
  // 重新渲染動態內容
  loadSessions();
  loadMessages();
});
```

---

## 11. CSS 設計系統

### Robotics 主題色系 (CSS Variables)
```css
:root {
  --robot-primary: #0066cc;      /* 工業藍 - 主要動作 */
  --robot-secondary: #00a86b;    /* 安全綠 - 成功狀態 */
  --robot-accent: #ff6b00;       /* 警示橙 - 重點強調 */
  --robot-dark: #1a1f2e;         /* 深海軍藍 - 終端機背景 */
  --robot-surface: #ffffff;
  --robot-bg: #f0f4f8;
  --coord-x: #ff6b00;            /* X 軸座標色 */
  --coord-y: #00a86b;            /* Y 軸座標色 */
  --coord-z: #0066cc;            /* Z 軸座標色 */
  --terminal-bg: #0d1117;        /* 終端機背景 */
  --terminal-green: #3fb950;     /* 終端機綠 */
}
```

### 字體
- **UI**：Noto Sans TC (中文) + 系統字體
- **代碼/座標/日誌**：JetBrains Mono (等寬)

### 關鍵元件
| 元件 | Class | 特色 |
|------|-------|------|
| 終端機日誌 | `.simulation-log` | 深色背景、等寬字體、語法高亮 |
| 座標顯示 | `.coord-panel` | 三欄網格、軸向配色 |
| 物件卡片 | `.object-card` | 色點標記、座標顯示 |
| 模擬狀態 | `.sim-status` | 狀態點 + 文字、動態顏色 |
| 上傳區 | `.upload-area` | 虛線邊框、拖拽高亮 |

---

## 12. 部署與運維

### Vercel 部署
1. 連接 GitHub Repository
2. 設定環境變數 (不需要，前端無密鑰)
3. 自動偵測靜態網站，輸出目錄 `/`
4. Push 到 main 即自動部署

### Supabase 設定
1. **Database**：執行 `supabase/schema.sql`
2. **Storage**：建立 `robot-images` bucket，設定公開讀取
3. **Edge Functions**：
   ```bash
   supabase link --project-ref <ref>
   supabase functions deploy ai-proxy robot-commands
   supabase secrets set AZURE_OPENAI_ENDPOINT=... AZURE_OPENAI_API_KEY=... AZURE_OPENAI_DEPLOYMENT=gpt-5.4-mini GITHUB_TOKEN=ghp_xxx
   ```
4. **Auth**：啟用 Email/Password + Anonymous sign-in

### 快取破壞規則
- CSS/JS 版本：`?v=YYYYMMDDx` (如 `?v=20260910a`)
- 同日多次修改：`a` → `b` → `c`...

### 常見問題排查
| 問題 | 原因 | 解決 |
|------|------|------|
| AI 回應 401 | Azure API Key 過期 | 更新 Supabase Secrets |
| GitHub Models 429 | 免費額度用盡 | 等待或切換 Azure |
| Realtime 不更新 | RLS 政策阻擋 | 檢查 policies |
| 圖片不顯示 | Storage policy | 確認 bucket public 或 policy 正確 |

---

## 13. 開發者指南

### 本機開發
```bash
# 1. 複製專案
cd Harmony

# 2. 使用 Live Server (VS Code) 或任何靜態伺服器
# 3. 複製 js/config.local.js.example 為 js/config.local.js
# 4. 填入 LOCAL_GITHUB_TOKEN (可選)
```

### 新增功能檢查清單
- [ ] 更新 `projectdocument.md` 對應章節
- [ ] 新增 i18n 翻譯鍵 (三語系)
- [ ] 遵循 CSS 變數設計系統
- [ ] 新增/修改資料表需同步 schema.sql + RLS
- [ ] Edge Function 修改後需重新部署
- [ ] 修改前端檔案需更新 cache-bust 版本號

### 除錯技巧
- 開啟 `DEBUG_ENABLED = true` (config.js) 顯示詳細日誌
- 瀏覽器 Console 查看 `robotSimulator.state` 完整狀態
- Supabase Dashboard > Logs 查看 Edge Function 執行記錄

### 擴充建議
1. **真實視覺模型**：整合 ONNX.js 執行 YOLOv8 推論
2. **3D 視覺化**：Three.js 渲染機械手臂模擬畫面
3. **ROS 2 整合**：WebSocket bridge 連接真實/模擬 ROS
4. **課程模式**：預設任務、評分系統、進度追蹤
5. **多人協作**：共享工作階段、即時共同編輯指令

---

## 版本歷程

| 版本 | 日期 | 主要變更 |
|------|------|----------|
| v0.1.0 | 2026-09-10 | 初始版本：三大模組、聊天室、AI 面板、完整認證 |

---

## 重要連結

| 資源 | 網址 |
|------|------|
| GitHub Repository | (待建立) |
| Vercel Deployment | (待部署) |
| Supabase Dashboard | (待建立專案) |
| Azure OpenAI Portal | https://oai.azure.com |

---

*本文件隨專案演進持續更新，請於每次重大變更後同步修改。*