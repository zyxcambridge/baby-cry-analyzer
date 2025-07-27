// 引入必要的库
const { ChatOpenAI } = require('langchain/llms/openai');
const process = require('process');

// 初始化 llm 客户端
function initLLM(model) {
    return new ChatOpenAI({
        base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model: model,
        api_key: process.env.DASHSCOPE_API_KEY, // 从环境变量读取
    });
}

// 自检功能
async function selfCheck() {
    const llm = initLLM('qwen-max');
    try {
        const result = await llm.call("Hello, how are you?");
        console.log("Self-check result:", result);
        return true;
    } catch (error) {
        console.error("Self-check failed:", error);
        return false;
    }
}

// 测试函数
async function testModel(model) {
    const llm = initLLM(model);
    try {
        const result = await llm.call("Hello, how are you?");
        console.log(`Test ${model} result:`, result);
        return true;
    } catch (error) {
        console.error(`Test ${model} failed:`, error);
        return false;
    }
}

// 单元测试
describe('LLM Model Tests', () => {
    beforeAll(async () => {
        // 执行自检
        const isHealthy = await selfCheck();
        if (!isHealthy) {
            throw new Error('LLM self-check failed, aborting tests.');
        }
    });

    test('Test qwen-max model', async () => {
        const result = await testModel('qwen-max');
        expect(result).toBe(true);
    });

    test('Test qwen-plus model', async () => {
        const result = await testModel('qwen-plus');
        expect(result).toBe(true);
    });

    test('Test qwen-turbo model', async () => {
        const result = await testModel('qwen-turbo');
        expect(result).toBe(true);
    });
});