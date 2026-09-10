// ===== Harmony 繁體中文 Locale =====
window.LOCALE_ZH_TW = {
  auth: {
    login: {
      title: '登入',
      email: '電子郵件',
      password: '密碼',
      submit: '登入',
      switch: '還沒有帳號？',
      switchLink: '註冊'
    },
    signup: {
      title: '註冊',
      name: '顯示名稱',
      email: '電子郵件',
      password: '密碼 (至少 6 個字元)',
      submit: '註冊',
      switch: '已經有帳號？',
      switchLink: '登入'
    },
    guest: {
      login: '訪客登入',
      continue: '繼續使用訪客身份'
    },
    noticeConsent: '使用本平台即表示您同意我們的 ',
    error: {
      invalidCredentials: '電子郵件或密碼錯誤',
      emailExists: '此電子郵件已被註冊',
      weakPassword: '密碼長度至少需 6 個字元',
      networkError: '網路錯誤，請稍後再試'
    }
  },
  topbar: {
    logout: '登出',
    language: '語言',
    help: '說明',
    navChat: '聊天室',
    navAdmin: '管理員',
    navTeacher: '教師'
  },
  chat: {
    placeholder: '輸入訊息或機械手臂指令...',
    send: '發送',
    uploadImage: '上傳圖片',
    newSession: '新增工作階段',
    aiAssist: 'AI 協助',
    downloadLog: '下載日誌',
    noSession: '尚無工作階段。上傳圖片以開始。',
    sessionTitle: '工作階段',
    coordinates: '座標',
    detectedObjects: '偵測到的物件',
    simulationLog: '模擬日誌',
    running: '執行中...',
    completed: '已完成',
    error: '錯誤'
  },
  robot: {
    vision: {
      title: '視覺與座標轉換器',
      uploadPrompt: '上傳測試圖片以模擬相機畫面',
      detecting: '偵測物件中...',
      detected: '偵測到物件',
      noObjects: '未偵測到物件',
      pixelCoords: '像素座標',
      worldCoords: '世界座標 (公尺)',
      calibration: '校準: 1px = 0.5cm, Z=0.05m'
    },
    parser: {
      title: '指令解析器',
      inputPlaceholder: '輸入自然語言指令...',
      parsing: '解析指令中...',
      parsedActions: '解析後的動作',
      actionDetect: '偵測',
      actionPick: '夾取',
      actionPlace: '放置',
      actionReset: '歸位',
      targetObject: '目標物件',
      coordinates: '座標'
    },
    logger: {
      title: '模擬日誌記錄器',
      executing: '執行模擬中...',
      step: '步驟',
      logSaved: '日誌已儲存至',
      downloadReady: '可下載',
      timestamp: '時間戳記'
    },
    simulator: {
      title: '機械手臂模擬器',
      startSimulation: '開始模擬',
      stopSimulation: '停止模擬',
      resetSimulation: '重置',
      statusIdle: '待機',
      statusRunning: '執行中',
      statusPaused: '暫停',
      statusError: '錯誤'
    }
  },
  aiAssist: {
    title: 'AI 助手',
    modes: {
      designer: '指令設計師',
      planner: '任務規劃師',
      debugger: '座標除錯器',
      generator: '代碼生成器'
    },
    designerDesc: '協助優化自然語言以獲得更好的解析結果',
    plannerDesc: '討論多步驟任務分解',
    debuggerDesc: '解釋座標轉換過程',
    generatorDesc: '從模擬日誌匯出 Python/ROS 代碼',
    placeholder: '詢問 AI 關於機械手臂指令...',
    thinking: 'AI 思考中...'
  },
  session: {
    list: '工作階段列表',
    create: '建立工作階段',
    uploadImage: '上傳圖片',
    imagePreview: '圖片預覽',
    deleteConfirm: '確定刪除此工作階段？',
    noSessions: '尚無工作階段。建立一個以開始。'
  },
  common: {
    save: '儲存',
    cancel: '取消',
    confirm: '確認',
    delete: '刪除',
    edit: '編輯',
    close: '關閉',
    loading: '載入中...',
    success: '成功',
    error: '錯誤',
    warning: '警告',
    info: '資訊',
    yes: '是',
    no: '否',
    ok: '確定',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    submit: '提交',
    reset: '重置',
    clear: '清除',
    copy: '複製',
    download: '下載',
    upload: '上傳',
    refresh: '重新整理',
    search: '搜尋',
    filter: '篩選',
    sort: '排序',
    view: '檢視',
    settings: '設定',
    help: '說明',
    about: '關於',
    version: '版本'
  },
  notification: {
    sessionCreated: '工作階段建立成功',
    sessionDeleted: '工作階段已刪除',
    imageUploaded: '圖片上傳成功',
    commandParsed: '指令解析成功',
    simulationStarted: '模擬已開始',
    simulationCompleted: '模擬已完成',
    logDownloaded: '日誌已下載',
    errorOccurred: '發生錯誤'
  }
};