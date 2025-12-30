# After-Sales 项目文档中心

**项目名称**: 智能售后工作台 (After-Sales Platform)
**技术栈**: AgentScope + NestJS + PostgreSQL + Redis + Milvus
**架构模式**: Multi-Agent + DDD + Event-Driven
**文档版本**: v2.0
**最后更新**: 2025-12-30

---

## 📖 文档导航

### 🚀 新手必读

如果你是新加入团队的成员，按以下顺序阅读文档：

| 角色 | 推荐路径 | 预计时间 |
|-----|---------|---------|
| **产品经理** | [产品分析报告](prd/PRODUCT_ANALYSIS_REPORT.md) → [PRD目录](prd/README.md) | 30分钟 |
| **开发工程师** | [快速开始](guides/QUICK_START.md) → [启动指南](guides/STARTUP_GUIDE.md) → [架构设计](architecture/AGENT_ARCHITECTURE_DESIGN.md) | 1小时 |
| **架构师** | [产品概述](prd/2-baseline/1-overview/Product-Overview.md) → [架构设计](architecture/AGENT_ARCHITECTURE_DESIGN.md) → [ADR文档](architecture/decision-records/) | 2小时 |
| **测试工程师** | [启动指南](guides/STARTUP_GUIDE.md) → [测试文档](testing/) → [PRD验收标准](prd/README.md) | 1小时 |

---

## 📂 文档结构总览

```
docs/
├── README.md                           # 📍 本文件(文档中心导航)
│
├── 📋 PRD文档 (prd/)                    # 产品需求文档
│   ├── README.md                       # PRD导航(必读)
│   ├── 1-roadmap/                      # 产品路线图
│   ├── 2-baseline/                     # 基线PRD(14个文档,~14,750行)
│   │   ├── 1-overview/                 # 产品概述
│   │   ├── 2-features/                 # 功能PRD(4个)
│   │   ├── 3-agents/                   # Agent PRD(4个)
│   │   ├── 4-hybrid-modules/           # 混合模块PRD(4个)
│   │   └── 5-nonfunctional/            # 非功能需求
│   ├── 3-incremental/                  # 增量PRD(v0.5/v0.8/v1.0)
│   ├── 4-templates/                    # PRD模板
│   └── 5-guides/                       # PRD编写指南
│
├── 🏗️ 架构设计 (architecture/)          # 系统架构文档
│   ├── AGENT_ARCHITECTURE_DESIGN.md    # Multi-Agent架构详解
│   └── decision-records/               # 架构决策记录(ADR)
│       └── ADR-001-MULTI-AGENT.md      # ADR-001: 为什么选择Multi-Agent
│
├── 🔌 API文档 (api/)                    # API参考文档
│   └── API_REFERENCE.md                # AgentScope API参考
│
├── 📝 实施记录 (implementation/)        # 实施历程文档
│   ├── PHASE_1_AGENTS_IMPLEMENTATION.md        # Phase 1: Agent实施
│   └── PHASE_2_QUALITY_INSPECTION.md           # Phase 2: 质检异步化
│
├── 📚 使用指南 (guides/)                # 快速入门指南
│   ├── QUICK_START.md                  # 5分钟快速开始
│   └── STARTUP_GUIDE.md                # 完整启动指南(30分钟)
│
├── ✨ 功能文档 (features/)              # 具体功能说明
│   └── SENTIMENT_ICON_FEATURE.md       # 情感图标功能
│
├── 🚀 部署文档 (deployment/)            # 部署运维
│   └── README.md                       # 部署文档索引(待补充)
│
├── 🧪 测试文档 (testing/)               # 测试策略
│   └── README.md                       # 测试文档索引(待补充)
│
└── 🔧 运维文档 (operations/)            # 运维手册
    └── README.md                       # 运维文档索引(待补充)
```

---

## 🎯 按角色查找文档

### 👨‍💻 开发工程师

**必读文档** (按优先级排序):
1. ⭐ [启动指南](guides/STARTUP_GUIDE.md) - 环境配置与项目启动
2. ⭐ [Multi-Agent架构](architecture/AGENT_ARCHITECTURE_DESIGN.md) - 理解核心架构
3. ⭐ [产品概述](prd/2-baseline/1-overview/Product-Overview.md) - 了解产品全貌
4. [API参考](api/API_REFERENCE.md) - AgentScope API使用
5. [Agent PRD](prd/2-baseline/3-agents/) - 了解各Agent职责

