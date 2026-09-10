# Harmony - AIEduChat 自然語言機械手臂控制平台

🚀 **測試版 MVP** - 讓學生透過自然語言控制模擬機械手臂，學習機器人指令設計與座標轉換。

## ✨ 核心特色

### 三大核心模組
| 模組 | 功能 | 技術實現 |
|------|------|----------|
| **視覺與座標轉換器** | 上傳測試圖片 → 模擬 YOLO 偵測 → 像素轉世界座標 | Canvas + 校準參數映射 |
| **指令解析器** | 自然語言 → LLM → 標準動作序列 (JSON) | Azure OpenAI / GitHub Models via Edge Function |
| **模擬日誌記錄器** | 動作序列 → 模擬執行 → 文字日誌檔輸出 | 模擬延遲 + 檔案下載 |

### 介面功能
- 💬 **聊天室風格介面** - 即時訊息、工作階段管理
- 📷 **圖片上傳與視覺標記** - 拖拽上傳、偵測結果視覺化
- 🤖 **AI 協助面板** - 四種模式：指令設計師、任務規劃師、座標除錯器、代碼生成器
- 📥 **日誌下載** - 一鍵下載 `robot_command_log_*.txt`
- 🌍 **多國語系** - English / 繁體中文 / 简体中文
- 🔐 **完整認證** - Email/Password、訪客登入、角色導向 UI

## 🏗️ 技術架構

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser   │────▶│   Supabase   │────▶│  Azure OpenAI   │
│  (Vanilla   │     │  (Auth, DB,  │     │  / GitHub Models│
│   JS/CSS)   │     │  Realtime,   │     │                 │
│             │     │  Storage,    │     │  (API Keys in   │
│             │     │  Edge Fn)    │     │   Secrets)      │
└─────────────┘     └──────────────┘     └─────────────────┘
```

- **前端**：HTML/CSS/JS (無框架，單一 HTML 入口)
- **後端**：Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **AI**：Supabase Edge Function `ai-proxy` 代理呼叫 (保護 API Key)
- **部署**：Vercel 自動部署

## 🚀 快速開始

### 前置需求
- Node.js 18+ (用於 Supabase CLI)
- Supabase 專案
- Azure OpenAI 資源 (或 GitHub Personal Access Token)

### 1. 複製專案
```bash
git clone <your-repo-url>
cd Harmony
```

### 2. 設定 Supabase
```bash
# 安裝 Supabase CLI
npm install -g supabase

# 連結專案
supabase link --project-ref <your-project-ref>

# 推送資料庫結構
supabase db push

# 或手動在 SQL Editor 執行 supabase/schema.sql
```

### 3. 部署 Edge Functions
```bash
# 設定 Secrets (在 Supabase Dashboard 或 CLI)
supabase secrets set AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
supabase secrets set AZURE_OPENAI_API_KEY=your-key
supabase secrets set AZURE_OPENAI_DEPLOYMENT=gpt-5.4-mini
supabase secrets set GITHUB_TOKEN=ghp_xxxxxxxxxxxx  # 選填，備援用

