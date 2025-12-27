# 智能售后工作台 - 核心业务流程设计文档

> **文档类型**: 业务流程设计
> **版本**: v1.0
> **日期**: 2025-12-26
> **状态**: 已实现

---

## 一、客户咨询处理全流程

### 1.1 流程概览

```
┌────────────────────────────────────────────────────────┐
│ 后台自动处理（AI驱动）                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 1. 客户发起咨询 (飞书/企微/Web)                        │
│   ↓ (3秒)                                             │
│                                                        │
│ 2. 消息接入与对话创建                                  │
│   → 创建Conversation实体                               │
│   → 保存客户消息到Message表                            │
│   ↓ (5秒)                                             │
│                                                        │
│ 3. AI并行分析 (3个Agent同时工作)                       │
│   → SentimentAnalyzerAgent: 分析情感（😡急切/😐中性）  │
│   → RequirementCollectorAgent: 识别需求（故障/咨询）  │
│   → KnowledgeManagerAgent: 搜索相关知识库             │
│   ↓ (8秒)                                             │
│                                                        │
│ 4. AI智能回复生成                                      │
│   → CustomerServiceAgent生成3种回复建议               │
│   → 每种建议带置信度评分                               │
│   ↓ (3秒)                                             │
│                                                        │
│ 5. 自动创建需求和任务（后台）                          │
│   → 需求置信度>0.7: 创建Requirement实体               │
│   → 高优先级需求: 自动创建Task实体                     │
│   → 不需要客服操作，后台自动完成                       │
│   ↓ (实时)                                            │
│                                                        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ 前端展示与客服操作（人工参与）                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 6. WebSocket推送到前端                                 │
│   → 对话消息                                           │
│   → AI生成的3种回复建议                                │
│   → 推荐知识库                                         │
│   → 已创建的需求和任务（只读，无需操作）              │
│   ↓                                                    │
│                                                        │
│ 7. 客服审核AI建议并确认回复 (Phase 1必需, 5分钟内)    │
│   → 查看AI的3种回复建议                                │
│   → 选择一种或修改后确认                               │
│   → 点击"发送回复"按钮                                 │
│   ↓ (3秒)                                             │
│                                                        │
│ 8. 发送回复给客户                                      │
│   → 通过IM渠道发送                                     │
│   → 更新对话状态                                       │
│   ↓ (实时)                                            │
│                                                        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ 后续跟踪（自动）                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 9. 质检评分与跟踪                                      │
│   → QualityInspectorAgent实时评分                     │
│   → 客户满意度预测                                     │
│   ↓ (Phase 3规划)                                     │
│                                                        │
│ 10. 知识沉淀与更新                                     │
│   → 对话结束后自动生成总结                             │
│   → 更新知识库                                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**关键理解**:
- ✅ **步骤1-5**: 后台自动完成，客服无需操作
- ✅ **步骤6-8**: 客服参与，审核AI建议并发送回复
- ✅ **步骤9-10**: 后台自动完成，客服无需操作

**时间分配**:
- 后台自动处理: 约20秒
- 客服审核操作: 1-5分钟（取决于复杂度）
- 总计: 1-5分钟完成一次客户咨询

---

### 1.1.1 关键术语解释

为避免理解偏差，以下术语需特别说明：

#### 术语1: "需求和任务创建"

**不是指**: 客服手动创建需求卡片

**实际含义**:
- AI自动从客户消息中**识别需求**（如"系统故障"、"功能咨询"）
- 系统后台**自动创建Requirement实体**（数据库记录）
- 高优先级需求自动触发**创建Task实体**（待办任务）
- 客服在前端只能**查看**这些已创建的需求和任务，无需手动操作

**举例**:
```
客户说: "系统突然报错，无法登录！"
  ↓ AI分析
识别出需求: "故障处理 - ERP登录失败"
  ↓ 后台自动
创建Requirement: {
  id: "req001",
  title: "故障处理 - ERP登录失败",
  category: "technical",
  priority: "urgent",
  confidence: 0.85
}
  ↓ 因为priority=urgent，自动触发
创建Task: {
  id: "task001",
  title: "需求跟进: 故障处理",
  requirementId: "req001",
  status: "pending"
}
  ↓ 前端展示
客服看到: 右侧面板显示"已创建1个需求，1个任务"（只读）
```

---

#### 术语2: "人工审核" vs "客服确认"

这两个术语在原文档中混用，实际是**同一个动作**。

**统一术语**: **客服审核AI回复建议**

**含义**:
- 客服查看AI生成的3种回复建议
- 选择一种采纳，或修改后确认
- 点击"发送回复"按钮

**不是指**:
- ❌ 审核需求是否合理（需求是后台自动创建的）
- ❌ 审核任务是否需要派发（任务是自动创建的）
- ✅ **只是审核"给客户的回复内容"**

**举例**:
```
前端展示:
┌─────────────────────────────────┐
│ AI建议回复1（推荐）:             │
│ "感谢反馈！这是认证服务问题..." │
│                                 │
│ AI建议回复2:                    │
│ "技术团队已收到警报..."         │
│                                 │
│ AI建议回复3:                    │
│ "非常抱歉给您带来困扰..."       │
└─────────────────────────────────┘

