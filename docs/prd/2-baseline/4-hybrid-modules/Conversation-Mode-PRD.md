## 4.4 对话模式与人工介入模块

> **PRD格式**: Hybrid PRD (4部分结构: Agent能力 + 功能特性 + 人机协作 + 验收标准)
> **优先级**: P0 (核心功能模块)
> **所属版本**: v0.5+ (基础对话) → v0.8+ (智能协同)

---

### Part 1: Agent能力 (对话管理与介入检测)

#### 1.1 Agent Profile

**相关Agent**: Orchestrator, AssistantAgent, EngineerAgent

**对话管理能力**:
- **对话模式识别**: 识别当前对话适合AI处理还是人工介入
- **介入时机检测**: 检测何时需要人工客服接管对话
- **对话状态管理**: 维护对话状态，支持AI/人工模式切换
- **协同对话**: AI和人工客服协同回复客户

**MCP工具清单**:

```typescript
// 1. 对话模式管理
interface ConversationModeTools {
  // 识别对话模式
  detectConversationMode(conversationId: string): ConversationMode;

  // 切换对话模式
  switchConversationMode(
    conversationId: string,
    mode: "ai" | "human" | "hybrid"
  ): void;

  // 检测人工介入时机
  detectHandoffTrigger(conversationId: string): HandoffTrigger;

  // 请求人工接管
  requestHumanHandoff(
    conversationId: string,
    reason: string,
    priority: Priority
  ): HandoffRequest;
}

// 2. 协同对话
interface CollaborativeTools {
  // AI草稿建议
  suggestReply(conversationId: string, context: Context): SuggestedReply;

  // 知识实时推荐
  recommendKnowledge(
    conversationId: string,
    currentMessage: string
  ): Knowledge[];

  // 情感分析
  analyzeSentiment(message: string): SentimentAnalysis;

  // 意图变化检测
  detectIntentShift(conversationId: string): IntentShift;
}

// 3. 质量监控
interface QualityMonitoringTools {
  // 实时质量评分
  scoreConversationQuality(conversationId: string): QualityScore;

  // 风险预警
  detectRiskIndicators(conversationId: string): RiskIndicator[];

  // 合规检测
  checkCompliance(message: string): ComplianceCheck;
}
```

---

#### 1.2 工具详细规格

##### 工具1: detectConversationMode

**功能描述**: 分析对话内容和上下文，判断适合的对话模式

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 | 约束 |
|-------|------|------|------|------|
| conversationId | string | 是 | 对话ID | UUID格式 |

**输出格式**:
```json
{
  "conversationId": "conv-12345",
  "suggestedMode": "hybrid",
  "confidence": 0.85,
  "reasoning": "客户问题复杂度中等，建议AI辅助+人工确认",
  "modes": {
    "ai": {
      "suitable": true,
      "confidence": 0.70,
      "pros": ["问题属于FAQ范围", "知识库有相关答案"],
      "cons": ["客户情绪略显焦虑，需人工安抚"]
    },
    "human": {
      "suitable": true,
      "confidence": 0.60,
      "pros": ["VIP客户，优先人工服务"],
      "cons": ["问题标准化，AI可处理"]
    },
    "hybrid": {
      "suitable": true,
      "confidence": 0.85,
      "pros": ["AI提供知识推荐，人工确认后回复", "平衡效率和质量"],
      "cons": []
    }
  },
  "triggers": [
    "VIP客户",
    "问题复杂度: medium",
    "客户情绪: 略焦虑"
  ]
}
```

**模式判断逻辑**:
```python
def detect_conversation_mode(conversation):
    score_ai = 10.0
    score_human = 10.0

    # 因素1: 问题复杂度
    complexity = analyze_complexity(conversation)
    if complexity == "low":
        score_ai += 5
    elif complexity == "high":
        score_human += 5

    # 因素2: 客户等级
    if conversation.customer.level == "VIP":
        score_human += 3
    else:
        score_ai += 2

    # 因素3: 意图类型
    intent = conversation.intent
    if intent in ["greeting", "consultation"]:
        score_ai += 3
    elif intent in ["complaint", "refund"]:
        score_human += 5

    # 因素4: 客户情绪
    sentiment = analyze_sentiment(conversation)
    if sentiment.negativity > 0.7:
        score_human += 4

    # 因素5: 知识库覆盖
    knowledge_coverage = check_knowledge_coverage(conversation)
    if knowledge_coverage > 0.8:
        score_ai += 3
    else:
        score_human += 2

    # 因素6: 历史偏好
    if conversation.customer.preferHuman:
        score_human += 2

    # 决策
    if abs(score_ai - score_human) < 3:
        return "hybrid"  # 分数接近，混合模式
    elif score_ai > score_human:
        return "ai"
    else:
        return "human"
```

