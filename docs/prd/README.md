# 产品需求文档(PRD)目录

> **文档体系版本**: v2.0 (模块化PRD)
> **创建日期**: 2025-12-28
> **最后更新**: 2025-12-30
> **维护团队**: 产品团队

---

## 📖 文档导航

### 🎯 快速索引

| 你是... | 推荐阅读顺序 |
|---------|-------------|
| **新产品经理** | 产品概述 → 路线图 → 功能PRD → 混合模块PRD |
| **新开发工程师** | 产品概述 → Agent PRD → 非功能需求 → 路线图 |
| **架构师** | 产品概述 → Agent PRD → 混合模块 → 非功能需求 |
| **测试工程师** | 功能PRD验收标准 → 路线图 → 非功能需求 |

---

## 📂 文档结构

```
prd/
├── README.md                           # 📍 本文件(PRD导航)
├── PRODUCT_ANALYSIS_REPORT.md          # 产品分析报告(v1.2)
├── BUSINESS_FLOW_DESIGN.md             # 业务流程设计
│
├── 1-roadmap/                          # 🗺️ 产品路线图
│   └── ITERATIONS_ROADMAP.md           # 迭代路线图(v0.5/v0.8/v1.0)
│
├── 2-baseline/                         # 📋 基线PRD(模块化)
│   ├── 1-overview/                     # 产品概述
│   │   └── Product-Overview.md         # ✅ 产品定位、用户、价值、架构
│   │
│   ├── 2-features/                     # 核心功能PRD
│   │   ├── 2.1-Conversation-Management-PRD.md  # ✅ 对话管理(~1200行)
│   │   ├── 2.2-Customer-Management-PRD.md      # ✅ 客户管理(~650行)
│   │   ├── 2.3-Knowledge-Management-PRD.md     # ✅ 知识库管理(~400行)
│   │   └── 2.4-Report-Center-PRD.md            # ✅ 报表中心(~1000行)
│   │
│   ├── 3-agents/                       # Agent PRD(11章标准格式)
│   │   ├── Orchestrator-PRD.md         # ✅ 智能路由Agent(~1500行)
│   │   ├── AssistantAgent-PRD.md       # ✅ 助理Agent(知识检索)
│   │   ├── EngineerAgent-PRD.md        # ✅ 工程师Agent(故障诊断)
│   │   └── InspectorAgent-PRD.md       # ✅ 质检Agent(质量评分)
│   │
│   ├── 4-hybrid-modules/               # 混合模块PRD(4部分格式)
│   │   ├── Knowledge-Base-PRD.md       # ✅ 知识库混合PRD(Agent+功能)
│   │   ├── Analytics-QA-PRD.md         # ✅ 分析与质检(~1200行)
│   │   ├── Task-Collaboration-PRD.md   # ✅ 任务协同(~1400行)
│   │   └── Conversation-Mode-PRD.md    # ✅ 对话模式与人工介入(~1300行)
│   │
│   └── 5-nonfunctional/                # 非功能需求
│       └── Non-Functional-Requirements.md  # ✅ 性能/安全/可扩展性(~1100行)
│
├── 4-templates/                        # 📝 PRD模板
│   ├── Agent_PRD_Template.md           # ✅ Agent PRD模板(11章)
│   ├── Feature_PRD_Template.md         # ✅ Feature PRD模板(8章)
│   └── Hybrid_PRD_Template.md          # ✅ Hybrid PRD模板(4部分)
│
└── 5-guides/                           # 📚 PRD编写指南
    └── PRD_Writing_Guide.md            # ✅ PRD编写规范与最佳实践
```

---

## 📊 文档完成度

### 2-baseline基线PRD

| 模块 | 文档数 | 完成度 | 总行数 | 状态 |
|------|--------|--------|--------|------|
| **1-overview** | 1 | ✅ 100% | ~800行 | 完成 |
| **2-features** | 4 | ✅ 100% | ~3,250行 | 完成 |
| **3-agents** | 4 | ✅ 100% | ~4,500行 | 完成 |
| **4-hybrid-modules** | 4 | ✅ 100% | ~5,100行 | 完成 |
| **5-nonfunctional** | 1 | ✅ 100% | ~1,100行 | 完成 |
| **合计** | **14** | **✅ 100%** | **~14,750行** | **全部完成** |

---

## 🎯 核心文档说明

### 1️⃣ 产品概述 (Product-Overview.md)

**适合人群**: 所有人(5分钟快速了解产品)

**内容摘要**:
- 产品定位: 智能售后工作台(AI + 人工协同)
- 目标用户: 客服、团队经理、质检专员
- 核心价值: 效率提升50% + 质量提升15% + 成本节省30%
- 技术架构: AgentScope Multi-Agent + Fastify + PostgreSQL
- 核心功能: 对话管理、客户管理、知识库、质检、任务、报表

