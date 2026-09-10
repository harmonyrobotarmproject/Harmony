// ===== Harmony Module 2: Command Parser via LLM =====
// 指令解析器 - 將自然語言轉換為標準機械手臂動作序列

const robotParser = {
  // 解析自然語言指令
  async parseCommand(naturalLanguage, detectedObjects = [], sessionContext = {}) {
    if (!naturalLanguage || !naturalLanguage.trim()) {
      throw new Error('指令不能為空');
    }

    // 呼叫 AI 解析
    const actions = await aiTransport.parseRobotCommand(
      naturalLanguage.trim(),
      detectedObjects,
      sessionContext
    );

    // 後處理：確保動作序列完整
    return this.postProcessActions(actions, detectedObjects);
  },

  // 後處理動作序列
  postProcessActions(actions, detectedObjects) {
    // 確保有 detect 動作對應到實際偵測物件
    const detectActions = actions.filter(a => a.action === 'detect');
    const pickPlaceActions = actions.filter(a => a.action === 'pick' || a.action === 'place');
    
    // 如果有 pick/place 但沒有對應的 detect，自動補上
    const processed = [...actions];
    
    pickPlaceActions.forEach(ppAction => {
      const targetName = ppAction.params?.target_name || ppAction.params?.targetName;
      if (targetName && !detectActions.some(d => d.params?.target_name === targetName)) {
        // 找到對應的偵測物件
        const obj = detectedObjects.find(o => o.name === targetName);
        if (obj) {
          // 插入 detect 動作在前面
          const insertIndex = processed.indexOf(ppAction);
          processed.splice(insertIndex, 0, {
            action: 'detect',
            params: { target_name: targetName },
            description: `偵測 ${targetName} 位置`,
            autoInserted: true
          });
        }
      }
    });

    // 確保最後有 reset_home
    const lastAction = processed[processed.length - 1];
    if (!lastAction || lastAction.action !== 'reset_home') {
      processed.push({
        action: 'reset_home',
        params: {},
        description: '機械手臂復位到安全位置'
      });
    }

    return processed;
  },

  // 驗證動作序列
  validateActions(actions) {
    const errors = [];
    const validActions = ['detect', 'pick', 'place', 'reset_home'];

    actions.forEach((action, index) => {
      if (!validActions.includes(action.action)) {
        errors.push(`步驟 ${index + 1}: 未知動作 "${action.action}"`);
        return;
      }

      if (action.action === 'detect') {
        if (!action.params?.target_name) {
          errors.push(`步驟 ${index + 1}: detect 缺少 target_name 參數`);
        }
      }

      if (action.action === 'pick' || action.action === 'place') {
        const { x, y, z } = action.params || {};
        if (x === undefined || y === undefined || z === undefined) {
          errors.push(`步驟 ${index + 1}: ${action.action} 缺少座標參數 (x, y, z)`);
        } else if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
          errors.push(`步驟 ${index + 1}: ${action.action} 座標必須為數字`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // 格式化動作序列為顯示用文字
  formatActionsForDisplay(actions) {
    const actionLabels = {
      detect: '🔍 偵測',
      pick: '🤏 夾取',
      place: '📦 放置',
      reset_home: '🏠 歸位',
      error: '❌ 錯誤'
    };

    return actions.map((action, i) => {
      const label = actionLabels[action.action] || action.action;
      const params = action.params || {};
      let paramStr = '';
      
      if (action.action === 'detect') {
        paramStr = `「${params.target_name}」`;
      } else if (action.action === 'pick' || action.action === 'place') {
        paramStr = `座標 [${params.x?.toFixed(4) || 0}, ${params.y?.toFixed(4) || 0}, ${params.z?.toFixed(4) || 0}]`;
      }

      return `${i + 1}. ${label} ${paramStr} — ${action.description || ''}`;
    }).join('\n');
  },

  // 產生模擬執行指令 (給 Logger 用)
  generateExecutionScript(actions, detectedObjects) {
    const lines = [];
    const timestamp = new Date().toISOString();
    
    lines.push(`[${timestamp}] 開始執行任務`);
    
    let stepNum = 1;
    const objectCoords = {};
    
    // 建立物件座標查詢表
    detectedObjects.forEach(obj => {
      objectCoords[obj.name] = obj.world;
    });

    actions.forEach(action => {
      switch (action.action) {
        case 'detect': {
          const targetName = action.params?.target_name;
          const coords = objectCoords[targetName] || [0, 0, 0.05];
          lines.push(`步驟 ${stepNum}: 視覺辨識 '${targetName}' 成功，座標為 X:${coords[0].toFixed(4)}, Y:${coords[1].toFixed(4)}, Z:${coords[2].toFixed(4)}`);
          break;
        }
        case 'pick': {
          const { x, y, z } = action.params;
          lines.push(`步驟 ${stepNum}: 執行 pick 動作，目標位置 -> [${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}]`);
          break;
        }
        case 'place': {
          const { x, y, z } = action.params;
          lines.push(`步驟 ${stepNum}: 執行 place 動作，目標位置 -> [${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}]`);
          break;
        }
        case 'reset_home': {
          lines.push(`步驟 ${stepNum}: 執行 reset_home 動作，機械手臂復位`);
          break;
        }
        case 'error': {
          lines.push(`步驟 ${stepNum}: ❌ ${action.description}`);
          break;
        }
      }
      stepNum++;
    });
    
    lines.push(`[${new Date().toISOString()}] 任務模擬完成`);
    
    return lines.join('\n');
  },

  // 互動式指令優化 (給 AI Assist 用)
  async refineCommand(originalCommand, feedback, detectedObjects = []) {
    const prompt = `原始指令：「${originalCommand}」
使用者回饋：「${feedback}」
已偵測物件：${detectedObjects.map(o => o.name).join(', ') || '無'}

請根據回饋修改指令，使其更精確、可執行。只回傳修改後的指令文字，不要額外說明。`;

    const response = await aiTransport.chatWithAI([
      { role: 'user', content: prompt }
    ], { temperature: 0.2, maxTokens: 200 });

    return response.choices?.[0]?.message?.content?.trim() || originalCommand;
  },

  // 分析指令複雜度
  analyzeComplexity(actions) {
    const stats = {
      totalSteps: actions.length,
      detectCount: 0,
      pickCount: 0,
      placeCount: 0,
      estimatedTime: 0 // 秒
    };

    actions.forEach(action => {
      switch (action.action) {
        case 'detect': stats.detectCount++; stats.estimatedTime += 1; break;
        case 'pick': stats.pickCount++; stats.estimatedTime += 3; break;
        case 'place': stats.placeCount++; stats.estimatedTime += 3; break;
        case 'reset_home': stats.estimatedTime += 2; break;
      }
    });

    return stats;
  }
};

window.robotParser = robotParser;