**参考文档**:
- [Phase 1实施记录](implementation/PHASE_1_AGENTS_IMPLEMENTATION.md) - Agent实现细节
- [功能PRD](prd/2-baseline/2-features/) - 各功能模块详细设计
- [非功能需求](prd/2-baseline/5-nonfunctional/Non-Functional-Requirements.md) - 性能、安全等要求

---

### 🏗️ 架构师 / Tech Lead

**必读文档**:
1. ⭐ [产品概述](prd/2-baseline/1-overview/Product-Overview.md) - 产品定位与价值
2. ⭐ [Multi-Agent架构](architecture/AGENT_ARCHITECTURE_DESIGN.md) - 完整架构设计
3. ⭐ [ADR-001](architecture/decision-records/ADR-001-MULTI-AGENT.md) - 架构决策记录
4. [非功能需求](prd/2-baseline/5-nonfunctional/Non-Functional-Requirements.md) - 企业级要求
5. [混合模块PRD](prd/2-baseline/4-hybrid-modules/) - Agent与功能协作

**参考文档**:
- [增量PRD](prd/3-incremental/) - 版本演进规划
- [产品路线图](prd/1-roadmap/ITERATIONS_ROADMAP.md) - 迭代计划
- [业务流程设计](prd/BUSINESS_FLOW_DESIGN.md) - 业务流程

---

### 🎨 产品经理

**必读文档**:
1. ⭐ [产品分析报告](prd/PRODUCT_ANALYSIS_REPORT.md) - 产品全面分析
2. ⭐ [PRD目录](prd/README.md) - PRD文档导航
3. ⭐ [产品概述](prd/2-baseline/1-overview/Product-Overview.md) - 快速了解产品
4. [功能PRD](prd/2-baseline/2-features/) - 4个核心功能详细设计
5. [对话模式规格](prd/DIALOGUE_MODE_SPECIFICATION.md) - 对话模式设计

**参考文档**:
- [业务流程设计](prd/BUSINESS_FLOW_DESIGN.md) - 业务流程
- [混合模块PRD](prd/2-baseline/4-hybrid-modules/) - 复杂功能设计
- [增量PRD](prd/3-incremental/) - 版本演进

---

### 🧪 测试工程师

**必读文档**:
1. ⭐ [启动指南](guides/STARTUP_GUIDE.md) - 如何运行项目
2. ⭐ [测试文档目录](testing/README.md) - 测试策略与规范
3. [功能PRD验收标准](prd/2-baseline/2-features/) - 各功能验收要求
4. [非功能需求](prd/2-baseline/5-nonfunctional/Non-Functional-Requirements.md) - 性能、安全验收
5. [API参考](api/API_REFERENCE.md) - API测试参考

**参考文档**:
- [Agent PRD验收标准](prd/2-baseline/3-agents/) - Agent功能验收
- [业务流程](prd/BUSINESS_FLOW_DESIGN.md) - E2E测试场景

---

### 🔧 DevOps / SRE

**必读文档**:
1. ⭐ [部署文档目录](deployment/README.md) - 部署指南
2. ⭐ [运维文档目录](operations/README.md) - 运维手册
3. [非功能需求](prd/2-baseline/5-nonfunctional/Non-Functional-Requirements.md) - 性能、可用性要求
4. [启动指南](guides/STARTUP_GUIDE.md) - 环境配置参考

---

## 📝 按主题查找文档

### 🏗️ 架构与设计

| 文档 | 描述 | 难度 | 优先级 |
|------|------|------|--------|
| [Multi-Agent架构](architecture/AGENT_ARCHITECTURE_DESIGN.md) | 完整架构设计(需求、设计、实现) | ⭐⭐⭐ | P0 |
| [ADR-001](architecture/decision-records/ADR-001-MULTI-AGENT.md) | 为什么选择Multi-Agent架构 | ⭐⭐ | P0 |
| [产品概述](prd/2-baseline/1-overview/Product-Overview.md) | 产品定位、用户、价值、技术栈 | ⭐ | P0 |
| [业务流程设计](prd/BUSINESS_FLOW_DESIGN.md) | 业务层面流程设计 | ⭐⭐ | P1 |

