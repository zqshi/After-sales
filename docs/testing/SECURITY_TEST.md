# 安全测试方案

> **文档版本**: v1.1
> **更新日期**: 2026-01-27

---

## 1. 范围与原则

- **鉴权与权限控制**：JWT、RBAC、资源级权限
- **输入安全**：SQL 注入、XSS、参数污染
- **传输安全**：HTTPS、敏感信息脱敏
- **文件与上传**：文件类型/大小校验
- **审计与日志**：敏感字段不落明文

---

## 2. 关键接口清单（以 /api/v1 为前缀）

- `/api/v1/api/auth/login`
- `/api/v1/api/auth/me`
- `/api/v1/api/conversations`
- `/api/v1/api/requirements`
- `/api/v1/api/tasks`
- `/api/v1/api/knowledge`
- `/api/v1/api/audit/events`
- `/metrics`（无需前缀）

---

## 3. 安全测试项

- **鉴权/权限**
  - 未登录访问返回 401
  - 无权限操作返回 403
  - 权限变化即时生效
- **注入与XSS**
  - SQL 注入：`' OR '1'='1` 等
  - XSS：`<script>alert(1)</script>`
- **CSRF**
  - 接口是否使用 SameSite Cookie / Token
- **敏感信息泄露**
  - 响应体/日志不输出密码、token、密钥
- **文件上传**
  - 非法类型、超大文件、重复上传校验

---

## 4. 工具建议

- OWASP ZAP
- Burp Suite（可选）

---

## 5. 自动化现状

- 当前安全测试以人工 + 工具扫描为主
- 如需自动化，可在 CI 中加入 ZAP 基础扫描

---

**维护团队**: QA / 安全
