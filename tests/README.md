# After-Sales 测试指南

**测试框架**: Vitest (Backend单元测试) + Bash Scripts (集成测试)
**测试覆盖率目标**: 80%
**最后更新**: 2025-12-27

---

## 📋 目录

- [测试类型](#测试类型)
- [快速开始](#快速开始)
- [集成测试](#集成测试)
- [单元测试](#单元测试)
- [测试数据](#测试数据)
- [测试最佳实践](#测试最佳实践)

---

## 测试类型

### 1. 集成测试（Integration Tests）

**位置**: `tests/integration/`

**目的**: 测试多个服务间的集成流程

**已实现的测试**:
- ✅ `test-quality-inspection.sh` - 质检集成测试

**运行方式**:
```bash
./tests/integration/test-quality-inspection.sh
```

---

### 2. 单元测试（Unit Tests）

**位置**: `backend/tests/unit/`

**目的**: 测试单个类/函数的逻辑

**状态**: ⏳ 待补充（Phase 3）

**运行方式**:
```bash
cd backend
npm test
```

---

### 3. E2E测试（End-to-End Tests）

**位置**: `tests/e2e/`

**目的**: 测试完整的用户流程

**状态**: ⏳ 待实现（Phase 3）

---

## 快速开始

### 前置条件

确保所有服务已启动：

```bash
# 1. 检查Backend服务
curl http://localhost:8080/api/health

# 2. 检查AgentScope服务
curl http://localhost:5000/health

# 3. 检查PostgreSQL
psql -U admin -d aftersales -h localhost -c "SELECT 1;"

# 4. 检查Redis
redis-cli ping
```

---

### 运行所有测试

```bash
# 运行集成测试
./tests/integration/test-quality-inspection.sh

# 运行Backend单元测试（待补充）
cd backend && npm test

# 运行Frontend测试（待补充）
npm test
```

---

## 集成测试

### test-quality-inspection.sh

**测试目标**: 验证对话关闭后自动触发质检的完整流程

**测试步骤**:

1. **检查服务状态**
   - Backend服务健康检查
   - AgentScope服务健康检查

2. **创建测试对话**
   - POST `/api/conversations`
   - 获取conversation_id

3. **模拟对话**
   - 发送4条消息（2条用户 + 2条客服）
   - 模拟低质量对话场景

4. **关闭对话（触发质检）**
   - POST `/api/conversations/:id/close`
   - 验证关闭延迟<500ms

5. **等待质检完成**
   - 轮询质检报告（最多30秒）
   - GET `/api/quality-reports/:id`

6. **验证质检报告**
   - 检查报告结构完整性
   - 验证quality_score字段
   - 验证dimensions字段

**运行**:
```bash
./tests/integration/test-quality-inspection.sh
```

**预期输出**:
```
========================================
质检集成测试
========================================

Step 1: 检查服务状态
----------------------------------------
检查Backend服务... ✓
检查AgentScope服务... ✓

Step 2: 创建测试对话
----------------------------------------
创建测试对话... ✓ (ID: conv-123)

Step 3: 模拟对话
----------------------------------------
发送消息 (user)... ✓
发送消息 (assistant)... ✓
发送消息 (user)... ✓
发送消息 (assistant)... ✓

Step 4: 关闭对话（触发质检）
----------------------------------------
关闭对话... ✓ (耗时: 320ms)
✓ 对话关闭延迟 < 500ms 测试通过

Step 5: 等待质检完成
----------------------------------------
等待质检完成 (最多30秒).......... ✓
✓ 质检已完成，质量分: 78

Step 6: 验证质检报告
----------------------------------------
验证质检报告... ✓

质检报告详情:
----------------------------------------
{
  "quality_score": 78,
  "dimensions": {
    "completeness": 80,
    "professionalism": 75,
    "compliance": 85,
    "tone": 60
  },
  ...
}
----------------------------------------

========================================
✓ 质检集成测试全部通过
========================================
```

---

### 自定义测试脚本

**创建新的集成测试**:

```bash
#!/bin/bash
# tests/integration/test-your-feature.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# 配置
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"

echo -e "${GREEN}测试开始${NC}"

# 你的测试逻辑...

echo -e "${GREEN}测试通过${NC}"
```

**添加执行权限**:
```bash
chmod +x tests/integration/test-your-feature.sh
```

---

## 单元测试

**状态**: ⏳ 待补充（Phase 3）

### Backend单元测试（Vitest）

**测试框架**: Vitest + @faker-js/faker

**配置文件**: `backend/vitest.config.ts`

**运行**:
```bash
cd backend

# 运行所有测试
npm test

# 运行单个测试文件
npm test tests/unit/domain/Conversation.test.ts

# 运行并监听变化
npm test -- --watch

# 生成覆盖率报告
npm run test:coverage
```

**测试示例**:
```typescript
// backend/tests/unit/domain/Conversation.test.ts
import { describe, it, expect } from 'vitest';
import { Conversation } from '@/domain/aggregates/Conversation';

describe('Conversation', () => {
  it('should create a new conversation', () => {
    const conversation = Conversation.create({
      customerId: 'customer-001',
      channel: 'web',
      title: 'Test Conversation'
    });

    expect(conversation.status).toBe('active');
    expect(conversation.customerId).toBe('customer-001');
  });

  it('should close conversation and emit event', () => {
    const conversation = Conversation.create({...});
    conversation.close('user');

    expect(conversation.status).toBe('closed');
    expect(conversation.domainEvents).toHaveLength(1);
    expect(conversation.domainEvents[0].eventType).toBe('ConversationClosed');
  });
});
```

---

### Agent单元测试（Python）

**测试框架**: pytest

**配置文件**: `agentscope-service/pytest.ini`

**运行**:
```bash
cd agentscope-service

# 运行所有测试
pytest

# 运行单个测试文件
pytest tests/unit/test_assistant_agent.py

# 生成覆盖率报告
pytest --cov=src --cov-report=html
```

**测试示例**:
```python
# agentscope-service/tests/unit/test_assistant_agent.py
import pytest
from src.agents.assistant_agent import AssistantAgent

@pytest.mark.asyncio
async def test_assistant_agent_sentiment_analysis():
    agent = await AssistantAgent.create(toolkit, mcp_client)
    msg = Msg(name="user", content="系统怎么这么烂！")

    result = await agent.analyze_sentiment(msg)

    assert result["sentiment"] == "negative"
    assert result["risk_level"] == "high"
```

---

## 测试数据

### 测试数据库

**配置**:
```bash
# backend/.env.test
DATABASE_URL=postgresql://admin:admin123@localhost:5432/aftersales_test
```

**初始化**:
```bash
cd backend
npm run migration:run -- --env=test
```

### Mock数据

使用`@faker-js/faker`生成测试数据：

```typescript
import { faker } from '@faker-js/faker';

const mockCustomer = {
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
};

const mockConversation = {
  id: faker.string.uuid(),
  customerId: mockCustomer.id,
  channel: 'web',
  title: faker.lorem.sentence(),
};
```

---

## 测试最佳实践

### 1. 测试命名规范

**单元测试**:
- 文件名：`*.test.ts` 或 `*.spec.ts`
- 测试名：`should [期望行为] when [条件]`

**示例**:
```typescript
describe('Conversation', () => {
  it('should emit ConversationClosedEvent when closed', () => {
    // ...
  });

  it('should throw error when closing already closed conversation', () => {
    // ...
  });
});
```

---

### 2. AAA模式（Arrange-Act-Assert）

```typescript
it('should close conversation', () => {
  // Arrange - 准备测试数据
  const conversation = Conversation.create({...});

  // Act - 执行操作
  conversation.close('user');

  // Assert - 验证结果
  expect(conversation.status).toBe('closed');
});
```

---

### 3. 测试隔离

- ✅ 每个测试独立运行
- ✅ 使用`beforeEach`清理状态
- ✅ 不依赖测试顺序

```typescript
describe('Conversation', () => {
  let conversation: Conversation;

  beforeEach(() => {
    conversation = Conversation.create({...});
  });

  it('test 1', () => {
    // conversation是全新的
  });

  it('test 2', () => {
    // conversation是全新的
  });
});
```

---

### 4. Mock外部依赖

```typescript
import { vi } from 'vitest';

// Mock MCP Client
const mockMCPClient = {
  call_tool: vi.fn().mockResolvedValue({ sentiment: 'positive' })
};

// 使用Mock
const agent = new AssistantAgent(mockMCPClient);
const result = await agent.analyze_sentiment(msg);

expect(mockMCPClient.call_tool).toHaveBeenCalledWith(
  'analyzeConversation',
  { conversationId: 'conv-001' }
);
```

---

### 5. 覆盖率目标

| 类型 | 目标覆盖率 |
|------|-----------|
| **Domain层** | >90% |
| **Application层** | >80% |
| **Infrastructure层** | >70% |
| **API层** | >60% |
| **总体** | >80% |

---

## CI/CD集成

### GitHub Actions配置

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run Backend tests
        run: |
          cd backend
          npm test

      - name: Run Integration tests
        run: |
          docker-compose up -d
          ./tests/integration/test-quality-inspection.sh
```

---

## 待补充的测试

### Phase 3计划

**单元测试**:
- [ ] Domain层测试（Conversation, Customer, Task...）
- [ ] Application层测试（Use Cases）
- [ ] Agent测试（Assistant, Engineer, Inspector）

**集成测试**:
- [ ] Agent路由测试
- [ ] 并行执行测试
- [ ] MCP工具测试

**E2E测试**:
- [ ] 完整对话流程测试
- [ ] 质检流程测试
- [ ] 多场景测试

**压力测试**:
- [ ] 1000并发对话测试
- [ ] Agent性能测试
- [ ] 数据库压力测试

---

## 常见问题

### Q: 集成测试失败怎么办？

**A**: 检查以下项：
1. Backend和AgentScope服务是否启动
2. 数据库和Redis是否可访问
3. 环境变量是否正确配置
4. 查看服务日志：`docker-compose logs -f backend`

---

### Q: 如何调试测试？

**A**: 使用VSCode调试配置：

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

### Q: 测试覆盖率如何提升？

**A**: 优先级顺序：
1. Domain层（业务核心逻辑）
2. Application层（Use Cases）
3. Agent层（核心功能）
4. Infrastructure层（数据持久化）

---

## 相关文档

- [API_REFERENCE.md](../docs/api/API_REFERENCE.md) - API接口文档
- [AGENT_ARCHITECTURE_DESIGN.md](../docs/architecture/AGENT_ARCHITECTURE_DESIGN.md) - 架构设计
- [STARTUP_GUIDE.md](../docs/guides/STARTUP_GUIDE.md) - 启动指南

---

**维护者**: QA团队
**最后更新**: 2025-12-27
