# 对话模式详细规格说明

> **文档类型**: 产品功能规格
> **版本**: v1.0
> **日期**: 2025-12-26
> **状态**: 已确认

---

## 一、核心设计理念

### 1.1 为什么需要三种模式？

智能售后系统的三种对话模式设计基于以下考虑：

1. **渐进式自动化** - 从全人工 → 部分自动 → 高度自动的平滑过渡
2. **场景差异化** - 不同风险等级和复杂度使用不同策略
3. **数据积累** - 记录人工修改行为，持续训练AI模型
4. **用户信任建立** - 让客服团队逐步信任和依赖AI能力

### 1.2 初期阶段的特殊性

> **关键理解**: 在系统初期（Phase 1），所有涉及与客户交互的回复均需**人工确认后发送**。

**这意味着**:
- 三种模式在**操作层面**都是"AI建议 → 人工确认 → 发送"
- 差异主要体现在**UI交互、路由策略、数据记录、AI投入程度**
- 这不是设计缺陷，而是**有意为之的渐进策略**

---

## 二、三种模式全面对比

### 2.1 核心定位差异

| 模式 | 核心定位 | 谁是主角 | 设计目标 |
|-----|---------|---------|---------|
| **Agent自动** | AI优先，人工监督 | AI是主角 | 高度自动化（90%） |
| **Agent监督** | AI-人工协作 | 协作关系 | 中度自动化（70%） |
| **人工优先** | 人工主导，AI辅助 | 人工是主角 | 永远人工（0%） |

---

### 2.2 当前阶段（Phase 1）详细对比

#### 操作流程差异

| 阶段 | Agent自动 | Agent监督 | 人工优先 |
|-----|----------|----------|---------|
| **1. 触发** | 客户消息 | 客户消息 | 客户消息 |
| **2. AI分析** | 深度分析，生成1个最优方案 | 深度分析，生成3+种方案 | 轻量分析，提供参考信息 |
| **3. UI展示** | 强调"采纳AI建议" | 强调"选择方案" | 强调"自由编辑" |
| **4. 人工操作** | 查看→采纳/修改→发送 | 查看→选择/组合→发送 | 编辑→参考AI→发送 |
| **5. 数据记录** | 记录置信度+修改率 | 记录方案选择+组合 | 记录AI使用率 |

#### UI界面差异

**Agent自动模式UI**:
```
┌─────────────────────────────────────────┐
│ 🤖 AI自动回复（审核中）                  │
│ 置信度: 0.85 ⭐⭐⭐⭐                    │
├─────────────────────────────────────────┤
│ 建议回复:                                │
│ 感谢反馈！这是认证服务问题，我们的技术   │
│ 团队已经在处理，预计15分钟内恢复正常。   │
│ 给您带来的不便深表歉意。                 │
│                                         │
│ 参考来源:                                │
│ • 知识库: ERP登录问题排查指南            │
│ • 历史案例: 90%成功率                    │
├─────────────────────────────────────────┤
│ [✓ 采纳并发送]  [✏️ 编辑后发送]  [✗ 拒绝] │
└─────────────────────────────────────────┘

辅助面板（折叠）:
  • 客户画像
  • 相关知识库（已关联）
  • 历史案例（已参考）
```

**设计要点**:
- 突出单一推荐方案
- 默认"采纳"按钮高亮（引导一键发送）
- 置信度可视化（星级展示）
- 修改操作会被标记（降低置信度评分）

---

**Agent监督模式UI**:
```
┌─────────────────────────────────────────┐
│ 🔍 AI监督建议（请选择方案）              │
├─────────────────────────────────────────┤
│ ✓ 方案1: 知识库标准回复（推荐）          │
│   置信度: 0.90                          │
│   感谢反馈！这是认证服务问题...          │
│   [查看完整内容]                         │
│                                         │
│ ○ 方案2: 历史案例改进版                 │
│   置信度: 0.85                          │
│   技术团队已收到警报，正在全力修复...    │
│   [查看完整内容]                         │
│                                         │
│ ○ 方案3: 自定义安抚话术                 │
│   置信度: 0.75                          │
│   非常抱歉给您带来困扰...                │
│   [查看完整内容]                         │
├─────────────────────────────────────────┤
│ 编辑区:                                  │
│ [自由编辑框 - 可组合多个方案]            │
│                                         │
├─────────────────────────────────────────┤
│ [发送所选方案]  [组合方案]  [完全自定义]  │
└─────────────────────────────────────────┘

辅助面板（展开）:
  • 客户画像
  • 推荐知识库（3+条）
  • 历史相似案例（3+条）
  • 情感分析结果
```