---

##### 工具2: detectHandoffTrigger

**功能描述**: 检测对话中的人工接管触发条件

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 | 约束 |
|-------|------|------|------|------|
| conversationId | string | 是 | 对话ID | UUID格式 |

**输出格式**:
```json
{
  "conversationId": "conv-12345",
  "shouldHandoff": true,
  "triggers": [
    {
      "type": "negative_sentiment",
      "severity": "high",
      "description": "客户情绪强烈负面(投诉、愤怒)",
      "confidence": 0.92
    },
    {
      "type": "unresolved_turns",
      "severity": "medium",
      "description": "连续3轮未解决客户问题",
      "confidence": 0.88
    }
  ],
  "priority": "high",
  "recommendedAction": "立即分配人工客服接管",
  "suggestedCSR": {
    "userId": "csr-001",
    "userName": "张三",
    "reason": "资深客服，擅长处理投诉"
  }
}
```

**触发条件清单**:

| 触发类型 | 触发条件 | 严重程度 | 优先级 |
|---------|---------|---------|--------|
| **negative_sentiment** | 检测到负面情绪词汇(投诉/愤怒/差评) | high | urgent |
| **unresolved_turns** | 连续3轮AI回复后问题仍未解决 | medium | high |
| **vip_customer** | VIP客户主动要求人工 | high | high |
| **sensitive_topic** | 涉及退款/赔偿/法律等敏感话题 | high | high |
| **ai_confidence_low** | AI回复置信度<0.6 | medium | normal |
| **customer_request** | 客户明确要求"转人工" | high | urgent |
| **compliance_risk** | 检测到合规风险(如承诺超限) | high | urgent |
| **timeout** | 对话响应超时(>5分钟无回复) | low | normal |

**触发检测逻辑**:
```python
def detect_handoff_triggers(conversation):
    triggers = []

    # 1. 负面情绪检测
    sentiment = analyze_sentiment(conversation.latestMessage)
    if sentiment.negativity > 0.8:
        triggers.append({
            "type": "negative_sentiment",
            "severity": "high",
            "confidence": sentiment.confidence
        })

    # 2. 未解决轮次检测
    unresolved_turns = count_unresolved_turns(conversation)
    if unresolved_turns >= 3:
        triggers.append({
            "type": "unresolved_turns",
            "severity": "medium",
            "confidence": 1.0
        })

    # 3. VIP客户检测
    if conversation.customer.level == "VIP":
        triggers.append({
            "type": "vip_customer",
            "severity": "high",
            "confidence": 1.0
        })

    # 4. 敏感话题检测
    sensitive_keywords = ["退款", "赔偿", "投诉", "法律", "工商局"]
    if any(kw in conversation.latestMessage for kw in sensitive_keywords):
        triggers.append({
            "type": "sensitive_topic",
            "severity": "high",
            "confidence": 0.9
        })

    # 5. AI置信度检测
    if conversation.aiConfidence < 0.6:
        triggers.append({
            "type": "ai_confidence_low",
            "severity": "medium",
            "confidence": 1.0 - conversation.aiConfidence
        })

    # 6. 客户明确要求
    if re.search(r"(转人工|人工客服|找人工)", conversation.latestMessage):
        triggers.append({
            "type": "customer_request",
            "severity": "high",
            "confidence": 1.0
        })

    return {
        "shouldHandoff": len(triggers) > 0,
        "triggers": triggers,
        "priority": calculate_priority(triggers)
    }
```

---

##### 工具3: suggestReply

**功能描述**: AI为人工客服提供回复草稿建议

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 | 约束 |
|-------|------|------|------|------|
| conversationId | string | 是 | 对话ID | UUID格式 |
| context | object | 否 | 上下文信息 | {customerMood?, urgency?} |

**输出格式**:
```json
{
  "conversationId": "conv-12345",
  "suggestions": [
    {
      "rank": 1,
      "reply": "张先生您好，非常抱歉给您带来不便。关于您反馈的退款问题，我这边已经为您查询，您的订单符合7天无理由退款政策。我现在就为您发起退款流程，预计3-5个工作日到账。请问还有其他需要帮助的吗?",
      "confidence": 0.92,
      "tone": "empathetic",
      "relatedKnowledge": [
        {
          "id": "kb-refund-policy",
          "title": "退款政策与流程",
          "relevance": 0.95
        }
      ],
      "reasoning": "客户要求退款，根据知识库找到退款政策，语气表达歉意和解决意愿"
    },
    {
      "rank": 2,
      "reply": "您好，关于退款的问题，我们的政策是...",
      "confidence": 0.75,
      "tone": "formal",
      "reasoning": "较为正式的回复方式"
    }
  ],
  "warnings": [
    "客户情绪略显焦虑，建议先表达歉意"
  ],
  "doNots": [
    "避免使用'绝对''保证'等承诺超限词汇",
    "避免推卸责任"
  ]
}
```

