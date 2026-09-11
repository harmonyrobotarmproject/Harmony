// ===== Harmony Message Renderer =====
// 訊息渲染工具，支援 Markdown、程式碼高亮、特殊訊息類型

const render = {
  // 初始化 marked 設定
  init() {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
      });
    }
  },

  // 渲染單一訊息
  renderMessage(msg, currentUserId) {
    const isSelf = msg.user_id === currentUserId;
    const messageType = msg.message_type || 'text';
    
    const div = document.createElement('div');
    div.className = `message ${isSelf ? 'self' : 'other'} ${messageType !== 'text' ? messageType : ''}`;
    div.dataset.messageId = msg.id;
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = this.getInitials(msg.sender_name || 'User');
    avatar.style.background = isSelf ? 'var(--robot-primary)' : this.getAvatarColor(msg.user_id);
    
    // Bubble
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // Sender name (for other's messages)
    if (!isSelf && messageType !== 'system') {
      const sender = document.createElement('div');
      sender.className = 'message-sender';
      sender.textContent = msg.sender_name || 'Unknown';
      bubble.appendChild(sender);
    }
    
    // Content
    const content = document.createElement('div');
    content.className = 'message-content';
    
    switch (messageType) {
      case 'robot_command':
        content.innerHTML = this.renderRobotCommand(msg);
        break;
      case 'robot_log':
        content.innerHTML = this.renderRobotLog(msg);
        break;
      case 'robot_result':
        content.innerHTML = this.renderRobotResult(msg);
        break;
      case 'system':
        content.textContent = msg.content;
        break;
      default:
        content.innerHTML = this.renderMarkdown(msg.content);
    }
    
    bubble.appendChild(content);
    
    // Time
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = this.formatTime(msg.created_at);
    bubble.appendChild(time);
    
    div.appendChild(avatar);
    div.appendChild(bubble);
    
    return div;
  },

  // 渲染機械手臂指令訊息
  renderRobotCommand(msg) {
    const actions = msg.metadata?.actions || [];
    let html = `<div class="robot-command">`;
    html += `<div class="robot-command-header"><i data-lucide="cpu"></i> <strong>機械手臂指令序列</strong></div>`;
    html += `<ol class="robot-command-list">`;
    actions.forEach((action, i) => {
      const params = action.params || {};
      const coordStr = params.x !== undefined ? ` [${this.formatCoord(params.x)}, ${this.formatCoord(params.y)}, ${this.formatCoord(params.z)}]` : '';
      html += `<li><span class="step-num">${i + 1}.</span> <span class="action-name">${action.action}</span><span class="action-desc">${action.description || ''}</span><span class="action-coord">${coordStr}</span></li>`;
    });
    html += `</ol>`;
    if (msg.metadata?.sessionId) {
      html += `<button class="btn btn-sm btn-primary" onclick="runSimulation('${msg.metadata.sessionId}')"><i data-lucide="play"></i> 執行模擬</button>`;
    }
    html += `</div>`;
    return html;
  },

  // 渲染機械手臂日誌訊息
  renderRobotLog(msg) {
    const lines = msg.content?.split('\n') || [];
    let html = `<div class="robot-log">`;
    lines.forEach(line => {
      const cls = this.getLogLineClass(line);
      html += `<div class="log-line ${cls}">${this.escapeHtml(line)}</div>`;
    });
    html += `</div>`;
    html += `<div class="robot-log-actions" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">`;
    if (msg.metadata?.downloadUrl) {
      html += `<a href="${msg.metadata.downloadUrl}" class="btn btn-sm btn-outline" download><i data-lucide="download"></i> 下載日誌</a>`;
    }
    html += `<button class="btn btn-sm btn-primary" onclick="showLeRobotCode()"><i data-lucide="cpu"></i> 產出 LeRobot 代碼</button>`;
    html += `</div>`;
    return html;
  },

  // 渲染機械手臂結果訊息
  renderRobotResult(msg) {
    return `<div class="robot-result"><i data-lucide="check-circle" style="color:var(--robot-success)"></i> <strong>模擬完成</strong><br>${this.escapeHtml(msg.content)}</div>`;
  },

  // 判斷日誌行類別
  getLogLineClass(line) {
    if (line.startsWith('[') && line.includes(']')) return 'timestamp';
    if (line.startsWith('步驟')) return 'step';
    if (line.includes('成功') || line.includes('完成')) return 'success';
    if (line.includes('錯誤') || line.includes('失敗')) return 'error';
    if (line.includes('警告')) return 'warning';
    if (line.includes('座標') || line.includes('X:') || line.includes('Y:') || line.includes('Z:')) return 'coord';
    return 'info';
  },

  // 渲染 Markdown
  renderMarkdown(text) {
    if (!text) return '';
    if (typeof marked === 'undefined') return this.escapeHtml(text);
    const html = marked.parse(text);
    return DOMPurify.sanitize(html);
  },

  // 格式化座標顯示
  formatCoord(val) {
    if (typeof val !== 'number') return val;
    return val.toFixed(4);
  },

  // 格式化時間
  formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  // 取得首字母
  getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  },

  // 根據 userId 產生固定顏色
  getAvatarColor(userId) {
    const colors = [
      '#0066cc', '#00a86b', '#ff6b00', '#a371f7', '#f85149',
      '#39c5cf', '#d29922', '#3fb950', '#58a6ff'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  },

  // HTML 轉義
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // 渲染並插入訊息到區域
  appendMessage(area, msg, currentUserId) {
    const el = this.renderMessage(msg, currentUserId);
    area.appendChild(el);
    // 重新渲染 Lucide 圖示
    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ nodes: [el] });
    }
    // 自動捲動到底部
    area.scrollTop = area.scrollHeight;
  },

  // 渲染訊息列表
  renderMessages(area, messages, currentUserId) {
    area.innerHTML = '';
    messages.forEach(msg => {
      const el = this.renderMessage(msg, currentUserId);
      area.appendChild(el);
    });
    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ nodes: [area] });
    }
    area.scrollTop = area.scrollHeight;
  }
};

// 初始化
render.init();
window.render = render;