客服操作:
1. 查看3种建议
2. 选择建议1（或修改后）
3. 点击"发送回复"
   → 这就是"客服审核AI建议"
```

---

#### 术语3: "前端展示" vs "客服确认"

这两个术语描述的是**连续的两个动作**，但在原流程图中分开了（有歧义）。

**正确理解**:
- **前端展示**: WebSocket推送数据到前端界面（技术动作）
- **客服确认**: 客服看到界面后审核并点击发送（人工动作）

**应该合并为一个步骤**: "前端展示与客服审核"

---

#### 术语4: "质检评分"

**不是指**: 客服手动给对话打分

**实际含义**:
- QualityInspectorAgent（质检Agent）自动评估
- 评估维度: 处理质量、情绪改善、客户满意度
- 生成质检报告（自动）
- 低分会自动创建改进任务

**客服参与度**: 0%（完全自动）

---

### 1.1.2 完整案例演示

为了更直观理解，以下是一个完整的真实案例：

#### 场景：客户报告系统故障

**时间线**：
```
T+0秒: 客户在飞书发送消息
┌─────────────────────────────────────────────┐
│ 客户(张三): 系统突然报错，无法登录！        │
└─────────────────────────────────────────────┘

T+3秒: 后台自动创建对话
┌─────────────────────────────────────────────┐
│ [后台日志]                                  │
│ ✓ 创建Conversation (id: conv123)           │
│ ✓ 保存Message (客户消息)                    │
│ ✓ 触发MessageSentEvent                     │
└─────────────────────────────────────────────┘

T+8秒: AI并行分析完成
┌─────────────────────────────────────────────┐
│ [后台日志]                                  │
│ ✓ 情感分析: negative (65%), 急切           │
│ ✓ 需求识别: 故障处理 - ERP登录失败         │
│ ✓ 知识库: 找到"ERP登录问题排查指南"        │
└─────────────────────────────────────────────┘

T+16秒: AI生成回复建议
┌─────────────────────────────────────────────┐
│ [后台日志]                                  │
│ ✓ 生成3种回复建议                           │
│   - 建议1 (知识库): 置信度0.90             │
│   - 建议2 (历史案例): 置信度0.85           │
│   - 建议3 (自定义): 置信度0.75             │
└─────────────────────────────────────────────┘

T+19秒: 自动创建需求和任务
┌─────────────────────────────────────────────┐
│ [后台日志]                                  │
│ ✓ 创建Requirement (id: req001)             │
│   title: "故障处理 - ERP登录失败"           │
│   priority: urgent, confidence: 0.85        │
│                                             │
│ ✓ 自动触发创建Task (id: task001)           │
│   title: "需求跟进: 故障处理"               │
│   派发给: 自动分配算法                      │
└─────────────────────────────────────────────┘

T+20秒: 推送到客服前端
┌─────────────────────────────────────────────┐
│ 客服工作台 - 王小美（在线）                 │
├─────────────────────────────────────────────┤
│ 左侧: 对话列表                              │
│   🔴 张三 - 系统故障 (SLA剩余4:40)         │
│                                             │
│ 中间: 对话内容                              │
│   张三: 系统突然报错，无法登录！            │
│                                             │
│   🤖 AI建议回复（3种）:                     │
│   ┌───────────────────────────────────────┐ │
│   │ 建议1（推荐 ⭐⭐⭐⭐）:                 │ │
│   │ 感谢反馈！这是认证服务问题，我们的   │ │
│   │ 技术团队已经在处理，预计15分钟内恢复 │ │
│   │ 正常。给您带来的不便深表歉意。       │ │
│   │                                       │ │
│   │ [采纳此方案]  [修改后发送]            │ │
│   └───────────────────────────────────────┘ │
│                                             │
│   [查看建议2] [查看建议3]                   │
│                                             │
│ 右侧: 分析面板                              │
│   📊 客户画像: 普通客户, 风险等级低         │
│   📚 推荐知识库: ERP登录问题排查指南        │
│   📋 已创建需求: 1个 (故障处理)             │
│   📋 已创建任务: 1个 (需求跟进)             │
│      ↑ 这些是后台自动创建的，只读          │
└─────────────────────────────────────────────┘

