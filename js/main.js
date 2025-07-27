// 婴儿哭声与行为分析器主程序

class BabyCryAnalyzer {
    constructor() {
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioStream = null;
        this.videoStream = null;
        this.audioChunks = [];
        this.isAudioAnalyzing = false;
        this.isRealtimeAnalyzing = false;
        this.isVideoAnalyzing = false;
        this.websocket = null;
        this.audioProcessor = null;
        this.realtimeResults = [];
        this.audioAnalysisResult = null;
        this.videoAnalysisResult = null;
        this.realtimeAnalysisResult = null;
        
        // DOM元素
        this.audioAnalysisBtn = document.getElementById('audioAnalysisBtn');
        this.realtimeAnalysisBtn = document.getElementById('realtimeAnalysisBtn');
        this.videoAnalysisBtn = document.getElementById('videoAnalysisBtn');
        this.audioResult = document.getElementById('audioResult');
        this.realtimeResult = document.getElementById('realtimeResult');
        this.videoResult = document.getElementById('videoResult');
        this.solutionResult = document.getElementById('solutionResult');
        this.video = document.getElementById('video');
        
        // 绑定事件
        this.bindEvents();
    }
    
    bindEvents() {
        this.audioAnalysisBtn.addEventListener('click', () => this.toggleAudioAnalysis());
        this.realtimeAnalysisBtn.addEventListener('click', () => this.toggleRealtimeAnalysis());
        this.videoAnalysisBtn.addEventListener('click', () => this.toggleVideoAnalysis());
    }
    
    async toggleAudioAnalysis() {
        if (this.isAudioAnalyzing) {
            this.stopAudioAnalysis();
        } else {
            await this.startAudioAnalysis();
        }
    }
    
    async startAudioAnalysis() {
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
                this.analyzeAudio();
            };
            
            // 开始录制
            this.mediaRecorder.start();
            this.isAudioAnalyzing = true;
            
            // 更新UI状态
            this.audioAnalysisBtn.textContent = "停止音频分析";
            this.audioAnalysisBtn.classList.add("active");
            this.realtimeAnalysisBtn.disabled = true;
            this.videoAnalysisBtn.disabled = true;
            
            this.audioResult.innerHTML = "正在录制2分钟音频...";
            
