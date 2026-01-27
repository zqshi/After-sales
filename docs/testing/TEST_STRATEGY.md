# 测试策略文档 (Test Strategy)

> **文档版本**: v1.0
> **创建日期**: 2025-12-30
> **维护团队**: QA团队
> **适用版本**: v0.5+ (基础测试) → v1.0 (完整测试体系)

---

## 📋 目录

- [1. 测试策略概览](#1-测试策略概览)
- [2. 单元测试](#2-单元测试)
- [3. 集成测试](#3-集成测试)
- [4. E2E测试](#4-e2e测试)
- [5. 性能测试](#5-性能测试)
- [6. 安全测试](#6-安全测试)
- [7. Agent测试](#7-agent测试)
- [8. 测试覆盖率](#8-测试覆盖率)

---

## 1. 测试策略概览

### 1.1 测试金字塔

```
         ┌────────────┐
         │  E2E测试   │  10% - 慢、脆弱、昂贵
         │   (UI)     │
      ┌──┴────────────┴──┐
      │   集成测试        │  20% - 中速、组件交互
      │  (API/Service)   │
   ┌──┴──────────────────┴──┐
   │     单元测试            │  70% - 快、稳定、廉价
   │  (函数/类/模块)         │
   └────────────────────────┘
```

### 1.2 测试目标

| 版本 | 单元测试覆盖率 | 集成测试覆盖率 | E2E测试场景 | 性能要求 |
|------|--------------|--------------|------------|----------|
| **v0.5** | >70% | >50% | 10+核心场景 | API P95 <500ms |
| **v0.8** | >80% | >70% | 30+场景 | API P95 <300ms |
| **v1.0** | >85% | >75% | 50+场景 | API P95 <200ms |

---

## 2. 单元测试

### 2.1 Backend单元测试 (Vitest + Fastify)

```typescript
// conversation.usecase.spec.ts
import { describe, it, expect, vi } from 'vitest';

describe('GetConversationUseCase', () => {
  it('应该返回单个对话', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: '1', customerId: '123', status: 'active' }),
    };
    const useCase = new GetConversationUseCase(repo as any);

    const result = await useCase.execute({ id: '1' }, { userId: 'u1' });

    expect(result.id).toBe('1');
  });
});
```

### 2.2 Frontend单元测试 (Vitest + JSDOM)

```typescript
// conversation-list.test.ts
import { describe, it, expect } from 'vitest';

describe('ConversationList', () => {
  it('应该渲染对话列表', () => {
    document.body.innerHTML = '<ul id=\"list\"><li>张三</li></ul>';
    expect(document.querySelector('#list')?.textContent).toContain('张三');
  });
});
```

### 2.3 Agent服务单元测试 (Pytest)

```python
# test_orchestrator.py
@pytest.mark.asyncio
async def test_intent_recognition_fault(orchestrator):
    """测试故障意图识别"""
    message = "我的设备无法开机"
    result = await orchestrator.recognize_intent(message)

    assert result['intent'] == 'fault'
    assert result['next_agent'] == 'EngineerAgent'
```

---

## 3. 集成测试

### 3.1 API集成测试

```typescript
// conversation.integration.spec.ts
describe('GET /api/v1/conversations', () => {
  it('应该返回对话列表', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
  });
});
```

---

## 4. E2E测试

### 4.1 使用Playwright

```typescript
// e2e/conversation-flow.spec.ts
test('创建新对话并发送消息', async ({ page }) => {
  await page.click('button:has-text("新建对话")');
  await page.fill('[name="customerName"]', '张三');
  await page.click('button:has-text("创建")');

  await expect(page.locator('.conversation-list')).toContainText('张三');
});
```

---

## 5. 性能测试

### 5.1 使用k6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // 预热
    { duration: '5m', target: 1000 }, // 峰值
    { duration: '2m', target: 0 },    // 降温
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // P95 <300ms
  },
};

export default function () {
  const res = http.get('https://api.after-sales.com/conversations');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });
  sleep(1);
}
```

---

## 6. 安全测试

### 6.1 OWASP Top 10测试

```yaml
SQL注入测试:
  - 输入: ' OR '1'='1
  - 预期: 应被拦截

XSS测试:
  - 输入: <script>alert('XSS')</script>
  - 预期: 应被转义

CSRF测试:
  - 验证CSRF Token
  - 验证Same-Site Cookie
```

---

## 7. Agent测试

### 7.1 意图识别准确率测试

```python
# test_intent_accuracy.py
def test_intent_recognition_accuracy():
    """测试意图识别准确率"""
    test_cases = [
        ("我的设备无法开机", "fault"),
        ("保修期是多久？", "consultation"),
        ("我要投诉", "complaint"),
    ]

    correct = 0
    for message, expected_intent in test_cases:
        result = orchestrator.recognize_intent(message)
        if result['intent'] == expected_intent:
            correct += 1

    accuracy = correct / len(test_cases)
    assert accuracy > 0.90  # 准确率>90%
```

---

## 8. 测试覆盖率

### 8.1 覆盖率目标

| 模块 | 单元测试 | 集成测试 | E2E测试 |
|------|---------|---------|---------|
| **Frontend** | >80% | >70% | >60% |
| **Backend** | >85% | >75% | >65% |
| **Agent服务** | >80% | >70% | - |

---

## 📞 相关文档

- [测试用例库](./TEST_CASES.md) - 详细测试用例
- [非功能需求](../prd/2-baseline/5-nonfunctional/Non-Functional-Requirements.md) - 性能要求

---

**文档维护者**: QA团队
**最后更新**: 2025-12-30