**设计要点**:
- 平等展示多个方案（不过度强调某一个）
- 支持单选、组合、自定义三种操作
- 每个方案都显示置信度
- 提供更多上下文信息辅助决策

---

**人工优先模式UI**:
```
┌─────────────────────────────────────────┐
│ 👤 人工处理（VIP客户 - 高风险客户）      │
├─────────────────────────────────────────┤
│ 主编辑区（占大部分空间）:                 │
│ ┌─────────────────────────────────────┐ │
│ │ [自由输入框 - 高度重视人工编辑]      │ │
│ │                                     │ │
│ │                                     │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 快捷话术:                                │
│ [致歉话术] [技术故障] [VIP专属] [升级]   │
├─────────────────────────────────────────┤
│ [确认发送]  [保存草稿]  [转接专家]       │
└─────────────────────────────────────────┘

AI辅助面板（侧边栏，默认展开但不抢眼）:
┌─────────────────────────────────────────┐
│ 📊 客户360度画像                         │
│   • SLA等级: 金牌VIP                    │
│   • 风险等级: 高                        │
│   • 合同金额: 100万/年                  │
│   • 合作时长: 3年                       │
│   • 近期满意度: 3.2/5 (⚠️ 下降)         │
│   • 投诉次数: 2次/近30天                │
│                                         │
│ 📚 推荐知识库（相关度排序）              │
│   1. ERP登录问题排查指南                │
│   2. 认证服务故障SOP                    │
│   3. VIP客户应急处理流程                │
│                                         │
│ 📝 历史互动（近7天）                     │
│   • 3天前: 类似登录问题（已解决）       │
│   • 5天前: 功能咨询（满意度4.5）        │
│   • 7天前: 投诉处理（满意度3.0）        │
│                                         │
│ 💡 AI参考建议（点击展开）                │
│   [展开查看AI生成的3种参考话术]         │
└─────────────────────────────────────────┘
```

**设计要点**:
- 自由输入框占据主要视觉空间
- AI建议在辅助区域，默认折叠或弱化展示
- 强调客户画像和历史记录（而非AI建议）
- 提供快捷话术但不强制使用

---

### 2.3 路由和分配策略差异

#### 自动路由规则

```python
def routeConversation(conversation: Conversation):
  # Step 1: 根据客户属性选择模式
  if (customer.isVIP or customer.riskLevel == "high"):
    mode = "human_first"
    queue = "vip_queue"  # 优先队列
    assignTo = getExpertAgent()  # 分配给专家
    sla = 60  # 1分钟

  elif (customer.historyQuality < 0.7 or sentiment.score < 0.5):
    mode = "agent_supervised"
    queue = "supervised_queue"  # 普通队列
    assignTo = getSeniorAgent()  # 资深客服
    sla = 300  # 5分钟

  else:
    mode = "agent_auto"
    queue = "auto_queue"  # 普通队列
    assignTo = getAvailableAgent()  # 任意客服
    sla = 300  # 5分钟

  # Step 2: 推送到对应队列
  pushToQueue(queue, conversation)

  # Step 3: 通知分配的客服
  notifyAgent(assignTo, conversation, mode)
```

#### 客服工作台队列展示

**Agent自动队列**:
```
┌─────────────────────────────────────────┐
│ 🤖 自动模式队列（12个待处理）            │
├─────────────────────────────────────────┤
│ • 张三 - 功能咨询 (SLA剩余4:32) 🟢      │
│ • 李四 - 故障报告 (SLA剩余2:15) 🟡      │
│ • ...                                   │
│                                         │
│ 提示: 这些对话AI已准备好建议，快速采纳   │
└─────────────────────────────────────────┘
```

