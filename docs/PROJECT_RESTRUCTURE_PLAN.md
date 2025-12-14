# 项目目录结构治理方案

## 1. 现状分析

### 1.1 当前项目结构问题

#### 问题1: 文档分散混乱
```
当前状态:
- 根目录下散布13个Markdown文档
- docs/目录下仅有部分架构文档
- 文档职责不清晰,存在重复

影响:
- 难以查找和维护文档
- 新成员理解成本高
- 文档更新易遗漏
```

#### 问题2: 代码结构与DDD设计不匹配
```
当前代码结构: 按功能模块平铺
assets/js/
├── ai/
├── chat/
├── customer/
├── requirements/
├── tasks/
├── knowledge/
└── domains/  (新创建但未完全使用)

DDD设计结构: 按架构分层
assets/js/
├── presentation/  (展示层)
├── application/   (应用层)
├── domain/        (领域层)
└── infrastructure/ (基础设施层)

影响:
- 代码职责混淆
- 难以应用DDD模式
- 不利于测试和维护
```

#### 问题3: 临时文件未清理
```
chat-input-optimized.html  # HTML片段,非完整页面
其他可能的测试文件

影响:
- 项目结构不清晰
- 可能包含过时代码
```

### 1.2 文档分类分析

#### 需要移动的文档(13个)

**API相关(3个)** → `docs/api/`
- API_CONTRACT_GUIDE.md (80行)
- API_GATEWAY_SPEC.md (74行)
- API_OPENAPI_SPEC.md (150行)

**架构相关(3个)** → `docs/architecture/`
- BACKEND_ARCHITECTURE.md (28行) - 后端架构概述
- FRONTEND_ARCHITECTURE.md (23行) - 前端架构概述
- TECHNICAL_DESIGN.md (49行) - 技术设计总览

**治理相关(2个)** → `docs/governance/`
- GOVERNANCE_CHECKLIST.md (41行)
- GOVERNANCE_TRANSFORMATION_PLAN.md (107行)

**项目管理(2个)** → `docs/`
- MODULE_BACKLOG.md (15行) - 模块待办
- PROJECT_QUALITY_ASSESSMENT.md (471行) - 已存在于docs/,根目录重复

**开发文档(1个)** → `docs/development/`
- DEVELOPMENT.md (518行)

**保持根目录(2个)**
- README.md (298行) - 项目入口文档
- CHANGELOG.md (237行) - 变更日志

#### 需要评估合并的文档

```
重复/相似内容分析:

1. TECHNICAL_DESIGN.md vs docs/TECHNICAL_SOLUTIONS.md
   - TECHNICAL_DESIGN.md: 49行,DDD领域映射和模块技术方案
   - TECHNICAL_SOLUTIONS.md: 大量行,完整的工程化方案
   - 建议: 保留TECHNICAL_SOLUTIONS.md,将TECHNICAL_DESIGN.md有价值内容合并

2. BACKEND_ARCHITECTURE.md vs docs/architecture/*
   - BACKEND_ARCHITECTURE.md: 28行,后端技术选型概述
   - docs/architecture/: 完整的DDD架构设计
   - 建议: 保留BACKEND_ARCHITECTURE.md移至docs/architecture/作为后端补充

3. FRONTEND_ARCHITECTURE.md vs docs/architecture/*
   - FRONTEND_ARCHITECTURE.md: 23行,前端技术方案概述
   - 建议: 保留并移至docs/architecture/作为前端补充

4. PROJECT_QUALITY_ASSESSMENT.md (根目录)
   - 与docs/PROJECT_QUALITY_ASSESSMENT.md重复
   - 建议: 删除根目录版本
```

### 1.3 DIRECTORY_STRUCTURE.md设计方案评估

#### 优点 ✅
1. **符合DDD分层**: 清晰的四层架构(Presentation/Application/Domain/Infrastructure)
2. **职责明确**: 每层职责清晰,依赖方向正确
3. **可扩展**: 按限界上下文组织,易于扩展新领域
4. **测试友好**: 分层便于单元测试和集成测试
5. **文档完善**: 目录结构、命名规范、迁移计划都很详细

#### 挑战 ⚠️
1. **迁移工作量大**: 需要移动和重构大量现有代码
2. **现有代码依赖**: 需要更新所有import路径
3. **渐进式迁移**: 需要在迁移过程中保持系统可用
4. **团队学习成本**: 需要团队理解DDD分层概念

#### 可行性评估 ✅ 可借鉴并执行

**建议采用渐进式迁移策略**:
- 不是一次性推倒重来
- 按模块逐步迁移
- 保持系统持续可用
- 新代码直接按新结构开发

## 2. 治理方案

### 2.1 文档整理方案

#### 阶段1: 创建docs子目录结构

```bash
docs/
├── architecture/      # 架构设计(已存在)
├── api/              # API文档(新建)
├── governance/       # 治理文档(新建)
├── development/      # 开发文档(新建)
└── guides/           # 使用指南(新建)
```

#### 阶段2: 文档迁移映射表

