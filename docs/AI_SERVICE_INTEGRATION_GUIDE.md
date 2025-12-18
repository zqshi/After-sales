# 金山云 DeepSeek AI 服务集成指南

**版本**: v1.0
**日期**: 2025-12-16
**状态**: ✅ 已配置并测试通过

---

## 📋 一、配置概览

### 1.1 服务信息

| 配置项 | 值 |
|--------|---|
| **提供商** | 金山云 (KSYun) |
| **模型** | DeepSeek-v3.1 |
| **Base URL** | https://kspmas.ksyun.com |
| **API密钥** | 85c923cc-9dcf-467a-89d5-285d3798014d |

### 1.2 性能指标（测试结果）

| 指标 | 值 |
|------|---|
| **API响应时间** | 10672ms (首次请求) |
| **状态码** | 200 OK |
| **Token使用** | Prompt: 13, Completion: 100, Total: 113 |
| **最大上下文** | 128K tokens |

---

## 🚀 二、配置步骤

### 2.1 环境变量配置

已添加到 `backend/.env`:

```bash
# AI服务 - 金山云 DeepSeek-v3.1
AI_SERVICE_PROVIDER=ksyun
AI_SERVICE_URL=https://kspmas.ksyun.com
AI_SERVICE_API_KEY=85c923cc-9dcf-467a-89d5-285d3798014d
AI_MODEL=deepseek-v3.1
AI_SERVICE_TIMEOUT=30000
AI_SERVICE_MAX_RETRIES=3
```

### 2.2 应用配置更新

已更新 `backend/src/config/app.config.ts`:

```typescript
ai: {
  provider: process.env.AI_SERVICE_PROVIDER || 'ksyun',
  serviceUrl: process.env.AI_SERVICE_URL || '',
  apiKey: process.env.AI_SERVICE_API_KEY || '',
  model: process.env.AI_MODEL || 'deepseek-v3.1',
  timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),
  maxRetries: parseInt(process.env.AI_SERVICE_MAX_RETRIES || '3', 10),
  enabled: !!process.env.AI_SERVICE_URL && !!process.env.AI_SERVICE_API_KEY,
}
```

### 2.3 AI服务适配器

已创建 `backend/src/infrastructure/adapters/AIServiceAdapter.ts`

**核心功能**:
- ✅ 对话质量分析
- ✅ 知识库内容推荐
- ✅ 自动重试机制（最多3次）
- ✅ 超时控制（30秒）
- ✅ 错误处理和降级

---

## 💡 三、使用示例

### 3.1 对话分析

```typescript
import { AIServiceAdapter } from '@infrastructure/adapters/AIServiceAdapter';

const aiAdapter = new AIServiceAdapter();

const result = await aiAdapter.analyzeConversation({
  conversationId: 'conv-123',
  messages: [
    { role: 'user', content: '你好，我的账号无法登录' },
    { role: 'assistant', content: '您好！我来帮您解决登录问题。' },
  ],
  keywords: ['登录', '账号'],
});

console.log(result);
// {
//   summary: '对话摘要',
//   sentiment: 'positive',
//   score: 0.85,
//   confidence: 0.9,
//   issues: [...],
//   suggestions: [...],
//   recommendations: [...]
// }
```

### 3.2 知识推荐

```typescript
const recommendations = await aiAdapter.recommendKnowledge({
  query: '如何申请产假？',
  context: '员工关系/假期管理',
  topK: 3,
});

console.log(recommendations);
// {
//   recommendations: [
//     {
//       title: '产假申请流程',
//       content: '产假申请需要提前30天...',
//       relevance: 0.95
//     },
//     ...
//   ]
// }
```

### 3.3 在 AiService 中使用

现有的 `AiService.ts` 已经有外部AI服务调用的框架：

```typescript
// backend/src/application/services/AiService.ts

async analyzeConversation(request: AnalyzeConversationRequest) {
  if (config.ai.serviceUrl) {
    try {
      // 调用外部AI服务（金山云DeepSeek）
      return await this.callExternalAnalyze(request);
    } catch (err) {
      console.warn('[ai] external analyze failed, falling back to local logic', err);
    }
  }

  // 本地fallback逻辑
  // ...
}
```

**建议更新**: 将 `callExternalAnalyze` 方法改为使用 `AIServiceAdapter`:

```typescript
import { AIServiceAdapter } from '@infrastructure/adapters/AIServiceAdapter';

export class AiService {
  private aiAdapter: AIServiceAdapter;

  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly knowledgeRecommender: KnowledgeRecommender,
  ) {
    this.aiAdapter = new AIServiceAdapter();
  }

  private async callExternalAnalyze(request: AnalyzeConversationRequest) {
    return await this.aiAdapter.analyzeConversation({
      conversationId: request.conversationId,
      context: request.context,
      keywords: request.options?.keywords,
    });
  }
}
```

---

## 🧪 四、测试验证

### 4.1 快速测试

运行简单测试脚本：

```bash
cd backend
npx tsx test-ai-simple.ts
```

**预期输出**:
```
🚀 开始测试金山云 DeepSeek AI 服务...
📡 发送测试请求...
⏱️  请求耗时: ~10000ms
📊 响应状态: 200 OK
✅ 测试成功!
🎉 金山云AI服务配置正确，可以正常使用！
```

### 4.2 完整测试套件

运行完整测试（包含对话分析、知识推荐）：

```bash
cd backend
npx tsx test-ai-connection.ts
```

---

## 📊 五、API规范

### 5.1 请求格式

金山云DeepSeek使用标准的OpenAI兼容API：