**生成逻辑**:
```python
def suggest_reply(conversation, context):
    # 1. 分析客户问题
    customer_issue = extract_issue(conversation.latestMessage)

    # 2. 检索相关知识
    knowledge = search_knowledge(customer_issue)

    # 3. 分析客户情绪
    sentiment = analyze_sentiment(conversation)

    # 4. 确定回复语气
    if sentiment.negativity > 0.7:
        tone = "empathetic"  # 表达同理心
    elif conversation.customer.level == "VIP":
        tone = "respectful"  # 尊重
    else:
        tone = "friendly"    # 友好

    # 5. 生成回复草稿
    prompt = f"""
    根据以下信息生成回复草稿:
    - 客户问题: {customer_issue}
    - 相关知识: {knowledge}
    - 客户情绪: {sentiment}
    - 回复语气: {tone}

    要求:
    1. 先表达歉意(如适用)
    2. 提供解决方案
    3. 询问是否还有其他需要
    4. 避免承诺超限
    """

    reply = call_llm(prompt)

    # 6. 质量检查
    compliance_check = check_compliance(reply)
    if not compliance_check.passed:
        reply = revise_reply(reply, compliance_check.issues)

    return {
        "reply": reply,
        "confidence": calculate_confidence(reply, knowledge),
        "tone": tone,
        "relatedKnowledge": knowledge
    }
```

---

##### 工具4: recommendKnowledge

**功能描述**: 实时推荐相关知识给客服

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 | 约束 |
|-------|------|------|------|------|
| conversationId | string | 是 | 对话ID | UUID格式 |
| currentMessage | string | 是 | 当前客户消息 | - |

**输出格式**:
```json
{
  "conversationId": "conv-12345",
  "recommendations": [
    {
      "id": "kb-refund-001",
      "title": "7天无理由退款政策",
      "snippet": "根据《消费者权益保护法》，商品在未开封情况下支持7天无理由退款...",
      "relevance": 0.95,
      "category": "退款政策",
      "tags": ["退款", "政策"],
      "usageCount": 120,
      "avgSatisfaction": 4.5,
      "quickActions": [
        {
          "label": "一键引用",
          "action": "insert_to_reply"
        },
        {
          "label": "查看详情",
          "action": "open_knowledge"
        }
      ]
    },
    {
      "id": "kb-refund-002",
      "title": "退款流程与时效",
      "snippet": "退款流程: 1. 客户申请 2. 审核通过 3. 退款到账(3-5工作日)...",
      "relevance": 0.88,
      "category": "退款流程",
      "tags": ["退款", "流程"],
      "usageCount": 85,
      "avgSatisfaction": 4.3
    }
  ],
  "totalFound": 5,
  "searchTime": "0.12s"
}
```

**推荐策略**:
```python
def recommend_knowledge(conversation, current_message):
    # 1. 提取关键词
    keywords = extract_keywords(current_message)

    # 2. 语义检索
    semantic_results = semantic_search(current_message, top_k=10)

    # 3. 关键词检索
    keyword_results = keyword_search(keywords, top_k=10)

    # 4. 融合排序
    combined_results = merge_and_rank(semantic_results, keyword_results)

    # 5. 过滤与重排序
    for result in combined_results:
        # 加权: 相关度 × 使用次数 × 满意度
        result.score = (
            result.relevance * 0.6 +
            normalize(result.usageCount) * 0.2 +
            result.avgSatisfaction / 5.0 * 0.2
        )

    # 6. 上下文加成
    if conversation.intent == "fault":
        boost_category(combined_results, "故障排查")

    # 7. 返回Top 3
    top_results = combined_results[:3]

    return {
        "recommendations": top_results,
        "totalFound": len(combined_results),
        "searchTime": f"{elapsed_time}s"
    }
```

---

##### 工具5: analyzeSentiment

**功能描述**: 分析客户消息的情感倾向

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 | 约束 |
|-------|------|------|------|------|
| message | string | 是 | 客户消息 | - |

**输出格式**:
```json
{
  "message": "你们的产品太差了，根本不能用，我要投诉!",
  "overall": "negative",
  "scores": {
    "positive": 0.05,
    "neutral": 0.10,
    "negative": 0.85
  },
  "emotions": [
    {"type": "anger", "intensity": 0.80},
    {"type": "frustration", "intensity": 0.70},
    {"type": "disappointment", "intensity": 0.60}
  ],
  "keywords": [
    {"word": "太差了", "sentiment": "negative", "weight": 0.9},
    {"word": "投诉", "sentiment": "negative", "weight": 1.0}
  ],
  "urgency": "high",
  "riskLevel": "high",
  "suggestion": "客户情绪强烈负面，建议立即人工介入安抚"
}
```