T+20秒 ~ T+2分钟: 客服审核（人工操作）
┌─────────────────────────────────────────────┐
│ 客服操作:                                   │
│ 1. 查看客户消息                             │
│ 2. 查看AI的3种建议                          │
│ 3. 查看右侧的客户画像和知识库              │
│ 4. 决定: 采纳建议1，但补充一句话           │
│ 5. 点击"修改后发送"                        │
│ 6. 在建议1后面加上: "如有任何疑问请随时..." │
│ 7. 点击"确认发送"                          │
└─────────────────────────────────────────────┘

T+2分钟3秒: 发送回复给客户
┌─────────────────────────────────────────────┐
│ 飞书IM - 张三收到消息:                      │
│                                             │
│ 客服王小美:                                 │
│ 感谢反馈！这是认证服务问题，我们的技术团队 │
│ 已经在处理，预计15分钟内恢复正常。给您带来 │
│ 的不便深表歉意。如有任何疑问请随时联系我。 │
└─────────────────────────────────────────────┘

T+2分钟3秒: 后台自动质检
┌─────────────────────────────────────────────┐
│ [后台日志]                                  │
│ ✓ QualityInspectorAgent开始评估            │
│   - 处理质量: 92分 (回复完整、专业)        │
│   - 情绪改善: negative → neutral (改善25%) │
│   - 客户满意度: 预测4.2/5                   │
│                                             │
│ ✓ 质检通过，无需改进任务                    │
└─────────────────────────────────────────────┘
```

**关键点总结**:
1. ✅ **需求和任务创建** - T+19秒后台自动完成，客服只是在T+20秒看到结果
2. ✅ **客服审核** - T+20秒~T+2分钟，客服审核AI建议并确认发送
3. ✅ **前端展示与客服确认** - 是同一个阶段（T+20秒推送，T+2分钟确认）
4. ✅ **质检评分** - T+2分钟3秒后台自动完成，客服无需操作

---

### 1.2 详细流程

#### 步骤1: 消息接入 (3秒)

**触发条件**: 客户在任意渠道发送消息

**执行流程**:
```typescript
1. ImController.handleMessage(request)
   输入: { channel, customerId, content, timestamp }

2. 验证消息格式和客户身份

3. CreateConversationUseCase.execute()
   - 检查是否有未关闭的对话
   - 如有则复用，否则创建新对话
   - 设置channel, priority, mode

4. 触发领域事件:
   - ConversationCreatedEvent (首次)
   - MessageSentEvent

5. EventBus.publishAll(events)
```

**输出**:
- Conversation实体 (conversationId, status=open)
- Message实体 (messageId, content, senderType=customer)

**关键决策**:
- 客户等级判断: VIP → priority=high, mode=human_first
- 历史对话检查: 30天内有未关闭对话 → 复用

**对话模式选择逻辑**:
```python
# 根据客户属性自动选择对话模式
def selectMode(customer: Customer) -> Mode {
  if (customer.isVIP or customer.riskLevel == "high") {
    return "human_first"  # VIP/高风险 → 人工优先
  }
  else if (customer.historyQuality < 0.7) {
    return "agent_supervised"  # 历史质量差 → Agent监督
  }
  else {
    return "agent_auto"  # 常规客户 → Agent自动
  }
}
```

> **重要**: 初期阶段（Phase 1），无论选择哪种模式，所有涉及客户交互的回复均需**人工确认后发送**。三种模式的差异主要体现在UI交互、路由策略和数据记录上。详见产品分析报告"三种对话模式详解"章节。

---

#### 步骤2: AI并行分析 (5秒)

**触发条件**: MessageSentEvent发布

**执行流程**:
```yaml
parallel_analysis:
  并行执行3个Agent:

  1. SentimentAnalyzerAgent (3秒)
     输入: message.content + conversation.history
     输出: { sentiment: "negative", score: 0.65, intensity: "急切" }

  2. RequirementCollectorAgent (5秒)
     输入: message.content + customer.profile
     输出: {
       requirements: [
         { title: "故障处理", category: "technical", priority: "urgent" }
       ],
       confidence: 0.85
     }

  3. KnowledgeManagerAgent (5秒)
     输入: message.content + sentiment
     输出: {
       knowledgeItems: [
         { id: "kb001", title: "ERP登录问题排查指南", score: 0.92 }
       ]
     }
```

**输出**:
- 情感分析结果 (sentiment, score, intensity)
- 需求列表 (requirements[], confidence)
- 推荐知识库 (knowledgeItems[])

**降级策略**:
- LLM调用失败 → 使用关键词匹配算法
- 超时(>5秒) → 返回部分结果

---

#### 步骤3: 智能回复生成 (8秒)

**触发条件**: 并行分析完成

**执行流程**:
```typescript
1. CustomerServiceAgent.generateReply()
   输入: {
     message: "系统报错，无法登录",
     sentiment: { sentiment: "negative", score: 0.65 },
     requirements: [...],
     knowledge: [...]
   }