---

### 🔧 实施与开发

| 文档 | 描述 | 难度 | 优先级 |
|------|------|------|--------|
| [启动指南](guides/STARTUP_GUIDE.md) | 完整启动指南(30分钟) | ⭐⭐ | P0 |
| [快速开始](guides/QUICK_START.md) | 快速开始(5分钟) | ⭐ | P0 |
| [Phase 1实施](implementation/PHASE_1_AGENTS_IMPLEMENTATION.md) | 3个Agent实现详情 | ⭐⭐⭐ | P1 |
| [Phase 2实施](implementation/PHASE_2_QUALITY_INSPECTION.md) | 质检异步化实现 | ⭐⭐⭐ | P1 |

---

### 🔌 API文档

| 文档 | 描述 | 难度 | 优先级 |
|------|------|------|--------|
| [AgentScope API](api/API_REFERENCE.md) | Python服务API参考 | ⭐⭐ | P0 |

---

### 📋 产品与需求

| 文档 | 描述 | 优先级 | 完成度 |
|------|------|--------|--------|
| [PRD目录](prd/README.md) | PRD文档导航(必读) | P0 | ✅ 100% |
| [产品分析报告](prd/PRODUCT_ANALYSIS_REPORT.md) | 产品全面分析 | P0 | ✅ 100% |
| [基线PRD](prd/2-baseline/) | 14个模块化PRD文档 | P0 | ✅ 100% |
| [增量PRD](prd/3-incremental/) | v0.5/v0.8/v1.0版本演进 | P0 | ✅ 100% |
| [业务流程设计](prd/BUSINESS_FLOW_DESIGN.md) | 业务流程图 | P1 | ✅ 100% |
| [对话模式规格](prd/DIALOGUE_MODE_SPECIFICATION.md) | 对话模式详细说明 | P1 | ✅ 100% |

**统计**: PRD文档共17个文件，总计约**18,000+行**，覆盖产品、功能、Agent、混合模块、非功能需求5大类

---

### 🚀 部署运维

| 文档 | 描述 | 优先级 | 状态 |
|------|------|--------|------|
| [部署文档目录](deployment/README.md) | 部署、环境、CI/CD | P0 | 🚧 待补充 |
| [测试文档目录](testing/README.md) | 测试策略、用例、性能测试 | P0 | 🚧 待补充 |
| [运维文档目录](operations/README.md) | 运维手册、故障排查 | P0 | 🚧 待补充 |

---

## 🔍 常见问题导航

### Q: 如何快速运行项目？
**A**: 阅读 [快速开始](guides/QUICK_START.md) (5分钟) 或 [启动指南](guides/STARTUP_GUIDE.md) (完整版30分钟)

### Q: 什么是Multi-Agent架构？
**A**: 阅读 [Multi-Agent架构](architecture/AGENT_ARCHITECTURE_DESIGN.md) 第一、二章，或查看 [产品概述](prd/2-baseline/1-overview/Product-Overview.md)

### Q: 有哪些Agent，分别做什么？
**A**:
- **Orchestrator**: 智能路由，意图识别与Agent选择
- **AssistantAgent**: 知识检索与回复生成
- **EngineerAgent**: 故障诊断与解决方案推荐
- **InspectorAgent**: 质检评分与违规检测

详见 [Agent PRD目录](prd/2-baseline/3-agents/)

### Q: 对话管理功能有哪些？
**A**: 阅读 [对话管理PRD](prd/2-baseline/2-features/2.1-Conversation-Management-PRD.md)，包括多渠道对话、实时消息、对话转派、历史查询等

### Q: 质检是如何实现的？
**A**: 阅读 [分析与质检PRD](prd/2-baseline/4-hybrid-modules/Analytics-QA-PRD.md)，包含五维度评分、违规检测、异议复审等

### Q: 如何添加新的Agent？
**A**: 参考 [Agent PRD模板](prd/4-templates/Agent_PRD_Template.md) 和 [Phase 1实施](implementation/PHASE_1_AGENTS_IMPLEMENTATION.md)

### Q: 性能要求是什么？
**A**: 阅读 [非功能需求 - 第5.1章](prd/2-baseline/5-nonfunctional/Non-Functional-Requirements.md)
- v1.0目标: API P95 <200ms, 1000+并发用户, 99.95%可用性