**情感分析逻辑**:
```python
def analyze_sentiment(message):
    # 1. 使用预训练情感分析模型
    sentiment_scores = sentiment_model.predict(message)

    # 2. 提取情感关键词
    keywords = []
    negative_words = ["差", "烂", "垃圾", "投诉", "退款"]
    positive_words = ["好", "满意", "感谢", "不错"]

    for word in negative_words:
        if word in message:
            keywords.append({
                "word": word,
                "sentiment": "negative",
                "weight": 0.9
            })

    for word in positive_words:
        if word in message:
            keywords.append({
                "word": word,
                "sentiment": "positive",
                "weight": 0.8
            })

    # 3. 检测强烈情绪
    intensity_markers = ["!", "！", "???", "太...了"]
    intensity = sum(1 for marker in intensity_markers if marker in message)

    # 4. 计算风险等级
    if sentiment_scores["negative"] > 0.8 and intensity >= 2:
        risk_level = "high"
    elif sentiment_scores["negative"] > 0.6:
        risk_level = "medium"
    else:
        risk_level = "low"

    # 5. 生成建议
    if risk_level == "high":
        suggestion = "客户情绪强烈负面，建议立即人工介入安抚"
    elif risk_level == "medium":
        suggestion = "客户略显不满，建议关注情绪变化"
    else:
        suggestion = "客户情绪正常"

    return {
        "overall": "negative" if sentiment_scores["negative"] > 0.5 else "positive",
        "scores": sentiment_scores,
        "keywords": keywords,
        "riskLevel": risk_level,
        "suggestion": suggestion
    }
```

---

### Part 2: 功能特性 (对话模式与协同)

#### 2.1 对话模式切换

**功能描述**: 支持AI模式、人工模式、混合模式三种对话模式

**模式定义**:

| 模式 | 说明 | 适用场景 | 示例 |
|-----|------|---------|------|
| **AI模式** | 完全由AI回复，无人工干预 | 简单FAQ、问候、标准咨询 | "产品支持哪些系统?" |
| **人工模式** | 完全由人工回复，AI不介入 | VIP客户、投诉、敏感话题 | "我要投诉你们!" |
| **混合模式** | AI辅助+人工确认 | 复杂故障、技术咨询 | "产品报错E101怎么办?" |

**UI展示**:
```
┌──────────────────────────────────────────────────────────┐
│ 对话 #conv-12345 | 客户: 张三 (VIP)                        │
├──────────────────────────────────────────────────────────┤
│ 当前模式: [🤖 AI模式] ▼                                   │
│   切换为: ○ AI模式  ○ 人工模式  ● 混合模式               │
├──────────────────────────────────────────────────────────┤
│ [混合模式] 说明:                                          │
│ • AI提供回复建议和知识推荐                                │
│ • 人工审核后再发送给客户                                   │
│ • 平衡效率和质量                                          │
└──────────────────────────────────────────────────────────┘
```

**自动模式切换**:
```python
def auto_switch_mode(conversation):
    # 检测触发条件
    triggers = detect_handoff_triggers(conversation)

    if triggers.shouldHandoff and triggers.priority == "urgent":
        # 紧急情况，立即切换到人工模式
        switch_mode(conversation, "human")
        notify_csr(conversation, "紧急对话需要接管")

    elif conversation.customer.level == "VIP":
        # VIP客户，默认混合模式
        switch_mode(conversation, "hybrid")

    else:
        # 普通客户，根据问题复杂度决定
        mode = detect_conversation_mode(conversation)
        switch_mode(conversation, mode)
```

---

#### 2.2 人工客服接管

**功能描述**: 人工客服接管AI对话，无缝衔接

**接管流程**:
```
AI对话中
  ↓
检测到接管触发条件 (投诉/VIP/连续未解决)
  ↓
推送通知给空闲客服: "有对话需要接管"
  ↓
客服点击【接管】
  ↓
系统同步对话历史和客户信息
  ↓
客服发送第一条消息
  ↓
对话模式切换为"人工模式"
  ↓
AI转为辅助角色 (提供知识推荐)
```

**UI界面**:
```
┌──────────────────────────────────────────────────────────┐
│ 🔔 待接管对话 (3)                                         │
├──────────────────────────────────────────────────────────┤
│ ⚠️ [紧急] 客户张三 (VIP) - 投诉产品质量问题              │
│   对话时长: 5分钟 | 轮次: 4 | AI未解决                    │
│   情绪: 强烈负面😡 | 优先级: urgent                       │
│   [接管对话] [查看详情]                                   │
│                                                          │
│ ⏰ [高优] 客户李四 - 故障排查超过3轮未解决                │
│   对话时长: 8分钟 | 轮次: 6 | AI置信度: 0.55             │
│   情绪: 略焦虑😟 | 优先级: high                          │
│   [接管对话] [查看详情]                                   │
│                                                          │
│ ... (还有1个)                                            │
└──────────────────────────────────────────────────────────┘
```

