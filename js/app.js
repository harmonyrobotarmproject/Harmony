// ===== Harmony Main Application =====
// 核心應用邏輯：認證、工作階段、聊天、機器人模擬整合

// 立即註冊表單處理 (防止原生 submit 導致頁面重整)
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var loginForm = document.getElementById('form-login');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        login();
      });
    }
    var signupForm = document.getElementById('form-signup');
    if (signupForm) {
      signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        signup();
      });
    }
  });
})();

// ===== Global State =====
let _supabase;
let currentUser = null;
let currentProfile = null;
let currentSessionId = null;
let messageChannel = null;
let objectsChannel = null;
let aiPanelOpen = false;
let currentAiMode = 'designer';

// ===== Supabase Init =====
try {
  _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error('Supabase init failed:', e);
  showToast('Supabase 連線失敗，請檢查設定', 'error');
}

// ===== i18n Init =====
window.i18nInit();

// ===== Auth State Listener =====
_supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    currentUser = session.user;
    await loadProfile();
    showMainApp();
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    currentProfile = null;
    currentSessionId = null;
    showAuthPage();
  } else if (event === 'INITIAL_SESSION' && session?.user) {
    currentUser = session.user;
    await loadProfile();
    showMainApp();
  }
});

// ===== Profile Loading =====
async function loadProfile() {
  const { data, error } = await db.getProfile(currentUser.id);
  if (error) {
    console.error('Load profile error:', error);
    return;
  }
  currentProfile = data;
  updateUserBadge();
  loadSessions();
}

// ===== Page Navigation =====
function showAuthPage() {
  document.getElementById('page-auth').classList.add('active');
  document.getElementById('page-main').classList.remove('active');
  cleanupChannels();
}

function showMainApp() {
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-main').classList.add('active');
  
  // 更新導覽列顯示
  const isAdmin = currentProfile?.role === 'admin';
  const isTeacher = currentProfile?.role === 'teacher';
  
  document.getElementById('nav-tab-admin').classList.toggle('hidden', !isAdmin);
  document.getElementById('nav-tab-teacher').classList.toggle('hidden', !(isAdmin || isTeacher));
  
  // 重新渲染圖示
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  
  // 關閉側邊欄 (mobile)
  closeSidebar();
}

// ===== User Badge =====
function updateUserBadge() {
  const badge = document.getElementById('user-badge');
  const avatar = document.getElementById('user-avatar');
  const name = document.getElementById('user-name');
  const roleBadge = document.getElementById('user-role-badge');
  
  if (currentProfile) {
    badge.classList.remove('hidden');
    avatar.textContent = currentProfile.display_name?.charAt(0)?.toUpperCase() || 'U';
    name.textContent = currentProfile.display_name || 'User';
    
    if (currentProfile.role !== 'student') {
      roleBadge.textContent = currentProfile.role;
      roleBadge.classList.remove('hidden');
    }
  } else {
    badge.classList.add('hidden');
  }
}

// ===== Session Management =====
async function loadSessions() {
  const { data, error } = await db.getUserSessions(currentUser.id);
  if (error) {
    console.error('Load sessions error:', error);
    showToast('載入工作階段失敗', 'error');
    return;
  }
  renderSessionList(data || []);
}

function renderSessionList(sessions) {
  const container = document.getElementById('session-list');
  if (!container) return;
  
  const emptyStateHTML = `<div class="empty-state" id="empty-sessions">
    <i data-lucide="image"></i>
    <h3 data-i18n="session.noSessions">${t('session.noSessions')}</h3>
    <p data-i18n="session.noSessionsDesc">${t('session.noSessionsDesc')}</p>
  </div>`;

  if (sessions.length === 0) {
    container.innerHTML = emptyStateHTML;
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
    return;
  }
  
  container.innerHTML = sessions.map(session => `
    <div class="session-item ${currentSessionId === session.id ? 'active' : ''}" 
         onclick="selectSession('${session.id}')">
      <div class="session-thumb">
        ${session.image_url ? `<img src="${session.image_url}" alt="${session.name}">` : '<i data-lucide="image" style="width:100%;height:100%;color:var(--robot-text-muted)"></i>'}
      </div>
      <div class="session-info">
        <div class="session-name">${escapeHtml(session.name || 'Untitled')}</div>
        <div class="session-meta">
          <span>${formatDate(session.created_at)}</span>
          <span class="session-status ${session.status || 'idle'}">
            <span class="dot"></span> ${t(`robot.simulator.status${capitalize(session.status || 'idle')}`)}
          </span>
        </div>
      </div>
      <div class="session-actions">
        <button class="session-action-btn" onclick="event.stopPropagation(); deleteSession('${session.id}')" aria-label="Delete"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `).join('');
  
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
}

