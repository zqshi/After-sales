# 覆盖率实跑记录

更新时间：2026-02-02

> 说明：本文件记录“真实覆盖率”执行结果与阻塞原因，便于后续复现与排障。

## 后端（Vitest）

**命令**:
```bash
cd backend && npm run test:coverage
```

**结果**: ✅ 成功  
**覆盖率摘要（v8）**:
- Statements: **89.56%**
- Branches: **80.65%**
- Functions: **85.12%**
- Lines: **89.56%**

**报告位置**:
- `backend/coverage/index.html`
- `backend/coverage/lcov.info`

**注意**:
- Vitest 阈值 80% 已通过

## 前端（Vitest）

**命令**:
```bash
npm run test:coverage
```

**结果**: ✅ 成功  
**覆盖率摘要（v8）**:
- Statements: **72.69%**
- Branches: **58.05%**
- Functions: **65.21%**
- Lines: **72.69%**

**报告位置**:
- `coverage/index.html`
- `coverage/lcov.info`

## AgentScope（Pytest）

**命令**:
```bash
cd agentscope-service && PYTHONPATH=. pytest
```

**结果**: ✅ 成功  
**覆盖率摘要**:
- Total coverage: **86.27%**

**报告位置**:
- `agentscope-service/coverage.xml`
- `agentscope-service/htmlcov/index.html`

## 后续建议

1. 后端覆盖率已达标（当前 89.52%/80.06%/85.11%）。
2. 覆盖率缺口清单已更新：`tests/COVERAGE_GAPS.md`。
