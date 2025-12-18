/**
 * 金山云 DeepSeek AI 服务连通性测试脚本
 *
 * 使用方法：
 * npx tsx test-ai-connection.ts
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件路径（ES模块兼容）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') });

interface TestResult {
  test: string;
  passed: boolean;
  duration: number;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

/**
 * 测试1：基础连通性测试
 */
async function testBasicConnection(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = '基础连通性测试';

  try {
    const response = await fetch(`${process.env.AI_SERVICE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'deepseek-v3.1',
        messages: [
          {
            role: 'user',
            content: '你好，请回复"连接成功"',
          },
        ],
        max_tokens: 50,
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        test: testName,
        passed: false,
        duration,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return {
        test: testName,
        passed: false,
        duration,
        error: 'No response choices returned',
      };
    }

    return {
      test: testName,
      passed: true,
      duration,
      response: data.choices[0].message.content,
    };
  } catch (error: any) {
    return {
      test: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * 测试2：对话分析测试
 */
async function testConversationAnalysis(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = '对话分析测试';

  try {
    const prompt = `请分析以下客服对话的质量：

对话内容：
1. [user]: 你好，我的账号无法登录
2. [assistant]: 您好！我来帮您解决登录问题。请问您遇到的具体错误提示是什么？
3. [user]: 显示"用户名或密码错误"
4. [assistant]: 好的，请您确认：1) 用户名是否正确；2) 密码是否有大小写；3) 是否需要重置密码？

请以JSON格式返回分析结果，包含以下字段：
{
  "summary": "对话摘要",
  "sentiment": "positive/neutral/negative",
  "score": 0-1之间的分数,
  "confidence": 0-1之间的置信度,
  "issues": [{"type": "问题类型", "severity": "low/medium/high", "description": "问题描述"}],
  "suggestions": ["改进建议1", "改进建议2"]
}`;

    const response = await fetch(`${process.env.AI_SERVICE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'deepseek-v3.1',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的客服对话分析助手。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        test: testName,
        passed: false,
        duration,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return {
        test: testName,
        passed: false,
        duration,
        error: 'No response choices returned',
      };
    }

    const content = data.choices[0].message.content;

    // 尝试解析JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          test: testName,
          passed: true,
          duration,
          response: parsed,
        };
      }
    } catch (parseError) {
      // JSON解析失败，但请求成功
    }

    return {
      test: testName,
      passed: true,
      duration,
      response: content,
    };
  } catch (error: any) {
    return {
      test: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * 测试3：知识推荐测试
 */
async function testKnowledgeRecommendation(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = '知识推荐测试';

  try {
    const prompt = `用户问题：如何申请产假？

请推荐3个最相关的知识库内容，以JSON格式返回：
{
  "recommendations": [
    {
      "title": "知识标题",
      "content": "知识摘要",
      "relevance": 0-1之间的相关度分数
    }
  ]
}`;

    const response = await fetch(`${process.env.AI_SERVICE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'deepseek-v3.1',
        messages: [
          {
            role: 'system',
            content: '你是一个智能知识推荐助手。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 800,
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        test: testName,
        passed: false,
        duration,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return {
        test: testName,
        passed: false,
        duration,
        error: 'No response choices returned',
      };
    }

    const content = data.choices[0].message.content;

    // 尝试解析JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          test: testName,
          passed: true,
          duration,
          response: parsed,
        };
      }
    } catch (parseError) {
      // JSON解析失败，但请求成功
    }

    return {
      test: testName,
      passed: true,
      duration,
      response: content,
    };
  } catch (error: any) {
    return {
      test: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * 打印测试报告
 */
function printReport() {
  console.log('\n' + '='.repeat(80));
  console.log('  金山云 DeepSeek AI 服务连通性测试报告');
  console.log('='.repeat(80) + '\n');

  console.log('配置信息：');
  console.log(`  提供商: ${process.env.AI_SERVICE_PROVIDER}`);
  console.log(`  Base URL: ${process.env.AI_SERVICE_URL}`);
  console.log(`  模型: ${process.env.AI_MODEL}`);
  console.log(`  API Key: ${process.env.AI_SERVICE_API_KEY?.substring(0, 20)}...`);
  console.log();

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  results.forEach((result, index) => {
    const status = result.passed ? '✅ 通过' : '❌ 失败';
    console.log(`${index + 1}. ${result.test}`);
    console.log(`   状态: ${status}`);
    console.log(`   耗时: ${result.duration}ms`);

    if (result.passed && result.response) {
      console.log(`   响应: ${JSON.stringify(result.response, null, 2).substring(0, 200)}...`);
    }

    if (!result.passed && result.error) {
      console.log(`   错误: ${result.error}`);
    }
    console.log();
  });

  console.log('='.repeat(80));
  console.log(`测试总结: ${passedCount}/${totalCount} 通过`);
  console.log('='.repeat(80) + '\n');

  if (passedCount === totalCount) {
    console.log('🎉 所有测试通过！金山云AI服务配置正确，可以正常使用。\n');
  } else {
    console.log('⚠️  部分测试失败，请检查配置和网络连接。\n');
    process.exit(1);
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('开始测试金山云 DeepSeek AI 服务...\n');

  // 检查环境变量
  if (!process.env.AI_SERVICE_URL) {
    console.error('❌ 错误: AI_SERVICE_URL 未配置');
    process.exit(1);
  }

  if (!process.env.AI_SERVICE_API_KEY) {
    console.error('❌ 错误: AI_SERVICE_API_KEY 未配置');
    process.exit(1);
  }

  // 运行测试
  results.push(await testBasicConnection());
  results.push(await testConversationAnalysis());
  results.push(await testKnowledgeRecommendation());

  // 打印报告
  printReport();
}

// 执行测试
runTests().catch((error) => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
