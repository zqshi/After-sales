# After-Sales 项目文档中心

**项目名称**: After-Sales 售后系统
**技术栈**: AgentScope + Node.js + PostgreSQL + Redis
**架构模式**: Multi-Agent + DDD + Event-Driven
**文档版本**: v1.0
**最后更新**: 2025-12-27

---

## 📖 文档导航

### 🚀 新手必读

如果你是新加入团队的开发者，按以下顺序阅读文档：

1. **[快速开始](guides/QUICK_START.md)** - 5分钟快速了解项目
2. **[启动指南](guides/STARTUP_GUIDE.md)** - 详细的环境配置和启动步骤
3. **[Multi-Agent架构](architecture/MULTI_AGENT_ARCHITECTURE.md)** - 核心架构设计
4. **[API参考](api/API_REFERENCE.md)** - AgentScope API文档

---

## 📂 文档结构

```
docs/
├── README.md                            # 📍 本文件（文档导航）
├──architecture/                          # 🏗️ 架构设计
│   ├── MULTI_AGENT_ARCHITECTURE.md       # Multi-Agent架构详解
│   └── decision-records/                 # 架构决策记录（ADR）
│       └── ADR-001-MULTI-AGENT.md        # ADR-001: 为什么选择Multi-Agent
├── api/                                  # 🔌 API文档
│   ├── API_REFERENCE.md                  # AgentScope API参考
│   └── BACKEND_API.md                    # Backend API参考
├── implementation/                       # 📝 实施记录
│   ├── PHASE_1_AGENTS.md                 # Phase 1: 3个Agent实施
│   ├── PHASE_2_QUALITY_INSPECTION.md     # Phase 2: 质检异步化
│   └── PHASE_3_TESTING.md                # Phase 3: 测试和优化
├── guides/                               # 📚 使用指南
│   ├── QUICK_START.md                    # 快速开始（5分钟）
│   ├── STARTUP_GUIDE.md                  # 完整启动指南（30分钟）
│   └── DEVELOPMENT_GUIDE.md              # 开发者指南
├── features/                             # ✨ 功能文档
│   └── SENTIMENT_ICON_FEATURE.md         # 情感图标功能
├── prd/                                  # 📋 产品需求文档
│   ├── README.md                         # PRD索引
│   ├── BUSINESS_FLOW_DESIGN.md           # 业务流程设计
│   ├── DIALOGUE_MODE_SPECIFICATION.md    # 对话模式规格
│   └── PRODUCT_ANALYSIS_REPORT.md        # 产品分析报告
└── reports/                              # 📊 各类报告
    ├── CODE_GOVERNANCE_REPORT.md         # 代码治理报告
    └── DOCS_GOVERNANCE_ANALYSIS.md       # 文档治理分析
```

---

## 🎯 按角色查找文档

### 👨‍💻 开发工程师

**必读文档**:
1. [启动指南](guides/STARTUP_GUIDE.md) - 如何运行项目
2. [Multi-Agent架构](architecture/MULTI_AGENT_ARCHITECTURE.md) - 理解系统架构
3. [API参考](api/API_REFERENCE.md) - AgentScope API使用

**参考文档**:
- [Phase 1实施](implementation/PHASE_1_AGENTS.md) - 3个Agent实现细节
- [代码治理报告](reports/CODE_GOVERNANCE_REPORT.md) - 代码规范

---

### 🏗️ 架构师/Tech Lead

**必读文档**:
1. [Multi-Agent架构](architecture/MULTI_AGENT_ARCHITECTURE.md) - 完整架构设计
2. [ADR-001](architecture/decision-records/ADR-001-MULTI-AGENT.md) - 架构决策记录
3. [Phase 1-3实施](implementation/) - 实施历史

**参考文档**:
- [文档治理分析](reports/DOCS_GOVERNANCE_ANALYSIS.md) - 文档质量评估
- [产品分析](prd/PRODUCT_ANALYSIS_REPORT.md) - 产品需求

---

### 🎨 产品经理

**必读文档**:
1. [业务流程设计](prd/BUSINESS_FLOW_DESIGN.md) - 业务流程
2. [对话模式规格](prd/DIALOGUE_MODE_SPECIFICATION.md) - 对话模式
3. [产品分析报告](prd/PRODUCT_ANALYSIS_REPORT.md) - 产品分析

**参考文档**:
- [Multi-Agent架构](architecture/MULTI_AGENT_ARCHITECTURE.md) - 技术架构（第一、二章）
- [情感图标功能](features/SENTIMENT_ICON_FEATURE.md) - 功能示例

---

### 🧪 测试工程师

**必读文档**:
1. [启动指南](guides/STARTUP_GUIDE.md) - 如何运行项目
2. [Phase 3测试](implementation/PHASE_3_TESTING.md) - 测试策略和用例
3. [API参考](api/API_REFERENCE.md) - API测试参考

