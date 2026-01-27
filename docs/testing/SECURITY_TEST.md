# 安全测试方案

> **文档版本**: v1.0
> **更新日期**: 2026-01-27

---

## 1. 重点测试项

- 鉴权与权限控制（401/403）
- SQL 注入与参数污染
- XSS/CSRF 基础检查
- 敏感信息泄露（日志/响应体）

---

## 2. 工具建议

- OWASP ZAP
- Burp Suite（可选）

---

## 3. 关键接口清单

- `/api/v1/api/auth/login`
- `/api/v1/api/conversations`
- `/api/v1/api/requirements`
- `/api/v1/api/tasks`
- `/api/v1/api/audit/events`

---

**维护团队**: QA / 安全
