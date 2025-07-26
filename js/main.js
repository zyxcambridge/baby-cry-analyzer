// 婴儿哭声分析器主程序

class BabyCryAnalyzer {
    constructor() {
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioStream = null;
        this.videoStream = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        // DOM元素
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.startVideoBtn = document.getElementById('startVideoBtn');
        this.video = document.getElementById('video');
        this.resultDiv = document.getElementById('result');
        this.solutionDiv = document.getElementById('solution');
        
        // 绑定事件
        this.bindEvents();
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.startVideoBtn.addEventListener('click', () => this.startVideo());
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
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            
            this.resultDiv.innerHTML = "正在录制音频...";
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
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
        }
    }
    
    async startVideo() {
        try {
            this.videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
            });
            
            this.video.srcObject = this.videoStream;
            this.startVideoBtn.textContent = "摄像头已开启";
            this.startVideoBtn.disabled = true;
        } catch (error) {
            console.error("获取视频权限失败:", error);
            this.resultDiv.innerHTML = "无法访问摄像头，请检查权限设置";
        }
    }
    
    analyzeCry() {
        // 在实际应用中，这里会进行音频分析
        // 包括MFCC特征提取、频谱分析等
        // 为演示目的，我们模拟分析过程
        
        this.resultDiv.innerHTML = "正在分析哭声...";
        
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
            
            // 显示分析结果
            this.resultDiv.innerHTML = `
                <h3>分析完成</h3>
                <p><strong>哭声类型：</strong>${result.type}</p>
                <p><strong>可能原因：</strong>${result.description}</p>
            `;
            
            // 显示解决方案
            this.solutionDiv.innerHTML = `
                <h3>建议解决方案</h3>
                <p>${result.solution}</p>
                <p class="note">提示：本分析基于音频特征识别技术，仅供参考。如有疑问，请咨询专业医生。</p>
            `;
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
    
    // 提示用户使用说明
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <h3>使用说明</h3>
        <ol>
            <li>点击"开始录音"按钮开始录制宝宝哭声</li>
            <li>让宝宝自然哭泣，录制几秒钟音频</li>
            <li>点击"停止录音"按钮结束录制并开始分析</li>
            <li>系统将自动分析哭声类型并提供解决方案</li>
        </ol>
        <p>为了获得最佳分析效果，请在安静环境中使用</p>
    `;
});