**接管后界面**:
```
┌──────────────────────────────────────────────────────────┐
│ 对话 #conv-12345 | 客户: 张三 (VIP) | 模式: 👤 人工模式  │
├──────────────────────────────────────────────────────────┤
│ 📋 对话历史 (已接管):                                     │
│   [AI] 您好，请问有什么可以帮助您的?                       │
│   [客户] 你们的产品太差了，根本不能用!                     │
│   [AI] 非常抱歉给您带来不便，请问具体遇到什么问题?          │
│   [客户] 报错E101，我按照说明操作了还是不行，我要投诉!     │
│   ↓ (您已接管对话)                                       │
├──────────────────────────────────────────────────────────┤
│ 💡 AI建议回复:                                            │
│   "张先生您好，非常抱歉给您带来不便。我是资深客服小王，    │
│    现在由我来为您处理这个问题。关于E101错误..."           │
│   [使用建议] [编辑后使用] [忽略]                          │
│                                                          │
│ 📚 推荐知识:                                              │
│   1. 错误代码E101故障排查 (相关度95%)                     │
│   2. VIP客户安抚话术 (相关度88%)                          │
│   [查看详情]                                              │
├──────────────────────────────────────────────────────────┤
│ ✍️ 回复框:                                               │
│ [________________________________________] [发送]         │
└──────────────────────────────────────────────────────────┘
```

---

#### 2.3 协同对话模式

**功能描述**: AI和人工协同回复，AI提供建议，人工确认后发送

**协同流程**:
```
客户发送消息
  ↓
AI实时分析:
  - 识别意图
  - 推荐知识
  - 生成回复草稿
  ↓
客服收到AI建议:
  - 查看回复草稿
  - 查看推荐知识
  - 查看情感分析
  ↓
客服选择:
  - 直接使用AI草稿 (一键发送)
  - 编辑后使用 (修改部分内容)
  - 忽略建议 (自己写)
  ↓
客服发送回复
  ↓
AI记录反馈 (用于优化模型)
```

**UI界面 (协同模式)**:
```
┌──────────────────────────────────────────────────────────┐
│ 对话 #conv-12345 | 客户: 张三 | 模式: 🤝 混合模式         │
├──────────────────────────────────────────────────────────┤
│ 💬 客户消息:                                              │
│   "产品报错E101，按照说明操作了还是不行，怎么办?"          │
│                                                          │
│ 🤖 AI分析:                                               │
│   意图: 技术故障  情绪: 略焦虑😟  紧急度: 中              │
│                                                          │
│ 💡 AI建议回复 (置信度: 92%):                             │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 您好，关于E101错误，这通常是驱动问题导致的。         │   │
│ │ 请尝试以下步骤:                                     │   │
│ │ 1. 卸载当前驱动                                     │   │
│ │ 2. 重启设备                                         │   │
│ │ 3. 安装最新版驱动 (下载链接: xxx)                   │   │
│ │ 如果仍无法解决，我帮您申请工程师远程协助。            │   │
│ └────────────────────────────────────────────────────┘   │
│ [✅ 使用建议] [✏️ 编辑后使用] [❌ 忽略]                    │
│                                                          │
│ 📚 推荐知识 (2):                                          │
│   1. [E101错误排查指南] (相关度95%) [查看] [引用]         │
│   2. [驱动安装步骤] (相关度88%) [查看] [引用]             │
│                                                          │
│ ✍️ 或者自己输入:                                         │
│ [________________________________________] [发送]         │
└──────────────────────────────────────────────────────────┘
```

**效率对比**:
- **纯人工**: 平均回复时间 2-3分钟 (搜索知识库+编写回复)
- **协同模式**: 平均回复时间 30秒-1分钟 (审核AI草稿+微调)
- **效率提升**: 60-70%

---

#### 2.4 对话质量实时监控

**功能描述**: 对话进行中实时监控质量指标，及时预警

**监控指标**:

1. **响应时间监控**:
```
┌─────────────────────────────────────┐
│ ⏱️ 响应时间: 2分30秒                │
│ ⚠️ 超过目标值 (目标: <2分钟)        │
│ 建议: 使用快捷回复加快响应          │
└─────────────────────────────────────┘
```