async function selectSession(sessionId) {
  // 清理舊頻道
  cleanupChannels();
  
  currentSessionId = sessionId;
  
  // 載入工作階段詳情
  const { data: session, error } = await db.getSession(sessionId);
  if (error || !session) {
    showToast('載入工作階段失敗', 'error');
    return;
  }
  
  // 初始化模擬器
  await robotSimulator.initSession(session);
  
  // 更新 UI
  document.getElementById('current-session-name').textContent = session.name || 'Untitled Session';
  updateSessionStatus(session.status || 'idle');
  
  // 重新渲染列表高亮
  renderSessionList((await db.getUserSessions(currentUser.id)).data || []);
  
  // 載入偵測物件
  const { data: objects } = await db.getSessionObjects(sessionId);
  if (objects && objects.length > 0) {
    robotSimulator.state.detectedObjects = objects.map(o => ({
      name: o.name,
      pixel: [o.pixel_u, o.pixel_v],
      world: [o.world_x, o.world_y, o.world_z],
      confidence: o.confidence,
      color: o.color,
      bbox: { x1: o.bbox_x1, y1: o.bbox_y1, x2: o.bbox_x2, y2: o.bbox_y2 }
    }));
    robotSimulator.state.annotatedImageUrl = robotVision.getAnnotatedImage(robotSimulator.state.detectedObjects);
    renderDetectedObjects();
  }
  
  // 載入訊息
  loadMessages();
  
  // 訂閱即時更新
  subscribeToRealtime(sessionId);
  
  showToast(t('notification.sessionLoaded', session.name), 'success');
}

async function createSession() {
  const name = document.getElementById('new-session-name').value.trim();
  const imageInput = document.getElementById('session-image-input');
  
  if (!imageInput.files[0]) {
    showToast('請上傳測試圖片', 'warning');
    return;
  }
  
  const file = imageInput.files[0];
  const sessionName = name || `Session ${new Date().toLocaleString()}`;
  
  // 上傳圖片
  const timestamp = Date.now();
  const path = `${currentUser.id}/${timestamp}_${file.name}`;
  const { data: uploadData, error: uploadError } = await db.uploadImage('robot-images', path, file);
  
  if (uploadError) {
    showToast('圖片上傳失敗: ' + uploadError.message, 'error');
    return;
  }
  
  const imageUrl = db.getImageUrl('robot-images', path);
  
  // 建立工作階段
  const { data: session, error } = await db.createSession({
    user_id: currentUser.id,
    name: sessionName,
    image_url: imageUrl,
    status: 'idle'
  });
  
  if (error) {
    showToast('建立工作階段失敗: ' + error.message, 'error');
    return;
  }
  
  closeModal('modal-new-session');
  loadSessions();
  showToast(t('notification.sessionCreated'), 'success');
}

async function deleteSession(sessionId) {
  if (!confirm(t('session.deleteConfirm'))) return;
  
  const { error } = await db.deleteSession(sessionId);
  if (error) {
    showToast('刪除失敗: ' + error.message, 'error');
    return;
  }
  
  if (currentSessionId === sessionId) {
    currentSessionId = null;
    robotSimulator.reset();
    document.getElementById('current-session-name').textContent = t('chat.noSession');
    document.getElementById('message-area').innerHTML = '';
  }
  
  loadSessions();
  showToast(t('notification.sessionDeleted'), 'success');
}