2. 构建Prompt:
   """
   客户消息: {message}
   情绪状态: {sentiment} (急切)
   相关知识: {knowledge[0].title}
   历史案例: 90%成功率使用"认证服务重启"

   请生成3种专业、有温度的回复方案。
   """

3. LLM调用 (DeepSeek v3.1)
   temperature: 0.7
   max_tokens: 500

4. 解析输出:
   {
     suggestions: [
       { id: 1, content: "...", source: "knowledge", confidence: 0.90 },
       { id: 2, content: "...", source: "history", confidence: 0.85 },
       { id: 3, content: "...", source: "custom", confidence: 0.75 }
     ],
     overall_confidence: 0.85
   }
```

**输出**:
- 3+种回复建议
- 每种建议的置信度
- 总体置信度

**质量保障**:
- 敏感词过滤
- 回复长度控制 (50-300字)
- 语气检查 (礼貌/专业)

---

#### 步骤4: 人工审核决策 (决策点1)

> **阶段说明**:
> - **Phase 1（当前）**: 所有回复均需人工确认发送，决策逻辑主要用于数据记录和模型训练
> - **Phase 2-3（未来）**: 根据置信度和场景决定是否自动发送

**决策逻辑**:
```python
# Phase 1: 所有回复都需要人工审核（但记录决策结果用于训练）
need_human_review = True  # 固定为True

# 同时记录自动化决策（用于未来Phase 2启用）
would_auto_send = not (
    overall_confidence < 0.9                    # 置信度不足
    or sentiment.score < 0.5                    # 情绪极度负面
    or customer.isVIP                           # VIP客户
    or customer.riskLevel == "high"             # 高风险客户
    or requirements.length > 2                  # 需求复杂
    or conversation.mode == "human_first"       # 人工优先模式
)

# 记录到数据库用于分析
log_automation_decision(conversationId, would_auto_send, reason)
```

**人工审核流程** (Phase 1所有对话)
```
1. WebSocket推送到前端:
   {
     type: "review_required",
     conversationId,
     mode: conversation.mode,  // agent_auto | agent_supervised | human_first
     suggestions: [...],
     context: {
       customerProfile: {...},
       knowledgeRecommendations: [...],
       historicalCases: [...]
     },
     automationDecision: {  // 记录用于训练
       wouldAutoSend: false,
       reason: "置信度0.65低于阈值0.9"
     }
   }

2. 前端根据mode渲染不同UI:
   - agent_auto: 强调"采纳AI建议"
   - agent_supervised: 强调"选择方案"
   - human_first: 强调"自由编辑"

3. 客服操作:
   - 查看AI建议（三种模式展示方式不同）
   - 修改或确认
   - 点击"发送回复"

4. 记录审核结果（用于模型训练）:
   {
     conversationId,
     mode: "agent_auto",
     approved: true,
     modified: true,
     modificationRate: 0.3,  // 修改程度
     original: "...",
     final: "...",
     reviewTime: 180s,
     automationDecision: {...}  // 如果是自动模式会如何决策
   }
```

> **Phase 2-3 差异**: 未来阶段，agent_auto和agent_supervised模式下，高置信度回复会自动发送，无需人工审核。human_first模式永远需要人工确认。

---

#### 步骤5: 需求和任务创建 (3秒)

**触发条件**: 需求置信度 > 0.7

**执行流程**:
```typescript
foreach (requirement in requirements) {
  1. CreateRequirementUseCase.execute({
       customerId,
       conversationId,
       title: requirement.title,
       category: requirement.category,
       priority: requirement.priority,
       source: "conversation"
     })

  2. 触发事件: RequirementCreatedEvent

  3. RequirementCreatedEventHandler.handle()
     if (priority in ["urgent", "high"] or source in ["conversation", "customer"]) {
       CreateTaskUseCase.execute({
         title: "需求跟进: " + requirement.title,
         priority: mapPriority(requirement.priority),
         requirementId: requirement.id,
         conversationId,
         autoCreated: true
       })
     }

  4. 触发事件: TaskCreatedEvent
}
```

**输出**:
- Requirement实体列表
- Task实体列表 (自动创建)

**优先级映射**:
- urgent → high
- high → high
- medium → medium
- low → low

---

#### 步骤6: 前端展示 (实时)

**WebSocket推送内容**:
```json
{
  "type": "conversation_update",
  "data": {
    "conversation": {
      "id": "conv123",
      "messages": [...],
      "slaRemaining": "14:32"
    },
    "aiSuggestions": {
      "suggestions": [...],
      "confidence": 0.85
    },
    "analysis": {
      "sentiment": { "sentiment": "negative", "score": 0.65 },
      "urgency": 85,
      "riskLevel": "medium"
    },
    "knowledgeRecommendations": [...],
    "requirements": [...],
    "tasks": [...]
  }
}
```

**前端展示**:
- 左侧: 对话列表更新 (新消息标记)
- 中间: 消息气泡 + AI建议面板
- 右侧: 客户画像 + 分析结果

---

#### 步骤7: 发送回复 (3秒)

**执行流程**:
```typescript
1. SendMessageUseCase.execute({
     conversationId,
     content: finalReply,
     senderType: "agent",
     senderId: agentId
   })