---

### 2️⃣ 功能PRD (2-features)

**格式**: 8章标准格式(功能概述/场景/设计/数据/规则/非功能/验收)

**已完成的功能PRD**:

#### 2.1 对话管理功能 (~1,200行)
```yaml
核心内容:
  - 统一多渠道对话(飞书/企微/Web)
  - 实时消息收发(WebSocket)
  - 对话筛选与搜索(5+维度)
  - 对话转派与协作
  - 历史对话查询与导出

验收标准:
  - 消息发送延迟 <300ms
  - 对话列表加载 <1秒
  - 支持500并发对话
```

#### 2.2 客户管理功能 (~650行)
```yaml
核心内容:
  - 360度客户画像
  - 客户分级管理(VIP/普通)
  - 客户历史追溯
  - AI客户洞察

业务规则:
  - VIP自动升级: 总消费>¥10,000或订单≥5笔
  - 流失预警: 180天未联系→中风险
```

#### 2.3 知识库管理功能 (~400行)
```yaml
核心内容:
  - 知识CRUD
  - 知识分类与标签
  - 知识搜索(关键词+语义)
  - 知识质量评分

质量评分:
  = 引用次数×0.4 + 满意度×0.3 + 解决率×0.3
```

#### 2.4 报表中心功能 (~1,000行)
```yaml
核心内容:
  - 10+预设报表模板
  - 自定义报表配置(20+指标, 10+维度)
  - 定期报表推送(日/周/月)
  - 多格式导出(Excel/PDF/CSV)
  - 实时BI看板(CEO驾驶舱)
```

---

### 3️⃣ Agent PRD (3-agents)

**格式**: 11章标准格式(概述/能力/工具/数据/业务/性能/成本/验收...)

**已完成的Agent PRD**:

#### Orchestrator (智能路由Agent) ~1,500行
```yaml
核心能力:
  - 意图识别(fault/consultation/complaint/refund/greeting)
  - Agent选择(AssistantAgent/EngineerAgent)
  - 路由决策(基于规则+AI混合)

性能目标:
  - 路由决策时间: <500ms (P95)
  - 意图识别准确率: >90%

成本:
  - Claude API调用成本: ¥0.02/次
  - 月度成本: ~¥6,000 (假设300次/天)
```

#### AssistantAgent (助理Agent)
```yaml
核心能力:
  - 知识检索(语义+关键词)
  - 回复生成
  - 多轮对话管理

工具清单:
  - searchKnowledge: 向量检索+PostgreSQL全文搜索
  - generateReply: 基于知识生成回复
  - analyzeSentiment: 情感分析
```

#### EngineerAgent (工程师Agent)
```yaml
核心能力:
  - 故障诊断(基于症状推理)
  - 解决方案推荐
  - 远程协助指导

诊断流程:
  1. 收集症状
  2. 查询历史案例
  3. 推理可能原因
  4. 生成诊断步骤
  5. 推荐解决方案
```

#### InspectorAgent (质检Agent)
```yaml
核心能力:
  - 五维度质检(响应速度/专业性/友好度/合规性/解决能力)
  - 违规检测(承诺超限/态度不佳/信息泄露)
  - 异议复审

质检流程:
  1. 自动触发(对话结束后)
  2. 多维度评分(0-10分)
  3. 生成质检报告
  4. 违规自动标记
```

---

### 4️⃣ 混合模块PRD (4-hybrid-modules)

**格式**: 4部分格式(Agent能力 + 功能特性 + 人机协作 + 验收标准)

**适用场景**: 同时包含Agent能力和前端功能的模块

#### Knowledge-Base-PRD (知识库混合PRD)
```yaml
Part 1: Agent能力
  - KnowledgeAgent: 自动知识沉淀
  - 从对话提取知识
  - 知识质量评估

Part 2: 功能特性
  - 知识管理UI
  - 知识审核流程
  - 知识搜索与引用

Part 3: 人机协作
  - AI自动沉淀 → 人工审核 → 发布知识库
  - AI推荐知识 → 人工引用 → 回复客户
```

#### Analytics-QA-PRD (分析与质检) ~1,200行
```yaml
Part 1: Agent能力(InspectorAgent)
  - 质检评分(五维度)
  - 违规检测(8类违规)
  - 异议复审

Part 2: 功能特性
  - BI看板(Grafana)
  - 自定义报表
  - 排名与激励

Part 3: 人机协作
  - AI自动质检 → 人工抽检 → 异议申诉 → AI复审
```

#### Task-Collaboration-PRD (任务协同) ~1,400行
```yaml
Part 1: Agent能力
  - NLP任务解析: "明天提醒我..." → 结构化任务
  - 智能任务分配(基于工作量+专长)
  - 任务优先级推荐

Part 2: 功能特性
  - 任务看板(Kanban)
  - 任务协作(@提醒/评论/附件)
  - 任务提醒(in-app/email/飞书)
```