// ===== Image Upload Handling =====
function handleSessionImageSelect(input) {
  const file = input.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showToast('請選擇圖片檔案', 'warning');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showToast('圖片大小不能超過 5MB', 'warning');
    return;
  }
  
  const container = document.getElementById('image-preview-container');
  container.innerHTML = `
    <div class="image-preview">
      <img src="${URL.createObjectURL(file)}" alt="Preview">
      <button class="remove-btn" onclick="clearSessionImage()" aria-label="Remove"><i data-lucide="x"></i></button>
    </div>
  `;
  container.classList.remove('hidden');
  
  // 更新上傳區域顯示
  document.getElementById('upload-area').classList.add('hidden');
  
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
}

function clearSessionImage() {
  document.getElementById('session-image-input').value = '';
  document.getElementById('image-preview-container').classList.add('hidden');
  document.getElementById('upload-area').classList.remove('hidden');
}

function handleImageUpload() {
  document.getElementById('chat-image-input').click();
}

function handleChatImageSelect(input) {
  const file = input.files[0];
  if (!file) return;
  
  // 如果有當前工作階段，上傳並更新
  if (currentSessionId) {
    uploadSessionImage(file);
  } else {
    showToast('請先建立或選擇工作階段', 'warning');
  }
  input.value = '';
}

async function uploadSessionImage(file) {
  const timestamp = Date.now();
  const path = `${currentUser.id}/${timestamp}_${file.name}`;
  
  const { data, error } = await db.uploadImage('robot-images', path, file);
  if (error) {
    showToast('上傳失敗: ' + error.message, 'error');
    return;
  }
  
  const imageUrl = db.getImageUrl('robot-images', path);
  
  // 更新工作階段圖片
  await db.updateSession(currentSessionId, { image_url: imageUrl, status: 'idle' });
  
  // 重新載入圖片到視覺模組
  await robotVision.processImage(file);
  
  // 自動偵測
  await runVision();
  
  showToast(t('notification.imageUploaded'), 'success');
}

// ===== Vision & Detection =====
async function runVision() {
  if (!currentSessionId) {
    showToast('請先選擇工作階段', 'warning');
    return;
  }
  
  try {
    updateSessionStatus('detecting');
    const detections = await robotSimulator.runVision();
    renderDetectedObjects();
    updateSessionStatus('detected');
    showToast(t('notification.detectionCompleted', detections.length), 'success');
  } catch (err) {
    updateSessionStatus('error');
    showToast('偵測失敗: ' + err.message, 'error');
  }
}

function renderDetectedObjects() {
  const objects = robotSimulator.state.detectedObjects;
  // 這裡可以更新側邊欄的物件顯示區域
  // 暫時在聊天區顯示
  if (objects.length > 0) {
    const msg = {
      id: 'vision-' + Date.now(),
      user_id: 'system',
      sender_name: '系統',
      message_type: 'system',
      content: `🔍 偵測完成！發現 ${objects.length} 個物件：\n` + 
        objects.map(o => `• ${o.name}: [${o.world[0].toFixed(4)}, ${o.world[1].toFixed(4)}, ${o.world[2].toFixed(4)}]`).join('\n'),
      created_at: new Date().toISOString()
    };
    render.appendMessage(document.getElementById('message-area'), msg, currentUser.id);
  }
}

// ===== Command Parsing & Simulation =====
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  
  if (!currentSessionId) {
    showToast('請先建立或選擇工作階段', 'warning');
    return;
  }
  
  input.value = '';
  input.style.height = 'auto';
  
  // 發送使用者訊息
  const { data: msg } = await db.sendMessage({
    session_id: currentSessionId,
    user_id: currentUser.id,
    content: text,
    message_type: 'text',
    sender_name: currentProfile.display_name
  });
  
  if (msg) {
    render.appendMessage(document.getElementById('message-area'), msg, currentUser.id);
  }
  
  // 如果是機器人指令，解析並執行
  if (isRobotCommand(text)) {
    await handleRobotCommand(text);
  }
}

function isRobotCommand(text) {
  // 簡單判斷：包含機器人相關關鍵字
  const keywords = ['夾', '取', '放', '移動', '偵測', '檢測', '抓', '拿', '把', '放到', '放在', '移到', '移往'];
  return keywords.some(k => text.includes(k));
}

