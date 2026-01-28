# 性能测试方案

> **文档版本**: v1.1
> **更新日期**: 2026-01-27

---

## 1. 当前自动化基线（仓库已实现）

来自 `tests/frontend/e2e/performance/performance.spec.js`：

- **首屏加载**：DOM Content Loaded < 3s
- **关键交互**：Dock 切换 < 500ms

---

## 2. 目标指标（参考非功能需求）

> 指标以 `docs/prd/2-baseline/5-nonfunctional/Non-Functional-Requirements.md` 为准。

- API P95 < 500ms（核心接口）
- 并发用户 500+（阶段性）
- 消息吞吐 500+ msg/min

---

## 3. 工具与方法

- **已落地**：Playwright（前端性能基线）
- **建议扩展**：k6 / Locust / JMeter（接口与系统压测）

---

## 4. 核心压测场景（建议）

- 登录与鉴权
- 会话列表/消息查询
- 需求创建/状态更新
- 任务创建/完成
- SSE/实时事件推送

---

## 5. 执行方式

```bash
# 运行前端性能基线用例
npm run test:e2e -- tests/frontend/e2e/performance/performance.spec.js
```

---

## 6. 数据准备

使用 `docs/testing/TEST_DATA.md` 中的数据集准备脚本或 mock 数据。

---

**维护团队**: QA / 后端
