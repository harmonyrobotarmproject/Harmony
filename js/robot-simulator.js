// ===== Harmony Integration: Robot Simulator =====
// 整合視覺、解析器、日誌記錄器的主協調器

const robotSimulator = {
  // 當前狀態
  state: {
    currentSessionId: null,
    currentSession: null,
    detectedObjects: [],
    parsedActions: [],
    isRunning: false,
    simulationLog: [],
    annotatedImageUrl: null
  },

  // 初始化新工作階段
  async initSession(sessionData) {
    this.state.currentSessionId = sessionData.id;
    this.state.currentSession = sessionData;
    this.state.detectedObjects = [];
    this.state.parsedActions = [];
    this.state.simulationLog = [];
    this.state.annotatedImageUrl = null;
    
    // 載入已偵測的物件 (如果有)
    if (sessionData.image_url) {
      await this.loadSessionImage(sessionData.image_url);
    }
  },

  // 載入工作階段圖片
  async loadSessionImage(imageUrl) {
    try {
      // 從 URL 載入圖片
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await robotVision.processImage(blob);
    } catch (err) {
      console.error('Failed to load session image:', err);
    }
  },

  // 執行視覺偵測
  async runVision(targetNames = []) {
    if (!robotVision.currentImage) {
      throw new Error('No image loaded. Please upload an image first.');
    }

    // 顯示偵測中狀態
    this.updateUIState('detecting');

    try {
      const detections = await robotVision.detectObjects(targetNames);
      this.state.detectedObjects = detections;
      
      // 產生標記後的圖片
      this.state.annotatedImageUrl = robotVision.getAnnotatedImage(detections);
      
      // 儲存到資料庫
      await this.saveObjectsToDB(detections);
      
      // 更新 UI
      this.updateUIState('detected');
      
      return detections;
    } catch (err) {
      this.updateUIState('error');
      throw err;
    }
  },

  // 儲存偵測物件到資料庫
  async saveObjectsToDB(detections) {
    for (const det of detections) {
      try {
        await db.createRobotObject({
          session_id: this.state.currentSessionId,
          name: det.name,
          pixel_u: det.pixel[0],
          pixel_v: det.pixel[1],
          world_x: det.world[0],
          world_y: det.world[1],
          world_z: det.world[2],
          confidence: det.confidence,
          color: det.color,
          bbox_x1: det.bbox.x1,
          bbox_y1: det.bbox.y1,
          bbox_x2: det.bbox.x2,
          bbox_y2: det.bbox.y2
        });
      } catch (err) {
        console.error('Failed to save object:', err);
      }
    }
  },

  // 解析自然語言指令
  async parseCommand(naturalLanguage) {
    if (!naturalLanguage || !naturalLanguage.trim()) {
      throw new Error('請輸入指令');
    }

    this.updateUIState('parsing');

    try {
      // 取得工作階段上下文
      const sessionContext = {
        imageSize: robotVision.currentImage ? {
          width: robotVision.currentImage.width,
          height: robotVision.currentImage.height
        } : null,
        calibration: {
          pixelToMeter: ROBOT_VISION_CONFIG.pixelToMeter,
          fixedZHeight: ROBOT_VISION_CONFIG.fixedZHeight
        }
      };

      const actions = await robotParser.parseCommand(
        naturalLanguage,
        this.state.detectedObjects,
        sessionContext
      );

      this.state.parsedActions = actions;
      
      // 驗證動作
      const validation = robotParser.validateActions(actions);
      if (!validation.valid) {
        console.warn('Action validation warnings:', validation.errors);
      }

      this.updateUIState('parsed');
      
      return actions;
    } catch (err) {
      this.updateUIState('error');
      throw err;
    }
  },

  // 執行模擬
  async runSimulation() {
    if (this.state.isRunning) {
      throw new Error('Simulation already running');
    }

    if (this.state.parsedActions.length === 0) {
      throw new Error('No actions to execute. Parse a command first.');
    }

    this.state.isRunning = true;
    this.updateUIState('running');

    try {
      const result = await robotLogger.executeSimulation(
        this.state.parsedActions,
        this.state.detectedObjects,
        this.state.currentSessionId
      );

      this.state.simulationLog = result.lines;
      this.state.isRunning = false;
      this.updateUIState('completed');

      return result;
    } catch (err) {
      this.state.isRunning = false;
      this.updateUIState('error');
      throw err;
    }
  },

  // 停止模擬
  stopSimulation() {
    this.state.isRunning = false;
    this.updateUIState('idle');
  },

  // 重置模擬器
  reset() {
    this.state = {
      currentSessionId: null,
      currentSession: null,
      detectedObjects: [],
      parsedActions: [],
      isRunning: false,
      simulationLog: [],
      annotatedImageUrl: null
    };
    robotVision.reset();
    this.updateUIState('idle');
  },

  // 更新 UI 狀態 (由各頁面實作)
  updateUIState(state) {
    // 觸發自定義事件，讓 UI 監聽並更新
    window.dispatchEvent(new CustomEvent('robot:stateChange', { 
      detail: { state, simulator: this.state } 
    }));
  },

  // 取得當前狀態
  getState() {
    return { ...this.state };
  },

  // 取得偵測物件摘要
  getObjectsSummary() {
    return this.state.detectedObjects.map(obj => ({
      name: obj.name,
      world: obj.world,
      pixel: obj.pixel,
      confidence: obj.confidence
    }));
  },

  // 取得動作序列摘要
  getActionsSummary() {
    return this.state.parsedActions.map((action, i) => ({
      step: i + 1,
      action: action.action,
      description: action.description,
      params: action.params
    }));
  },

  // 匯出模擬結果
  exportResults(format = 'json') {
    const data = {
      sessionId: this.state.currentSessionId,
      sessionName: this.state.currentSession?.name,
      timestamp: new Date().toISOString(),
      objects: this.getObjectsSummary(),
      actions: this.getActionsSummary(),
      log: this.state.simulationLog
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'txt':
        return this.state.simulationLog.join('\n');
      case 'python':
        const parsed = robotLogger.parseLogContent(this.state.simulationLog.join('\n'));
        return robotLogger.generatePythonCode(parsed);
      default:
        return data;
    }
  }
};

window.robotSimulator = robotSimulator;