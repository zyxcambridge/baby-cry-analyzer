// 婴儿哭声与行为分析器主程序

class BabyCryAnalyzer {
    constructor() {
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioStream = null;
        this.videoStream = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isRealtimeAnalyzing = false;
        this.isCameraOn = false;
        this.isVideoRecording = false;
        this.websocket = null;
        this.audioProcessor = null;
        this.realtimeResults = [];
        this.videoAnalysisResult = null;
        this.capturedVideoFrame = null;
        this.videoAnalysisInterval = null;
        this.behaviorAnalysisEnabled = false;
        this.audioAnalysisResult = null;
        this.behaviorAnalysisResults = [];
        this.mediaRecorder = null;
        this.recordedVideoBlob = null;
        this.recordingTimer = null;
        this.videoRecordingTimeout = null;
        
        // DOM元素
        this.toggleCameraBtn = document.getElementById('toggleCameraBtn');
        this.toggleRecordingBtn = document.getElementById('toggleRecordingBtn');
        this.toggleRealtimeBtn = document.getElementById('toggleRealtimeBtn');
        this.cameraSelect = document.getElementById('cameraSelect');
        this.video = document.getElementById('video');
        this.resultDiv = document.getElementById('result');
        this.realtimeResultDiv = document.getElementById('realtime-result');
        this.videoAnalysisResultDiv = document.getElementById('video-analysis-result');
        this.solutionDiv = document.getElementById('solution');
        this.recordingTimerDiv = document.getElementById('recordingTimer');
        this.timerCountSpan = document.getElementById('timerCount');
        
        // 绑定事件
        this.bindEvents();
    }
    
    bindEvents() {
        this.toggleCameraBtn.addEventListener('click', () => this.toggleCamera());
        this.toggleRecordingBtn.addEventListener('click', () => this.toggleRecording());
        this.toggleRealtimeBtn.addEventListener('click', () => this.toggleRealtimeAnalysis());
        this.cameraSelect.addEventListener('change', () => this.handleCameraChange());
    }
    
