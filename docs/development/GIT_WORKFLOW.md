# Git工作流程 (Git Workflow)

## 分支模型

### 主要分支

- **main**: 生产环境代码，始终保持稳定
- **develop**: 开发分支，集成最新功能

### 支持分支

- **feature/***: 功能开发
- **bugfix/***: Bug修复
- **hotfix/***: 紧急修复
- **release/***: 发布准备

## 工作流程

### 开发新功能

```bash
# 1. 从develop创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/user-authentication

# 2. 开发功能
# ... 编写代码 ...

# 3. 提交代码
git add .
git commit -m "feat: implement user authentication"

# 4. 推送到远程
git push origin feature/user-authentication

# 5. 创建PR到develop分支
```

### 修复Bug

```bash
# 从develop创建bugfix分支
git checkout develop
git checkout -b bugfix/fix-login-error

# 修复Bug并提交
git add .
git commit -m "fix: resolve login error"

# 推送并创建PR
git push origin bugfix/fix-login-error
```

### 紧急修复

```bash
# 从main创建hotfix分支
git checkout main
git checkout -b hotfix/critical-security-fix

# 修复问题
git add .
git commit -m "fix: patch security vulnerability"

# 推送并创建PR到main和develop
git push origin hotfix/critical-security-fix
```

## Commit规范

参见 [CONTRIBUTING.md](../../CONTRIBUTING.md#提交规范)

## 合并策略

- **feature → develop**: Squash and merge
- **bugfix → develop**: Squash and merge
- **hotfix → main**: Merge commit
- **develop → main**: Merge commit

## 最佳实践

1. 经常从上游分支rebase
2. 保持commit历史清晰
3. 避免直接push到main
4. 使用有意义的分支名
5. 及时删除已合并的分支
