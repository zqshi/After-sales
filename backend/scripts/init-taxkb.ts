/**
 * TaxKB知识库初始化脚本
 *
 * 功能：
 * 1. 验证TaxKB服务连接
 * 2. 上传初始知识库文档
 * 3. 验证语义搜索能力
 *
 * 使用方式：
 * ```bash
 * # 1. 确保TaxKB服务已启动
 * # 2. 配置.env中的TAXKB_*参数
 * # 3. 运行脚本
 * npx tsx scripts/init-taxkb.ts
 * ```
 */

import fs from 'fs';
import path from 'path';
import { TaxKBAdapter, TaxKBError } from '../src/infrastructure/adapters/TaxKBAdapter';
import { taxkbConfig } from '../src/config/taxkb.config';

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(80));
}

/**
 * 检查TaxKB配置
 */
function checkConfiguration(): void {
  logSection('步骤 1: 检查配置');

  log(`✓ TAXKB_ENABLED: ${taxkbConfig.enabled}`, 'blue');
  log(`✓ TAXKB_BASE_URL: ${taxkbConfig.baseUrl}`, 'blue');
  log(`✓ TAXKB_API_KEY: ${taxkbConfig.apiKey.substring(0, 8)}***`, 'blue');
  log(`✓ TAXKB_TIMEOUT: ${taxkbConfig.timeout}ms`, 'blue');

  if (!taxkbConfig.enabled) {
    log('\n⚠️  警告: TAXKB_ENABLED=false，脚本将启用TaxKB以测试连接', 'yellow');
    log('   如需生产使用，请在.env中设置 TAXKB_ENABLED=true\n', 'yellow');
    // 临时启用用于测试
    process.env.TAXKB_ENABLED = 'true';
  }
}

/**
 * 测试TaxKB连接
 */
async function testConnection(adapter: TaxKBAdapter): Promise<boolean> {
  logSection('步骤 2: 测试连接');

  try {
    log('正在测试语义搜索API...', 'blue');
    const results = await adapter.semanticSearch('测试查询', { topK: 1 });
    log(`✓ 连接成功！返回 ${results.length} 条结果`, 'green');
    return true;
  } catch (error) {
    if (error instanceof TaxKBError) {
      log(`✗ 连接失败: ${error.message} (状态码: ${error.statusCode})`, 'red');
      if (error.statusCode === 503) {
        log('  原因: TaxKB集成已禁用', 'yellow');
      } else if (error.statusCode === 401 || error.statusCode === 403) {
        log('  原因: API密钥无效', 'yellow');
      } else if (error.statusCode === 404) {
        log('  原因: API端点不存在，请检查BASE_URL', 'yellow');
      } else if (error.statusCode === 408) {
        log('  原因: 请求超时，TaxKB服务可能未启动', 'yellow');
      }
    } else {
      log(`✗ 连接失败: ${(error as Error).message}`, 'red');
    }
    return false;
  }
}

/**
 * 准备示例文档
 */