2. conversation.sendMessage(finalReply, agentId)
   触发: MessageSentEvent

3. 调用外部IM API:
   if (channel == "feishu") {
     FeishuClient.sendMessage(customerId, finalReply)
   }

4. 更新SLA状态:
   conversation.checkSLAStatus()
   if (SLA超时) {
     触发: SLAViolatedEvent
   }
```

**输出**:
- Message实体 (senderType=agent)
- 外部IM消息发送状态

**异常处理**:
- IM API失败 → 记录到数据库，稍后重试
- SLA超时 → 告警通知经理

---

#### 步骤8: 质检评分 (实时)

**触发条件**: 回复发送后

**执行流程**:
```typescript
1. QualityInspectorAgent.evaluate({
     conversation,
     latestReply,
     sentimentBefore: 0.65,
     sentimentAfter: 待测
   })

2. 评估维度:
   - 处理质量 (0-100分):
     * 回复完整性 (30%)
     * 专业度 (30%)
     * 合规性 (20%)
     * 语气礼貌 (20%)

   - 情绪改善 (0-100%):
     * 客户情绪变化
     * 是否缓解焦虑

   - 客户满意度 (1-5星):
     * 预测满意度 (待客户反馈确认)

3. 生成质检报告:
   {
     conversationId,
     qualityScore: 92,
     emotionImprovement: 25,
     predictedSatisfaction: 4.2,
     issues: [],
     recommendations: ["后续回访确认满意度"]
   }

4. if (qualityScore < 70 or issues.length > 0) {
     创建Task: "质量改进: 回访客户"
   }
```

**输出**:
- 质检报告
- 改进建议
- 后续任务 (可选)

---

#### 步骤9: 知识沉淀 (Phase 3规划)

**触发条件**: 对话关闭且标记为"典型案例"

**执行流程** (待实现):
```typescript
1. 对话总结生成:
   - 问题类型
   - 解决方案
   - 关键步骤
   - 预期效果

2. 知识库更新:
   - 自动创建知识条目
   - 关联相似案例
   - 更新FAQ

3. 知识图谱更新:
   - 添加节点和关系
   - 更新热度权重
```

---

## 二、需求管理流程

### 2.1 流程概览

```
需求创建 (AI提取 or 人工录入)
  ↓ (5秒)
优先级智能评估
  ↓ (8秒)
可行性分析 (产品/技术需求)
  ↓ (决策点: 是否需要人工确认?)
人工确认 (高优先级/不可行, 24小时)
  ↓ (10秒)
任务智能拆分
  ↓ (3秒/loop)
批量创建Task
  ↓ (5秒)
智能分配给工程师
  ↓ (3秒)
通知相关人员
```

---

### 2.2 关键决策规则

#### 决策点1: 是否自动创建Task?

```python
should_auto_create_task = (
    priority in ["urgent", "high"]              # 高优先级
    or source in ["conversation", "customer"]   # 客户直接提出
)

if should_auto_create_task:
    CreateTaskUseCase.execute(...)
else:
    # 推荐给产品/技术评审
    pass
```

#### 决策点2: 是否需要人工确认?

```python
need_confirmation = (
    priority == "urgent"                        # 紧急需求
    or feasibility.is_feasible == false         # 不可行
    or estimated_cost > 10人天                   # 成本高
)

if need_confirmation:
    # 等待人工确认 (24小时超时)
    HumanInLoopExecutor.wait(timeout=86400000)
else:
    # 自动批准
    pass
```

---

### 2.3 任务拆分算法

```typescript
function breakdownTasks(requirement: Requirement): Task[] {
  const tasks = [];

  // 根据需求类型拆分
  switch (requirement.category) {
    case "product":
      tasks.push(
        { title: "需求评审", estimatedHours: 2, priority: "high" },
        { title: "原型设计", estimatedHours: 8, priority: "medium" },
        { title: "开发实现", estimatedHours: 40, priority: "medium" },
        { title: "测试验证", estimatedHours: 8, priority: "medium" }
      );
      break;

    case "technical":
      tasks.push(
        { title: "技术调研", estimatedHours: 4, priority: "high" },
        { title: "方案设计", estimatedHours: 8, priority: "high" },
        { title: "代码实现", estimatedHours: 24, priority: "medium" },
        { title: "Code Review", estimatedHours: 2, priority: "medium" }
      );
      break;

    case "service":
      tasks.push(
        { title: "需求确认", estimatedHours: 1, priority: "high" },
        { title: "执行服务", estimatedHours: 4, priority: "high" },
        { title: "回访反馈", estimatedHours: 1, priority: "low" }
      );
      break;
  }

  return tasks;
}
```

---

## 三、故障处理流程

### 3.1 流程概览

```
故障报告 (飞书IM)
  ↓ (5秒)
