/**
 * 简单的金山云 DeepSeek AI 服务测试
 */

const AI_SERVICE_URL = 'https://kspmas.ksyun.com';
const AI_API_KEY = '85c923cc-9dcf-467a-89d5-285d3798014d';
const AI_MODEL = 'deepseek-v3.1';

async function testAI() {
  console.log('🚀 开始测试金山云 DeepSeek AI 服务...\n');
  console.log('配置信息:');
  console.log(`  Base URL: ${AI_SERVICE_URL}`);
  console.log(`  Model: ${AI_MODEL}`);
  console.log(`  API Key: ${AI_API_KEY.substring(0, 20)}...\n`);

  try {
    console.log('📡 发送测试请求...');
    const startTime = Date.now();

    const response = await fetch(`${AI_SERVICE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'user',
            content: '你好，请简单介绍一下你自己',
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30000), // 30秒超时
    });

    const duration = Date.now() - startTime;

    console.log(`⏱️  请求耗时: ${duration}ms`);
    console.log(`📊 响应状态: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API请求失败:');
      console.error(`   状态码: ${response.status}`);
      console.error(`   错误信息: ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      console.error('❌ 响应格式错误: 没有返回choices');
      console.error('响应数据:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    const content = data.choices[0].message.content;

    console.log('✅ 测试成功!\n');
    console.log('AI响应:');
    console.log('─'.repeat(60));
    console.log(content);
    console.log('─'.repeat(60));
    console.log();

    // 打印完整响应数据（用于调试）
    console.log('完整响应数据:');
    console.log(JSON.stringify(data, null, 2));
    console.log();

    console.log('🎉 金山云AI服务配置正确，可以正常使用！');
  } catch (error: any) {
    console.error('❌ 测试失败:');
    console.error(`   错误类型: ${error.name}`);
    console.error(`   错误信息: ${error.message}`);

    if (error.cause) {
      console.error(`   原因: ${error.cause}`);
    }

    process.exit(1);
  }
}

testAI();