---

### 📝 技术写作者

**必读文档**:
1. [文档治理分析](reports/DOCS_GOVERNANCE_ANALYSIS.md) - 文档现状和规范
2. [本导航](README.md) - 文档结构

---

## 📝 按主题查找文档

### 🏗️ 架构与设计

| 文档 | 描述 | 难度 |
|------|------|------|
| [Multi-Agent架构](architecture/MULTI_AGENT_ARCHITECTURE.md) | 完整架构设计（需求、设计、实现） | ⭐⭐⭐ |
| [ADR-001](architecture/decision-records/ADR-001-MULTI-AGENT.md) | 为什么选择Multi-Agent架构 | ⭐⭐ |
| [业务流程设计](prd/BUSINESS_FLOW_DESIGN.md) | 业务层面流程设计 | ⭐ |

---

### 🔧 实施与开发

| 文档 | 描述 | 难度 |
|------|------|------|
| [Phase 1实施](implementation/PHASE_1_AGENTS.md) | 3个Agent实现详情 | ⭐⭐⭐ |
| [Phase 2实施](implementation/PHASE_2_QUALITY_INSPECTION.md) | 质检异步化实现 | ⭐⭐⭐ |
| [Phase 3实施](implementation/PHASE_3_TESTING.md) | 测试和优化 | ⭐⭐ |
| [启动指南](guides/STARTUP_GUIDE.md) | 详细的环境配置和启动 | ⭐⭐ |

---

### 🔌 API文档

| 文档 | 描述 | 难度 |
|------|------|------|
| [AgentScope API](api/API_REFERENCE.md) | Python服务API参考 | ⭐⭐ |
| [Backend API](api/BACKEND_API.md) | Node.js服务API参考 | ⭐⭐ |

---

### 📋 产品与需求

| 文档 | 描述 | 难度 |
|------|------|------|
| [产品分析报告](prd/PRODUCT_ANALYSIS_REPORT.md) | 产品需求分析 | ⭐ |
| [业务流程设计](prd/BUSINESS_FLOW_DESIGN.md) | 业务流程图 | ⭐ |
| [对话模式规格](prd/DIALOGUE_MODE_SPECIFICATION.md) | 对话模式详细说明 | ⭐⭐ |

---

### 📊 报告与分析

| 文档 | 描述 | 受众 |
|------|------|------|
| [代码治理报告](reports/CODE_GOVERNANCE_REPORT.md) | 代码库治理成果 | 全员 |
| [文档治理分析](reports/DOCS_GOVERNANCE_ANALYSIS.md) | 文档质量评估 | 架构师、TW |

---

## 🔍 常见问题导航

### Q: 如何快速运行项目？
**A**: 阅读 [快速开始](guides/QUICK_START.md)（5分钟）或 [启动指南](guides/STARTUP_GUIDE.md)（完整版）

### Q: 什么是Multi-Agent架构？
**A**: 阅读 [Multi-Agent架构](architecture/MULTI_AGENT_ARCHITECTURE.md) 第一、二章

### Q: 3个Agent分别做什么？
**A**: 阅读 [Multi-Agent架构](architecture/MULTI_AGENT_ARCHITECTURE.md) 第2.3节

### Q: 质检是如何实现的？
**A**: 阅读 [Phase 2实施](implementation/PHASE_2_QUALITY_INSPECTION.md) 或 [Multi-Agent架构](architecture/MULTI_AGENT_ARCHITECTURE.md) 第三章场景3

### Q: 如何添加新的Agent？
**A**: 阅读 [Phase 1实施](implementation/PHASE_1_AGENTS.md)，参考AssistantAgent实现

### Q: AgentScope API有哪些接口？
**A**: 阅读 [API参考](api/API_REFERENCE.md)

### Q: 项目有哪些技术债务？
**A**: 阅读 [代码治理报告](reports/CODE_GOVERNANCE_REPORT.md) 和 [文档治理分析](reports/DOCS_GOVERNANCE_ANALYSIS.md)

---

## 🚨 文档状态说明

| 状态 | 说明 | 图标 |
|------|------|------|
| **完成** | 文档已完成并审核 | ✅ |
| **草稿** | 文档正在编写中 | 🚧 |
| **待审核** | 文档已完成，等待审核 | ⏳ |
| **已过时** | 文档内容已过时，需要更新 | ⚠️ |

### 当前文档状态

#### 架构设计
- ✅ [MULTI_AGENT_ARCHITECTURE.md](architecture/MULTI_AGENT_ARCHITECTURE.md) - 完成（2025-12-27）
- 🚧 [ADR-001-MULTI-AGENT.md](architecture/decision-records/ADR-001-MULTI-AGENT.md) - 待创建