| 源文件 | 目标位置 | 操作 |
|--------|----------|------|
| API_CONTRACT_GUIDE.md | docs/api/ | 移动 |
| API_GATEWAY_SPEC.md | docs/api/ | 移动 |
| API_OPENAPI_SPEC.md | docs/api/ | 移动 |
| BACKEND_ARCHITECTURE.md | docs/architecture/ | 移动 |
| FRONTEND_ARCHITECTURE.md | docs/architecture/ | 移动 |
| TECHNICAL_DESIGN.md | docs/architecture/ | 移动 |
| GOVERNANCE_CHECKLIST.md | docs/governance/ | 移动 |
| GOVERNANCE_TRANSFORMATION_PLAN.md | docs/governance/ | 移动 |
| DEVELOPMENT.md | docs/development/ | 移动 |
| MODULE_BACKLOG.md | docs/ | 移动 |
| PROJECT_QUALITY_ASSESSMENT.md | - | 删除(重复) |
| README.md | - | 保持根目录 |
| CHANGELOG.md | - | 保持根目录 |

#### 阶段3: 文档内容优化

**合并重复内容**:
```markdown
1. 将TECHNICAL_DESIGN.md的DDD领域映射部分补充到DDD_STRATEGIC_DESIGN.md
2. 更新README.md,添加文档导航链接
3. 更新ARCHITECTURE_SUMMARY.md,包含新增的架构文档引用
```

### 2.2 代码结构迁移方案

#### 渐进式迁移策略

```
原则:
- 新代码直接按新结构开发
- 旧代码按模块逐步迁移
- 保持系统持续可用
- 每个阶段都有可工作的版本
```

#### 迁移阶段划分

**阶段1: 基础设施层搭建(第1周)**
```
目标: 建立新目录结构,创建基础类

新建目录:
assets/js/
├── infrastructure/
│   ├── api/
│   │   ├── ApiClient.js       # API客户端封装
│   │   └── HttpClient.js      # HTTP请求基类
│   ├── events/
│   │   └── EventBus.js         # 事件总线
│   ├── cache/
│   │   └── LRUCache.js         # 缓存实现
│   └── repositories/
│       └── BaseRepository.js   # Repository基类

迁移文件:
- assets/js/api.js → infrastructure/api/ApiClient.js (重构)
- assets/js/core/storage.js → infrastructure/cache/Storage.js

影响范围: 最小,仅新增文件
```

**阶段2: 领域层实现(第2-3周)**
```
目标: 完善领域模型,实现聚合根

新建结构:
assets/js/domain/
├── conversation/
│   ├── models/
│   │   ├── Conversation.js     # 聚合根
│   │   ├── Message.js          # 实体
│   │   └── Channel.js          # 值对象
│   ├── services/
│   │   └── SLACalculator.js    # 领域服务
│   └── events/
│       └── MessageSentEvent.js
├── customer/
│   ├── models/
│   │   └── (已存在,需补充)
│   └── repositories/
│       └── (已存在)
└── requirement/
    ├── models/
    │   ├── Requirement.js
    │   └── RequirementStatus.js
    └── services/
        └── RequirementDetector.js

保留旧结构: 暂时保留原有文件,新代码使用新结构
影响范围: 中等,新代码引用新路径
```

**阶段3: 应用层重构(第4周)**
```
目标: 创建应用服务层,封装用例

新建结构:
assets/js/application/
├── services/
│   ├── ConversationService.js   # 对话服务
│   ├── ProfileService.js         # 客户服务
│   └── RequirementService.js    # 需求服务
├── commands/
│   ├── SendMessageCommand.js
│   └── CreateRequirementCommand.js
├── queries/
│   ├── GetConversationQuery.js
│   └── GetProfileQuery.js
└── dtos/
    ├── ConversationDTO.js
    └── ProfileDTO.js

迁移策略:
- 从旧模块中提取业务逻辑到Application Services
- 保持接口兼容
影响范围: 较大,需要重构业务逻辑
```

**阶段4: 展示层迁移(第5周)**
```
目标: 重构视图层,使用ViewModel模式

新建结构:
assets/js/presentation/
├── conversation/
│   ├── ConversationView.js
│   ├── ConversationController.js
│   ├── components/
│   │   ├── MessageList.js
│   │   └── MessageInput.js
│   └── viewmodels/
│       └── ConversationViewModel.js
├── customer/
├── requirement/
└── task/

迁移策略:
- 将assets/js/chat/index.js重构为Conversation模块
- 将assets/js/customer/index.js重构为Customer模块
- 逐个页面迁移

影响范围: 大,需要更新HTML引用
```

**阶段5: 旧代码清理(第6周)**
```
目标: 移除旧目录,更新所有引用

操作:
- 删除旧目录: assets/js/{chat,customer,requirements,tasks,knowledge,ai}/
- 更新所有import语句
- 运行完整测试

影响范围: 全局
验证: 完整的回归测试
```

### 2.3 临时文件清理方案

#### 待清理文件列表

```bash
# 确认可删除
./chat-input-optimized.html  # HTML片段,非完整页面

# 待评估
(运行扫描后补充)
```

