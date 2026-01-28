# 测试文档

> **文档版本**: v1.1
> **创建日期**: 2025-12-30
> **维护团队**: QA团队
> **最后更新**: 2026-01-27

---

## 📋 文档清单

| 文档 | 状态 | 描述 | 优先级 |
|------|------|------|--------|
| `TEST_STRATEGY.md` | ✅已完成 | 测试策略与执行规范 | P0 |
| `TEST_CASES.md` | ✅已完成 | 用例索引与覆盖清单 | P0 |
| `PERFORMANCE_TEST.md` | ✅已完成 | 性能测试方案与基线 | P1 |
| `SECURITY_TEST.md` | ✅已完成 | 安全测试方案与清单 | P1 |
| `TEST_DATA.md` | ✅已完成 | 测试数据准备与清理 | P1 |
| `BUG_REPORT_TEMPLATE.md` | ✅已完成 | Bug报告模板 | P2 |

---

## ✅ 自动化落地现状（基于仓库实际）

- **后端测试（Vitest）**
  - 集成测试：`tests/backend/integration/`（已实现）
  - E2E测试：`tests/backend/e2e/`（已实现）
  - 单元测试：`tests/backend/unit/`（目录存在，当前无用例）
- **前端E2E（Playwright）**
  - `tests/frontend/e2e/`（已实现，含集成类用例）
- **系统集成脚本**
  - `tests/system/test-quality-inspection.sh`（质检流程）

---

## 🚀 快速执行入口

```bash
# 前端E2E（Playwright）
E2E_BASE_URL=http://localhost:3002 E2E_NO_WEB_SERVER=true npm run test:e2e -- --workers=1

# 后端集成/E2E（Vitest）
cd backend && npm run test:integration
cd backend && npm run test:e2e

# 系统集成脚本
./tests/system/test-quality-inspection.sh
```

---

## 📁 测试相关目录索引

- `tests/README.md`：测试目录结构与执行方式
- `tests/AUTOMATION_TEST_CASES.md`：自动化覆盖清单（含优先级）
- `tests/WEB_APP_TEST_CASES.md`：Web端详细用例（可执行版）
- `tests/backend/*.md`：后端接口与事件格式说明

---

## 📞 相关文档

- [测试策略](./TEST_STRATEGY.md)
- [测试用例库](./TEST_CASES.md)
- [性能测试方案](./PERFORMANCE_TEST.md)
- [安全测试方案](./SECURITY_TEST.md)
- [测试数据准备](./TEST_DATA.md)
- [Bug报告模板](./BUG_REPORT_TEMPLATE.md)

---

**文档维护者**: QA团队
