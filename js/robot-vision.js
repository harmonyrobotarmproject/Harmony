// ===== Harmony Module 1: Vision & Coordinate Mapper =====
// 視覺與座標轉換器 - 模擬 YOLO 物件偵測與像素到世界座標映射

const robotVision = {
  // 當前影像資料
  currentImage: null,
  currentImageData: null,
  canvas: null,
  ctx: null,

  // 初始化 Canvas
  initCanvas() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
  },

  // 處理上傳的圖片檔案
  async processImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.currentImage = img;
          this.currentImageData = e.target.result;
          this.initCanvas();
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          this.ctx.drawImage(img, 0, 0);
          
          resolve({
            width: img.width,
            height: img.height,
            dataUrl: e.target.result
          });
        };
        img.onerror = () => reject(new Error('圖片載入失敗'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsDataURL(file);
    });
  },

  // 模擬物件偵測 (模擬 YOLOv8)
  async detectObjects(targetNames = []) {
    if (!this.currentImage) {
      throw new Error('No image loaded');
    }

    const config = ROBOT_VISION_CONFIG;
    const results = [];

    // 如果有指定目標名稱，只偵測那些
    // 否則偵測所有模擬物件
    const objectsToDetect = targetNames.length > 0 
      ? targetNames 
      : Object.keys(config.mockObjects);

    for (const name of objectsToDetect) {
      const mock = config.mockObjects[name];
      if (!mock) continue;

      // 模擬偵測延遲
      await this.sleep(100);

      const pixelCoords = [mock.u, mock.v];
      const worldCoords = this.pixelToWorld(pixelCoords[0], pixelCoords[1]);

      results.push({
        name,
        pixel: pixelCoords,
        world: worldCoords,
        confidence: 0.95, // 模擬高信心度
        color: mock.color,
        bbox: this.calculateBbox(mock.u, mock.v)
      });
    }

    return results;
  },

  // 像素座標轉世界座標
  pixelToWorld(u, v) {
    const config = ROBOT_VISION_CONFIG;
    const cx = config.imageWidth / 2;
    const cy = config.imageHeight / 2;
    
    // 原點置中，Y 軸反轉 (影像座標系 -> 世界座標系)
    const x = (u - cx) * config.pixelToMeter;
    const y = (cy - v) * config.pixelToMeter;
    const z = config.fixedZHeight;

    return [parseFloat(x.toFixed(4)), parseFloat(y.toFixed(4)), z];
  },

  // 世界座標轉像素座標 (反向)
  worldToPixel(x, y) {
    const config = ROBOT_VISION_CONFIG;
    const cx = config.imageWidth / 2;
    const cy = config.imageHeight / 2;
    
    const u = Math.round(x / config.pixelToMeter + cx);
    const v = Math.round(cy - y / config.pixelToMeter);
    
    return [u, v];
  },

  // 計算邊界框
  calculateBbox(u, v, size = 40) {
    return {
      x1: Math.max(0, u - size),
      y1: Math.max(0, v - size),
      x2: Math.min(ROBOT_VISION_CONFIG.imageWidth, u + size),
      y2: Math.min(ROBOT_VISION_CONFIG.imageHeight, v + size)
    };
  },

  // 繪製合成「桌面俯視」背景 (Demo 模式 / 無真實圖片時)
  drawSyntheticBackground(detections) {
    const config = ROBOT_VISION_CONFIG;
    const w = config.imageWidth;
    const h = config.imageHeight;
    const ctx = this.ctx;

    // 背景漸層 (模擬桌面材質)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#3a3f47');
    grad.addColorStop(0.5, '#2f343c');
    grad.addColorStop(1, '#252930');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 輕微網格線 (給深度感)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 畫出每個物件的「實心形狀」 (模擬 webcam 真的看到的物體)
    detections.forEach(det => {
      const { pixel, color, bbox } = det;
      const cx = pixel[0];
      const cy = pixel[1];
      const r = Math.max(12, Math.min((bbox.x2 - bbox.x1) / 2, (bbox.y2 - bbox.y1) / 2));

      // 物體陰影 (偏移 3px)
      ctx.beginPath();
      ctx.arc(cx + 3, cy + 3, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();

      // 物體主體 (依 color 填色)
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      g.addColorStop(0, this.lightenColor(color, 40));
      g.addColorStop(1, color);
      ctx.fillStyle = g;
      ctx.fill();

      // 高光
      ctx.beginPath();
      ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    });
  },

  // 輔助：把 hex color 變亮
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + percent);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
    const b = Math.min(255, (num & 0x0000FF) + percent);
    return `rgb(${r},${g},${b})`;
  },

  // 在 Canvas 上繪製偵測結果 (支援無 currentImage 的合成模式)
  drawDetections(detections) {
    // 確保 canvas / ctx 存在
    if (!this.canvas) this.initCanvas();

    const config = ROBOT_VISION_CONFIG;
    const hasImage = !!this.currentImage;

    if (hasImage) {
      // 真實圖片模式：canvas 依圖片尺寸
      this.canvas.width = this.currentImage.width;
      this.canvas.height = this.currentImage.height;
      this.ctx.drawImage(this.currentImage, 0, 0);
    } else {
      // Demo / 合成模式：固定 config 尺寸
      this.canvas.width = config.imageWidth;
      this.canvas.height = config.imageHeight;
      this.drawSyntheticBackground(detections);
    }

    // 疊加偵測框、標籤、中心點
    detections.forEach(det => {
      const { bbox, name, color, confidence, pixel } = det;
      const width = bbox.x2 - bbox.x1;
      const height = bbox.y2 - bbox.y1;

      // 邊界框
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(bbox.x1, bbox.y1, width, height);

      // 標籤背景
      this.ctx.fillStyle = color;
      const label = `${name} ${(confidence * 100).toFixed(0)}%`;
      const textMetrics = this.ctx.measureText(label);
      this.ctx.fillRect(bbox.x1, bbox.y1 - 24, textMetrics.width + 10, 24);

      // 標籤文字
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '14px JetBrains Mono, monospace';
      this.ctx.fillText(label, bbox.x1 + 5, bbox.y1 - 6);

      // 中心點
      this.ctx.beginPath();
      this.ctx.arc(pixel[0], pixel[1], 5, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });

    return this.canvas.toDataURL('image/png');
  },

  // 取得帶有偵測標記的圖片 (統一回傳 dataURL，自動處理有無圖片)
  getAnnotatedImage(detections) {
    return this.drawDetections(detections);
  },

  // 睡眠工具
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 重置
  reset() {
    this.currentImage = null;
    this.currentImageData = null;
    if (this.canvas) {
      this.canvas.width = 0;
      this.canvas.height = 0;
    }
  }
};

window.robotVision = robotVision;