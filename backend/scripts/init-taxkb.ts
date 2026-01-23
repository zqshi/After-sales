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
import { fileURLToPath } from 'url';
import { TaxKBAdapter, TaxKBError } from '../src/infrastructure/adapters/TaxKBAdapter';
import { taxkbConfig } from '../src/config/taxkb.config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const supportedExtensions = ['.txt', '.pdf', '.docx', '.doc', '.xlsx', '.xls'];

  const ensureExampleDocs = () => {
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const existing = fs
      .readdirSync(docsDir)
      .filter((f) => supportedExtensions.includes(path.extname(f)));
    if (existing.length > 0) {
      return;
    }

    fs.mkdirSync(docsDir, { recursive: true });

    const exampleDocs = [
      {
        filename: '01-产品功能介绍.txt',
        content: `产品功能介绍

核心功能
1. 智能会话管理 - 多渠道接入、自动分配客服、客户等级监控和告警
2. 任务管理系统 - 自动任务创建、优先级调度、质量评分
3. 需求管理 - 智能需求检测、自动分类和优先级、生命周期跟踪
4. 知识库 - 文档管理、语义搜索、智能推荐

常见问题
Q: 如何创建新会话？
A: 通过POST /api/conversations接口，提供customerId和channel参数。

Q: 如何查询我的任务？
A: 使用GET /api/tasks?assigneeId=YOUR_ID接口。`,
      },
      {
        filename: '02-常见问题处理指南.txt',
        content: `常见问题处理指南

客户咨询类
1. 账号问题 - 忘记密码
处理流程:
1) 验证客户身份
2) 发送密码重置链接
3) 引导客户完成重置
4) 创建服务记录

2. 功能使用问题 - 不知道如何使用某功能
处理流程:
1) 了解具体功能名称
2) 搜索知识库相关文档
3) 提供详细操作步骤
4) 必要时远程协助

故障处理类
1. 系统报错 - 收集错误信息, 检查日志, 定位根因, 执行修复, 通知结果
2. 性能问题 - 了解表现, 检查监控, 分析资源, 优化扩容, 持续跟踪

话术模板
开场白: 您好！我是客服{AgentName}，很高兴为您服务。请问有什么可以帮助您的？
问题确认: 我理解您的问题是：{问题总结}，对吗？
解决方案: 根据您的情况，建议您：{方案描述}
结束语: 问题已为您解决。如还有其他疑问，请随时联系我们！`,
      },
      {
        filename: '03-API使用手册.txt',
        content: `API使用手册

认证
所有API请求需要携带JWT Token:
Authorization: Bearer YOUR_JWT_TOKEN

会话管理
创建会话: POST /api/conversations
发送消息: POST /api/conversations/:id/messages

任务管理
创建任务: POST /api/tasks
完成任务: PUT /api/tasks/:id/complete

知识库
搜索知识: POST /api/knowledge/search

错误码
400 请求参数错误
401 未认证
403 无权限
404 资源不存在
500 服务器错误`,
      },
    ];

    exampleDocs.forEach((doc) => {
      const filePath = path.join(docsDir, doc.filename);
      fs.writeFileSync(filePath, doc.content, 'utf-8');
      log(`✓ 创建示例文档: ${doc.filename}`, 'green');
    });
  };

  // 如果目录不存在或无可用文档，创建示例文档
  ensureExampleDocs();

  // 扫描文档目录
  const files = fs
    .readdirSync(docsDir)
    .filter((f) => supportedExtensions.includes(path.extname(f)))
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
        filename,
        category: {
          company_entity: 'AfterSales',
          business_domain: 'Knowledge',
        },
      });

      log(`✓ 成功上传: ${filename} (doc_id: ${doc.doc_id})`, 'green');
      successCount++;

      await waitForProcessing(adapter, doc.doc_id);
      await verifyDocumentContent(adapter, doc.doc_id, filename);
    } catch (error) {
      if (error instanceof TaxKBError) {
        log(`✗ 上传失败: ${filename} - ${error.message} (状态码: ${error.statusCode})`, 'red');
        if (error.details) {
          log(`  详情: ${JSON.stringify(error.details)}`, 'yellow');
          const existingId = extractExistingDocId(error.details);
          if (existingId) {
            log(`  使用已有文档: ${existingId}`, 'yellow');
            await waitForProcessing(adapter, existingId);
            await verifyDocumentContent(adapter, existingId, filename);
          }
        }
      } else {
        log(`✗ 上传失败: ${filename} - ${(error as Error).message}`, 'red');
      }
      failCount++;
    }
  }

  log(`\n上传完成: ${successCount} 成功, ${failCount} 失败`, 'cyan');
}

async function waitForProcessing(
  adapter: TaxKBAdapter,
  docId: string,
  maxAttempts = 6,
  intervalMs = 5000,
): Promise<void> {
  log('  检查文档处理进度...', 'blue');
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const status = await adapter.getProcessingProgress(docId);
    log(
      `  处理状态: ${status.overall_status} (${status.overall_progress}%)`,
      'blue',
    );
    const normalized = String(status.overall_status || '').toLowerCase();
    if (
      normalized.includes('complete') ||
      normalized.includes('success') ||
      normalized.includes('failed') ||
      normalized.includes('error')
    ) {
      return;
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

function extractExistingDocId(details: unknown): string | null {
  if (!details || typeof details !== 'object') {
    return null;
  }
  const payload = details as Record<string, any>;
  const existingDoc = payload?.detail?.existing_doc;
  if (existingDoc && typeof existingDoc.doc_id === 'string') {
    return existingDoc.doc_id;
  }
  return null;
}

async function verifyDocumentContent(
  adapter: TaxKBAdapter,
  docId: string,
  filename: string,
): Promise<void> {
  try {
    const doc = await adapter.getDocument(docId, { include: ['fulltext', 'metadata'] });
    const contentLength = doc.content ? doc.content.length : 0;
    if (contentLength > 0) {
      log(`  解析内容可用: ${filename} (length=${contentLength})`, 'green');
      return;
    }
    log(`  ⚠️  解析内容为空: ${filename} (doc_id=${docId})`, 'yellow');
  } catch (error) {
    log(`  ⚠️  获取文档详情失败: ${filename}`, 'yellow');
  }
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
        const preview = result.content ? result.content.substring(0, 60) : '(no content)';
        log(
          `  ${idx + 1}. [评分: ${result.score.toFixed(3)}] ${preview}...`,
          'blue',
        );
      });

      // QA搜索
      try {
        const qaResults = await adapter.searchQA(query, { top_k: 2 });
        log(`✓ QA搜索返回 ${qaResults.length} 条结果`, 'green');
        qaResults.slice(0, 1).forEach((qa, idx) => {
          const answerPreview = qa.answer ? qa.answer.substring(0, 80) : '(no answer)';
          log(`  ${idx + 1}. Q: ${qa.question}`, 'blue');
          log(`     A: ${answerPreview}...`, 'blue');
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