提取故障信息 (AI)
  ↓ (3秒)
检查信息完整性
  ↓ (决策点: 信息是否完整?)
请求补充信息 (10分钟)
  ↓ (5秒)
评估严重性 (P0-P4)
  ↓ (5秒, 并行)
知识库搜索 + 相似案例查找
  ↓ (8秒)
诊断分析
  ↓ (8秒)
生成解决方案
  ↓ (决策点: P0/P1需人工审核?)
人工审核方案 (3分钟)
  ↓ (3秒)
创建Task + 发送回复
  ↓ (3秒)
P0/P1告警通知
```

---

### 3.2 故障分级标准

| 等级 | 定义 | 响应时间 | 处理流程 |
|-----|------|---------|---------|
| **P0** | 核心功能不可用，影响所有用户 | 15分钟 | 强制人工审核 + 立即告警 |
| **P1** | 重要功能不可用，影响部分用户 | 1小时 | 强制人工审核 + 告警通知 |
| **P2** | 功能异常，有替代方案 | 4小时 | AI自动处理 |
| **P3** | 次要功能问题 | 1天 | AI自动处理 |
| **P4** | 优化建议 | 1周 | 记录到需求池 |

---

### 3.3 严重性评估算法

```typescript
function assessSeverity(faultInfo: FaultInfo): Severity {
  let score = 0;

  // 影响范围 (0-40分)
  if (faultInfo.impactScope == "all_users") score += 40;
  else if (faultInfo.impactScope == "multiple_users") score += 25;
  else if (faultInfo.impactScope == "single_user") score += 10;

  // 功能重要性 (0-30分)
  if (faultInfo.function == "core") score += 30;
  else if (faultInfo.function == "important") score += 20;
  else if (faultInfo.function == "minor") score += 10;

  // 是否有替代方案 (0-20分)
  if (!faultInfo.hasWorkaround) score += 20;

  // 客户情绪 (0-10分)
  if (sentiment.score < 0.3) score += 10;
  else if (sentiment.score < 0.6) score += 5;

  // 总分映射到等级
  if (score >= 80) return "P0";
  else if (score >= 60) return "P1";
  else if (score >= 40) return "P2";
  else if (score >= 20) return "P3";
  else return "P4";
}
```

---

### 3.4 解决方案生成

**步骤1: 知识库匹配**
```sql
SELECT * FROM knowledge
WHERE category = 'troubleshooting'
  AND (
    title LIKE '%{errorMessage}%'
    OR keywords && ARRAY['{keyword1}', '{keyword2}']
  )
ORDER BY usage_count DESC, updated_at DESC
LIMIT 5
```

**步骤2: 相似案例查找**
```typescript
function findSimilarCases(faultSignature: string): Case[] {
  // 计算故障签名
  const signature = hashCode(
    faultInfo.errorMessage +
    faultInfo.stackTrace +
    faultInfo.environment
  );

  // 查找相似签名
  return historicalCases.filter(c =>
    similarity(c.signature, signature) > 0.8
  ).sort((a, b) => b.successRate - a.successRate);
}
```

**步骤3: 方案合成**
```typescript
function generateSolution(
  diagnosis: Diagnosis,
  knowledge: KnowledgeItem[],
  similarCases: Case[]
): Solution {

  // 综合推荐
  const solution = {
    steps: [],
    expectedTime: 0,
    successRate: 0,
    customerReply: ""
  };

  // 优先使用成功率最高的历史案例
  if (similarCases.length > 0 && similarCases[0].successRate > 0.9) {
    solution.steps = similarCases[0].steps;
    solution.successRate = similarCases[0].successRate;
  }
  // 否则使用知识库
  else if (knowledge.length > 0) {
    solution.steps = knowledge[0].steps;
    solution.successRate = 0.75; // 默认
  }
  // 兜底方案
  else {
    solution.steps = ["人工排查", "联系技术支持"];
    solution.successRate = 0.5;
  }

  // 生成客户回复
  solution.customerReply = generateCustomerReply(solution);

  return solution;
}
```

---

## 四、工作流引擎执行机制

### 4.1 工作流定义结构

```yaml
name: workflow_name
description: 工作流描述
version: "1.0"