2. **情绪趋势监控**:
```
┌─────────────────────────────────────┐
│ 😊 客户情绪趋势:                     │
│ 😐 → 😟 → 😡 (逐渐恶化)             │
│ ⚠️ 风险: 可能转为投诉                │
│ 建议: 主动表达歉意，提供补偿方案     │
└─────────────────────────────────────┘
```

3. **解决进度监控**:
```
┌─────────────────────────────────────┐
│ 🎯 解决进度:                         │
│ 对话轮次: 5轮                        │
│ 问题状态: 未解决                     │
│ ⚠️ 警告: 已超过3轮仍未解决            │
│ 建议: 考虑升级到专家或人工接管       │
└─────────────────────────────────────┘
```

4. **合规风险监控**:
```
┌─────────────────────────────────────┐
│ ⚖️ 合规检测:                        │
│ ❌ 发现风险词: "绝对能解决"          │
│ 类型: 承诺超限                       │
│ 建议: 修改为"通常情况下可以解决"     │
└─────────────────────────────────────┘
```

---

#### 2.5 对话小结与交接

**功能描述**: 对话结束时生成小结，便于后续跟进和交接

**小结内容**:
```
┌──────────────────────────────────────────────────────────┐
│ 📝 对话小结 #conv-12345                                   │
├──────────────────────────────────────────────────────────┤
│ 客户: 张三 (VIP)                                          │
│ 渠道: 飞书                                                │
│ 对话时长: 15分钟                                           │
│ 对话轮次: 8轮                                              │
│ 处理客服: 李四 (工号: csr-002)                            │
│                                                          │
│ 问题描述:                                                 │
│   客户反馈产品报错E101，已尝试更新驱动仍无效              │
│                                                          │
│ 解决方案:                                                 │
│   1. 远程协助客户重新安装驱动                             │
│   2. 确认为硬件故障                                       │
│   3. 已发起换货工单 (工单号: WO-12345)                    │
│                                                          │
│ 后续跟进:                                                 │
│   ☑ 已创建任务: 3天后回访确认新设备使用情况               │
│   ☑ 已添加客户标签: "硬件故障" "已换货"                   │
│                                                          │
│ 满意度: ⭐⭐⭐⭐⭐ 5/5                                    │
│ 客户评价: "服务很好，问题解决及时"                         │
│                                                          │
│ 质检得分: 9.2/10 (优秀)                                   │
│   - 响应速度: 9.0                                         │
│   - 专业性: 9.5                                           │
│   - 友好度: 9.0                                           │
│                                                          │
│ [导出PDF] [发送邮件] [关闭]                               │
└──────────────────────────────────────────────────────────┘
```

**自动生成逻辑**:
```python
def generate_conversation_summary(conversation):
    # 1. 提取问题描述
    issue = extract_main_issue(conversation)

    # 2. 总结解决方案
    solution = summarize_solution(conversation)

    # 3. 检查后续跟进
    follow_ups = extract_follow_ups(conversation)

    # 4. 获取满意度和质检得分
    satisfaction = conversation.satisfactionScore
    inspection = conversation.inspection

    # 5. 生成小结
    summary = {
        "customer": conversation.customer,
        "channel": conversation.channel,
        "duration": conversation.duration,
        "turnCount": conversation.turnCount,
        "csr": conversation.csr,
        "issue": issue,
        "solution": solution,
        "followUps": follow_ups,
        "satisfaction": satisfaction,
        "inspection": inspection
    }

    return summary
```

---

### Part 3: 人机协作边界

#### 3.1 AI主导场景

**场景1: 标准FAQ**
- **AI职责**: 完全自主回复，无需人工干预
- **人工职责**: 事后抽检质量
- **协作方式**: AI独立处理 → 人工抽检

**示例**:
```
客户: "产品支持Mac系统吗?"
  ↓
AI自动识别: FAQ类问题
  ↓
AI检索知识库: 找到"系统兼容性"知识
  ↓
AI自动回复:
  "您好! 我们的产品支持Mac系统(macOS 10.15+)。
   以下是安装指南: [知识链接]"
  ↓
客户: "好的，谢谢!"
  ↓
对话自动标记为"已解决"
  ↓
InspectorAgent自动质检
  ↓
人工抽检 (10%采样)
```

---

**场景2: 知识推荐**
- **AI职责**: 实时推荐相关知识给客服
- **人工职责**: 选择合适的知识引用
- **协作方式**: AI推荐 → 人工选择 → 引用到回复

**示例**:
```
客户: "产品无法启动，显示错误E101"
  ↓
AI实时分析:
  - 意图: 技术故障
  - 关键词: E101
  ↓
AI推荐知识:
  1. [E101错误排查指南] (95%)
  2. [驱动安装步骤] (88%)
  3. [常见启动问题] (75%)
  ↓
客服查看推荐:
  - 选择知识1 → 一键引用到回复
  ↓
客服发送:
  "您好，E101错误通常是驱动问题。请按以下步骤操作:
   [引用知识1的内容]"
```