**Agent监督队列**:
```
┌─────────────────────────────────────────┐
│ 🔍 监督模式队列（5个待处理）             │
├─────────────────────────────────────────┤
│ • 王五 - 复杂需求 (SLA剩余3:45) 🟡      │
│ • 赵六 - 投诉处理 (SLA剩余1:20) 🔴      │
│ • ...                                   │
│                                         │
│ 提示: 需要您仔细审阅并选择最佳方案       │
└─────────────────────────────────────────┘
```

**人工优先队列**:
```
┌─────────────────────────────────────────┐
│ 👤 VIP专属队列（2个待处理）⚡             │
├─────────────────────────────────────────┤
│ • 孙七(VIP) - 紧急故障 (SLA剩余0:45) 🔴│
│ • 周八(高风险) - 投诉 (SLA剩余0:30) 🔴 │
│                                         │
│ 提示: 高优先级，请立即处理！             │
└─────────────────────────────────────────┘
```

---

### 2.4 数据记录差异

#### 记录目的
所有模式都会详细记录人工操作，用于：
1. **模型训练** - 学习人工如何修改AI建议
2. **置信度校准** - 调整AI的自信程度
3. **效果评估** - 对比三种模式的效率和质量
4. **自动化决策** - 为Phase 2自动发送做准备

#### 记录字段对比

**Agent自动模式记录**:
```json
{
  "conversationId": "conv123",
  "mode": "agent_auto",
  "aiSuggestion": {
    "content": "...",
    "confidence": 0.85,
    "source": "knowledge",
    "generationTime": 8.2
  },
  "humanReview": {
    "action": "modified",  // adopted | modified | rejected
    "modificationRate": 0.3,  // 修改了30%的内容
    "modifiedParts": ["语气", "补充信息"],
    "reviewTime": 120,  // 2分钟审核
    "finalContent": "..."
  },
  "automationDecision": {
    "wouldAutoSend": false,  // 如果是自动模式会发送吗？
    "reason": "置信度0.85低于阈值0.9",
    "thresholdUsed": 0.9
  },
  "outcome": {
    "sent": true,
    "customerSatisfaction": 4.5,  // 事后评分
    "issueResolved": true
  }
}
```

**Agent监督模式记录**:
```json
{
  "conversationId": "conv124",
  "mode": "agent_supervised",
  "aiSuggestions": [
    { "id": 1, "content": "...", "confidence": 0.90, "source": "knowledge" },
    { "id": 2, "content": "...", "confidence": 0.85, "source": "history" },
    { "id": 3, "content": "...", "confidence": 0.75, "source": "custom" }
  ],
  "humanReview": {
    "action": "combined",  // selected_one | combined | custom
    "selectedSuggestions": [1, 3],  // 组合了方案1和3
    "combinationStrategy": "前半段用方案1，后半段用方案3",
    "reviewTime": 180,
    "finalContent": "..."
  },
  "automationDecision": {
    "wouldAutoSend": false,
    "reason": "最高置信度0.90低于阈值0.95",
    "thresholdUsed": 0.95
  },
  "outcome": {
    "sent": true,
    "customerSatisfaction": 4.8,
    "issueResolved": true
  }
}
```

**人工优先模式记录**:
```json
{
  "conversationId": "conv125",
  "mode": "human_first",
  "customer": {
    "isVIP": true,
    "riskLevel": "high"
  },
  "aiAssistance": {
    "providedSuggestions": true,
    "suggestionsViewed": false,  // 客服是否查看了AI建议
    "knowledgeRecommendations": [...],
    "knowledgeUsed": true  // 客服是否使用了推荐知识库
  },
  "humanReview": {
    "action": "full_custom",  // 完全自定义编写
    "aiInfluence": 0.1,  // AI影响度估算（10%）
    "draftIterations": 3,  // 修改了3次
    "reviewTime": 420,  // 7分钟
    "finalContent": "..."
  },
  "automationDecision": {
    "wouldAutoSend": "N/A",  // 人工优先模式永不自动
    "reason": "VIP客户 + 高风险"
  },
  "outcome": {
    "sent": true,
    "customerSatisfaction": 5.0,
    "issueResolved": true,
    "escalated": false
  }
}
```

---

## 三、未来阶段演进

### 3.1 Phase 2（3-6个月后）- 部分自动化