async function handleRobotCommand(text) {
  try {
    // 解析指令
    const actions = await robotSimulator.parseCommand(text);
    
    // 顯示解析結果
    const actionMsg = {
      id: 'parser-' + Date.now(),
      user_id: 'system',
      sender_name: 'AI 解析器',
      message_type: 'robot_command',
      content: robotParser.formatActionsForDisplay(actions),
      metadata: { actions, sessionId: currentSessionId },
      created_at: new Date().toISOString()
    };
    render.appendMessage(document.getElementById('message-area'), actionMsg, currentUser.id);
    
    // 詢問是否執行 (或自動執行)
    // 這裡自動執行
    await runSimulation();
    
  } catch (err) {
    showToast('指令處理失敗: ' + err.message, 'error');
  }
}

async function runSimulation() {
  if (!currentSessionId) return;
  
  try {
    updateSessionStatus('running');
    const result = await robotSimulator.runSimulation();
    
    // 顯示日誌
    const logMsg = {
      id: 'log-' + Date.now(),
      user_id: 'system',
      sender_name: '模擬器',
      message_type: 'robot_log',
      content: result.content,
      metadata: { downloadUrl: null }, // 可加入下載連結
      created_at: new Date().toISOString()
    };
    render.appendMessage(document.getElementById('message-area'), logMsg, currentUser.id);
    
    updateSessionStatus('completed');
    showToast(t('notification.simulationCompleted'), 'success');
    
  } catch (err) {
    updateSessionStatus('error');
    showToast('模擬執行失敗: ' + err.message, 'error');
  }
}

function updateSessionStatus(status) {
  const statusEl = document.getElementById('session-status');
  if (statusEl) {
    statusEl.className = `sim-status ${status}`;
    statusEl.innerHTML = `<span class="dot"></span> ${t(`robot.simulator.status${capitalize(status)}`)}`;
  }
}

// ===== Messages =====
async function loadMessages() {
  if (!currentSessionId) return;
  
  const { data, error } = await db.getMessages(currentSessionId);
  if (error) {
    console.error('Load messages error:', error);
    return;
  }
  
  render.renderMessages(document.getElementById('message-area'), data || [], currentUser.id);
}

function subscribeToRealtime(sessionId) {
  messageChannel = db.subscribeToMessages(sessionId, (payload) => {
    const msg = payload.new;
    if (msg.user_id !== currentUser.id) {
      render.appendMessage(document.getElementById('message-area'), msg, currentUser.id);
    }
  });
  
  objectsChannel = db.subscribeToSessionObjects(sessionId, (payload) => {
    // 即時更新偵測物件
    if (payload.eventType === 'INSERT') {
      robotSimulator.state.detectedObjects.push({
        name: payload.new.name,
        pixel: [payload.new.pixel_u, payload.new.pixel_v],
        world: [payload.new.world_x, payload.new.world_y, payload.new.world_z],
        confidence: payload.new.confidence,
        color: payload.new.color
      });
      renderDetectedObjects();
    }
  });
}

function cleanupChannels() {
  if (messageChannel) db.unsubscribe(messageChannel);
  if (objectsChannel) db.unsubscribe(objectsChannel);
  messageChannel = null;
  objectsChannel = null;
}

// ===== AI Assist Panel =====
function toggleAiPanel() {
  const panel = document.getElementById('ai-panel');
  aiPanelOpen = !aiPanelOpen;
  panel.classList.toggle('open', aiPanelOpen);
  
  if (aiPanelOpen) {
    document.getElementById('ai-input').focus();
    loadAiMode(currentAiMode);
  }
}