#### Conversation-Mode-PRD (对话模式与人工介入) ~1,300行
```yaml
Part 1: Agent能力
  - 对话模式识别(AI/人工/混合)
  - 人工介入检测(8种触发条件)
  - AI回复建议

Part 2: 功能特性
  - 三种对话模式切换
  - 人工接管界面
  - 协同对话(AI草稿+人工确认)

Part 3: 人机协作边界
  - AI主导: FAQ自动回复
  - 人工主导: VIP服务、投诉处理
  - 协同模式: 复杂故障排查
```

---

### 5️⃣ 非功能需求 (Non-Functional-Requirements.md) ~1,100行

**章节结构**:
```yaml
5.1 性能需求:
  - API响应时间: <200ms (P95, v1.0)
  - 并发用户数: 1000+
  - 吞吐量: 1000 QPS

5.2 安全需求:
  - HTTPS/TLS 1.3
  - AES-256加密
  - JWT认证
  - 审计日志(180天)
  - 等保三级(v1.0目标)

5.3 可扩展性需求:
  - 横向扩展(K8s HPA)
  - 数据库分片(按tenant_id)
  - 降级策略(Claude → GPT-4 → 规则)

5.4 可用性需求:
  - v0.5: 99%
  - v0.8: 99.5%
  - v1.0: 99.95%
  - 高可用架构(主从复制/自动故障转移)

5.5 可维护性需求:
  - 日志聚合(ELK/Loki)
  - 监控告警(Prometheus + Grafana)
  - 文档完整性要求
```

---

## 📝 PRD编写规范

### 1. 文档格式

我们使用3种标准PRD格式:

| 格式 | 适用场景 | 章节数 | 模板文件 |
|------|---------|--------|---------|
| **Agent PRD** | 纯Agent能力 | 11章 | `4-templates/Agent_PRD_Template.md` |
| **Feature PRD** | 纯前端功能 | 8章 | `4-templates/Feature_PRD_Template.md` |
| **Hybrid PRD** | Agent+功能 | 4部分 | `4-templates/Hybrid_PRD_Template.md` |

### 2. 命名规范

```yaml
Agent PRD:
  - 格式: {AgentName}-PRD.md
  - 示例: Orchestrator-PRD.md

Feature PRD:
  - 格式: {序号}-{功能名}-PRD.md
  - 示例: 2.1-Conversation-Management-PRD.md

Hybrid PRD:
  - 格式: {模块名}-PRD.md
  - 示例: Knowledge-Base-PRD.md
```

### 3. 文档头部

每个PRD必须包含:
```markdown
## {文档标题}

> **PRD格式**: Agent PRD (11章标准格式)
> **优先级**: P0 (核心功能)
> **所属版本**: v0.5+ (基础功能) → v0.8+ (智能增强)
> **说明**: (可选)特殊说明

---
```

### 4. 验收标准

每个PRD必须包含明确的验收标准:
```yaml
功能验收:
  - [ ] 功能A正常工作
  - [ ] 功能B正常工作

性能验收:
  - [ ] API响应<500ms
  - [ ] 并发100不崩溃

准确性验收:
  - [ ] 数据准确率>99%
```

---

## 🔗 相关文档

### 技术文档
- [系统架构](../architecture/AGENT_ARCHITECTURE_DESIGN.md)
- [API文档](../api/API_REFERENCE.md)
- [部署文档](../deployment/)
- [测试文档](../testing/)
- [运维文档](../operations/)

### 业务文档
- [业务流程设计](./BUSINESS_FLOW_DESIGN.md)
- [对话模式规格](./2-baseline/4-hybrid-modules/Conversation-Mode-PRD.md)
- [产品分析报告](./PRODUCT_ANALYSIS_REPORT.md)

---

## 📞 联系方式

| 问题类型 | 联系人 | 方式 |
|---------|--------|------|
| **PRD编写规范** | 产品团队 | 查看 `5-guides/PRD_Writing_Guide.md` |
| **需求澄清** | 产品经理 | 飞书群 / Issue |
| **技术实现** | 架构师 | 技术评审会 |
| **文档错误** | 文档维护者 | GitHub Issue (标签: `documentation`) |

---

## 📜 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v2.0 | 2025-12-30 | 完成所有基线PRD文档,更新README | Claude |
| v1.5 | 2025-12-29 | 完成Agent PRD和混合模块PRD | Claude |
| v1.0 | 2025-12-28 | 创建模块化PRD结构 | Claude |

---

**文档维护者**: 产品团队
**最后审查**: 2025-12-30
**下次审查**: 2026-01-30
