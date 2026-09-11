// ===== Harmony Local Configuration =====
// 此檔案不會被 git 追蹤 (.gitignore 已排除)
// 用於本機開發環境的敏感設定

// GitHub Personal Access Token (用於 GitHub Models fallback)
// 格式: ghp_xxxxxxxxxxxx 或 github_pat_xxxxxxxxxxxx
// 在 GitHub Settings > Developer settings > Personal access tokens 建立
window.LOCAL_GITHUB_TOKEN = '';

// 本機測試用的 Supabase 設定 (可選，覆蓋 config.js)
// window.SUPABASE_URL = 'https://your-local-ref.supabase.co';
// window.SUPABASE_ANON_KEY = 'your-local-anon-key';

// 本機除錯旗標
window.LOCAL_DEBUG = true;