# 部署
supabase functions deploy ai-proxy
supabase functions deploy robot-commands
```

### 4. 設定前端配置
編輯 `js/config.js`：
```javascript
window.SUPABASE_URL = 'https://your-project.supabase.co';
window.SUPABASE_ANON_KEY = 'your-anon-key';
```

### 5. 本機測試
使用 VS Code Live Server 或任何靜態伺服器開啟 `index.html`

### 6. 部署到 Vercel
1. 將專案推送到 GitHub
2. 在 Vercel 匯入 Repository
3. 自動偵測為靜態網站，無需額外設定
4. Push 到 main 即自動部署

## 📁 專案結構

```
Harmony/
├── index.html                 # 單一入口頁面
├── js/
│   ├── config.js              # 公開設定
│   ├── config.local.js        # 本機 Token (gitignored)
│   ├── app.js                 # 核心邏輯
│   ├── i18n.js                # 翻譯引擎
│   ├── db.js                  # Supabase 封裝
│   ├── render.js              # 訊息渲染
│   ├── ai-transport.js        # AI 呼叫層
│   ├── robot-vision.js        # 模組一：視覺座標
│   ├── robot-parser.js        # 模組二：指令解析
│   ├── robot-logger.js        # 模組三：日誌記錄
│   ├── robot-simulator.js     # 整合協調器
│   └── locales/               # 語系檔
├── styles/
│   ├── main.css               # 核心樣式
│   └── harmony-theme.css      # 機器人主題
├── supabase/
│   ├── schema.sql             # 資料庫結構
│   └── functions/             # Edge Functions
└── projectdocument.md         # 完整技術文件
```

## 🎮 使用流程

1. **登入/註冊** - 或使用訪客模式
2. **建立工作階段** - 點擊側邊欄 `+ New`，上傳桌面測試圖片
3. **視覺偵測** - 系統自動/手動執行偵測，顯示物件座標
4. **輸入指令** - 在聊天室輸入自然語言，如：「夾起紅色積木放到藍色盒子」
5. **AI 解析** - 顯示標準動作序列 (detect → pick → place → reset_home)
6. **執行模擬** - 查看即時終端機風格日誌
7. **下載日誌** - 取得 `robot_command_log_*.txt` 文字檔

## 🤖 AI 協助面板模式

| 模式 | 用途 | 範例提問 |
|------|------|----------|
| **指令設計師** | 優化自然語言指令 | 「如何描述才能精確夾取特定物件？」 |
| **任務規劃師** | 分解複雜任務 | 「我要把所有積木分顏色分類，怎麼規劃步驟？」 |
| **座標除錯器** | 解釋座標轉換 | 「為什麼 Y 軸是負數？校準參數如何調整？」 |
| **代碼生成器** | 匯出 Python/ROS | 「生成這個模擬的 Python 代碼」 |

## 📝 輸出日誌格式

```
========================================
Harmony Robot Arm Simulation Log
Session ID: 550e8400-e29b-41d4-a716-446655440000
Start Time: 2026-09-10T10:30:00.000Z
========================================

[DETECTED OBJECTS]
  紅色積木:
    Pixel: [400, 300]
    World: [0.4000, -0.3000, 0.0500]
    Confidence: 95.0%

[EXECUTION SEQUENCE]
步驟 1: 視覺辨識 '紅色積木' 成功，座標為 X:0.4000, Y:-0.3000, Z:0.0500 (耗時 0.82s)
步驟 2: 執行 pick 動作，目標位置 -> [0.4000, -0.3000, 0.0500] (耗時 1.52s)
步驟 3: 執行 place 動作，目標位置 -> [-0.2000, 0.4000, 0.0500] (耗時 1.48s)
步驟 4: 執行 reset_home 動作，機械手臂復位 (耗時 1.01s)

========================================
End Time: 2026-09-10T10:30:05.830Z
Total Duration: 5.83s
Status: COMPLETED
========================================
```

## 🔧 環境變數

| 變數 | 說明 | 必填 |
|------|------|------|
| `SUPABASE_URL` | Supabase 專案網址 | ✅ |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI 端點 | ✅ (主要) |
| `AZURE_OPENAI_API_KEY` | Azure API Key | ✅ (主要) |
| `AZURE_OPENAI_DEPLOYMENT` | 模型部署名稱 | ✅ (主要) |
| `GITHUB_TOKEN` | GitHub PAT (ghp_...) | ❌ (備援) |
| `LOCAL_GITHUB_TOKEN` | 本機開發用 Token | ❌ (本機) |

## 📚 文件

- [完整技術文件](projectdocument.md) - 架構、資料庫、模組、部署完整說明
- [Supabase Schema](supabase/schema.sql) - 資料庫 DDL + RLS + Triggers

## 🛠️ 開發指南

### 新增語系
1. 複製 `js/locales/en.js` 為 `js/locales/xx.js`
2. 翻譯所有鍵值
3. 在 `index.html` 加入 `<script src="js/locales/xx.js">`
4. 在 `i18n.js` 的 `LOCALE_MAP` 加入對應

### 修改樣式
- 核心變數在 `styles/main.css` 的 `:root`
- 機器人主題在 `styles/harmony-theme.css`
- 修改後更新 `index.html` 的 `?v=YYYYMMDDx` 版本號

### 快取破壞
```html
<!-- 格式：YYYYMMDD + 字母序號 -->
<link rel="stylesheet" href="styles/main.css?v=20260910a">
<script src="js/app.js?v=20260910a"></script>
```

## 📄 授權

MIT License - 歡迎自由使用、修改、分發

---

**Harmony v0.1.0** - 讓自然語言控制機器人成為教學現場的日常 🤝