            // 2分钟后自动停止录制
            setTimeout(() => {
                if (this.isAudioAnalyzing) {
                    this.stopAudioAnalysis();
                }
            }, 120000); // 2分钟
        } catch (error) {
            console.error("获取音频权限失败:", error);
            this.audioResult.innerHTML = "无法访问麦克风，请检查权限设置";
        }
    }
    
    stopAudioAnalysis() {
        if (this.mediaRecorder && this.isAudioAnalyzing) {
            this.mediaRecorder.stop();
            this.audioStream.getTracks().forEach(track => track.stop());
            this.isAudioAnalyzing = false;
            
            // 更新UI状态
            this.audioAnalysisBtn.textContent = "开始音频分析";
            this.audioAnalysisBtn.classList.remove("active");
            this.realtimeAnalysisBtn.disabled = false;
            this.videoAnalysisBtn.disabled = false;
        }
    }
    
    async analyzeAudio() {
        this.audioResult.innerHTML = "正在分析音频...";
        
        try {
            // 模拟调用LLM进行音频分析
            const API_KEY = "sk-e84b9c85f2db40f7a8c9a0fba43fe3de";
            
            // 构造请求消息
            const messages = [
                {
                    role: "user",
                    content: "请分析婴儿哭声，判断可能的原因（如饥饿、困倦、不适、疼痛或尿湿等），并提供相应的解决方案。请以结构化格式返回结果，包括：1) 哭声类型，2) 可能原因，3) 建议的解决方案。"
                }
            ];
            
            // 构造请求体
            const requestBody = {
                model: "qwen-max",
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
                console.error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
                throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.choices && data.choices.length > 0) {
                const resultText = data.choices[0].message.content;
                this.audioAnalysisResult = resultText;
                
                // 更新音频分析结果显示
                this.audioResult.innerHTML = `<p>${resultText}</p>`;
                
                // 综合分析结果
                this.combineAllResults();
            } else {
                throw new Error("API返回数据格式不正确");
            }
        } catch (error) {
            console.error("调用阿里云音频分析API失败:", error);
            this.audioResult.innerHTML = "音频分析失败，请稍后重试";
            // 添加详细错误信息
            this.audioResult.innerHTML += `<br><small>错误详情: ${error.message}</small>`;
        }
    }
    
    async toggleRealtimeAnalysis() {
        if (this.isRealtimeAnalyzing) {
            this.stopRealtimeAnalysis();
        } else {
            await this.startRealtimeAnalysis();
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
            this.realtimeAnalysisBtn.textContent = "停止实时分析";
            this.realtimeAnalysisBtn.classList.add("active");
            this.audioAnalysisBtn.disabled = true;
            this.videoAnalysisBtn.disabled = true;
            
            this.realtimeResult.innerHTML = "正在实时分析...";
            
            // 连接阿里云实时分析服务
            this.connectToAliyun();
        } catch (error) {
            console.error("开始实时分析失败:", error);
            this.realtimeResult.innerHTML = "无法开始实时分析，请检查权限设置";
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
        this.realtimeAnalysisBtn.textContent = "开始实时分析";
        this.realtimeAnalysisBtn.classList.remove("active");
        this.audioAnalysisBtn.disabled = false;
        this.videoAnalysisBtn.disabled = false;
        
        // 综合分析结果
        this.combineAllResults();
    }
    
    connectToAliyun() {
        // 阿里云API密钥
        const API_KEY = "sk-e84b9c85f2db40f7a8c9a0fba43fe3de";
        const API_URL = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen-omni-turbo-realtime";
        
        try {
            this.websocket = new WebSocket(API_URL);
            
            this.websocket.onopen = (event) => {
                console.log("已连接到阿里云实时分析服务");
                this.realtimeResult.innerHTML = "已连接到实时分析服务，正在监听音频...";
                
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
                this.realtimeResult.innerHTML = "实时分析服务连接错误: " + error.message;
            };
        } catch (error) {
            console.error("连接阿里云实时分析服务失败:", error);
            this.realtimeResult.innerHTML = "连接实时分析服务失败: " + error.message;
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
            this.realtimeResult.innerHTML = `
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
            this.realtimeResult.innerHTML = `
                <p>${this.realtimeResults.join('')}</p>
            `;
        } else if (data.type === "error") {
            // 处理错误信息
            console.error("阿里云服务返回错误:", data);
            this.realtimeResult.innerHTML = "服务错误: " + (data.error?.message || "未知错误");
        }
    }
    
    async toggleVideoAnalysis() {
        if (this.isVideoAnalyzing) {
            this.stopVideoAnalysis();
        } else {
            await this.startVideoAnalysis();
        }
    }
    
    async startVideoAnalysis() {
        try {
            // 设置约束条件，优先使用后置摄像头
            const constraints = {
                video: {
                    facingMode: { exact: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.video.srcObject = this.videoStream;
            this.video.style.display = "block";
            this.isVideoAnalyzing = true;
            
            // 更新UI状态
            this.videoAnalysisBtn.textContent = "停止视频分析";
            this.videoAnalysisBtn.classList.add("active");
            this.audioAnalysisBtn.disabled = true;
            this.realtimeAnalysisBtn.disabled = true;
            
            this.videoResult.innerHTML = "正在分析视频...";
            
            // 等待视频稳定
            setTimeout(async () => {
                await this.analyzeVideoFrame();
            }, 2000);
        } catch (error) {
            console.error("获取视频权限失败:", error);
            // 如果后置摄像头不可用，尝试使用默认摄像头
            try {
                this.videoStream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: false 
                });
                
                this.video.srcObject = this.videoStream;
                this.video.style.display = "block";
                this.isVideoAnalyzing = true;
                
                // 更新UI状态
                this.videoAnalysisBtn.textContent = "停止视频分析";
                this.videoAnalysisBtn.classList.add("active");
                this.audioAnalysisBtn.disabled = true;
                this.realtimeAnalysisBtn.disabled = true;
                
                this.videoResult.innerHTML = "正在分析视频...";
                
                // 等待视频稳定
                setTimeout(async () => {
                    await this.analyzeVideoFrame();
                }, 2000);
            } catch (fallbackError) {
                console.error("获取任何摄像头权限都失败:", fallbackError);
                this.videoResult.innerHTML = "无法访问摄像头，请检查权限设置";
            }
        }
    }
    
    stopVideoAnalysis() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
            this.video.style.display = "none";
            this.isVideoAnalyzing = false;
            
            // 更新UI状态
            this.videoAnalysisBtn.textContent = "开始视频分析";
            this.videoAnalysisBtn.classList.remove("active");
            this.audioAnalysisBtn.disabled = false;
            this.realtimeAnalysisBtn.disabled = false;
        }
    }
    
    async analyzeVideoFrame() {
        if (!this.video.srcObject) {
            this.videoResult.innerHTML = "请先开启摄像头";
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
            
            // 发送到阿里云视觉分析服务
            await this.sendToAliyunVLModel(blob);
        } catch (error) {
            console.error("视频分析失败:", error);
            this.videoResult.innerHTML = "视频分析失败，请重试";
        }
    }
    
    async sendToAliyunVLModel(imageBlob) {
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
                this.videoResult.innerHTML = `<p>${resultText}</p>`;
                
                // 综合分析结果
                this.combineAllResults();
            } else {
                throw new Error("API返回数据格式不正确");
            }
        } catch (error) {
            console.error("调用阿里云视觉分析API失败:", error);
            this.videoResult.innerHTML = "视频分析失败，请稍后重试";
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
    
    combineAllResults() {
        // 综合三种分析结果进行判断
        this.solutionResult.innerHTML = "正在综合分析...";
        
        // 模拟综合分析过程
        setTimeout(() => {
            // 根据可用的分析数据源动态调整分析方法说明
            let combinedResult = "";
            const analysisSources = [];
            
            if (this.audioAnalysisResult) {
                analysisSources.push("音频分析");
            }
            
            if (this.realtimeResults.length > 0) {
                analysisSources.push("实时音频分析");
            }
            
            if (this.videoAnalysisResult) {
                analysisSources.push("视频行为分析");
            }
            
            if (analysisSources.length > 0) {
                combinedResult = "结合" + analysisSources.join("、");
            } else {
                combinedResult = "暂无分析数据";
            }
            
            // 显示综合解决方案
            let solutionHTML = `<h3>综合分析结果</h3>`;
            
            if (this.audioAnalysisResult) {
                solutionHTML += `<h4>音频分析结果</h4><p>${this.audioAnalysisResult}</p>`;
            }
            
            if (this.realtimeResults.length > 0) {
                solutionHTML += `<h4>实时分析结果</h4><p>${this.realtimeResults.join('')}</p>`;
            }
            
            if (this.videoAnalysisResult) {
                solutionHTML += `<h4>视频分析结果</h4><p>${this.videoAnalysisResult}</p>`;
            }
            
            if (analysisSources.length > 0) {
                solutionHTML += `<p class="summary"><strong>分析方法：</strong>${combinedResult}</p>`;
            } else {
                solutionHTML += `<p>请至少进行一项分析以获取解决方案</p>`;
            }
            
            this.solutionResult.innerHTML = solutionHTML;
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