```typescript
POST https://kspmas.ksyun.com/v1/chat/completions

Headers:
  Content-Type: application/json
  Authorization: Bearer {API_KEY}

Body:
{
  "model": "deepseek-v3.1",
  "messages": [
    {"role": "system", "content": "系统提示"},
    {"role": "user", "content": "用户消息"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

### 5.2 响应格式

```json
{
  "id": "f6ddf923381d4d608d13a42412025b9c",
  "object": "chat.completion",
  "created": 1765883677,
  "model": "deepseek-v3.1",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "AI生成的回复内容"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 13,
    "total_tokens": 113,
    "completion_tokens": 100
  }
}
```

### 5.3 参数说明

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `model` | string | 模型名称 | deepseek-v3.1 |
| `messages` | array | 对话消息列表 | 必需 |
| `temperature` | number | 随机性控制 (0-2) | 0.7 |
| `max_tokens` | number | 最大生成token数 | - |
| `top_p` | number | 核采样参数 | 1.0 |
| `frequency_penalty` | number | 频率惩罚 (-2 to 2) | 0 |
| `presence_penalty` | number | 存在惩罚 (-2 to 2) | 0 |

---

## ⚠️ 六、注意事项

### 6.1 性能优化

1. **首次请求较慢**: 首次API调用约10秒，后续请求会更快
2. **合理设置超时**: 推荐30秒超时（已配置）
3. **使用缓存**: 对相同问题缓存AI响应结果
4. **批量处理**: 避免频繁单次调用

### 6.2 错误处理

AIServiceAdapter 已实现：
- ✅ 自动重试（最多3次，指数退避）
- ✅ 超时控制（30秒）
- ✅ 错误分类（网络错误、服务错误、超时）
- ✅ 降级机制（失败时使用本地逻辑）

### 6.3 成本控制

DeepSeek-v3.1 token使用情况：
- **Prompt tokens**: 按实际消息长度计算
- **Completion tokens**: 受 `max_tokens` 限制
- **建议**: 设置合理的 `max_tokens`，避免过长响应

### 6.4 安全建议

1. **API密钥保护**:
   - ✅ 已存储在 `.env` 文件
   - ⚠️ 不要提交到Git（`.env` 在 `.gitignore` 中）
   - ⚠️ 生产环境使用环境变量

2. **请求限流**:
   - 建议实现请求频率限制
   - 避免短时间大量调用

3. **敏感信息过滤**:
   - 调用AI前过滤敏感客户数据
   - 记录审计日志

---

## 🔄 七、与现有系统集成

### 7.1 集成点

1. **对话管理** (`ConversationController`)
   - 对话结束时触发质量分析
   - 实时提供客服建议

2. **知识库** (`KnowledgeController`)
   - 智能推荐相关知识
   - 自动生成摘要和标签

3. **任务管理** (`TaskController`)
   - 自动生成任务描述
   - 预测任务优先级

4. **需求检测** (`RequirementDetectorService`)
   - AI辅助识别客户需求
   - 自动分类和优先级排序

### 7.2 推荐使用场景

✅ **高价值场景**:
- 对话质量评估和改进建议
- 知识库内容智能推荐
- 客户情绪分析
- 问题自动分类

⚠️ **慎用场景**:
- 实时消息生成（延迟较高）
- 批量数据处理（成本较高）
- 关键业务决策（需要人工审核）

---

## 📈 八、监控和日志

### 8.1 关键指标

监控以下指标：
- API调用次数
- 平均响应时间
- 成功率 / 失败率
- Token使用量
- 错误类型分布

### 8.2 日志记录

AIServiceAdapter 已包含日志：

```typescript
console.log(`[AI] Request timeout, retrying... (${retryCount + 1}/${this.maxRetries})`);
console.warn('[AI] Failed to parse analyze response:', error);
```

建议：
- 使用结构化日志（JSON格式）
- 记录请求ID、耗时、Token使用
- 集成到 Prometheus/Grafana

---

## 🚀 九、下一步工作

### 9.1 立即可用

✅ 配置完成，可以开始使用：
1. 在 `AiService.ts` 中集成 `AIServiceAdapter`
2. 更新 Use Cases 调用AI分析
3. 前端展示AI建议结果

### 9.2 后续优化

推荐在阶段二完善：
1. 添加响应缓存（Redis）
2. 实现请求频率限制
3. 添加AI调用监控面板
4. 补充单元测试和集成测试

### 9.3 测试用例

需要补充的测试：
- [ ] AIServiceAdapter 单元测试
- [ ] 对话分析集成测试
- [ ] 知识推荐E2E测试
- [ ] 错误处理和重试测试
- [ ] 超时和降级测试

---

## 📞 十、支持和反馈

### 10.1 常见问题

**Q: API调用失败怎么办？**
A: 检查网络连接、API密钥、请求格式。AIServiceAdapter 会自动重试3次。

**Q: 响应时间太长？**
A: 首次请求较慢（~10秒），可以使用缓存或异步处理。

**Q: 如何控制成本？**
A: 设置合理的 `max_tokens`，启用缓存，避免重复请求。

### 10.2 技术支持

- 金山云文档：https://kspmas.ksyun.com/docs
- DeepSeek文档：https://www.deepseek.com/
- 项目Issue：在项目仓库提交Issue

---

## ✅ 十一、验收清单

配置完成后的验收清单：

- [x] 环境变量配置完成
- [x] app.config.ts 更新完成
- [x] AIServiceAdapter 创建完成
- [x] 基础连通性测试通过
- [ ] AiService 集成 AIServiceAdapter
- [ ] Use Cases 调用AI分析
- [ ] 前端展示AI建议
- [ ] 监控和日志集成
- [ ] 测试用例补充

---

**文档版本**: v1.0
**最后更新**: 2025-12-16
**维护者**: 开发团队