function prepareExampleDocs(): string[] {
  logSection('步骤 3: 准备示例文档');

  const docsDir = path.join(__dirname, '../docs/knowledge-base');

  // 如果目录不存在，创建示例文档
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });

    const exampleDocs = [
      {
        filename: '01-产品功能介绍.md',
        content: `# 产品功能介绍

## 核心功能

### 1. 智能会话管理
- 多渠道接入（飞书、企业微信）
- 自动分配客服
- SLA监控和告警

### 2. 任务管理系统
- 自动任务创建
- 优先级调度
- 质量评分

### 3. 需求管理
- 智能需求检测
- 自动分类和优先级
- 需求生命周期跟踪

### 4. 知识库
- 文档管理
- 语义搜索
- 智能推荐

## 常见问题

Q: 如何创建新会话？
A: 通过POST /api/conversations接口，提供customerId和channel参数。

Q: 如何查询我的任务？
A: 使用GET /api/tasks?assigneeId=YOUR_ID接口。
`,
      },
      {
        filename: '02-常见问题处理指南.md',
        content: `# 常见问题处理指南

## 客户咨询类

### 1. 账号问题
**问题**: 忘记密码
**处理流程**:
1. 验证客户身份
2. 发送密码重置链接
3. 引导客户完成重置
4. 创建服务记录

### 2. 功能使用问题
**问题**: 不知道如何使用某功能
**处理流程**:
1. 了解具体功能名称
2. 搜索知识库相关文档
3. 提供详细操作步骤
4. 必要时远程协助

## 故障处理类

### 1. 系统报错
**处理流程**:
1. 收集错误信息（错误码、时间、操作）
2. 检查系统日志
3. 定位问题根因
4. 执行修复方案
5. 通知客户结果

### 2. 性能问题
**处理流程**:
1. 了解性能表现（慢、卡顿、超时）
2. 检查系统监控指标
3. 分析资源使用情况
4. 优化或扩容
5. 持续跟踪

## 话术模板

**开场白**: 您好！我是客服{AgentName}，很高兴为您服务。请问有什么可以帮助您的？

**问题确认**: 我理解您的问题是：{问题总结}，对吗？

**解决方案**: 根据您的情况，建议您：{方案描述}

**结束语**: 问题已为您解决。如还有其他疑问，请随时联系我们！
`,
      },
      {
        filename: '03-API使用手册.md',
        content: `# API使用手册

## 认证

所有API请求需要携带JWT Token：
\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

## 会话管理

### 创建会话
\`\`\`http
POST /api/conversations
Content-Type: application/json

{
  "customerId": "customer-123",
  "channel": "feishu",
  "initialMessage": "我需要帮助"
}
\`\`\`

### 发送消息
\`\`\`http
POST /api/conversations/:id/messages
Content-Type: application/json

{
  "senderId": "agent-001",
  "senderType": "internal",
  "content": "您好！有什么可以帮您？"
}
\`\`\`

## 任务管理

### 创建任务
\`\`\`http
POST /api/tasks
Content-Type: application/json

{
  "title": "处理客户退款申请",
  "priority": "high",
  "conversationId": "conv-123",
  "requirementId": "req-456"
}
\`\`\`

### 完成任务
\`\`\`http
PUT /api/tasks/:id/complete
Content-Type: application/json

{
  "qualityScore": {
    "timeliness": 0.9,
    "accuracy": 0.95,
    "satisfaction": 0.85
  }
}
\`\`\`

## 知识库

### 搜索知识
\`\`\`http
POST /api/knowledge/search
Content-Type: application/json

{
  "query": "如何重置密码",
  "limit": 5
}
\`\`\`

## 错误码

- 400: 请求参数错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 500: 服务器错误
`,
      },
    ];

    exampleDocs.forEach((doc) => {
      const filePath = path.join(docsDir, doc.filename);
      fs.writeFileSync(filePath, doc.content, 'utf-8');
      log(`✓ 创建示例文档: ${doc.filename}`, 'green');
    });
  }

  // 扫描文档目录
  const files = fs
    .readdirSync(docsDir)
    .filter((f) => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.pdf'))
    .map((f) => path.join(docsDir, f));

  log(`\n找到 ${files.length} 个文档:`, 'blue');
  files.forEach((f) => log(`  - ${path.basename(f)}`, 'blue'));

  return files;
}

/**
 * 上传文档到TaxKB
 */