function switchAiMode(btn) {
  document.querySelectorAll('.ai-panel-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentAiMode = btn.dataset.mode;
  loadAiMode(currentAiMode);
}

function loadAiMode(mode) {
  const body = document.getElementById('ai-panel-body');
  const modeInfo = {
    designer: { title: '指令設計師', desc: '協助優化自然語言指令', placeholder: '請描述您想讓機械手臂做什麼...' },
    planner: { title: '任務規劃師', desc: '協助分解複雜任務為可執行步驟', placeholder: '描述完整任務目標...' },
    debugger: { title: '座標除錯器', desc: '解釋像素到世界座標的轉換', placeholder: '詢問座標轉換相關問題...' },
    generator: { title: '代碼生成器', desc: '從模擬日誌生成 Python/ROS 代碼', placeholder: '請求生成特定格式代碼...' },
    lerobot: { title: 'LeRobot 代碼生成器', desc: '生成 SO-101 校正、遙操作、錄製、訓練 CLI 指令', placeholder: '輸入任務描述（如：grab red cube and drop in blue box）' }
  };
  
  const info = modeInfo[mode] || modeInfo.designer;
  body.innerHTML = `
    <div class="ai-chat-messages" id="ai-chat-messages">
      <div class="ai-message ai">
        <div class="message-avatar" style="background:var(--robot-info)">🤖</div>
        <div class="message-bubble">
          <div class="message-content">
            <strong>${info.title}</strong><br>
            <small style="color:var(--robot-text-muted)">${info.desc}</small>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('ai-input').placeholder = info.placeholder;
}

async function sendAiMessage() {
  const input = document.getElementById('ai-input');
  const text = input.value.trim();
  if (!text) return;
  
  input.value = '';
  
  // 顯示使用者訊息
  appendAiMessage(text, 'user');
  
  // 顯示思考中
  const thinkingId = 'thinking-' + Date.now();
  appendAiMessage(t('aiAssist.thinking'), 'ai', thinkingId);
  
  try {
    let response;
    const context = {
      session: robotSimulator.state.currentSession,
      objects: robotSimulator.state.detectedObjects,
      actions: robotSimulator.state.parsedActions,
      log: robotSimulator.state.simulationLog
    };
    
    switch (currentAiMode) {
      case 'designer':
        response = await aiTransport.chatWithAI([
          { role: 'system', content: `你是機械手臂指令設計師。協助使用者將想法轉化為精確的自然語言指令。
當前偵測物件：${context.objects.map(o => o.name).join(', ') || '無'}
建議使用標準動作：detect, pick, place, reset_home` },
          { role: 'user', content: text }
        ]);
        break;
      case 'planner':
        response = await aiTransport.chatWithAI([
          { role: 'system', content: `你是任務規劃師。協助將複雜任務分解為機械手臂可執行的步驟序列。` },
          { role: 'user', content: text }
        ]);
        break;
      case 'debugger':
        response = await aiTransport.chatWithAI([
          { role: 'system', content: `你是座標除錯器。解釋視覺座標轉換：像素 -> 世界座標。
校準：1px = ${ROBOT_VISION_CONFIG.pixelToMeter * 100}cm, 固定 Z = ${ROBOT_VISION_CONFIG.fixedZHeight}m
影像中心為原點 (0,0)，X 向右，Y 向上。` },
          { role: 'user', content: text }
        ]);
        break;
      case 'generator':
        if (context.log.length > 0) {
          const parsed = robotLogger.parseLogContent(context.log.join('\n'));
          const code = robotLogger.generatePythonCode(parsed);
          response = { choices: [{ message: { content: '```python\n' + code + '\n```' } }] };
        } else {
          response = { choices: [{ message: { content: '尚無模擬日誌可生成代碼。請先執行模擬。' } }] };
        }
        break;
      case 'lerobot':
        if (context.session) {
          const task = text || context.session.name || 'grab object and place';
          const code = robotLogger.generateLeRobotCode({ task, objects: context.objects, session: context.session });
          response = { choices: [{ message: { content: '```bash\n' + code + '\n```' } }] };
        } else {
          response = { choices: [{ message: { content: '請先建立或選擇工作階段，再生成 LeRobot 代碼。' } }] };
        }
        break;
      default:
        response = await aiTransport.chatWithAI([
          { role: 'user', content: text }
        ]);
    }
    
    // 移除思考中訊息
    removeAiMessage(thinkingId);
    
    // 顯示回應
    const content = response.choices?.[0]?.message?.content || '無回應';
    appendAiMessage(content, 'ai');
    
  } catch (err) {
    removeAiMessage(thinkingId);
    appendAiMessage('發生錯誤: ' + err.message, 'ai');
  }
}

// ===== LeRobot Code Generation =====
function showLeRobotCode() {
  const context = {
    session: robotSimulator.state.currentSession,
    objects: robotSimulator.state.detectedObjects,
    actions: robotSimulator.state.parsedActions,
    log: robotSimulator.state.simulationLog
  };
  
  if (!context.session) {
    showToast('請先建立或選擇工作階段', 'warning');
    return;
  }
  
  const task = context.session.name || 'grab object and place';
  const code = robotLogger.generateLeRobotCode({ task, objects: context.objects, session: context.session });
  
  // 在聊天區顯示
  const logMsg = {
    id: 'lerobot-' + Date.now(),
    user_id: 'system',
    sender_name: 'LeRobot 代碼生成器',
    message_type: 'robot_log',
    content: '```bash\n' + code + '\n```',
    metadata: { downloadUrl: null },
    created_at: new Date().toISOString()
  };
  render.appendMessage(document.getElementById('message-area'), logMsg, currentUser.id);
  showToast('LeRobot 代碼已生成', 'success');
}

// 也提供給 AI Assist 面板用
window.showLeRobotCode = showLeRobotCode;

function appendAiMessage(content, role, id = null) {
  const container = document.getElementById('ai-chat-messages');
  const div = document.createElement('div');
  div.className = `ai-message ${role}`;
  if (id) div.id = id;
  
  const isUser = role === 'user';
  div.innerHTML = `
    <div class="message-avatar" style="background:${isUser ? 'var(--robot-primary)' : 'var(--robot-info)'}">
      ${isUser ? '👤' : '🤖'}
    </div>
    <div class="message-bubble" style="max-width:100%">
      <div class="message-content">${render.renderMarkdown(content)}</div>
    </div>
  `;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [div] });
}

function removeAiMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ===== Modals =====
function showNewSessionModal() {
  const modal = document.getElementById('modal-new-session');
  modal.classList.remove('hidden');
  modal.classList.add('open');
  document.getElementById('new-session-name').focus();
  clearSessionImage();
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('open');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('open');
  }
}

function toggleTopbarMore() {
  const dropdown = document.getElementById('topbar-more-dropdown');
  const isOpen = dropdown.classList.toggle('open');
  if (isOpen) {
    dropdown.classList.remove('hidden');
  } else {
    dropdown.classList.add('hidden');
  }
}

function closeTopbarMore() {
  const dropdown = document.getElementById('topbar-more-dropdown');
  dropdown.classList.add('hidden');
  dropdown.classList.remove('open');
}

function hidePauseBanner() {
  document.getElementById('pause-banner').classList.add('hidden');
}

// ===== Demo Mode =====
function updateDemoBadge() {
  const badge = document.getElementById('demo-badge');
  if (badge) {
    const isDemo = window.HARMONY_DEMO_MODE === true || localStorage.getItem('harmony_demo_mode') === '1';
    if (isDemo) {
      badge.classList.remove('hidden');
      badge.textContent = 'DEMO';
    } else {
      badge.classList.add('hidden');
    }
  }
}

function toggleDemoMode() {
  const isDemo = !(window.HARMONY_DEMO_MODE === true || localStorage.getItem('harmony_demo_mode') === '1');
  window.HARMONY_DEMO_MODE = isDemo;
  localStorage.setItem('harmony_demo_mode', isDemo ? '1' : '0');
  updateDemoBadge();
  
  const msg = isDemo 
    ? 'Demo 模式已啟用：AI 回應為離線規則生成，不呼叫 API'
    : 'Demo 模式已關閉：恢復使用真實 AI API';
  showToast(msg, isDemo ? 'warning' : 'success');
  
  // 如果在 AI 面板，重新載入當前模式提示
  if (document.getElementById('ai-panel').classList.contains('open')) {
    loadAiMode(currentAiMode);
  }
}

// ===== Sidebar (Mobile) =====
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('active');
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// ===== Auth Functions =====
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('auth-error');
  
  errEl.textContent = '';
  
  const { error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = t('auth.error.invalidCredentials');
    errEl.style.color = 'var(--robot-error)';
  }
}

async function signup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('auth-error');
  
  errEl.textContent = '';
  
  if (password.length < 6) {
    errEl.textContent = t('auth.error.weakPassword');
    errEl.style.color = 'var(--robot-error)';
    return;
  }
  
  const { error } = await _supabase.auth.signUp({ 
    email, 
    password,
    data: { display_name: name, role: 'student' }
  });
  
  if (error) {
    errEl.textContent = error.message.includes('already registered') ? t('auth.error.emailExists') : error.message;
    errEl.style.color = 'var(--robot-error)';
  } else {
    showToast('註冊成功，請檢查信箱驗證', 'success');
    showLogin();
  }
}

function showLogin() {
  document.getElementById('form-login').classList.add('active');
  document.getElementById('form-signup').classList.remove('active');
  document.getElementById('auth-error').textContent = '';
}

function showSignup() {
  document.getElementById('form-login').classList.remove('active');
  document.getElementById('form-signup').classList.add('active');
  document.getElementById('auth-error').textContent = '';
}

async function guestLogin() {
  const { error } = await _supabase.auth.signInAnonymously();
  if (error) showToast('訪客登入失敗: ' + error.message, 'error');
}

async function logout() {
  await _supabase.auth.signOut();
}

// ===== Utility Functions =====
function togglePwdVis(btn) {
  const input = btn.parentElement.querySelector('input');
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [icon] });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${type === 'error' ? '錯誤' : type === 'success' ? '成功' : type === 'warning' ? '警告' : '資訊'}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()"><i data-lucide="x"></i></button>
  `;
  container.appendChild(toast);
  
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [toast] });
  
  // 自動移除
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ===== Download Log =====
function downloadCurrentLog() {
  if (robotSimulator.state.simulationLog.length > 0) {
    const content = robotSimulator.state.simulationLog.join('\n');
    robotLogger.downloadLogFile(content, `robot_command_log_${currentSessionId}_${robotLogger.formatDateForFilename(new Date())}.txt`);
    showToast(t('notification.logDownloaded'), 'success');
  } else {
    showToast('無可下載的日誌', 'warning');
  }
}

