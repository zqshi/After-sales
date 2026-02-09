# ADR-002: 权限点命名规范与统一

**状态**: ✅ 已采纳并实施（权限管理模块已对齐）
**日期**: 2026-02-09
**决策者**: 架构团队
**最后更新**: 2026-02-09

---

## 背景

权限点命名在不同模块存在不一致（如权限管理模块曾复用 `session.read/write`），导致：
- 权限语义不清晰（读/写是否指会话或权限）
- UI 权限映射难以维护
- 新增功能时无法复用统一命名规则

---

## 决策

统一采用 **点分层级** 的权限点命名规范：

```
{domain}.{resource?}.{action}
```

### 规则
- `domain`：业务域或系统域（如 `customers`、`tasks`、`permissions`、`monitoring`）
- `resource`：可选，表示子资源（如 `members`、`roles`）
- `action`：动词或能力（如 `read`、`write`、`manage`、`assign`、`complete`）

### 示例
- `customers.read`
- `tasks.assign`
- `permissions.members.manage`
- `permissions.roles.manage`

### 禁止事项
- 禁止用无领域语义的权限点（如 `session.read/write`）去承载其他模块能力
- 禁止在同一域内混用 `read/write` 与 `view/edit` 等语义

---

## 影响范围

### 权限管理模块
此前权限管理接口使用 `session.read/write` 作为权限点，现统一调整为：

| 模块 | 旧权限点 | 新权限点 |
|------|----------|----------|
| 成员管理 | session.write | permissions.members.manage |
| 角色管理 | session.write | permissions.roles.manage |

### 数据迁移
新增迁移 `1760000000004-AddPermissionsManagementPermissions.ts`，确保 `admin` 角色拥有新权限点。

---

## 兼容性策略

- `session.read/write` 保留用于会话/鉴权相关接口，不再作为权限管理模块权限点使用
- 权限管理 UI 权限键与后端权限点统一为同名键，避免额外映射

---

## 后续工作

- 逐步梳理业务域权限点，确保全部遵循命名规范
- 增加“读/写/管理”层级的权限策略（如 `permissions.members.read`）
