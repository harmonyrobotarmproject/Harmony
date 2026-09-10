// ===== Harmony Platform Configuration =====
// 請修改以下值為您的 Supabase 專案設定

// Supabase 設定 (從 Supabase Dashboard > Settings > API 取得)
window.SUPABASE_URL = 'https://tkuxcwatbfvuvvsyobbz.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_tY3La9Nr_zbIscbtyIH6XQ_OY_-OuIe';

// AI 設定
window.AI_CONFIG_DEFAULTS = {
  // AI Provider: 'azure' (主要) 或 'github' (備援)
  provider: 'azure',
  // Azure OpenAI 模型部署名稱 (在 Azure AI Foundry 建立)
  azureModel: 'gpt-5.4-mini',
  // GitHub Models (免費額度: 50 req/day)
  githubModel: 'gpt-4o',
  // 溫度參數
  temperature: 0.3,
  // 最大 tokens
  maxTokens: 2000,
  // 系統提示詞 (機械手臂指令解析器專用)
  systemPrompt: `你是機械手臂指令解析器。將自然語言轉換為標準動作序列。

標準動作庫：
- detect(target_name): 視覺偵測物件，回傳 3D 坐標
- pick(x, y, z): 移動至坐標並夾取
- place(x, y, z): 移動至坐標並放開
- reset_home(): 回到安全初始位置

輸出格式：JSON 陣列，每個步驟包含 action, params, description
範例輸入：「幫我夾起紅色積木放到藍色盒子」
範例輸出：
[
  {"action": "detect", "params": {"target_name": "紅色積木"}, "description": "偵測紅色積木位置"},
  {"action": "detect", "params": {"target_name": "藍色盒子"}, "description": "偵測藍色盒子位置"},
  {"action": "pick", "params": {"x": 0, "y": 0, "z": 0}, "description": "夾取紅色積木"},
  {"action": "place", "params": {"x": 0, "y": 0, "z": 0}, "description": "放置到藍色盒子"},
  {"action": "reset_home", "params": {}, "description": "機械手臂復位"}
]

注意：pick/place 的坐標參數初始為 0，稍後由系統填入實際偵測座標。`
};

// 應用版本 (用於 cache-busting)
window.APP_VERSION = 'v0.1.1_20260910';

// 除錯模式
window.DEBUG_ENABLED = true;

// 模擬視覺設定
window.ROBOT_VISION_CONFIG = {
  // 影像尺寸 (用於座標映射)
  imageWidth: 640,
  imageHeight: 480,
  // 像素到公尺轉換 (1 pixel = 0.5 cm = 0.005 m)
  pixelToMeter: 0.005,
  // 固定 Z 軸高度 (桌面高度，單位: 公尺)
  fixedZHeight: 0.05,
  // 模擬物件位置 (用於測試圖片)
  mockObjects: {
    '蘋果': { u: 400, v: 300, color: '#ff0000' },
    '紅色積木': { u: 400, v: 300, color: '#ff0000' },
    '藍色盒子': { u: 200, v: 200, color: '#0000ff' },
    '藍色籃子': { u: 200, v: 200, color: '#0000ff' },
    '綠色球': { u: 500, v: 350, color: '#00ff00' },
    '黃色立方體': { u: 300, v: 150, color: '#ffff00' }
  }
};