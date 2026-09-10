// ===== Harmony AI Transport Layer =====
// AI 呼叫傳輸層，透過 Supabase Edge Function (ai-proxy) 代理呼叫

const aiTransport = {
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

  // 解析機械手臂指令 (專用函數)
  async parseRobotCommand(userInput, detectedObjects = [], sessionContext = {}) {
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

  // AI 協助對話 (通用聊天)
  async chatWithAI(messages, options = {}) {
    const systemPrompt = options.systemPrompt || '你是 Harmony 機械手臂控制平台的 AI 助手，協助學生設計指令、規劃任務、除錯座標轉換。';
    
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    return this.callAiViaProxy(fullMessages, options);
  }
};

window.aiTransport = aiTransport;