trigger:
  type: im_message | event | manual
  event: EventName (可选)
  channel: feishu | wecom (可选)

steps:
  - name: step_name
    type: action | parallel | human_in_loop
    agent: agent_name (可选)
    action: action_type
    input: $expression
    output: variable_name
    timeout: 5000
    condition: $expression (可选)
    loop: $expression (可选)
    fallback: default_value (可选)

    steps: [...] (parallel类型)

onError:
  - name: error_handler
    action: log | notify

onComplete:
  - name: completion_handler
    action: log | notify
```

---

### 4.2 步骤执行器

#### ActionStepExecutor - 普通步骤

```typescript
async execute(step: WorkflowStep, context: WorkflowContext): Promise<any> {
  // 1. 评估条件
  if (step.condition && !evaluateCondition(step.condition, context)) {
    return { skipped: true };
  }

  // 2. 评估输入
  const input = evaluateExpression(step.input, context);

  // 3. 执行动作
  let result;
  try {
    result = await executeAction(step.action, input, step.timeout);
  } catch (error) {
    if (step.fallback) {
      result = step.fallback;
    } else {
      throw error;
    }
  }

  // 4. 保存输出
  if (step.output) {
    context.set(step.output, result);
  }

  return result;
}
```

#### ParallelStepExecutor - 并行步骤

```typescript
async execute(step: ParallelStep, context: WorkflowContext): Promise<any> {
  // 1. 并行执行所有子步骤
  const promises = step.steps.map(subStep =>
    executeStep(subStep, context)
  );

  // 2. 等待所有完成
  const results = await Promise.all(promises);

  // 3. 合并结果
  const merged = {};
  step.steps.forEach((subStep, index) => {
    if (subStep.output) {
      merged[subStep.name] = results[index];
    }
  });

  return merged;
}
```

#### HumanInLoopExecutor - 人工审核

```typescript
async execute(step: HumanInLoopStep, context: WorkflowContext): Promise<any> {
  // 1. 推送到前端
  await websocket.push({
    type: "human_review_required",
    workflowId: context.workflowId,
    stepName: step.name,
    input: step.input,
    timeout: step.timeout
  });

  // 2. 等待人工响应
  const response = await waitForHumanResponse(
    context.workflowId,
    step.name,
    step.timeout
  );

  // 3. 超时处理
  if (!response && step.fallback) {
    return { approved: true, data: step.fallback };
  }

  return response;
}
```

---

### 4.3 表达式求值

```typescript
function evaluateExpression(expr: string, context: WorkflowContext): any {
  // 支持的表达式:
  // $variable - 变量引用
  // $object.property - 属性访问
  // $array.length - 数组长度
  // $variable == "value" - 条件判断
  // $variable > 10 - 数值比较

  if (expr.startsWith("$")) {
    const path = expr.substring(1).split(".");
    let value = context.get(path[0]);

    for (let i = 1; i < path.length; i++) {
      value = value?.[path[i]];
    }

    return value;
  }

  return expr;
}
```

---

## 五、事件驱动架构

### 5.1 事件发布流程

```typescript
// 1. 聚合根内触发领域事件
class Conversation extends AggregateRoot {
  sendMessage(content: string, senderId: string) {
    // 业务逻辑
    const message = new Message(content, senderId);
    this.messages.push(message);

    // 添加领域事件 (不立即发布)
    this.addDomainEvent(new MessageSentEvent({
      conversationId: this.id,
      messageId: message.id,
      senderId,
      content
    }));
  }
}

// 2. Repository保存并发布事件
class ConversationRepository {
  async save(conversation: Conversation): Promise<void> {
    // 在同一事务内保存聚合根和事件
    await this.db.transaction(async (trx) => {
      // 保存聚合根
      await trx.save(conversation);

      // 保存事件到事件表
      const events = conversation.getUncommittedEvents();
      await trx.insertMany("domain_events", events);
    });

    // 事务提交后发布事件
    const events = conversation.getUncommittedEvents();
    await this.eventBus.publishAll(events);

    // 清除已发布的事件
    conversation.clearEvents();
  }
}

// 3. EventBus分发给订阅者
class EventBus {
  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.subscribers.get(event.type) || [];

