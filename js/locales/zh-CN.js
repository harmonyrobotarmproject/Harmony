// ===== Harmony 简体中文 Locale =====
window.LOCALE_ZH_CN = {
  auth: {
    login: {
      title: '登录',
      email: '电子邮件',
      password: '密码',
      submit: '登录',
      switch: '还没有账号？',
      switchLink: '注册'
    },
    signup: {
      title: '注册',
      name: '显示名称',
      email: '电子邮件',
      password: '密码 (至少 6 个字符)',
      submit: '注册',
      switch: '已经有账号？',
      switchLink: '登录'
    },
    guest: {
      login: '访客登录',
      continue: '继续使用访客身份'
    },
    noticeConsent: '使用本平台即表示您同意我们的 ',
    error: {
      invalidCredentials: '电子邮件或密码错误',
      emailExists: '此电子邮件已被注册',
      weakPassword: '密码长度至少需 6 个字符',
      networkError: '网络错误，请稍后再试'
    }
  },
  topbar: {
    logout: '登出',
    language: '语言',
    help: '说明',
    navChat: '聊天室',
    navAdmin: '管理员',
    navTeacher: '教师'
  },
  chat: {
    placeholder: '输入消息或机械手臂指令...',
    send: '发送',
    uploadImage: '上传图片',
    newSession: '新增工作会话',
    aiAssist: 'AI 协助',
    downloadLog: '下载日志',
    noSession: '暂无工作会话。上传图片以开始。',
    sessionTitle: '工作会话',
    coordinates: '坐标',
    detectedObjects: '检测到的物体',
    simulationLog: '模拟日志',
    running: '执行中...',
    completed: '已完成',
    error: '错误'
  },
  robot: {
    vision: {
      title: '视觉与坐标转换器',
      uploadPrompt: '上传测试图片以模拟相机画面',
      detecting: '检测物体中...',
      detected: '检测到物体',
      noObjects: '未检测到物体',
      pixelCoords: '像素坐标',
      worldCoords: '世界坐标 (米)',
      calibration: '校准: 1px = 0.5cm, Z=0.05m'
    },
    parser: {
      title: '指令解析器',
      inputPlaceholder: '输入自然语言指令...',
      parsing: '解析指令中...',
      parsedActions: '解析后的动作',
      actionDetect: '检测',
      actionPick: '夹取',
      actionPlace: '放置',
      actionReset: '归位',
      targetObject: '目标物体',
      coordinates: '坐标'
    },
    logger: {
      title: '模拟日志记录器',
      executing: '执行模拟中...',
      step: '步骤',
      logSaved: '日志已保存至',
      downloadReady: '可下载',
      timestamp: '时间戳'
    },
    simulator: {
      title: '机械手臂模拟器',
      startSimulation: '开始模拟',
      stopSimulation: '停止模拟',
      resetSimulation: '重置',
      statusIdle: '待机',
      statusRunning: '执行中',
      statusPaused: '暂停',
      statusError: '错误'
    }
  },
  aiAssist: {
    title: 'AI 助手',
    modes: {
      designer: '指令设计师',
      planner: '任务规划师',
      debugger: '坐标调试器',
      generator: '代码生成器'
    },
    designerDesc: '协助优化自然语言以获得更好的解析结果',
    plannerDesc: '讨论多步骤任务分解',
    debuggerDesc: '解释坐标转换过程',
    generatorDesc: '从模拟日志导出 Python/ROS 代码',
    placeholder: '询问 AI 关于机械手臂指令...',
    thinking: 'AI 思考中...'
  },
  session: {
    list: '工作会话列表',
    create: '建立工作会话',
    uploadImage: '上传图片',
    imagePreview: '图片预览',
    deleteConfirm: '确定删除此工作会话？',
    noSessions: '暂无工作会话。建立一个以开始。'
  },
  common: {
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    close: '关闭',
    loading: '加载中...',
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '信息',
    yes: '是',
    no: '否',
    ok: '确定',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    submit: '提交',
    reset: '重置',
    clear: '清除',
    copy: '复制',
    download: '下载',
    upload: '上传',
    refresh: '刷新',
    search: '搜索',
    filter: '筛选',
    sort: '排序',
    view: '查看',
    settings: '设置',
    help: '帮助',
    about: '关于',
    version: '版本'
  },
  notification: {
    sessionCreated: '工作会话创建成功',
    sessionDeleted: '工作会话已删除',
    imageUploaded: '图片上传成功',
    commandParsed: '指令解析成功',
    simulationStarted: '模拟已开始',
    simulationCompleted: '模拟已完成',
    logDownloaded: '日志已下载',
    errorOccurred: '发生错误'
  }
};