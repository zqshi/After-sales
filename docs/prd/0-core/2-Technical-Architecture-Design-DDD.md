# 智能售后工作台 - DDD技术架构设计文档

> **文档类型**: 技术架构设计文档
> **项目名称**: 智能售后工作台 (After-Sales Intelligence Platform)
> **文档版本**: v1.5
> **更新日期**: 2026-01-14
> **文档所有者**: 技术架构团队
> **机密级别**: 内部公开

---

## 📋 文档导航

- [一、DDD架构概览](#一ddd架构概览)
- [二、战略设计](#二战略设计)
- [三、战术设计](#三战术设计)
- [四、技术实现细节](#四技术实现细节)
- [五、架构质量评估](#五架构质量评估)
- [六、技术债与改进计划](#六技术债与改进计划)

---

## 一、DDD架构概览

### 1.1 DDD架构全景图（详细版）

```
┌──────────────────────────────────────────────────────────────────┐
│                 智能售后工作台 - DDD技术架构全景                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  战略设计层 (Strategic Design Layer)                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Context Map - 8个限界上下文 + 关系模式(OHS/ACL/PL/Conformist) │  │
│  │ Conversation / Customer / Requirement / Quality / Knowledge│  │
│  │ Report / Tooling / Platform                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              ↓                                     │
│  战术设计层 (Tactical Design Layer)                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 聚合根: Conversation / CustomerProfile / Requirement /      │  │
│  │ KnowledgeDoc/KnowledgeFaq / QualityProfile / ReportSummary  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              ↓                                     │
│  应用服务层 (Application Service Layer)                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ UseCase编排 + 事件驱动 + ACL + SAGA                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              ↓                                     │
│  基础设施层 (Infrastructure Layer)                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Outbox事件总线 / 仓储 / 外部集成 / 监控告警                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 分层职责与依赖规则

| 层次 | 职责 | 典型模式 | 依赖方向 |
|-----|------|---------|---------|
| **Domain层** | 业务规则封装、聚合根、值对象、领域事件 | 聚合根/值对象/领域事件 | ❌ 零依赖 |
| **Application层** | UseCase编排、跨域协调、ACL、事件处理 | UseCase/SAGA/ACL | → Domain层 |
| **Infrastructure层** | 仓储实现、事件总线、外部集成 | Outbox/Repository | → Domain层<br>→ Application层 |
| **Presentation层** | API接口、参数验证、错误处理 | REST/DTO验证 | → Application层 |

---

## 二、战略设计

### 2.1 限界上下文清单（与PRD对齐）

| 上下文 | 业务价值 | 职责摘要 | 对应PRD |
|---|---|---|---|
| Conversation Context | 核心域 | 对话聚合、模式切换、消息生命周期 | 2.1 对话管理 |
| Customer Context | 核心域 | 客户画像、等级、历史信息 | 2.2 客户信息面板 |
| Knowledge Context | 通用域 | 文档/FAQ维护与检索 | 2.3 知识管理/应用 |
| Requirement Context | 支撑域 | 需求检测、卡片化、趋势 | 2.5 需求检测 |
| Quality Context | 支撑域 | 质检评分、复盘、洞察 | 2.6 质检 |
| Report Context | 通用域 | 指标汇总与趋势 | 2.4 报表中心 |
| Tooling Context | 通用域 | 系统巡检与协作入口 | 2.7 工具中心 |
| Platform Context | 通用域 | 稳定性、性能、安全审计 | 2.9 平台基础能力 |

### 2.2 Context Map（关系与责任边界）

```
Conversation → Customer (OHS)
Conversation → Requirement (Published Language)
Conversation → Quality (Published Language)
Requirement → Report (Event-driven)
Quality → Report (Event-driven)
Knowledge ↔ Conversation (ACL/查询协作)
Platform → All (通用基础能力)
```

### 2.3 集成策略

| 集成方式 | 使用场景 | 说明 |
|---------|---------|------|
| **事件驱动** | Conversation → Requirement/Quality/Report | 解耦与可追溯 |
| **防腐层** | Conversation ← Knowledge/Customer | 隔离模型变化 |
| **直接API调用** | Platform能力 | 强一致性需求 |

---

## 三、战术设计

### 3.1 聚合根与实体/值对象清单

```
Conversation (聚合根)
 ├─ Message (实体)
 ├─ Channel (值对象)
 ├─ AgentMode (值对象)
 └─ Priority (值对象)

CustomerProfile (聚合根)
 ├─ ContactInfo (值对象)
 ├─ Metrics (值对象)
 └─ SlaLevel (值对象)

KnowledgeDoc / KnowledgeFaq (聚合根)
 ├─ Category (值对象)
 └─ Status (值对象)

Requirement (聚合根)
 ├─ Priority (值对象)
 └─ Source (值对象)

QualityProfile (聚合根)
 └─ DimensionScore (值对象)

ReportSummary (聚合根)
 └─ Metrics (值对象)
```

### 3.2 领域事件清单

- ConversationCreated / MessageSent / ConversationClosed
- RequirementCreated / RequirementStatusChanged
- QualityScored / QualityReported
- KnowledgeUpdated
- ReportRefreshed

### 3.3 典型UseCase编排

```
对话处理：
LoadConversationList → OpenConversation → GetAISuggestions → SaveInternalNote

需求检测：
DetectRequirement → CreateRequirementCard → UpdateRequirementStatus

质检流程：
TriggerQualityCheck → GenerateScores → SaveQualityReport
```

### 3.4 关键领域服务设计（示例）

**ConversationAssignmentPolicyService（智能分配策略）**

```
策略1: VIP客户 → 优先高质量客服
策略2: 高风险客户 → 优先熟悉度
策略3: 紧急SLA → 优先低负载
策略4: KA客户 → 综合评分
策略5: 常规情况 → 综合评分
```

---

## 四、技术实现细节

### 4.1 事件总线与一致性

- 采用Outbox模式保障事件可靠投递
- 事件状态可追溯，支持重试与补偿
- 关键事件进入审计日志

### 4.2 ACL与外部集成

- 外部IM、知识检索等通过ACL隔离
- 统一DTO与适配层，降低耦合
- 适配层负责协议转换与异常统一

### 4.3 数据存储与缓存策略

| 组件 | 用途 | 关键约束 |
|---|---|---|
| PostgreSQL | 主业务数据 | JSONB存储聚合根 |
| Redis | 缓存与会话 | 热点查询缓存 |
| Milvus | 向量检索 | 知识检索P95<1s |
| MinIO | 对象存储 | 文档与附件 |

### 4.4 监控与审计

- 关键指标: 响应时效、错误率、知识检索耗时、质检响应
- 审计事件: 登录、权限变更、导出、配置修改

---

## 五、架构质量评估

### 5.1 质量目标

| 维度 | 目标 |
|---|---|
| 可维护性 | 领域边界清晰、规则内聚 |
| 可扩展性 | 模块解耦、事件驱动 |
| 可观测性 | 日志与审计可追溯 |
| 性能 | 满足非功能指标要求 |

### 5.2 质量风险

- 事件链路复杂度上升，排查成本提升
- 智能能力稳定性与成本波动

---

## 六、技术债与改进计划

### 6.1 已知技术债

- 智能能力依赖外部模型，成本与稳定性需监控
- 跨模块事件链路需要统一治理与监控

### 6.2 改进计划（阶段制）

- 阶段一: 保障对话核心链路稳定、事件可追溯
- 阶段二: 补齐智能化能力与自动化链路
- 阶段三: 完成审计合规与运营指标闭环

---

**文档结束**