### Q: 项目有哪些技术债务？
**A**: 查看 [部署文档](deployment/README.md)、[测试文档](testing/README.md)、[运维文档](operations/README.md) 中的待补充清单

---

## 🚨 文档状态说明

| 状态 | 说明 | 图标 |
|------|------|------|
| **完成** | 文档已完成并审核 | ✅ |
| **待补充** | 文档框架已建立，内容待补充 | 🚧 |
| **规划中** | 文档尚未创建 | 📅 |

### 当前文档状态总览

#### ✅ 已完成 (19个文档)
- 产品PRD体系 (17个文档, ~18,000行)
- 架构设计文档 (1个)
- 使用指南 (2个)

#### 🚧 待补充 (6个文档)
- 部署指南 (DEPLOYMENT_GUIDE.md)
- 环境配置 (ENVIRONMENT_SETUP.md)
- 测试策略 (TEST_STRATEGY.md)
- 测试用例 (TEST_CASES.md)
- 运维手册 (OPERATIONS_RUNBOOK.md)
- 故障排查 (TROUBLESHOOTING_GUIDE.md)

---

## 📝 文档贡献指南

### 如何创建新文档

1. **选择正确的目录**:
   - 架构设计 → `architecture/`
   - API文档 → `api/`
   - 实施记录 → `implementation/`
   - 使用指南 → `guides/`
   - 产品需求 → `prd/`
   - 部署运维 → `deployment/`
   - 测试文档 → `testing/`
   - 运维手册 → `operations/`

2. **使用清晰的文件名**:
   - ✅ 好: `MULTI_AGENT_ARCHITECTURE.md`
   - ❌ 差: `architecture.md`, `doc1.md`

3. **遵循文档模板**:
   - 标题、版本、日期
   - 目录（超过200行时必须）
   - 清晰的章节结构
   - 代码示例和图表
   - 相关文档链接

4. **更新本导航**:
   - 在对应章节添加新文档链接
   - 更新文档状态表

---

### 如何更新现有文档

1. **修改文档内容**
2. **更新"最后更新"日期**
3. **如果是重大修改，更新"版本号"**
4. **在Git提交信息中说明修改原因**

---

## 🔧 文档工具

### 推荐工具

- **Markdown编辑器**: VSCode + Markdown All in One插件
- **图表工具**: draw.io、Excalidraw
- **API文档**: TypeDoc (TypeScript)、JSDoc (JavaScript)、Sphinx (Python)
- **架构图**: PlantUML、Mermaid

---

## 📊 文档质量标准

### 优秀文档的标准

- ✅ **清晰的目标受众**: 明确这份文档是给谁看的
- ✅ **完整的章节结构**: 标题、目录、正文、相关文档
- ✅ **具体的代码示例**: 不要只描述，要有可运行的代码
- ✅ **准确的信息**: 与实际代码实现100%一致
- ✅ **及时的更新**: 代码变更时同步更新文档

---

## 📅 文档维护计划

### 每月维护（每月1号）

- [ ] 检查所有文档链接是否有效
- [ ] 检查文档与代码是否一致
- [ ] 更新过时的文档
- [ ] 删除不再需要的文档

### 每季度审查（每季度最后一个月）

- [ ] 全面审查文档质量
- [ ] 整合碎片化文档
- [ ] 更新架构决策记录（ADR）
- [ ] 收集文档反馈并改进

---

## 📞 获取帮助

### 文档相关问题

- **架构设计问题**: 联系架构师团队
- **API使用问题**: 查看 [API参考](api/API_REFERENCE.md) 或联系Backend团队
- **PRD需求问题**: 查看 [PRD目录](prd/README.md) 或联系产品团队
- **文档缺失/错误**: 在GitHub Issues中提issue，标签：`documentation`

---

## 📜 文档变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v2.0 | 2025-12-30 | 文档治理:删除冗余,补充缺失,更新索引 | Claude |
| v1.0 | 2025-12-27 | 创建文档导航，新增MULTI_AGENT_ARCHITECTURE.md | Claude |

---

**文档维护者**: 架构团队 + 产品团队
**最后审查**: 2025-12-30
**下次审查**: 2026-01-30
