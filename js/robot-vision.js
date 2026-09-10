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

  // 在 Canvas 上繪製偵測結果
  drawDetections(detections) {
    if (!this.ctx || !this.currentImage) return;

    // 重繪原圖
    this.ctx.drawImage(this.currentImage, 0, 0);

    detections.forEach(det => {
      const { bbox, name, color, confidence, pixel } = det;
      const width = bbox.x2 - bbox.x1;
      const height = bbox.y2 - bbox.y1;

      // 繪製邊界框
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(bbox.x1, bbox.y1, width, height);

      // 繪製標籤背景
      this.ctx.fillStyle = color;
      const label = `${name} ${(confidence * 100).toFixed(0)}%`;
      const textMetrics = this.ctx.measureText(label);
      this.ctx.fillRect(bbox.x1, bbox.y1 - 24, textMetrics.width + 10, 24);

      // 繪製標籤文字
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '14px JetBrains Mono, monospace';
      this.ctx.fillText(label, bbox.x1 + 5, bbox.y1 - 6);

      // 繪製中心點
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

  // 取得帶有偵測標記的圖片
  getAnnotatedImage(detections) {
    this.drawDetections(detections);
    return this.canvas.toDataURL('image/png');
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