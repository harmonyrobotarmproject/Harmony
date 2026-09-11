// ===== Harmony AI Transport Layer =====
// AI 呼叫傳輸層，透過 Supabase Edge Function (ai-proxy) 代理呼叫
// Demo 模式：不呼叫 API，使用規則式解析器回傳假回應

const aiTransport = {
  // 檢查是否為 Demo 模式
  isDemoMode() {
    return window.HARMONY_DEMO_MODE === true || localStorage.getItem('harmony_demo_mode') === '1';
  },

  // 呼叫 AI Proxy (主要路徑：Azure OpenAI)
  async callAiViaProxy(messages, options = {}) {
    const provider = options.provider || AI_CONFIG_DEFAULTS.provider;
    const model = options.model || AI_CONFIG_DEFAULTS[provider === 'azure' ? 'azureModel' : 'githubModel'];
    const temperature = options.temperature ?? AI_CONFIG_DEFAULTS.temperature;
    const maxTokens = options.maxTokens ?? AI_CONFIG_DEFAULTS.maxTokens;

    const body = {
      provider,
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    try {
      const { data, error } = await _supabase.functions.invoke('ai-proxy', { body });
      
      if (error) {
        // 如果是 401/429 錯誤，嘗試 fallback 到 GitHub Models
        if (error.message?.includes('401') || error.message?.includes('429') || error.message?.includes('Unauthorized')) {
          if (provider === 'azure') {
            console.warn('Azure OpenAI failed, falling back to GitHub Models...');
            return this.callGithubAi(messages, options);
          }
        }
        throw new Error(error.message || 'AI proxy error');
      }
      
      return data;
    } catch (err) {
      // 網路錯誤或其他，嘗試 fallback
      if (provider === 'azure' && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        console.warn('Azure OpenAI network error, falling back to GitHub Models...');
        return this.callGithubAi(messages, options);
      }
      throw err;
    }
  },

  // 直接呼叫 GitHub Models (備援路徑)
  async callGithubAi(messages, options = {}) {
    const token = this.getGithubToken();
    if (!token) {
      throw new Error('GitHub Token not configured. Please set in settings.');
    }

    const model = options.model || AI_CONFIG_DEFAULTS.githubModel;
    const temperature = options.temperature ?? AI_CONFIG_DEFAULTS.temperature;
    const maxTokens = options.maxTokens ?? AI_CONFIG_DEFAULTS.maxTokens;

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error('GitHub Token expired or invalid');
      if (response.status === 429) throw new Error('GitHub Models rate limit exceeded');
      throw new Error(error.message || `GitHub Models error: ${response.status}`);
    }

    return response.json();
  },

  // 取得 GitHub Token (優先順序：config.local.js > localStorage)
  getGithubToken() {
    if (window.LOCAL_GITHUB_TOKEN) return window.LOCAL_GITHUB_TOKEN;
    return localStorage.getItem('harmony_github_token') || '';
  },

  // 儲存 GitHub Token 到 localStorage
  setGithubToken(token) {
    localStorage.setItem('harmony_github_token', token);
  },

  // 移除 GitHub Token
  clearGithubToken() {
    localStorage.removeItem('harmony_github_token');
  },

  // ===== Demo 模式：規則式指令解析 =====
  demoParseRobotCommand(userInput, detectedObjects = [], sessionContext = {}) {
    const input = userInput.toLowerCase();
    const rules = DEMO_CONFIG.actionRules;
    const actions = [];
    const usedObjects = new Set();

    // 從偵測物件或 mockObjects 取得可用物件
    const availableObjects = detectedObjects.length > 0 
      ? detectedObjects 
      : Object.keys(ROBOT_VISION_CONFIG.mockObjects).map(name => {
          const mock = ROBOT_VISION_CONFIG.mockObjects[name];
          return {
            name,
            pixel: [mock.u, mock.v],
            world: this.pixelToWorld(mock.u, mock.v),
            confidence: 0.95,
            color: mock.color
          };
        });

    // 建立物件名稱查找表 (支援部分比對)
    const objectMap = {};
    availableObjects.forEach(obj => {
      objectMap[obj.name] = obj;
      // 也加入常見別名
      if (obj.name.includes('紅色')) objectMap['紅色積木'] = obj;
      if (obj.name.includes('藍色')) objectMap['藍色盒子'] = obj;
      if (obj.name.includes('綠色')) objectMap['綠色球'] = obj;
      if (obj.name.includes('黃色')) objectMap['黃色立方體'] = obj;
      if (obj.name.includes('蘋果')) objectMap['蘋果'] = obj;
    });

    // 1. 偵測：找出輸入中提到的所有物件
    const mentionedObjects = [];
    for (const [name, obj] of Object.entries(objectMap)) {
      if (input.includes(name.toLowerCase()) && !usedObjects.has(name)) {
        mentionedObjects.push(obj);
        usedObjects.add(name);
      }
    }

    // 如果沒有明確提到物件，但有偵測關鍵字，偵測所有可用物件
    const hasDetectKeyword = rules.detect.some(k => input.includes(k));
    if (hasDetectKeyword && mentionedObjects.length === 0 && availableObjects.length > 0) {
      mentionedObjects.push(...availableObjects.slice(0, 3)); // 最多偵測 3 個
    }

    // 產生 detect 動作
    mentionedObjects.forEach(obj => {
      actions.push({
        action: 'detect',
        params: { target_name: obj.name },
        description: `偵測 ${obj.name} 位置`
      });
    });

    // 2. 夾取：如果有 pick 關鍵字
    const hasPickKeyword = rules.pick.some(k => input.includes(k));
    if (hasPickKeyword) {
      // 找出被夾取的目標物件
      let pickTarget = mentionedObjects.find(o => input.includes(o.name.toLowerCase()));
      if (!pickTarget && mentionedObjects.length > 0) pickTarget = mentionedObjects[0];
      if (!pickTarget && availableObjects.length > 0) pickTarget = availableObjects[0];

      if (pickTarget) {
        const coords = pickTarget.world;
        actions.push({
          action: 'pick',
          params: { x: coords[0], y: coords[1], z: coords[2], target_name: pickTarget.name },
          description: `夾取 ${pickTarget.name}`
        });
      }
    }

    // 3. 放置：如果有 place 關鍵字
    const hasPlaceKeyword = rules.place.some(k => input.includes(k));
    if (hasPlaceKeyword) {
      // 找出放置目標 (不同於夾取目標)
      let placeTarget = mentionedObjects.find(o => o.name !== pickTarget?.name && input.includes(o.name.toLowerCase()));
      if (!placeTarget && mentionedObjects.length > 1) placeTarget = mentionedObjects.find(o => o.name !== pickTarget?.name);
      if (!placeTarget && availableObjects.length > 1) {
        placeTarget = availableObjects.find(o => o.name !== pickTarget?.name);
      }
      if (!placeTarget && availableObjects.length > 0) {
        placeTarget = availableObjects[availableObjects.length - 1];
      }

      if (placeTarget) {
        const coords = placeTarget.world;
        actions.push({
          action: 'place',
          params: { x: coords[0], y: coords[1], z: coords[2], target_name: placeTarget.name },
          description: `放置到 ${placeTarget.name}`
        });
      }
    }

    // 4. 歸位：總是加在最後
    actions.push({
      action: 'reset_home',
      params: {},
      description: '機械手臂復位到安全位置'
    });

    // 如果完全沒有識別出任何動作，給預設序列
    if (actions.length === 1) { // 只有 reset_home
      const firstObj = availableObjects[0];
      if (firstObj) {
        actions.unshift(
          { action: 'detect', params: { target_name: firstObj.name }, description: `偵測 ${firstObj.name} 位置` },
          { action: 'pick', params: { x: firstObj.world[0], y: firstObj.world[1], z: firstObj.world[2], target_name: firstObj.name }, description: `夾取 ${firstObj.name}` },
          { action: 'place', params: { x: firstObj.world[0], y: firstObj.world[1], z: firstObj.world[2], target_name: firstObj.name }, description: `放置 ${firstObj.name}` }
        );
      }
    }

    return actions;
  },

  // ===== Demo 模式：AI 協助罐頭回應 =====
  demoChatReply(messages, modeHint = '') {
    const templates = DEMO_CONFIG.chatTemplates[modeHint] || DEMO_CONFIG.chatTemplates.designer;
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const detectedNames = robotSimulator?.state?.detectedObjects?.map(o => o.name).join('、') || '紅色積木、藍色盒子';
    const taskHint = lastUserMsg.slice(0, 30);

    // 根據模式選擇回應策略
    let reply = templates[Math.floor(Math.random() * templates.length)];

    // 加入情境資訊
    if (modeHint === 'designer') {
      reply += `\n\n目前偵測物件：${detectedNames}`;
      reply += `\n建議指令：「偵測${detectedNames.split('、')[0]}，夾取後放到${detectedNames.split('、')[1] || '目標位置'}」`;
    } else if (modeHint === 'planner') {
      reply += `\n\n任務提示：${taskHint}`;
      reply += `\n目前可用物件：${detectedNames}`;
    } else if (modeHint === 'debugger') {
      reply += `\n\n校準參考：1px = ${ROBOT_VISION_CONFIG.pixelToMeter * 100}cm, Z = ${ROBOT_VISION_CONFIG.fixedZHeight}m`;
    } else if (modeHint === 'generator') {
      reply += `\n\n請先執行模擬產生日誌，或切換到 LeRobot 分頁生成 CLI 指令。`;
    } else if (modeHint === 'lerobot') {
      // LeRobot 模式直接生成代碼
      const session = robotSimulator?.state?.currentSession;
      const objects = robotSimulator?.state?.detectedObjects || [];
      const task = lastUserMsg || session?.name || 'grab object and place';
      const code = robotLogger.generateLeRobotCode({ task, objects, session });
      return {
        choices: [{ message: { content: '```bash\n' + code + '\n```' } }]
      };
    }

    return {
      choices: [{ message: { content: reply } }]
    };
  },

  // 解析機械手臂指令 (專用函數)
  async parseRobotCommand(userInput, detectedObjects = [], sessionContext = {}) {
    // Demo 模式：直接回傳規則解析結果
    if (this.isDemoMode()) {
      console.log('[Demo Mode] parseRobotCommand:', userInput);
      return this.demoParseRobotCommand(userInput, detectedObjects, sessionContext);
    }

    const systemPrompt = AI_CONFIG_DEFAULTS.systemPrompt;
    
    // 建立偵測到的物件上下文
    let objectContext = '';
    if (detectedObjects.length > 0) {
      objectContext = '\n\n已偵測到的物件：\n';
      detectedObjects.forEach(obj => {
        objectContext += `- ${obj.name}: 座標 [${obj.world[0].toFixed(4)}, ${obj.world[1].toFixed(4)}, ${obj.world[2].toFixed(4)}] (像素: [${obj.pixel[0]}, ${obj.pixel[1]}])\n`;
      });
    }

    // 加入工作階段上下文
    let contextPrompt = '';
    if (sessionContext.imageSize) {
      contextPrompt += `\n影像尺寸: ${sessionContext.imageSize.width}x${sessionContext.imageSize.height}`;
    }
    if (sessionContext.calibration) {
      contextPrompt += `\n校準參數: 1px = ${sessionContext.calibration.pixelToMeter * 100}cm, 固定 Z = ${sessionContext.calibration.fixedZHeight}m`;
    }

    const messages = [
      { role: 'system', content: systemPrompt + objectContext + contextPrompt },
      { role: 'user', content: userInput }
    ];

    const response = await this.callAiViaProxy(messages, { temperature: 0.1, maxTokens: 1500 });
    
    // 解析回應
    const content = response.choices?.[0]?.message?.content || '';
    return this.parseActionSequence(content, detectedObjects);
  },

  // 解析 AI 回應為動作序列
  parseActionSequence(content, detectedObjects) {
    try {
      // 嘗試提取 JSON 陣列
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in response');
      
      const actions = JSON.parse(jsonMatch[0]);
      
      // 驗證並填入實際座標
      return actions.map(action => {
        const validated = this.validateAction(action, detectedObjects);
        return validated;
      });
    } catch (err) {
      console.error('Failed to parse action sequence:', err);
      // 回傳預設錯誤動作
      return [{
        action: 'error',
        params: {},
        description: '指令解析失敗: ' + err.message,
        rawContent: content
      }];
    }
  },

  // 驗證動作並填入座標
  validateAction(action, detectedObjects) {
    const validActions = ['detect', 'pick', 'place', 'reset_home'];
    if (!validActions.includes(action.action)) {
      return { ...action, action: 'error', description: `未知動作: ${action.action}` };
    }

    // 如果是 pick/place 且座標為 0，嘗試從偵測物件填入
    if ((action.action === 'pick' || action.action === 'place') && action.params) {
      const targetName = action.params.target_name || action.params.targetName;
      if (targetName && (!action.params.x || action.params.x === 0)) {
        const obj = detectedObjects.find(o => o.name === targetName);
        if (obj) {
          action.params.x = obj.world[0];
          action.params.y = obj.world[1];
          action.params.z = obj.world[2];
        }
      }
    }

    return action;
  },

  // 像素轉世界座標 (供 demo 使用)
  pixelToWorld(u, v) {
    const config = ROBOT_VISION_CONFIG;
    const cx = config.imageWidth / 2;
    const cy = config.imageHeight / 2;
    const x = (u - cx) * config.pixelToMeter;
    const y = (cy - v) * config.pixelToMeter;
    const z = config.fixedZHeight;
    return [x, y, z];
  },

  // AI 協助對話 (通用聊天)
  async chatWithAI(messages, options = {}) {
    // Demo 模式：回傳罐頭回應
    if (this.isDemoMode()) {
      const modeHint = options.modeHint || '';
      console.log('[Demo Mode] chatWithAI:', modeHint);
      return this.demoChatReply(messages, modeHint);
    }

    const systemPrompt = options.systemPrompt || '你是 Harmony 機械手臂控制平台的 AI 助手，協助學生設計指令、規劃任務、除錯座標轉換。';
    
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    return this.callAiViaProxy(fullMessages, options);
  }
};

window.aiTransport = aiTransport;