async function uploadDocuments(
  adapter: TaxKBAdapter,
  files: string[],
): Promise<void> {
  logSection('步骤 4: 上传文档');

  let successCount = 0;
  let failCount = 0;

  for (const filePath of files) {
    const filename = path.basename(filePath);

    try {
      log(`正在上传: ${filename}...`, 'blue');

      const buffer = fs.readFileSync(filePath);
      const title = path.basename(filename, path.extname(filename));

      const doc = await adapter.uploadDocument(buffer, {
        title,
        category: {
          company_entity: 'AfterSales',
          business_domain: 'Knowledge',
        },
      });

      log(`✓ 成功上传: ${filename} (doc_id: ${doc.doc_id})`, 'green');
      successCount++;

      // 检查处理进度
      log('  检查文档处理进度...', 'blue');
      const status = await adapter.getProcessingProgress(doc.doc_id);
      log(
        `  处理状态: ${status.overall_status} (${status.overall_progress}%)`,
        'blue',
      );
    } catch (error) {
      if (error instanceof TaxKBError) {
        log(`✗ 上传失败: ${filename} - ${error.message}`, 'red');
      } else {
        log(`✗ 上传失败: ${filename} - ${(error as Error).message}`, 'red');
      }
      failCount++;
    }
  }

  log(`\n上传完成: ${successCount} 成功, ${failCount} 失败`, 'cyan');
}

/**
 * 测试搜索功能
 */
async function testSearch(adapter: TaxKBAdapter): Promise<void> {
  logSection('步骤 5: 测试搜索功能');

  const testQueries = [
    '如何创建会话',
    '任务管理功能',
    'API认证方式',
  ];

  for (const query of testQueries) {
    try {
      log(`\n正在搜索: "${query}"`, 'blue');

      // 语义搜索
      const semanticResults = await adapter.semanticSearch(query, { topK: 3 });
      log(`✓ 语义搜索返回 ${semanticResults.length} 条结果:`, 'green');
      semanticResults.slice(0, 2).forEach((result, idx) => {
        log(
          `  ${idx + 1}. [评分: ${result.score.toFixed(3)}] ${result.content.substring(0, 60)}...`,
          'blue',
        );
      });

      // QA搜索
      try {
        const qaResults = await adapter.searchQA(query, { top_k: 2 });
        log(`✓ QA搜索返回 ${qaResults.length} 条结果`, 'green');
        qaResults.slice(0, 1).forEach((qa, idx) => {
          log(`  ${idx + 1}. Q: ${qa.question}`, 'blue');
          log(`     A: ${qa.answer.substring(0, 80)}...`, 'blue');
        });
      } catch (error) {
        log('  QA搜索暂不可用（可能是文档处理中）', 'yellow');
      }
    } catch (error) {
      if (error instanceof TaxKBError) {
        log(`✗ 搜索失败: ${error.message}`, 'red');
      } else {
        log(`✗ 搜索失败: ${(error as Error).message}`, 'red');
      }
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.clear();
  log('🚀 TaxKB知识库初始化脚本', 'cyan');
  log('版本: 1.0.0', 'cyan');
  log('时间: ' + new Date().toISOString(), 'cyan');

  try {
    // 1. 检查配置
    checkConfiguration();

    // 2. 创建Adapter
    const adapter = new TaxKBAdapter();

    // 3. 测试连接
    const isConnected = await testConnection(adapter);
    if (!isConnected) {
      log('\n❌ 初始化失败: 无法连接到TaxKB服务', 'red');
      log('\n请检查:', 'yellow');
      log('  1. TaxKB服务是否已启动', 'yellow');
      log('  2. TAXKB_BASE_URL配置是否正确', 'yellow');
      log('  3. TAXKB_API_KEY是否有效', 'yellow');
      log('  4. 网络连接是否正常\n', 'yellow');
      process.exit(1);
    }

    // 4. 准备文档
    const files = prepareExampleDocs();

    // 5. 上传文档
    if (files.length > 0) {
      await uploadDocuments(adapter, files);
    } else {
      log('\n⚠️  没有找到可上传的文档', 'yellow');
    }

    // 6. 测试搜索
    await testSearch(adapter);

    // 7. 完成
    logSection('初始化完成');
    log('✅ TaxKB知识库初始化成功！', 'green');
    log('\n下一步:', 'cyan');
    log('  1. 在.env中设置 TAXKB_ENABLED=true', 'blue');
    log('  2. 重启后端服务', 'blue');
    log('  3. 访问 /api/knowledge/search 测试知识搜索\n', 'blue');
  } catch (error) {
    log('\n❌ 初始化过程出现错误:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// 执行主函数
main().catch((error) => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