---

#### 3.2 人工主导场景

**场景1: VIP客户服务**
- **人工职责**: 全程人工服务，提供个性化关怀
- **AI职责**: 辅助提供信息和建议
- **协作方式**: 人工主导 → AI辅助

**示例**:
```
VIP客户张三发起对话
  ↓
系统自动分配资深客服
  ↓
客服主动问候:
  "张先生您好，我是您的专属客服小王，有什么可以帮您的?"
  ↓
AI辅助:
  - 推送客户历史信息
  - 推送近期互动记录
  - 实时推荐知识
  ↓
客服全程人工回复 (AI仅提供建议)
```

---

**场景2: 投诉处理**
- **人工职责**: 主导安抚客户，解决问题
- **AI职责**: 提供合规建议，监控风险
- **协作方式**: 人工处理 → AI监控合规

**示例**:
```
客户: "你们的产品太差了，我要投诉!"
  ↓
AI检测: 投诉意图 + 强烈负面情绪
  ↓
立即分配资深客服
  ↓
客服回复:
  "张先生非常抱歉给您带来不便，请您告诉我具体遇到了什么问题，
   我一定帮您妥善解决。"
  ↓
AI实时监控:
  - 检测到"绝对"→ 提示: 避免承诺超限
  - 检测到"赔偿"→ 提示: 参考赔偿政策
  ↓
客服继续处理，AI持续提供合规建议
```

---

#### 3.3 协作模式场景

**场景1: 复杂故障排查**
- **AI职责**: 提供诊断步骤和方案建议
- **人工职责**: 确认方案可行性，指导客户操作
- **协作方式**: AI诊断 → 人工确认 → 共同解决

**示例**:
```
客户: "产品报错E101，已更新驱动仍无效"
  ↓
AI分析:
  - 意图: 技术故障
  - 复杂度: 中等
  - 建议: 混合模式
  ↓
AI生成诊断步骤:
  1. 确认系统版本
  2. 检查驱动版本号
  3. 尝试重新安装驱动
  4. 如仍无效，疑似硬件问题
  ↓
客服查看AI建议:
  - 确认步骤合理
  - 调整第3步: 补充截图说明
  ↓
客服引导客户按步骤操作:
  "好的张先生，我们一起排查一下。
   首先请您确认一下系统版本..."
  ↓
客户按步骤操作
  ↓
客服: "看起来可能是硬件问题，我帮您申请换货"
  ↓
AI自动创建换货工单
```

---

**场景2: 知识不足场景**
- **AI职责**: 坦诚告知知识不足，建议人工介入
- **人工职责**: 接管对话，解决问题，沉淀新知识
- **协作方式**: AI识别不足 → 人工接管 → AI学习

**示例**:
```
客户: "产品在macOS 15系统下无法打开，怎么办?"
  ↓
AI检索知识库:
  - 找到: macOS 10.15-14.x 相关知识
  - 未找到: macOS 15 相关知识
  ↓
AI判断: 知识不足，置信度低
  ↓
AI回复:
  "抱歉，关于macOS 15系统的兼容性，我暂时没有找到相关信息。
   我为您转接人工客服详细了解。"
  ↓
人工客服接管:
  - 查询技术文档
  - 确认: macOS 15需要v2.0版本
  - 回复客户
  ↓
对话结束后:
  - AI自动提取新知识: "macOS 15兼容性"
  - 客服审核后添加到知识库
  ↓
下次遇到类似问题，AI可以直接回答
```

---

### Part 4: 验收标准

#### 4.1 功能验收

**对话模式**:
- [ ] 支持AI/人工/混合三种模式切换
- [ ] 模式切换响应时间<200ms
- [ ] 自动模式推荐准确率>80%

**人工接管**:
- [ ] 接管触发检测准确率>90%
- [ ] 接管通知推送延迟<3秒
- [ ] 接管后上下文同步100%

**协同对话**:
- [ ] AI回复建议生成时间<2秒
- [ ] 知识推荐相关度>85%
- [ ] 情感分析准确率>80%

**实时监控**:
- [ ] 响应时间监控延迟<5秒
- [ ] 情绪趋势检测准确率>75%
- [ ] 合规风险检测召回率>95%

**对话小结**:
- [ ] 小结生成时间<5秒
- [ ] 小结完整性100% (包含所有必要字段)
- [ ] 小结准确性>90% (人工评估)

---

#### 4.2 性能验收