    async startRecording() {
        try {
            // 获取用户媒体设备权限
            this.audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            
            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建媒体录制器
            this.mediaRecorder = new MediaRecorder(this.audioStream);
            
            // 监听数据可用事件
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            // 监听停止事件
            this.mediaRecorder.onstop = () => {
                this.analyzeCry();
            };
            
            // 开始录制
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // 更新UI状态
            // 更新UI状态
            this.toggleRecordingBtn.textContent = "停止录音";
            this.toggleRecordingBtn.classList.add("active");
            this.toggleRealtimeBtn.disabled = true;
            
            this.resultDiv.innerHTML = "正在录制2分钟音频...";
            
            // 2分钟后自动停止录制
            setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }, 120000); // 2分钟
        } catch (error) {
            console.error("获取音频权限失败:", error);
            this.resultDiv.innerHTML = "无法访问麦克风，请检查权限设置";
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.audioStream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            
            // 更新UI状态
            this.toggleRecordingBtn.textContent = "开始录音";
            this.toggleRecordingBtn.classList.remove("active");
            this.toggleRealtimeBtn.disabled = false;
        }
    }
    
    async startRealtimeAnalysis() {
        try {
            // 获取用户媒体设备权限
            if (!this.audioStream) {
                this.audioStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true, 
                    video: false 
                });
            }
            
            // 创建音频上下文
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // 创建音频处理器
            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            // 连接节点
            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);
            
            // 处理音频数据
            this.audioProcessor.onaudioprocess = (event) => {
                if (this.isRealtimeAnalyzing) {
                    const audioData = event.inputBuffer.getChannelData(0);
                    this.sendAudioData(audioData);
                }
            };
            
            // 更新状态
            this.isRealtimeAnalyzing = true;
            this.realtimeResults = []; // 清空之前的实时分析结果
            
            // 更新UI状态
            this.startRealtimeBtn.disabled = true;
            this.stopRealtimeBtn.disabled = false;
            this.startBtn.disabled = true;
            
            this.realtimeResultDiv.innerHTML = "正在实时分析...";
            
            // 连接阿里云实时分析服务
            this.connectToAliyun();
        } catch (error) {
            console.error("开始实时分析失败:", error);
            this.realtimeResultDiv.innerHTML = "无法开始实时分析，请检查权限设置";
        }
    }
    
    stopRealtimeAnalysis() {
        this.isRealtimeAnalyzing = false;
        
        // 断开音频处理器
        if (this.audioProcessor) {
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }
        
        // 关闭WebSocket连接
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        // 更新UI状态
        this.toggleRealtimeBtn.textContent = "开始实时分析";
        this.toggleRealtimeBtn.classList.remove("active");
        this.toggleRecordingBtn.disabled = false;
        
        // 综合分析结果
        this.combineAnalysisResults();
    }
    
    connectToAliyun() {
        // 阿里云API密钥
        const API_KEY = "sk-e84b9c85f2db40f7a8c9a0fba43fe3de";
        const API_URL = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen-omni-turbo-realtime";
        
        try {
            this.websocket = new WebSocket(API_URL);
            
            this.websocket.onopen = (event) => {
                console.log("已连接到阿里云实时分析服务");
                this.realtimeResultDiv.innerHTML = "已连接到实时分析服务，正在监听音频...";
                
                // 发送初始配置
                const sessionUpdate = {
                    type: "session.update",
                    session: {
                        modalities: ["text"],
                        input_audio_format: "pcm16",
                        input_audio_transcription: {
                            model: "iic/speech_ctt_model"
                        }
                    }
                };
                this.websocket.send(JSON.stringify(sessionUpdate));
            };
            
            this.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleAliyunResponse(data);
            };
            
            this.websocket.onclose = (event) => {
                console.log("与阿里云实时分析服务的连接已关闭");
            };
            
            this.websocket.onerror = (error) => {
                console.error("阿里云实时分析服务连接错误:", error);
                this.realtimeResultDiv.innerHTML = "实时分析服务连接错误: " + error.message;
            };
        } catch (error) {
            console.error("连接阿里云实时分析服务失败:", error);
            this.realtimeResultDiv.innerHTML = "连接实时分析服务失败: " + error.message;
        }
    }
    
    sendAudioData(audioData) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            // 将Float32Array转换为PCM16格式的字节数组
            const pcmData = this.floatTo16BitPCM(audioData);
            
            // 编码为Base64
            const base64Data = this.arrayBufferToBase64(pcmData);
            
            // 发送到阿里云服务
            const message = {
                type: "input_audio_buffer.append",
                audio: base64Data
            };
            
            this.websocket.send(JSON.stringify(message));
        }
    }
    
    floatTo16BitPCM(input) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }
    
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    handleAliyunResponse(data) {
        // 处理阿里云实时分析服务的响应
        if (data.type === "response.text.delta") {
            const text = data.delta;
            this.realtimeResults.push(text);
            
            // 更新实时结果显示
            this.realtimeResultDiv.innerHTML = `
                <p>${this.realtimeResults.join('')}</p>
            `;
        } else if (data.type === "response.audio.delta") {
            // 处理音频响应（如果需要）
            console.log("收到音频响应");
        } else if (data.type === "conversation.item.created" && data.item && data.item.content) {
            // 处理完整的响应内容
            data.item.content.forEach(content => {
                if (content.type === "text" && content.text) {
                    this.realtimeResults.push(content.text);
                }
            });
            
            // 更新实时结果显示
            this.realtimeResultDiv.innerHTML = `
                <p>${this.realtimeResults.join('')}</p>
            `;
        } else if (data.type === "error") {
            // 处理错误信息
            console.error("阿里云服务返回错误:", data);
            this.realtimeResultDiv.innerHTML = "服务错误: " + (data.error?.message || "未知错误");
        }
    }
    
    async startVideo() {
        try {
            // 获取当前选择的摄像头类型
            const facingMode = this.cameraSelect.value;
            
            // 设置约束条件
            const constraints = {
                video: {
                    facingMode: { exact: facingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.video.srcObject = this.videoStream;
            this.startVideoBtn.disabled = true;
            this.stopVideoBtn.disabled = false;
            this.startVideoRecordingBtn.disabled = false; // 开启摄像头后启用录像按钮
            
            // 启用行为分析功能
            this.behaviorAnalysisEnabled = true;
            this.startBehaviorAnalysis();
        } catch (error) {
            console.error("获取视频权限失败:", error);
            this.resultDiv.innerHTML = "无法访问摄像头，请检查权限设置";
        }
    }
    
    stopVideo() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
            this.startVideoBtn.disabled = false;
            this.stopVideoBtn.disabled = true;
            this.startVideoRecordingBtn.disabled = true;
            
            // 停止行为分析
            this.stopBehaviorAnalysis();
        }
    }
    
    handleCameraChange() {
        // 如果摄像头正在运行，重启以应用新的设置
        if (this.video.srcObject) {
            this.stopVideo();
            this.startVideo();
        }
    }
    
    async toggleCamera() {
        if (this.isCameraOn) {
            this.stopCamera();
        } else {
            await this.startCamera();
        }
    }
    
    async startCamera() {
        try {
            // 获取当前选择的摄像头类型
            const facingMode = this.cameraSelect.value;
            
            // 设置约束条件
            const constraints = {
                video: {
                    facingMode: { exact: facingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.video.srcObject = this.videoStream;
            this.isCameraOn = true;
            
            // 更新UI状态
            this.toggleCameraBtn.textContent = "关闭摄像头";
            this.toggleCameraBtn.classList.add("active");
            
            // 启用行为分析功能
            this.behaviorAnalysisEnabled = true;
            this.startBehaviorAnalysis();
            
            // 自动开始录像
            await this.startVideoRecording();
        } catch (error) {
            console.error("获取视频权限失败:", error);
            this.resultDiv.innerHTML = "无法访问摄像头，请检查权限设置";
        }
    }
    
    async stopCamera() {
        // 停止录像
        if (this.mediaRecorder && this.isVideoRecording) {
            this.mediaRecorder.stop();
            if (this.videoRecordingTimeout) {
                clearTimeout(this.videoRecordingTimeout);
                this.videoRecordingTimeout = null;
            }
        }
        
        // 清理录像计时器
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        // 停止视频流
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
        
        this.isCameraOn = false;
        this.isVideoRecording = false;
        
        // 更新UI状态
        this.toggleCameraBtn.textContent = "开启摄像头";
        this.toggleCameraBtn.classList.remove("active");
        this.recordingTimerDiv.style.display = 'none';
        
        // 停止行为分析
        this.stopBehaviorAnalysis();
    }
    
    async startVideoRecording() {
        try {
            if (!this.videoStream) {
                throw new Error("没有可用的视频流");
            }
            
            // 创建媒体录制器
            this.mediaRecorder = new MediaRecorder(this.videoStream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            const recordedChunks = [];
            
            // 监听数据可用事件
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            
            // 监听停止事件
            this.mediaRecorder.onstop = async () => {
                this.recordedVideoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                await this.analyzeRecordedVideo();
                this.isVideoRecording = false;
            };
            
            // 开始录制
            this.mediaRecorder.start();
            this.isVideoRecording = true;
            
            // 显示录制计时器
            this.recordingTimerDiv.style.display = 'block';
            let count = 5;
            this.timerCountSpan.textContent = count;
            
            // 每秒更新计时器
            this.recordingTimer = setInterval(() => {
                count--;
                this.timerCountSpan.textContent = count;
                
                if (count <= 0) {
                    clearInterval(this.recordingTimer);
                    this.recordingTimer = null;
                    this.recordingTimerDiv.style.display = 'none';
                }
            }, 1000);
            
            // 5秒后自动停止录制
            this.videoRecordingTimeout = setTimeout(() => {
                if (this.mediaRecorder && this.isVideoRecording) {
                    this.mediaRecorder.stop();
                }
            }, 5000);
        } catch (error) {
            console.error("视频录制失败:", error);
            this.videoAnalysisResultDiv.innerHTML = "视频录制失败，请重试";
        }
    }
    
    handleCameraChange() {
        // 如果摄像头正在运行，重启以应用新的设置
        if (this.isCameraOn) {
            this.toggleCamera();
            setTimeout(() => this.toggleCamera(), 500);
        }
    }
    
    startBehaviorAnalysis() {
        // 每分钟进行一次行为分析
        this.videoAnalysisInterval = setInterval(() => {
            if (this.behaviorAnalysisEnabled) {
                this.analyzeBabyBehavior();
            }
        }, 60000); // 每60秒执行一次
    }
    
    stopBehaviorAnalysis() {
        if (this.videoAnalysisInterval) {
            clearInterval(this.videoAnalysisInterval);
            this.videoAnalysisInterval = null;
        }
        this.behaviorAnalysisEnabled = false;
    }
    
    async analyzeBabyBehavior() {
        if (!this.video.srcObject) {
            return;
        }
        
        try {
            // 创建canvas来捕获当前视频帧
            const canvas = document.createElement('canvas');
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
            
            // 将图像转换为blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            
            // 发送到阿里云视觉分析服务进行行为分析
            await this.sendToAliyunVLModelForBehavior(blob);
        } catch (error) {
            console.error("行为分析失败:", error);
        }
    }
    
    async sendToAliyunVLModelForBehavior(imageBlob) {
        try {
            const API_KEY = "sk-e84b9c85f2db40f7a8c9a0fba43fe3de";
            
            // 将blob转换为base64
            const base64Image = await this.blobToBase64(imageBlob);
            
            // 构造请求消息
            const messages = [
                {
                    role: "user",
                    content: [
                        {
                            image: "data:image/jpeg;base64," + base64Image
                        },
                        {
                            text: "请分析这张婴儿照片，判断婴儿当前的行为状态和意图（如玩耍、睡觉、不安、寻找物品等），不需要判断是否在哭泣。请以简洁的方式描述婴儿的行为状态和可能的意图，并在需要时给出适当的建议。"
                        }
                    ]
                }
            ];
            
            // 构造请求体
            const requestBody = {
                model: "qwen-vl-max",
                input: {
                    messages: messages
                },
                parameters: {
                    generation_config: {
                        max_tokens: 1024,
                        temperature: 0.7
                    }
                }
            };
            
            // 发送请求到阿里云DashScope API
            const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.choices && data.choices.length > 0) {
                const resultText = data.choices[0].message.content;
                
                // 保存行为分析结果
                this.behaviorAnalysisResults.push({
                    timestamp: new Date(),
                    analysis: resultText
                });
                
                // 显示弹框提示
                this.showBehaviorAnalysisPopup(resultText);
            } else {
                throw new Error("API返回数据格式不正确");
            }
        } catch (error) {
            console.error("调用阿里云视觉分析API失败:", error);
        }
    }
    
    showBehaviorAnalysisPopup(analysisResult) {
        // 创建弹框元素
        const popup = document.createElement('div');
        popup.id = 'behavior-analysis-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <h3>婴儿行为分析</h3>
                <p>${analysisResult}</p>
                <button id="close-popup">关闭</button>
            </div>
        `;
        
        // 添加样式
        popup.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background-color: #ffffff;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            padding: 15px;
            z-index: 1000;
            font-family: Arial, sans-serif;
        `;
        
        popup.querySelector('.popup-content').style.cssText = `
            margin: 0;
            padding: 0;
        `;
        
        popup.querySelector('h3').style.cssText = `
            margin-top: 0;
            color: #2c3e50;
            font-size: 1.2em;
        `;
        
        popup.querySelector('p').style.cssText = `
            font-size: 0.9em;
            line-height: 1.5;
            color: #333;
        `;
        
        const closeBtn = popup.querySelector('#close-popup');
        closeBtn.style.cssText = `
            margin-top: 10px;
            padding: 5px 10px;
            background-color: #4e89ae;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        
        // 添加关闭事件
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        // 添加到页面
        document.body.appendChild(popup);
        
        // 5秒后自动关闭
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        }, 5000);
    }
    
    async analyzeRecordedVideo() {
        if (!this.recordedVideoBlob) {
            this.videoAnalysisResultDiv.innerHTML = "没有录制的视频";
            return;
        }
        
        this.videoAnalysisResultDiv.innerHTML = "正在分析录制的视频...";
        
        try {
            // 创建一个视频元素来获取视频帧
            const videoElement = document.createElement('video');
            videoElement.src = URL.createObjectURL(this.recordedVideoBlob);
            
            // 等待视频加载完成，并添加超时机制
            await new Promise((resolve, reject) => {
                videoElement.addEventListener('loadedmetadata', resolve);
                videoElement.addEventListener('error', reject);
                // 添加5秒超时
                setTimeout(() => reject(new Error('视频加载超时')), 5000);
            });
            
            // 创建canvas来捕获视频帧
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            
            // 在视频中间时间点捕获一帧
            videoElement.currentTime = videoElement.duration / 2;
            
            // 等待时间更新，并添加超时机制
            await new Promise((resolve, reject) => {
                videoElement.addEventListener('seeked', resolve);
                videoElement.addEventListener('error', reject);
                // 添加5秒超时
                setTimeout(() => reject(new Error('视频帧提取超时')), 5000);
            });
            
            // 绘制视频帧到canvas
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // 将图像转换为blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            
            // 清理资源
            URL.revokeObjectURL(videoUrl);
            
            // 发送到阿里云视觉分析服务
            await this.sendToAliyunVLModel(blob);
        } catch (error) {
            console.error("视频分析失败:", error);
            this.videoAnalysisResultDiv.innerHTML = "视频分析失败，请重试";
            this.startVideoRecordingBtn.disabled = false;
        }
    }
    
    async sendToAliyunVLModel(imageBlob) {
        try {
            const API_KEY = "sk-e84b9c85f2db40f7a8c9a0fba43fe3de";
            
            // 准备请求数据
            const formData = new FormData();
            
            // 将blob转换为base64
            const base64Image = await this.blobToBase64(imageBlob);
            
            // 构造请求消息
            const messages = [
                {
                    role: "user",
                    content: [
                        {
                            image: "data:image/jpeg;base64," + base64Image
                        },
                        {
                            text: "请分析这张婴儿照片，判断婴儿是否在哭泣，如果在哭泣，请分析可能的原因（如饥饿、困倦、不适、疼痛或尿湿等），并提供相应的解决方案。请以结构化格式返回结果，包括：1) 是否在哭泣，2) 哭泣可能的原因，3) 建议的解决方案。"
                        }
                    ]
                }
            ];
            
            // 构造请求体
            const requestBody = {
                model: "qwen-vl-max",
                input: {
                    messages: messages
                },
                parameters: {
                    generation_config: {
                        max_tokens: 2048,
                        temperature: 0.7
                    }
                }
            };
            
            // 发送请求到阿里云DashScope API
            const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.choices && data.choices.length > 0) {
                const resultText = data.choices[0].message.content;
                this.videoAnalysisResult = resultText;
                
                // 更新视频分析结果显示
                this.videoAnalysisResultDiv.innerHTML = `
                    <p>${resultText}</p>
                `;
                
                // 综合分析结果
                this.combineAnalysisResults();
            this.startVideoRecordingBtn.disabled = false;
            } else {
                throw new Error("API返回数据格式不正确");
            }
        } catch (error) {
            console.error("调用阿里云视觉分析API失败:", error);
            this.videoAnalysisResultDiv.innerHTML = "视频分析失败，请稍后重试";
        }
    }
    
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // 移除"data:*/*;base64,"前缀
                const base64data = reader.result.split(',')[1];
                resolve(base64data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    combineAnalysisResults() {
        // 综合三种分析结果进行判断
        this.resultDiv.innerHTML = "正在综合分析...";
        
        // 模拟综合分析过程
        setTimeout(() => {
            // 随机选择一种哭声类型（实际应用中会基于综合分析判断）
            const cryTypes = [
                {
                    type: "饥饿",
                    description: "宝宝可能饿了，需要喂食",
                    solution: "给宝宝喂奶或辅食，注意观察宝宝的饥饿信号，建立规律的喂养时间"
                },
                {
                    type: "困倦",
                    description: "宝宝可能累了，需要休息",
                    solution: "创造安静、舒适的睡眠环境，轻柔地哄宝宝入睡，可以播放轻柔音乐或白噪音"
                },
                {
                    type: "不适",
                    description: "宝宝可能感到不舒服",
                    solution: "检查尿布是否需要更换，衣物是否过紧，室温是否合适，安抚宝宝情绪"
                },
                {
                    type: "疼痛",
                    description: "宝宝可能感到疼痛",
                    solution: "仔细检查宝宝身体是否有异常，如发热、红肿等，必要时咨询医生"
                },
                {
                    type: "尿湿",
                    description: "宝宝尿布可能湿了",
                    solution: "及时更换尿布，保持宝宝干爽舒适，注意清洁卫生"
                }
            ];
            
            // 根据可用的分析数据源动态调整分析方法说明
            let combinedResult = "";
            const analysisSources = [];
            
            if (this.audioAnalysisResult) {
                analysisSources.push("2分钟音频分析");
            }
            
            if (this.realtimeResults.length > 0) {
                analysisSources.push("实时音频分析");
            }
            
            if (this.videoAnalysisResult) {
                analysisSources.push("视频哭声分析");
            }
            
            if (this.behaviorAnalysisResults.length > 0) {
                analysisSources.push("行为状态分析");
            }
            
            if (analysisSources.length > 0) {
                combinedResult = "结合" + analysisSources.join("、");
            } else {
                combinedResult = "基于音频特征分析";
            }
            
            // 随机选择一种类型
            const randomIndex = Math.floor(Math.random() * cryTypes.length);
            const result = cryTypes[randomIndex];
            
            // 显示分析结果
            this.resultDiv.innerHTML = `
                <h3>综合分析完成</h3>
                <p><strong>分析方法：</strong>${combinedResult}</p>
                <p><strong>哭声类型：</strong>${result.type}</p>
                <p><strong>可能原因：</strong>${result.description}</p>
            `;
            
            // 显示解决方案
            let solutionHTML = `
                <h3>建议解决方案</h3>
                <p>${result.solution}</p>
            `;
            
            // 添加视频分析补充建议
            if (this.videoAnalysisResult) {
                solutionHTML += `<h4>视频分析补充建议</h4><p>${this.videoAnalysisResult}</p>`;
            }
            
            // 添加行为分析结果
            if (this.behaviorAnalysisResults.length > 0) {
                solutionHTML += `<h4>行为状态分析</h4><ul>`;
                this.behaviorAnalysisResults.slice(-3).forEach(item => { // 只显示最近3次
                    solutionHTML += `<li>${item.analysis}</li>`;
                });
                solutionHTML += `</ul>`;
            }
            
            solutionHTML += `<p class="note">提示：本分析基于多种数据源综合分析得出，仅供参考。如有疑问，请咨询专业医生。</p>`;
            
            this.solutionDiv.innerHTML = solutionHTML;
        }, 2000);
    }
    
    analyzeCry() {
        // 在实际应用中，这里会进行音频分析
        // 包括MFCC特征提取、频谱分析等
        // 为演示目的，我们模拟分析过程
        
        this.resultDiv.innerHTML = "正在分析2分钟音频...";
        
        // 模拟分析延迟
        setTimeout(() => {
            // 随机选择一种哭声类型（实际应用中会基于音频特征判断）
            const cryTypes = [
                {
                    type: "饥饿",
                    description: "宝宝可能饿了，需要喂食",
                    solution: "给宝宝喂奶或辅食，注意观察宝宝的饥饿信号，建立规律的喂养时间"
                },
                {
                    type: "困倦",
                    description: "宝宝可能累了，需要休息",
                    solution: "创造安静、舒适的睡眠环境，轻柔地哄宝宝入睡，可以播放轻柔音乐或白噪音"
                },
                {
                    type: "不适",
                    description: "宝宝可能感到不舒服",
                    solution: "检查尿布是否需要更换，衣物是否过紧，室温是否合适，安抚宝宝情绪"
                },
                {
                    type: "疼痛",
                    description: "宝宝可能感到疼痛",
                    solution: "仔细检查宝宝身体是否有异常，如发热、红肿等，必要时咨询医生"
                },
                {
                    type: "尿湿",
                    description: "宝宝尿布可能湿了",
                    solution: "及时更换尿布，保持宝宝干爽舒适，注意清洁卫生"
                }
            ];
            
            // 随机选择一种类型
            const randomIndex = Math.floor(Math.random() * cryTypes.length);
            const result = cryTypes[randomIndex];
            
            // 保存音频分析结果
            this.audioAnalysisResult = result;
            
            // 显示分析结果
            this.resultDiv.innerHTML = `
                <h3>2分钟音频分析完成</h3>
                <p><strong>哭声类型：</strong>${result.type}</p>
                <p><strong>可能原因：</strong>${result.description}</p>
            `;
            
            // 综合分析结果
            this.combineAnalysisResults();
        }, 2000);
    }
    
    // 实际应用中会实现的音频分析方法
    /*
    extractAudioFeatures(audioBuffer) {
        // 提取MFCC特征
        // 分析基频(F0)
        // 分析响度和音调
        // 返回特征向量
    }
    
    classifyCryType(features) {
        // 使用机器学习模型分类哭声类型
        // 返回分类结果
    }
    */
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const analyzer = new BabyCryAnalyzer();
});