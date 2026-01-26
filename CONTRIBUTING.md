# 贡献指南 (Contributing Guide)

感谢您对After-Sales项目的关注！本文档将帮助您了解如何为项目做出贡献。

## 目录

1. [行为准则](#行为准则)
2. [如何贡献](#如何贡献)
3. [开发流程](#开发流程)
4. [代码规范](#代码规范)
5. [提交规范](#提交规范)
6. [Pull Request流程](#pull-request流程)

---

## 行为准则

### 我们的承诺

为了营造开放和友好的环境，我们承诺：
- 尊重不同的观点和经验
- 接受建设性的批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 人身攻击或侮辱性评论
- 公开或私下骚扰
- 未经许可发布他人的私人信息

---

## 如何贡献

### 报告Bug

在提交Bug报告前，请：
1. 检查[已知问题列表](https://github.com/your-org/after-sales/issues)
2. 确保使用最新版本
3. 尝试重现问题

Bug报告应包含：
- 清晰的标题和描述
- 重现步骤
- 预期行为和实际行为
- 环境信息（OS、Node版本等）
- 相关日志和截图

### 建议新功能

功能建议应包含：
- 功能的详细描述
- 使用场景和价值
- 可能的实现方案
- 是否愿意实现该功能

### 贡献代码

1. Fork项目
2. 创建功能分支
3. 编写代码和测试
4. 提交Pull Request

---

## 开发流程

### 环境准备

```bash
# 克隆仓库
git clone https://github.com/your-org/after-sales.git
cd after-sales

# 安装Backend依赖
cd backend
npm install

# 安装AgentScope Service依赖
cd ../agentscope-service
pip install -e ".[dev]"

# 启动开发环境
docker-compose up -d
```

### 分支策略

- `main`: 主分支，保持稳定
- `develop`: 开发分支
- `feature/*`: 功能分支
- `bugfix/*`: Bug修复分支
- `hotfix/*`: 紧急修复分支

### 开发工作流

```bash
# 1. 从main创建功能分支
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 2. 开发和测试
# ... 编写代码 ...
npm test  # Backend测试
pytest    # Python测试

# 3. 提交代码
git add .
git commit -m "feat: add your feature"

# 4. 推送到远程
git push origin feature/your-feature-name

# 5. 创建Pull Request
```

---

## 代码规范

### Backend (TypeScript)

```typescript
// 使用ESLint和Prettier
npm run lint        // 检查代码风格
npm run lint:fix    // 自动修复
npm run format      // 格式化代码

// 命名规范
class UserService {}           // PascalCase for classes
function getUserById() {}      // camelCase for functions
const MAX_RETRY = 3;          // UPPER_CASE for constants

// 类型注解
function processUser(user: User): Promise<void> {
  // ...
}
```

### AgentScope Service (Python)

```python
# 使用ruff和mypy
ruff format .       # 格式化代码
ruff check .        # 检查代码风格
mypy src/           # 类型检查

# 命名规范
class UserService:              # PascalCase for classes
def get_user_by_id():          # snake_case for functions
MAX_RETRY = 3                  # UPPER_CASE for constants

# 类型注解
def process_user(user: User) -> None:
    ...
```

### 测试要求

- 所有新功能必须包含单元测试
- 测试覆盖率不低于80%
- 关键路径需要集成测试
- 重要功能需要E2E测试

---

## 提交规范

### Commit Message格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type类型

- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例

```bash
feat(backend): add user authentication

- Implement JWT-based authentication
- Add login and logout endpoints
- Add authentication middleware

Closes #123
```

---

## Pull Request流程

### 创建PR前

- [ ] 代码通过所有测试
- [ ] 代码符合规范
- [ ] 更新相关文档
- [ ] 添加必要的测试
- [ ] Rebase到最新的main分支

### PR描述模板

```markdown
## 变更类型
- [ ] 新功能
- [ ] Bug修复
- [ ] 文档更新
- [ ] 重构
- [ ] 性能优化

## 变更描述
[描述你的变更]

## 测试
[描述如何测试]

## 截图（如适用）
[添加截图]

## 相关Issue
Closes #[issue编号]
```

### Code Review

所有PR需要至少1个审核通过才能合并。

审核重点：
- 代码质量和可读性
- 测试覆盖率
- 性能影响
- 安全性
- 文档完整性

---

## 联系方式

- **GitHub Issues**: https://github.com/your-org/after-sales/issues
- **邮件**: dev@company.com
- **Slack**: #after-sales-dev

感谢您的贡献！