#### 清理原则

1. **HTML片段**: 删除,应该在组件中实现
2. **测试文件**: 移至tests/目录
3. **备份文件**: 删除(*_backup.*, *.old)
4. **临时文件**: 删除(*.tmp, *.temp)

## 3. 执行计划

### 3.1 文档整理执行计划

```
时间: 1天
负责: 架构团队

步骤:
1. 创建docs子目录结构 (30分钟)
2. 移动文档到对应目录 (1小时)
3. 删除重复文档 (30分钟)
4. 更新README.md文档导航 (1小时)
5. 更新内部文档链接 (1小时)
6. Git提交 (30分钟)

验证:
- 所有文档可访问
- 链接无死链
- 文档结构清晰
```

### 3.2 代码迁移执行计划

```
时间: 6周(可与开发并行)
负责: 开发团队

周1: 基础设施层
周2-3: 领域层
周4: 应用层
周5: 展示层
周6: 清理验证

每周交付:
- 可工作的代码
- 单元测试
- 迁移文档

验证标准:
- 所有测试通过
- 功能无回归
- 性能无劣化
```

### 3.3 风险控制

#### 风险1: 迁移过程中系统不可用
**缓解措施**:
- 采用渐进式迁移
- 保持旧代码同时运行
- 每个阶段都有可回滚点

#### 风险2: import路径更新遗漏
**缓解措施**:
- 使用ESLint检查
- 自动化查找替换
- 完整的集成测试

#### 风险3: 团队理解成本
**缓解措施**:
- 提供DDD培训
- 编写迁移指南
- Code Review把关

## 4. 成功标准

### 4.1 文档整理成功标准

- ✅ 根目录只保留README.md、CHANGELOG.md和配置文件
- ✅ 所有文档按类型归档到docs/子目录
- ✅ 无重复文档
- ✅ 文档导航清晰
- ✅ 所有链接可用

### 4.2 代码迁移成功标准

- ✅ 新目录结构符合DDD分层架构
- ✅ 所有模块按限界上下文组织
- ✅ 依赖方向正确(内层独立于外层)
- ✅ 测试覆盖率≥80%
- ✅ 无旧代码残留
- ✅ 性能无回归

### 4.3 质量标准

- ✅ 所有ESLint规则通过
- ✅ 所有单元测试通过
- ✅ E2E测试通过
- ✅ 代码Review通过
- ✅ 文档完整

## 5. 后续优化

### 5.1 短期优化(1-2个月)

1. **完善测试**: 补充单元测试,达到80%覆盖率
2. **性能优化**: 应用虚拟滚动、懒加载等优化
3. **安全加固**: 应用XSS防护,完善CSRF防护
4. **监控接入**: 接入Sentry错误监控

### 5.2 中期优化(3-6个月)

1. **事件驱动**: 实现完整的EventBus和事件处理器
2. **CQRS**: 分离读写模型
3. **微前端**: 考虑模块独立部署
4. **PWA**: 支持离线使用

### 5.3 长期优化(6-12个月)

1. **事件溯源**: 实现Event Sourcing
2. **微服务**: 后端拆分为微服务
3. **国际化**: 支持多语言
4. **移动端**: 开发移动应用

## 6. 附录

### 6.1 文档模板

#### 架构文档模板
```markdown
# {文档标题}

## 1. 概述
[文档目的和适用范围]

## 2. 架构设计
[架构图和说明]

## 3. 技术选型
[技术栈和理由]

## 4. 实施方案
[具体实施步骤]

## 5. 风险与挑战
[潜在风险和应对]

---
文档版本: 1.0
创建日期: YYYY-MM-DD
维护者: [团队名称]
```

### 6.2 Git提交规范

```
格式:
<type>(<scope>): <subject>

type:
- refactor: 代码重构(不改变功能)
- chore: 项目结构调整
- docs: 文档更新

示例:
chore(structure): 整理项目文档目录结构

- 创建docs子目录(api/governance/development)
- 移动13个文档到对应目录
- 删除重复的PROJECT_QUALITY_ASSESSMENT.md
- 更新README.md文档导航

refactor(domain): 迁移Customer模块到DDD分层结构

- 创建domain/customer目录结构
- 实现CustomerProfile聚合根
- 创建ProfileRepository
- 更新相关import路径
- 补充单元测试

Refs #123
```

### 6.3 迁移检查清单

**文档整理检查清单**:
- [ ] docs/子目录已创建
- [ ] 13个文档已移动到正确位置
- [ ] 重复文档已删除
- [ ] README.md已更新
- [ ] 所有内部链接已检查
- [ ] Git已提交

**代码迁移检查清单** (每个阶段):
- [ ] 新目录结构已创建
- [ ] 代码已迁移
- [ ] import路径已更新
- [ ] 单元测试已补充
- [ ] 测试全部通过
- [ ] 代码Review已完成
- [ ] 文档已更新
- [ ] Git已提交

---

**文档版本**: 1.0
**创建日期**: 2024-12-14
**维护者**: 架构团队