#### Agent自动模式
```
置信度 >= 0.9 + 非敏感场景:
  → 自动发送，人工事后审查
  → 自动化率目标: 60%

置信度 < 0.9 或 敏感场景:
  → 推送人工审核
```

**启用条件**:
- AI模型准确率 > 85%
- 客服团队信任度 > 80%
- 连续3个月无重大事故

#### Agent监督模式
```
仍需人工审核（保持Phase 1状态）
收集更多数据，观察Agent自动模式效果
```

#### 人工优先模式
```
永远需要人工确认（不变）
```

---

### 3.2 Phase 3（6-12个月后）- 高度自动化

#### Agent自动模式
```
置信度 >= 0.9:
  → 自动发送
  → 自动化率目标: 90%

置信度 < 0.9:
  → 推送人工审核
```

#### Agent监督模式
```
置信度 >= 0.95:
  → 自动发送（最高置信度方案）
  → 自动化率目标: 70%

置信度 < 0.95:
  → 推送人工审核
```

#### 人工优先模式
```
永远需要人工确认（不变）
但AI辅助能力增强（更准确的上下文分析）
```

---

## 四、实施建议

### 4.1 前端实现要点

```typescript
// 根据模式渲染不同UI组件
function renderChatInterface(conversation: Conversation) {
  switch (conversation.mode) {
    case "agent_auto":
      return <AgentAutoUI
        suggestion={aiSuggestion}
        emphasize="adopt"  // 强调采纳
      />;

    case "agent_supervised":
      return <AgentSupervisedUI
        suggestions={aiSuggestions}
        emphasize="select"  // 强调选择
      />;

    case "human_first":
      return <HumanFirstUI
        aiAssistance={aiContext}
        emphasize="edit"  // 强调编辑
      />;
  }
}
```

### 4.2 后端实现要点

```typescript
// 记录审核结果用于模型训练
async function recordHumanReview(
  conversationId: string,
  mode: ConversationMode,
  aiOutput: AISuggestion[],
  humanOutput: string,
  action: ReviewAction
) {
  // 计算修改率
  const modificationRate = calculateEditDistance(
    aiOutput[0].content,
    humanOutput
  );

  // 评估自动化决策
  const automationDecision = evaluateAutomationDecision({
    confidence: aiOutput[0].confidence,
    mode,
    customer: conversation.customer,
    sentiment: conversation.sentiment
  });

  // 保存到训练数据集
  await trainingDataRepo.save({
    conversationId,
    mode,
    aiSuggestions: aiOutput,
    humanFinal: humanOutput,
    modificationRate,
    automationDecision,
    outcome: {
      // 事后补充客户满意度
    }
  });
}
```

### 4.3 客服培训要点

**Agent自动模式培训**:
- 重点: 快速审核，信任AI
- 操作: 查看建议 → 快速判断 → 采纳/微调
- KPI: 平均审核时间 < 2分钟

**Agent监督模式培训**:
- 重点: 理解多个方案，选择最佳
- 操作: 对比方案 → 选择/组合 → 发送
- KPI: 方案选择准确率 > 90%

**人工优先模式培训**:
- 重点: 自由发挥，充分利用辅助信息
- 操作: 查看画像 → 参考知识 → 自由编写
- KPI: 客户满意度 > 4.8/5

---

## 五、常见问题

### Q1: 为什么不在Phase 1就实现自动发送？
**A**:
- 风险控制: 避免AI错误直接影响客户
- 数据积累: 需要人工修改数据训练模型
- 团队接受度: 让客服逐步信任AI

### Q2: 三种模式操作都一样，为什么不合并为一种？
**A**:
- 未来会分化: Phase 2-3自动化程度不同
- UI差异: 强调重点不同（采纳/选择/编辑）
- 数据标注: 需要区分场景进行模型训练

### Q3: 如何评估三种模式的效果？
**A**:
- 效率指标: 平均处理时间、审核时间
- 质量指标: 客户满意度、首次解决率
- 自动化指标: 修改率、AI建议采纳率

### Q4: 人工优先模式永不自动，有必要吗？
**A**:
- 必要: VIP/高风险客户需要人工判断
- 价值: 提供更高质量的个性化服务
- 定位: 体现对高价值客户的重视

---

**文档结束**
