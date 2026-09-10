# Harmony Platform - Supabase 部署設置指南

> 由於提供的 Supabase Personal Access Token (`sbp_v0_...`) 格式與 CLI/Management API 不相容，請按照以下步驟手動建立 Supabase 專案並部署。

---

## 📋 步驟總覽

1. **建立 Supabase 專案** (在 Dashboard)
2. **執行資料庫 Schema** (SQL Editor)
3. **設定 Storage Bucket** (robot-images)
4. **部署 Edge Functions** (ai-proxy, robot-commands)
5. **設定 Secrets** (API Keys)
6. **更新前端配置** (config.js)
7. **部署到 Vercel** (可選)

---

## 1️⃣ 建立 Supabase 專案

1. 前往 [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. 點擊 **New Project**
3. 填寫：
   - **Name**: `harmony` (或您偏好的名稱)
   - **Database Password**: 設定一個強密碼 (記下來，稍後需要)
   - **Region**: `ap-northeast-1` (東京，離香港最近)
   - **Pricing Plan**: `Free`
4. 點擊 **Create new project** 等待約 2 分鐘

### 記錄專案資訊
專案建立完成後，從 **Settings > API** 頁面複製：
- **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
- **Project Ref**: `YOUR_PROJECT_REF` (URL 中的那一段)
- **anon public key**: `eyJhbGciOiJ...` (很長的字串)
- **service_role secret key**: `eyJhbGciOiJ...` (很長的字串，⚠️ 保密)

---

## 2️⃣ 執行資料庫 Schema

1. 在 Supabase Dashboard 點擊左側 **SQL Editor**
2. 點擊 **New query**
3. 複製 `supabase/schema.sql` **全部內容** 貼上
4. 點擊 **Run** (或 Ctrl+Enter)
5. 確認沒有錯誤訊息，應顯示 "Success. No rows returned"

### 驗證資料表
前往 **Table Editor** 確認以下資料表存在：
- ✅ `profiles`
- ✅ `robot_sessions`
- ✅ `robot_objects`
- ✅ `messages`
- ✅ `simulation_logs`
- ✅ `system_settings`

---

## 3️⃣ 設定 Storage Bucket

1. 點擊左側 **Storage**
2. 點擊 **Create bucket**
3. 設定：
   - **Name**: `robot-images`
   - **Public bucket**: ✅ 勾選
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/*`
4. 點擊 **Create bucket**

### 設定 RLS Policies
在 `robot-images` bucket 頁面點擊 **Policies**，新增三個政策：

**Policy 1: Users can upload own images**
```sql
-- Name: Users can upload own images
-- Operation: INSERT
-- Definition: (bucket_id = 'robot-images' AND auth.uid()::text = (storage.foldername(name))[1])
```

**Policy 2: Users can view own images**
```sql
-- Name: Users can view own images
-- Operation: SELECT
-- Definition: (bucket_id = 'robot-images' AND auth.uid()::text = (storage.foldername(name))[1])
```

**Policy 3: Users can delete own images**
```sql
-- Name: Users can delete own images
-- Operation: DELETE
-- Definition: (bucket_id = 'robot-images' AND auth.uid()::text = (storage.foldername(name))[1])
```

---

## 4️⃣ 部署 Edge Functions

### 方法 A：使用 Supabase CLI (推薦，需本機 Docker)

```bash
# 1. 登入 (需要 Personal Access Token，或用瀏覽器登入)
supabase login

# 2. 連結專案
supabase link --project-ref YOUR_PROJECT_REF

# 3. 設定 Secrets (在專案根目錄)
supabase secrets set AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com
supabase secrets set AZURE_OPENAI_API_KEY=YOUR_AZURE_API_KEY
supabase secrets set AZURE_OPENAI_DEPLOYMENT=gpt-5.4-mini
supabase secrets set GITHUB_TOKEN=YOUR_GITHUB_TOKEN_HERE

# 4. 部署 Functions
supabase functions deploy ai-proxy
supabase functions deploy robot-commands
```

### 方法 B：使用 Supabase Dashboard (無需本機環境)

1. 前往 **Edge Functions** 頁面
2. 點擊 **Create new function**
3. **Function name**: `ai-proxy`
4. 複製 `supabase/functions/ai-proxy/index.ts` 內容貼上
5. 點擊 **Deploy**
6. 重複建立 `robot-commands` function

### 設定 Function Secrets (Dashboard 方式)
在 **Edge Functions > Settings > Secrets** 新增：
| Key | Value |
|-----|-------|
| `AZURE_OPENAI_ENDPOINT` | `https://YOUR_RESOURCE.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | `YOUR_AZURE_API_KEY` |
| `AZURE_OPENAI_DEPLOYMENT` | `gpt-5.4-mini` |
| `AZURE_OPENAI_API_VERSION` | `2024-02-15-preview` (可選) |
| `GITHUB_TOKEN` | `YOUR_GITHUB_TOKEN_HERE` |
| `SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` (自動可用) |
| `SUPABASE_SERVICE_ROLE_KEY` | `YOUR_SERVICE_ROLE_KEY` (自動可用) |

---

## 5️⃣ 設定 Auth Providers

1. 前往 **Authentication > Providers**
2. 確認 **Email** 已啟用
3. 啟用 **Anonymous sign-ins** (允許訪客登入)
4. (可選) 設定 **Site URL** 和 **Redirect URLs** 為您的 Vercel 網址

---

## 6️⃣ 更新前端配置

編輯 `js/config.js`，取代以下值：

```javascript
// 取代 YOUR_PROJECT_REF 為您的專案 ref
window.SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';

// 取代 YOUR_ANON_KEY 為您的 anon public key
window.SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

### 設定本機 GitHub Token (開發用)
複製 `js/config.local.js.example` 為 `js/config.local.js`：
```bash
cp js/config.local.js.example js/config.local.js
```
編輯 `js/config.local.js`：
```javascript
window.LOCAL_GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE';
```

---

## 7️⃣ 測試部署

### 本機測試
使用 VS Code Live Server 或任何靜態伺服器：
```bash
# 在 Harmony 目錄
npx serve .
# 或用 Python
python -m http.server 8080
```
開啟 `http://localhost:8080` (或 3000/5500)

### 驗證功能
- [ ] 註冊/登入/訪客登入正常
- [ ] 建立工作階段、上傳圖片
- [ ] 視覺偵測顯示物件座標
- [ ] 輸入指令「夾起紅色積木放到藍色盒子」
- [ ] AI 解析顯示動作序列
- [ ] 執行模擬產生日誌
- [ ] 下載日誌檔案
- [ ] AI 協助面板四種模式運作

---

## 8️⃣ 部署到 Vercel (生產環境)

1. 將程式碼推送到 GitHub (已完成：`https://github.com/harmonyrobotarmproject/Harmony`)
2. 前往 [https://vercel.com](https://vercel.com) → **Add New Project**
3. Import `harmonyrobotarmproject/Harmony`
4. 設定：
   - **Framework Preset**: `Other`
   - **Build Command**: (留空)
   - **Output Directory**: `.` (根目錄)
5. 點擊 **Deploy**

### Vercel 環境變數 (可選)
在 Vercel Project Settings > Environment Variables 新增：
| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` | All |
| `SUPABASE_ANON_KEY` | `YOUR_ANON_KEY` | All |

> 注意：前端不需要這些環境變數，因為 `config.js` 已包含設定。這裡只是備份。

---

## 🔧 常見問題

### Q: Edge Function 回傳 401 Unauthorized
- 檢查 `AZURE_OPENAI_API_KEY` 和 `AZURE_OPENAI_ENDPOINT` 是否正確設定在 Function Secrets
- 確認 Azure OpenAI 資源已部署 `gpt-5.4-mini` 模型

### Q: GitHub Models 回傳 429 Rate Limited
- 免費額度：50 requests/day
- 切換到 Azure Provider：在 Admin Panel > AI Settings 設定

### Q: Realtime 不更新
- 確認 `messages` 和 `robot_objects` 已加入 Realtime Publication
- 在 SQL Editor 執行：
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.robot_objects;
```

### Q: 圖片上傳失敗
- 確認 `robot-images` bucket 為 public
- 確認 RLS Policies 正確 (auth.uid() 對比 foldername)

### Q: 匿名登入後無法繼續
- 確認 Auth > Providers > Anonymous sign-ins 已啟用
- 檢查 `profiles` 表的 trigger `handle_new_user` 是否存在

---

## 📞 需要協助？

如果遇到問題，請提供：
1. Supabase Project Ref
2. 錯誤訊息截圖 (Console/Network tab)
3. Edge Function Logs (Dashboard > Edge Functions > Logs)

---

## ✅ 部署完成檢查清單

- [ ] Supabase 專案建立完成
- [ ] `schema.sql` 執行成功
- [ ] `robot-images` bucket 建立並設定 Policies
- [ ] `ai-proxy` Edge Function 部署並設定 Secrets
- [ ] `robot-commands` Edge Function 部署
- [ ] `js/config.js` 更新正確的 URL 和 Key
- [ ] 本機測試所有功能正常
- [ ] (可選) Vercel 部署成功

---

**專案網址**：
- GitHub: https://github.com/harmonyrobotarmproject/Harmony
- Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
- Vercel: (部署後獲得)