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
window.APP_VERSION = 'v0.1.10_20260911';

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

// ===== Demo 模式設定 =====
window.DEMO_CONFIG = {
  // Demo 模式開關 (localStorage 優先)
  enabled: localStorage.getItem('harmony_demo_mode') === '1',
  // LeRobot 代碼生成預設值
  lerobot: {
    followerPort: 'COM5',
    leaderPort: 'COM6',
    followerId: 'my_awesome_follower_arm',
    leaderId: 'my_awesome_leader_arm',
    datasetEpisodes: 30,
    datasetFps: 30,
    trainSteps: 300000,
    trainBatchSize: 8,
    saveFreq: 5000
  },
  // 規則式指令解析關鍵字對應
  actionRules: {
    detect: ['偵測', '檢測', '找', '看', '辨識', '識別'],
    pick: ['夾', '取', '抓', '拿', '拾', 'pick', 'grab'],
    place: ['放', '置', '放下', '放到', '放在', 'place', 'put', 'drop'],
    reset_home: ['歸位', '復位', '回家', '重置', 'reset', 'home']
  },
  // Demo 模式 AI 協助罐頭回應
  chatTemplates: {
    designer: [
      '建議使用標準動作：detect(物件名稱) → pick(x,y,z) → place(x,y,z) → reset_home()',
      '請嘗試更精確的指令，例如：「偵測紅色積木，夾取後放到藍色盒子」',
      '記得先偵測物件位置，再執行夾取動作，這樣座標才會準確。'
    ],
    planner: [
      '複雜任務建議分解為：1) 偵測所有物件 2) 規劃夾取順序 3) 依序執行 pick/place 4) 歸位',
      '多步驟任務可考慮加入中繼點，避免碰撞。',
      '若有多個相同物件，建議在指令中加入位置描述（如：左邊的紅色積木）。'
    ],
    debugger: [
      '座標轉換公式：worldX = (pixelX - width/2) * pixelToMeter, worldY = (height/2 - pixelY) * pixelToMeter',
      '固定 Z 高度為 0.05m (桌面)。像素原點在影像中心，X 向右，Y 向上。',
      '若座標偏移大，請檢查相機校準與 pixelToMeter 設定 (目前 1px = 0.5cm)。'
    ],
    generator: [
      '代碼生成器可從模擬日誌產生 Python 模擬代碼或 LeRobot CLI 指令。',
      'LeRobot 指令包含：校正 → 遙操作測試 → 錄製資料集 → 訓練 ACT 策略。',
      '請先執行模擬產生日誌，再使用代碼生成器。'
    ],
    lerobot: [
      'LeRobot 代碼生成器：將輸出完整的 SO-101 校正、遙操作、錄製、訓練指令。',
      '請在輸入框描述任務（如：grab red cube and drop in blue box），再按 Enter 生成。',
      '生成的指令已帶入偵測物件座標與任務描述，僅需調整 COM 埠即可使用。'
    ]
  }
};