// ===== Harmony Module 3: Dummy Logger =====
// 模擬日誌記錄器 - 模擬 ROS 執行過程並生成文字日誌檔

const robotLogger = {
  // 執行模擬並生成日誌
  async executeSimulation(actions, detectedObjects, sessionId) {
    const logLines = [];
    const startTime = new Date();
    
    // 標題
    logLines.push(`========================================`);
    logLines.push(`Harmony Robot Arm Simulation Log`);
    logLines.push(`Session ID: ${sessionId}`);
    logLines.push(`Start Time: ${startTime.toISOString()}`);
    logLines.push(`========================================`);
    logLines.push('');

    // 物件資訊
    if (detectedObjects.length > 0) {
      logLines.push(`[DETECTED OBJECTS]`);
      detectedObjects.forEach(obj => {
        logLines.push(`  ${obj.name}:`);
        logLines.push(`    Pixel: [${obj.pixel[0]}, ${obj.pixel[1]}]`);
        logLines.push(`    World: [${obj.world[0].toFixed(4)}, ${obj.world[1].toFixed(4)}, ${obj.world[2].toFixed(4)}]`);
        logLines.push(`    Confidence: ${(obj.confidence * 100).toFixed(1)}%`);
      });
      logLines.push('');
    }

    // 執行步驟
    logLines.push(`[EXECUTION SEQUENCE]`);
    
    let stepNum = 1;
    const objectCoords = {};
    detectedObjects.forEach(obj => {
      objectCoords[obj.name] = obj.world;
    });

    for (const action of actions) {
      const stepStartTime = new Date();
      
      // 模擬執行延遲
      await this.simulateDelay(action.action);
      
      const stepEndTime = new Date();
      const duration = ((stepEndTime - stepStartTime) / 1000).toFixed(2);
      
      let logEntry = '';
      
      switch (action.action) {
        case 'detect': {
          const targetName = action.params?.target_name;
          const coords = objectCoords[targetName] || [0, 0, 0.05];
          logEntry = `步驟 ${stepNum}: 視覺辨識 '${targetName}' 成功，座標為 X:${coords[0].toFixed(4)}, Y:${coords[1].toFixed(4)}, Z:${coords[2].toFixed(4)} (耗時 ${duration}s)`;
          break;
        }
        case 'pick': {
          const { x, y, z } = action.params;
          logEntry = `步驟 ${stepNum}: 執行 pick 動作，目標位置 -> [${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}] (耗時 ${duration}s)`;
          break;
        }
        case 'place': {
          const { x, y, z } = action.params;
          logEntry = `步驟 ${stepNum}: 執行 place 動作，目標位置 -> [${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}] (耗時 ${duration}s)`;
          break;
        }
        case 'reset_home': {
          logEntry = `步驟 ${stepNum}: 執行 reset_home 動作，機械手臂復位 (耗時 ${duration}s)`;
          break;
        }
        case 'error': {
          logEntry = `步驟 ${stepNum}: ❌ ${action.description}`;
          break;
        }
        default: {
          logEntry = `步驟 ${stepNum}: 未知動作 ${action.action}`;
        }
      }
      
      logLines.push(logEntry);
      stepNum++;
    }

    // 結尾
    const endTime = new Date();
    const totalDuration = ((endTime - startTime) / 1000).toFixed(2);
    logLines.push('');
    logLines.push(`========================================`);
    logLines.push(`End Time: ${endTime.toISOString()}`);
    logLines.push(`Total Duration: ${totalDuration}s`);
    logLines.push(`Status: COMPLETED`);
    logLines.push(`========================================`);

    const logContent = logLines.join('\n');
    
    // 儲存到資料庫
    await this.saveLogToDB(sessionId, logContent, actions, detectedObjects);
    
    // 觸發下載
    this.downloadLogFile(logContent, `robot_command_log_${sessionId}_${this.formatDateForFilename(startTime)}.txt`);
    
    return {
      content: logContent,
      lines: logLines,
      duration: totalDuration
    };
  },

  // 模擬延遲
  async simulateDelay(actionType) {
    const delays = {
      detect: 800,
      pick: 1500,
      place: 1500,
      reset_home: 1000,
      error: 100
    };
    const delay = delays[actionType] || 500;
    // 加入隨機抖動 ±20%
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    await new Promise(resolve => setTimeout(resolve, delay + jitter));
  },

  // 儲存日誌到資料庫
  async saveLogToDB(sessionId, content, actions, detectedObjects) {
    try {
      await db.saveSimulationLog({
        session_id: sessionId,
        log_content: content,
        actions: actions,
        detected_objects: detectedObjects.map(o => ({
          name: o.name,
          pixel: o.pixel,
          world: o.world
        })),
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to save log to DB:', err);
    }
  },

  // 下載日誌檔案
  downloadLogFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // 格式化日期用於檔名
  formatDateForFilename(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hour}${minute}`;
  },

  // 從資料庫讀取歷史日誌
  async getHistoryLogs(sessionId) {
    return db.getSimulationLogs(sessionId);
  },

  // 解析日誌內容 (用於代碼生成器)
  parseLogContent(logContent) {
    const lines = logContent.split('\n');
    const parsed = {
      sessionId: '',
      startTime: '',
      endTime: '',
      objects: [],
      steps: []
    };

    let inObjects = false;
    let inExecution = false;

    lines.forEach(line => {
      if (line.includes('Session ID:')) {
        parsed.sessionId = line.split('Session ID:')[1].trim();
      } else if (line.includes('Start Time:')) {
        parsed.startTime = line.split('Start Time:')[1].trim();
      } else if (line.includes('End Time:')) {
        parsed.endTime = line.split('End Time:')[1].trim();
      } else if (line.includes('[DETECTED OBJECTS]')) {
        inObjects = true;
        inExecution = false;
      } else if (line.includes('[EXECUTION SEQUENCE]')) {
        inObjects = false;
        inExecution = true;
      } else if (inObjects && line.trim().startsWith('  ') && !line.trim().startsWith('    ')) {
        // 物件名稱行
        const name = line.trim().replace(':', '');
        parsed.objects.push({ name, pixel: [], world: [] });
      } else if (inObjects && line.includes('World:')) {
        const match = line.match(/World:\s*\[([\d\.\-]+),\s*([\d\.\-]+),\s*([\d\.\-]+)\]/);
        if (match && parsed.objects.length > 0) {
          parsed.objects[parsed.objects.length - 1].world = [
            parseFloat(match[1]),
            parseFloat(match[2]),
            parseFloat(match[3])
          ];
        }
      } else if (inExecution && line.startsWith('步驟')) {
        parsed.steps.push(line.trim());
      }
    });

    return parsed;
  },

  // 生成 Python 代碼 (給 AI Assist 代碼生成器用)
  generatePythonCode(parsedLog) {
    let code = `# Harmony Robot Arm Simulation - Generated Python Code\n`;
    code += `# Session: ${parsedLog.sessionId}\n`;
    code += `# Generated: ${new Date().toISOString()}\n\n`;
    
    code += `import time\n`;
    code += `import numpy as np\n\n`;
    
    code += `# Robot configuration\n`;
    code += `ROBOT_BASE_FRAME = "base_link"\n`;
    code += `GRIPPER_FRAME = "gripper_link"\n\n`;
    
    // Define detected object positions
    code += `# Detected object positions (meters)\n`;
    parsedLog.objects.forEach(obj => {
      code += `OBJ_${obj.name.toUpperCase().replace(/\s+/g, '_')} = np.array([${obj.world[0].toFixed(4)}, ${obj.world[1].toFixed(4)}, ${obj.world[2].toFixed(4)}])\n`;
    });
    code += `\n`;
    
    code += `def move_to(position, speed=0.5):\n`;
    code += `    """Move robot to target position\"\"\"\n`;
    code += `    print(f"Moving to {position}")\n`;
    code += `    time.sleep(2)  # Simulate movement\n`;
    code += `    return True\n\n`;
    
    code += `def gripper_action(action):\n`;
    code += `    """Control gripper: 'open' or 'close'\"\"\"\n`;
    code += `    print(f"Gripper {action}")\n`;
    code += `    time.sleep(0.5)\n`;
    code += `    return True\n\n`;
    
    code += `def main():\n`;
    code += `    print("Starting robot simulation...")\n`;
    code += `    \n`;
    
    parsedLog.steps.forEach(step => {
      if (step.includes('視覺辨識')) {
        const match = step.match(/視覺辨識\s+'([^']+)'/);
        if (match) {
          code += `    # ${step}\n`;
          code += `    target_pos = OBJ_${match[1].toUpperCase().replace(/\s+/g, '_')}\n`;
          code += `    move_to(target_pos)\n`;
          code += `    \n`;
        }
      } else if (step.includes('pick 動作')) {
        code += `    # ${step}\n`;
        code += `    gripper_action('close')\n`;
        code += `    \n`;
      } else if (step.includes('place 動作')) {
        code += `    # ${step}\n`;
        code += `    gripper_action('open')\n`;
        code += `    \n`;
      } else if (step.includes('reset_home')) {
        code += `    # ${step}\n`;
        code += `    move_to(np.array([0.0, 0.0, 0.3]))  # Home position\n`;
        code += `    \n`;
      }
    });
    
    code += `    print("Simulation completed")\n`;
    code += `    return True\n\n`;
    
    code += `if __name__ == "__main__":\n`;
    code += `    main()\n`;
    
    return code;
  },

  // 生成 LeRobot CLI 代碼 (給 AI Assist LeRobot 分頁與模擬後按鈕用)
  generateLeRobotCode(context) {
    const { task, objects = [], session } = context || {};
    const cfg = DEMO_CONFIG?.lerobot || {};
    
    const followerPort = cfg.followerPort || 'COM5';
    const leaderPort = cfg.leaderPort || 'COM6';
    const followerId = cfg.followerId || 'my_awesome_follower_arm';
    const leaderId = cfg.leaderId || 'my_awesome_leader_arm';
    const episodes = cfg.datasetEpisodes || 30;
    const fps = cfg.datasetFps || 30;
    const trainSteps = cfg.trainSteps || 300000;
    const batchSize = cfg.trainBatchSize || 8;
    const saveFreq = cfg.saveFreq || 5000;

    const sessionName = session?.name || 'session';
    const safeName = sessionName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const repoId = `local/${safeName}_${Date.now().toString(36)}`;
    const datasetRoot = `dataset/${safeName}`;

    const taskDesc = task || sessionName || 'grab object and place';
    const singleTask = taskDesc.replace(/"/g, '\\"');

    let code = `# ===== LeRobot SO-101 代碼生成 (Harmony) =====\n`;
    code += `# 任務: ${singleTask}\n`;
    code += `# 生成時間: ${new Date().toISOString()}\n`;
    code += `# 工作階段: ${sessionName}\n\n`;

    // 偵測物件座標註解
    if (objects.length > 0) {
      code += `# 偵測物件座標:\n`;
      objects.forEach(obj => {
        if (obj.world) {
          code += `#   ${obj.name}: [${obj.world[0].toFixed(4)}, ${obj.world[1].toFixed(4)}, ${obj.world[2].toFixed(4)}] m\n`;
        }
      });
      code += `\n`;
    }

    code += `lerobot-find-port\n\n`;

    // 校正
    code += `# 校正 (請依環境調整 COM 埠)\n`;
    code += `lerobot-calibrate --robot.type=so101_follower --robot.port=${followerPort} --robot.id=${followerId}\n`;
    code += `lerobot-calibrate --teleop.type=so101_leader --teleop.port=${leaderPort} --teleop.id=${leaderId}\n\n`;

    // 測試雙臂
    code += `# 測試雙臂遙操作\n`;
    code += `python -m lerobot.teleoperate \\\n`;
    code += `  --robot.type=so101_follower --robot.port=${followerPort} --robot.id=${followerId} \\\n`;
    code += `  --teleop.type=so101_leader --teleop.port=${leaderPort} --teleop.id=${leaderId} \\\n`;
    code += `  --display_data=true\n\n`;

    // 錄製資料集
    code += `# 錄製資料集 (停止遙操作後執行，確保 COM${followerPort}/${leaderPort} 空閒)\n`;
    code += `python -m lerobot.record \\\n`;
    code += `  --robot.type=so101_follower --robot.port=${followerPort} --robot.id=${followerId} \\\n`;
    code += `  --robot.cameras="{ handeye: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: ${fps}, warmup_s: 3}, fixed: {type: opencv, index_or_path: 1, width: 640, height: 480, fps: ${fps}, warmup_s: 3}}" \\\n`;
    code += `  --teleop.type=so101_leader --teleop.port=${leaderPort} --teleop.id=${leaderId} \\\n`;
    code += `  --display_data=true --play_sounds=false \\\n`;
    code += `  --dataset.repo_id=${repoId} \\\n`;
    code += `  --dataset.root=${datasetRoot} \\\n`;
    code += `  --dataset.num_episodes=${episodes} \\\n`;
    code += `  --dataset.single_task="${singleTask}" \\\n`;
    code += `  --dataset.fps=${fps} --dataset.push_to_hub=false\n\n`;

    // 訓練 (from scratch)
    code += `# 訓練 ACT 策略 (from scratch)\n`;
    code += `python src/lerobot/scripts/train.py \\\n`;
    code += `  --dataset.repo_id=${repoId} \\\n`;
    code += `  --dataset.root=${datasetRoot} \\\n`;
    code += `  --dataset.auto_drop_static_start=true \\\n`;
    code += `  --dataset.motion_threshold=1.0 \\\n`;
    code += `  --policy.type=act \\\n`;
    code += `  --output_dir=outputs/train/${safeName} \\\n`;
    code += `  --job_name="${singleTask}" \\\n`;
    code += `  --policy.device=cuda --wandb.enable=false --policy.push_to_hub=false \\\n`;
    code += `  --batch_size=${batchSize} --steps=${trainSteps} --save_freq=${saveFreq}\n\n`;

    // 測試雙臂 (再次)
    code += `# 測試訓練後模型 (雙臂遙操作)\n`;
    code += `python -m lerobot.teleoperate \\\n`;
    code += `  --robot.type=so101_follower --robot.port=${followerPort} --robot.id=${followerId} \\\n`;
    code += `  --teleop.type=so101_leader --teleop.port=${leaderPort} --teleop.id=${leaderId} \\\n`;
    code += `  --display_data=true\n`;

    return code;
  }
};

window.robotLogger = robotLogger;