      // 异步执行所有处理器
      await Promise.all(
        handlers.map(handler =>
          handler.handle(event).catch(error => {
            logger.error("Event handler failed", { event, error });
          })
        )
      );
    }
  }
}
```

---

### 5.2 事件处理器示例

#### RequirementCreatedEventHandler - 需求创建处理

```typescript
class RequirementCreatedEventHandler {
  async handle(event: RequirementCreatedEvent): Promise<void> {
    const { requirementId, priority, source, conversationId } = event;

    // 决策: 是否自动创建Task
    const shouldCreateTask = (
      priority === "urgent" || priority === "high" ||
      source === "conversation" || source === "customer"
    );

    if (!shouldCreateTask) {
      logger.info("Requirement does not meet criteria for auto-task creation");
      return;
    }

    // 映射优先级
    const taskPriority = this.mapPriority(priority);

    // 创建Task
    await this.createTaskUseCase.execute({
      title: `需求跟进: ${event.title}`,
      priority: taskPriority,
      requirementId,
      conversationId,
      description: "自动创建的跟进任务",
      metadata: {
        autoCreated: true,
        source: "RequirementCreatedEvent"
      }
    });
  }

  private mapPriority(reqPriority: string): string {
    const mapping = {
      "urgent": "high",
      "high": "high",
      "medium": "medium",
      "low": "low"
    };
    return mapping[reqPriority] || "medium";
  }
}
```

#### TaskCompletedEventHandler - 任务完成处理

```typescript
class TaskCompletedEventHandler {
  async handle(event: TaskCompletedEvent): Promise<void> {
    const { taskId, conversationId, qualityScore } = event;

    if (!conversationId) return;

    // 检查对话是否可以关闭
    const conversation = await this.conversationRepo.findById(conversationId);
    const relatedTasks = await this.taskRepo.findByConversationId(conversationId);

    const allCompleted = relatedTasks.every(t => t.status === "completed");

    if (allCompleted && conversation.status === "open") {
      // 自动关闭对话
      await this.closeConversationUseCase.execute({
        conversationId,
        resolution: "所有任务已完成",
        autoClose: true
      });
    }

    // 如果质量评分低，创建改进任务
    if (qualityScore && qualityScore < 70) {
      await this.createTaskUseCase.execute({
        title: `质量改进: 任务 ${taskId}`,
        priority: "medium",
        conversationId,
        description: `质量评分${qualityScore}分，需要改进`
      });
    }
  }
}
```

---

## 六、SAGA模式 - ConversationTaskCoordinator

### 6.1 核心协调逻辑

```typescript
class ConversationTaskCoordinator {
  async processCustomerMessage(request: {
    customerId: string;
    message: string;
    channel: string;
  }): Promise<ProcessingResult> {

    // Step 1: 创建/获取对话
    const conversation = await this.getOrCreateConversation(
      request.customerId,
      request.channel
    );

    // Step 2: AI需求分析
    const requirements = await this.analyzeRequirements(
      request.message,
      conversation.history
    );

    // Step 3: 创建需求 (高置信度)
    const createdRequirements = [];
    for (const req of requirements.filter(r => r.confidence > 0.7)) {
      const created = await this.createRequirementUseCase.execute({
        customerId: request.customerId,
        conversationId: conversation.id,
        title: req.title,
        category: req.category,
        priority: req.priority
      });
      createdRequirements.push(created);
    }

    // Step 4: Agent生成回复建议
    const suggestions = await this.generateReplySuggestions(
      request.message,
      requirements,
      conversation
    );

    // Step 5: 评估是否需要人工审核
    const needsReview = this.evaluateNeedsReview(
      suggestions,
      createdRequirements,
      conversation
    );

    // Step 6: 推送结果
    if (needsReview) {
      await this.pushForHumanReview({
        conversationId: conversation.id,
        suggestions,
        requirements: createdRequirements,
        reason: "置信度不足或需求复杂"
      });
    }

    return {
      conversationId: conversation.id,
      suggestions,
      requirements: createdRequirements,
      needsReview
    };
  }

  private evaluateNeedsReview(
    suggestions: Suggestion[],
    requirements: Requirement[],
    conversation: Conversation
  ): boolean {
    const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;

    return (
      avgConfidence < 0.8 ||                    // 置信度低
      requirements.length > 2 ||                 // 需求复杂
      conversation.customer.isVIP ||             // VIP客户
      conversation.customer.riskLevel === "high" // 高风险客户
    );
  }
}
```

---

## 七、关键指标监控

### 7.1 实时指标

| 指标 | 计算方式 | 告警阈值 |
|-----|---------|---------|
| **平均响应时间** | sum(response_time) / count | >2分钟 |
| **AI置信度** | avg(confidence) | <0.7 |
| **人工介入率** | human_reviews / total | >30% |
| **SLA违约率** | sla_violations / total | >10% |
| **质检平均分** | avg(quality_score) | <80分 |

### 7.2 日报指标

| 指标 | 计算方式 | 目标值 |
|-----|---------|--------|
| **对话处理量** | count(conversations) | >100单/天 |
| **首次解决率** | first_solved / total | >80% |
| **客户满意度** | avg(satisfaction) | >4.5/5 |
| **知识复用率** | used_kb / total | >70% |
| **自动化率** | auto_resolved / total | >60% |

---

**文档结束**
