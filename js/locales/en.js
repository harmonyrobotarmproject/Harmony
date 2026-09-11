// ===== Harmony English Locale =====
window.LOCALE_EN = {
  auth: {
    login: {
      title: 'Login',
      email: 'Email',
      password: 'Password',
      submit: 'Login',
      switch: 'Don\'t have an account?',
      switchLink: 'Sign Up'
    },
    signup: {
      title: 'Sign Up',
      name: 'Display Name',
      email: 'Email',
      password: 'Password (min 6 characters)',
      submit: 'Sign Up',
      switch: 'Already have an account?',
      switchLink: 'Login'
    },
    guest: {
      login: 'Guest Login',
      continue: 'Continue as Guest'
    },
    noticeConsent: 'By using this platform, you agree to our ',
    error: {
      invalidCredentials: 'Invalid email or password',
      emailExists: 'Email already registered',
      weakPassword: 'Password must be at least 6 characters',
      networkError: 'Network error, please try again'
    }
  },
  topbar: {
    logout: 'Logout',
    language: 'Language',
    help: 'Help',
    navChat: 'Chat',
    navAdmin: 'Admin',
    navTeacher: 'Teacher'
  },
  chat: {
    placeholder: 'Type a message or robot command...',
    send: 'Send',
    uploadImage: 'Upload Image',
    newSession: 'New Session',
    aiAssist: 'AI Assist',
    downloadLog: 'Download Log',
    noSession: 'No active session. Upload an image to start.',
    sessionTitle: 'Session',
    coordinates: 'Coordinates',
    detectedObjects: 'Detected Objects',
    simulationLog: 'Simulation Log',
    running: 'Running...',
    completed: 'Completed',
    error: 'Error'
  },
  robot: {
    vision: {
      title: 'Vision & Coordinate Mapper',
      uploadPrompt: 'Upload a test image to simulate camera view',
      detecting: 'Detecting objects...',
      detected: 'Objects detected',
      noObjects: 'No objects detected',
      pixelCoords: 'Pixel Coordinates',
      worldCoords: 'World Coordinates (meters)',
      calibration: 'Calibration: 1px = 0.5cm, Z=0.05m'
    },
    parser: {
      title: 'Command Parser',
      inputPlaceholder: 'Enter natural language command...',
      parsing: 'Parsing command...',
      parsedActions: 'Parsed Actions',
      actionDetect: 'Detect',
      actionPick: 'Pick',
      actionPlace: 'Place',
      actionReset: 'Reset Home',
      targetObject: 'Target Object',
      coordinates: 'Coordinates'
    },
    logger: {
      title: 'Dummy Logger',
      executing: 'Executing simulation...',
      step: 'Step',
      logSaved: 'Log saved to',
      downloadReady: 'Download ready',
      timestamp: 'Timestamp'
    },
    simulator: {
      title: 'Robot Arm Simulator',
      startSimulation: 'Start Simulation',
      stopSimulation: 'Stop Simulation',
      resetSimulation: 'Reset',
      statusIdle: 'Idle',
      statusRunning: 'Running',
      statusPaused: 'Paused',
      statusError: 'Error'
    }
  },
  aiAssist: {
    title: 'AI Assistant',
    modes: {
      designer: 'Command Designer',
      planner: 'Task Planner',
      debugger: 'Coordinate Debugger',
      generator: 'Code Generator',
      lerobot: 'LeRobot Code'
    },
    designerDesc: 'Help refine natural language for better parsing',
    plannerDesc: 'Discuss multi-step task decomposition',
    debuggerDesc: 'Explain coordinate transformations',
    generatorDesc: 'Export Python/ROS code from simulation log',
    placeholder: 'Ask AI about robot commands...',
    thinking: 'AI is thinking...'
  },
  session: {
    list: 'Sessions',
    create: 'Create Session',
    uploadImage: 'Upload Image',
    imagePreview: 'Image Preview',
    deleteConfirm: 'Delete this session?',
    noSessions: 'No sessions yet. Create one to start.'
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    submit: 'Submit',
    reset: 'Reset',
    clear: 'Clear',
    copy: 'Copy',
    download: 'Download',
    upload: 'Upload',
    refresh: 'Refresh',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    view: 'View',
    settings: 'Settings',
    help: 'Help',
    about: 'About',
    version: 'Version'
  },
  notification: {
    sessionCreated: 'Session created successfully',
    sessionDeleted: 'Session deleted',
    imageUploaded: 'Image uploaded',
    commandParsed: 'Command parsed successfully',
    simulationStarted: 'Simulation started',
    simulationCompleted: 'Simulation completed',
    logDownloaded: 'Log downloaded',
    errorOccurred: 'An error occurred'
  }
};