#### API文档
- 🚧 [API_REFERENCE.md](api/API_REFERENCE.md) - 待创建
- 🚧 [BACKEND_API.md](api/BACKEND_API.md) - 待创建

#### 实施记录
- 🚧 [PHASE_1_AGENTS.md](implementation/PHASE_1_AGENTS.md) - 待创建
- 🚧 [PHASE_2_QUALITY_INSPECTION.md](implementation/PHASE_2_QUALITY_INSPECTION.md) - 待创建
- 🚧 [PHASE_3_TESTING.md](implementation/PHASE_3_TESTING.md) - 待创建

#### 使用指南
- ⏳ [QUICK_START.md](guides/QUICK_START.md) - 待审核
- ⏳ [STARTUP_GUIDE.md](guides/STARTUP_GUIDE.md) - 待审核

#### 产品文档
- ✅ [PRD目录](prd/README.md) - 完成
- ⏳ [BUSINESS_FLOW_DESIGN.md](prd/BUSINESS_FLOW_DESIGN.md) - 待验证
- ⏳ [DIALOGUE_MODE_SPECIFICATION.md](prd/DIALOGUE_MODE_SPECIFICATION.md) - 待验证

#### 报告
- ✅ [CODE_GOVERNANCE_REPORT.md](reports/CODE_GOVERNANCE_REPORT.md) - 完成（2025-12-27）
- ✅ [DOCS_GOVERNANCE_ANALYSIS.md](reports/DOCS_GOVERNANCE_ANALYSIS.md) - 完成（2025-12-27）

---

## 📝 文档贡献指南

### 如何创建新文档

1. **选择正确的目录**:
   - 架构设计 → `architecture/`
   - API文档 → `api/`
   - 实施记录 → `implementation/`
   - 使用指南 → `guides/`
   - 产品需求 → `prd/`
   - 报告 → `reports/`

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

### 文档Review流程

1. **开发者**: 创建/更新文档
2. **自检**: 检查格式、链接、代码示例
3. **提交PR**: 与代码变更一起提交
4. **Reviewer**: 技术负责人或架构师Review
5. **合并**: 合并后更新文档状态为✅

---

## 🔧 文档工具

### 推荐工具

- **Markdown编辑器**: VSCode + Markdown All in One插件
- **图表工具**: draw.io、Excalidraw
- **API文档**: TypeDoc（TypeScript）、JSDoc（JavaScript）、Sphinx（Python）
- **架构图**: PlantUML、Mermaid

### 本地预览

```bash
# 安装Markdown预览工具
npm install -g markdown-serve

# 在docs目录运行
cd docs
markdown-serve
# 访问 http://localhost:3000
```

---

## 📊 文档质量标准

### 优秀文档的标准

- ✅ **清晰的目标受众**: 明确这份文档是给谁看的
- ✅ **完整的章节结构**: 标题、目录、正文、相关文档
- ✅ **具体的代码示例**: 不要只描述，要有可运行的代码
- ✅ **准确的信息**: 与实际代码实现100%一致
- ✅ **及时的更新**: 代码变更时同步更新文档

### 文档检查清单

创建/更新文档时，检查以下项：

- [ ] 文件名清晰明确
- [ ] 有标题、版本号、日期
- [ ] 超过200行时有目录
- [ ] 章节结构清晰
- [ ] 有代码示例（如需要）
- [ ] 有图表（如需要）
- [ ] 链接到相关文档
- [ ] 拼写和语法检查
- [ ] 更新了docs/README.md导航
- [ ] 更新了"最后更新"日期

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

## 🎯 2026年文档路线图

### Q1 2026（1-3月）

- [ ] 完成所有P0文档（API、实施记录）
- [ ] 建立文档Review流程
- [ ] 配置自动化文档生成工具

### Q2 2026（4-6月）

- [ ] 完成所有P1文档
- [ ] 建立文档质量自动检查
- [ ] 创建视频教程

### Q3-Q4 2026（7-12月）

- [ ] 持续优化文档质量
- [ ] 建立文档守护者（Doc Guardian）机制
- [ ] 文档国际化（如需要）

---

## 📞 获取帮助

### 文档相关问题

- **架构设计问题**: 联系架构师团队
- **API使用问题**: 查看 [API参考](api/API_REFERENCE.md) 或联系Backend团队
- **文档缺失/错误**: 在GitHub Issues中提issue，标签：`documentation`

### 紧急联系方式

- **技术负责人**: [联系方式]
- **架构师**: [联系方式]
- **文档维护者**: [联系方式]

---

## 📜 文档变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2025-12-27 | 创建文档导航，新增MULTI_AGENT_ARCHITECTURE.md | Claude |
| - | - | - | - |

---

**文档维护者**: 架构团队
**最后审查**: 2025-12-27
**下次审查**: 2026-02-01