// ===== App Init =====
function initApp() {
  // Demo 模式徽章初始化
  updateDemoBadge();
  
  // 語言切換事件
  window.addEventListener('languagechange', () => {
    // 重新渲染動態內容
    if (currentSessionId) {
      loadSessions();
      loadMessages();
    }
  });
  
  // 點擊外部關閉 dropdown
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.topbar-more')) closeTopbarMore();
  });
  
  // Chat input auto-resize
  const chatInput = document.getElementById('chat-input');
  chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
  });
  
  // Enter to send (Shift+Enter for newline)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // AI input enter to send
  const aiInput = document.getElementById('ai-input');
  aiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAiMessage();
    }
  });
  
  // Drag and drop for session image
  const uploadArea = document.getElementById('upload-area');
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-over'), false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-over'), false);
  });
  
  uploadArea.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      document.getElementById('session-image-input').files = e.dataTransfer.files;
      handleSessionImageSelect(document.getElementById('session-image-input'));
    }
  }, false);
  
  console.log('Harmony ' + (window.APP_VERSION || 'v0.1.5') + ' initialized');
}

// 全域函數供 HTML 使用
window.initApp = initApp;
window.login = login;
window.signup = signup;
window.showLogin = showLogin;
window.showSignup = showSignup;
window.guestLogin = guestLogin;
window.logout = logout;
window.togglePwdVis = togglePwdVis;
window.setLanguage = window.setLanguage;
window.showModal = showModal;
window.closeModal = closeModal;
window.toggleTopbarMore = toggleTopbarMore;
window.closeTopbarMore = closeTopbarMore;
window.hidePauseBanner = hidePauseBanner;
window.toggleDemoMode = toggleDemoMode;
window.showLeRobotCode = showLeRobotCode;
window.switchView = switchView;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.showNewSessionModal = showNewSessionModal;
window.createSession = createSession;
window.deleteSession = deleteSession;
window.selectSession = selectSession;
window.runVision = runVision;
window.runSimulation = runSimulation;
window.sendMessage = sendMessage;
window.handleImageUpload = handleImageUpload;
window.toggleAiPanel = toggleAiPanel;
window.switchAiMode = switchAiMode;
window.sendAiMessage = sendAiMessage;
window.downloadCurrentLog = downloadCurrentLog;
window.clearSessionImage = clearSessionImage;

// Export for debugging
window.robotSimulator = robotSimulator;
window.robotVision = robotVision;
window.robotParser = robotParser;
window.robotLogger = robotLogger;
window.db = db;
window.aiTransport = aiTransport;