| 指标 | 目标值 | 测量方法 | 优先级 |
|-----|--------|---------|--------|
| 模式切换响应 | <200ms | 前端埋点 | P0 |
| AI建议生成 | <2秒 (P95) | API监控 | P0 |
| 知识推荐 | <1秒 | Prometheus | P0 |
| 情感分析 | <500ms | API监控 | P1 |
| 对话小结生成 | <5秒 | 前端埋点 | P1 |
| 并发对话支持 | 500并发 | 压测 | P0 |

---

#### 4.3 准确性验收

**模式识别准确性**:
- [ ] 对话模式推荐与人工判断一致性>80%
- [ ] 接管触发检测召回率>90% (无漏报重要接管)
- [ ] 接管触发检测精确率>75% (减少误报)

**AI辅助准确性**:
- [ ] 回复建议可用性>70% (客服采纳率)
- [ ] 知识推荐相关度>85% (人工评估)
- [ ] 情感分析准确率>80% (人工标注对比)

**质量监控准确性**:
- [ ] 合规风险检测F1-score>0.85
- [ ] 情绪趋势预测准确率>75%

---

#### 4.4 用户体验验收

**客服端**:
- [ ] 模式切换操作简单 (<3步)
- [ ] AI建议清晰易懂
- [ ] 知识推荐相关度高

**管理端**:
- [ ] 待接管对话列表实时更新
- [ ] 对话小结完整准确

**用户满意度**:
- [ ] 客服对协同模式满意度≥4.3/5.0
- [ ] AI建议采纳率≥60%

---

#### 4.5 业务验收

**效率提升**:
- [ ] 协同模式回复速度: 提升60-70% (vs 纯人工)
- [ ] 人工接管响应时间: <30秒
- [ ] AI模式自动解决率: >50% (FAQ类问题)

**质量提升**:
- [ ] 客户满意度: 4.2 → 4.5 (提升7%)
- [ ] 投诉转化率: 下降30% (及时接管)
- [ ] 对话质检平均分: 8.0 → 8.5 (提升6%)

**成本优化**:
- [ ] 人力成本节省: 30% (AI处理简单问题)
- [ ] 人工回复时间节省: 60% (AI辅助)

---

## 附录

### A. 对话模式决策矩阵

| 条件 | AI模式 | 人工模式 | 混合模式 |
|-----|--------|---------|---------|
| 客户等级 = VIP | ❌ | ✅ | ✅ |
| 意图 = FAQ | ✅ | ❌ | - |
| 意图 = 投诉 | ❌ | ✅ | ❌ |
| 意图 = 故障 | - | - | ✅ |
| 情绪 = 强烈负面 | ❌ | ✅ | ❌ |
| 知识覆盖率 > 80% | ✅ | - | ✅ |
| AI置信度 < 0.6 | ❌ | ✅ | - |
| 连续3轮未解决 | ❌ | ✅ | - |

---

### B. 接管优先级计算

```python
def calculate_handoff_priority(triggers):
    score = 0

    for trigger in triggers:
        if trigger.type == "customer_request":
            score += 10  # 客户明确要求，最高优先
        elif trigger.type == "negative_sentiment" and trigger.severity == "high":
            score += 8   # 强烈负面情绪
        elif trigger.type == "vip_customer":
            score += 7   # VIP客户
        elif trigger.type == "sensitive_topic":
            score += 7   # 敏感话题
        elif trigger.type == "compliance_risk":
            score += 9   # 合规风险
        elif trigger.type == "unresolved_turns":
            score += 5   # 连续未解决
        elif trigger.type == "ai_confidence_low":
            score += 3   # AI置信度低

    if score >= 10:
        return "urgent"
    elif score >= 7:
        return "high"
    elif score >= 4:
        return "normal"
    else:
        return "low"
```

---

### C. 数据库索引优化

```sql
-- Conversation表索引
CREATE INDEX idx_conversation_mode ON conversations(mode);
CREATE INDEX idx_conversation_status ON conversations(status);
CREATE INDEX idx_conversation_csr ON conversations(csr_id);
CREATE INDEX idx_conversation_customer ON conversations(customer_id);

-- 复合索引（用于待接管列表查询）
CREATE INDEX idx_conversation_handoff ON conversations(requires_handoff, priority DESC, created_at);

-- ConversationMessage表索引
CREATE INDEX idx_message_conversation ON conversation_messages(conversation_id, sent_at);
CREATE INDEX idx_message_sender ON conversation_messages(sender_type, sender_id);
```

---

**文档结束**

**相关文档**:
- Orchestrator Agent PRD: `3-agents/Orchestrator-PRD.md`
- AssistantAgent PRD: `3-agents/AssistantAgent-PRD.md`
- 产品概述: `1-overview/Product-Overview.md`
- v0.5增量PRD: `../../3-incremental/PRD-v0.5-Incremental.md`
