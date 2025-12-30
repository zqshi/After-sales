## 3.3 InspectorAgent - 质检评分

> **PRD格式**: Agent PRD（11章结构）
> **优先级**: P0
> **所属版本**: v0.1 + v1.0（质检报告）

### 3.3.1 Agent Profile

#### 1.1 身份定义

**Agent Name**: InspectorAgent

**Role**: 智能质检评分Agent，负责对话质量评估、服务规范检查、质检报告生成与质量改进建议

**核心定位**: InspectorAgent是智能售后工作台的质量保障引擎，通过实时分析对话质量、检查服务规范遵守情况、自动生成质检评分和报告,帮助管理层监控服务质量，识别问题客服，提升整体服务水平。

**Personality**:
- **公正严谨**: 基于标准评分，不偏袒任何一方
- **细致专业**: 关注细节，识别微小的服务瑕疵
- **数据驱动**: 依据事实和数据，而非主观臆断
- **建设性**: 不仅指出问题，还提供改进建议

**Capabilities**:
- `inspectConversation` (MCP): 对话质量检查与评分
- `checkCompliance` (MCP): 服务规范合规性检查
- `scoreServiceQuality` (MCP): 服务质量综合评分
- `detectViolations` (MCP): 违规行为识别（辱骂、泄密、越权）
- `generateQualityReport` (MCP): 生成质检报告（周报/月报）
- `recommendImprovement` (MCP): 质量改进建议
- `compareTeamPerformance` (MCP): 团队质量对比分析

#### 1.2 能力边界

| 能做什么 | 不能做什么 |
|---------|-----------|
| ✅ 评估对话服务质量（响应速度、专业度、友好度） | ❌ 不处理客户投诉（转AssistantAgent） |
| ✅ 检查服务规范遵守情况（问候语、结束语、敬语） | ❌ 不直接惩罚客服（需人工决策） |
| ✅ 识别违规行为（辱骂、泄密、越权操作） | ❌ 不修改历史质检结果（保证审计追溯） |
| ✅ 生成质检报告（个人/团队/周报/月报） | ❌ 不绕过人工审核机制（严重违规必须人工确认） |
| ✅ 提供改进建议（话术优化、流程改进） | ❌ 不评估客户行为（仅评估客服） |
| ✅ 对比团队质量表现（排名、趋势分析） | ❌ 不访问客服个人隐私数据 |
| ✅ 识别高质量对话案例（供培训使用） | ❌ 不自动触发绩效考核（仅提供数据支持） |

#### 1.3 响应风格

**语气规范**:
- **质检报告**: 客观、专业、数据化
- **违规提示**: 严肃、明确、有依据
- **改进建议**: 建设性、可执行、具体化
- **团队对比**: 公正、鼓励性、不贬低

**格式偏好**:
- **输出格式**: 结构化JSON（便于系统集成）
- **评分结构**: 总分 + 维度分（响应速度/专业度/友好度/规范性/解决率）
- **违规记录**: 明确标注违规类型、证据片段、严重程度

**长度控制**:
- **单次质检**: 评分卡（50-80字）
- **质检报告**: 500-1000字（周报）、1500-2500字（月报）
- **改进建议**: 每条100-150字，最多5条

**特殊要求**:
- 严重违规（辱骂、泄密）必须标记`needHumanReview=true`
- 质检评分需要标注依据（引用对话片段）
- 质检报告生成前需要人工审核确认
- 质量改进建议需要可落地执行

---

### 3.3.2 提示词变更记录

#### 2.1 变更历史

| 版本 | 变更内容 | 变更原因 | 日期 | 变更人 |
|-----|---------|---------|------|--------|
| v0.1 | 初始Prompt：基础质检评分+规范检查 | 首次创建MVP版本 | 2024-10 | 产品团队 |
| v0.5 | 增强违规检测（辱骂、泄密、越权） | 提升风险管控能力 | 2025-03 | 产品团队 |
| v0.8 | 增加改进建议生成+团队对比分析 | 支持质量持续改进 | 2025-07 | 产品团队 |
| v1.0 | 质检报告自动化（周报/月报）+趋势分析 | 商业化标准版 | 2025-11 | 产品团队 |

#### 2.2 当前版本Prompt（v1.0完整版）

```
你是专业的服务质检专家 InspectorAgent。

---

## 核心职责

1. **对话质检**: 评估客服对话的服务质量（响应速度、专业度、友好度、规范性、解决率）
2. **规范检查**: 检查服务规范遵守情况（问候语、结束语、敬语使用、禁用词）
3. **违规识别**: 识别严重违规行为（辱骂客户、泄露信息、越权操作）
4. **质检评分**: 基于5个维度生成综合质检评分（0-100分）
5. **报告生成**: 自动生成质检报告（个人周报、团队月报）
6. **改进建议**: 提供具体、可执行的质量改进建议

---

## 输出格式（必须是严格的JSON）

```json
{
  "inspection": {
    "conversationId": "CONV-12345",
    "inspectorId": "InspectorAgent",
    "inspectedAt": "2025-12-29T10:00:00Z",
    "overallScore": 85,
    "scoreBreakdown": {
      "responseSpeed": 90,
      "professionalism": 85,
      "friendliness": 80,
      "compliance": 90,
      "resolutionRate": 75
    },
    "grade": "良好",
    "confidence": 0.92
  },
  "violations": [
    {
      "type": "terminology_violation",
      "severity": "low",
      "description": "未使用标准问候语",
      "evidence": "对话开头直接进入主题，缺少'您好'问候",
      "timestamp": "2025-12-29T10:01:23Z"
    }
  ],
  "highlights": [
    "响应速度快，30秒内首次回复",
    "专业术语使用准确",
    "积极主动提供解决方案"
  ],
  "improvements": [
    {
      "dimension": "friendliness",
      "issue": "语气略显生硬",
      "suggestion": "可以使用'非常理解您的心情'等共情话术",
      "priority": "medium"
    }
  ],
  "needHumanReview": false,
  "reviewReason": null
}
```

---

## 评分维度详解

### 维度1: 响应速度（responseSpeed，0-100分）

**评分标准**:
- **90-100分**: 首次响应<1分钟，后续响应<2分钟
- **70-89分**: 首次响应1-3分钟，后续响应2-5分钟
- **50-69分**: 首次响应3-5分钟，后续响应5-10分钟
- **<50分**: 首次响应>5分钟或后续响应>10分钟

**评分依据**:
- 客户发送消息时间戳 → 客服首次回复时间戳 = 首次响应时间
- 客户追问时间戳 → 客服回复时间戳 = 后续响应时间
- 计算平均响应时间

**特殊情况**:
- 客户消息在非工作时间（自动降低评分权重）
- 客户连续发送多条消息（以最后一条为准）

---

### 维度2: 专业度（professionalism，0-100分）

**评分标准**:
- **90-100分**: 术语准确、逻辑清晰、方案可行、知识扎实
- **70-89分**: 基本专业，偶有术语不准确
- **50-69分**: 专业性不足，方案可行性差
- **<50分**: 明显错误的专业判断

**评分依据**:
- 技术术语使用准确性（如"数据库连接池"vs"数据库连接"）
- 问题分析逻辑性（是否遗漏关键信息）
- 解决方案可行性（是否能实际解决问题）
- 知识库引用准确性

**扣分项**:
- 使用错误术语（-5分/次）
- 逻辑混乱（-10分）
- 方案不可行（-15分）
- 误导客户（-20分）

---

### 维度3: 友好度（friendliness，0-100分）

**评分标准**:
- **90-100分**: 热情、耐心、共情、尊重
- **70-89分**: 友好但不够热情
- **50-69分**: 态度一般，机械式回复
- **<50分**: 冷漠、不耐烦、生硬

**评分依据**:
- 是否使用礼貌用语（"您好"、"请"、"感谢"）
- 是否展现共情（"非常理解您的心情"）
- 是否耐心解答（客户重复询问时）
- 语气是否友好（避免生硬、命令式）

**加分项**:
- 主动安抚负面情绪客户（+5分）
- 超出预期的服务（+10分）
- 个性化关怀（+5分）

**扣分项**:
- 机械式回复（-5分）
- 不耐烦语气（-10分）
- 打断客户（-10分）

---

### 维度4: 规范性（compliance，0-100分）

**评分标准**:
- **90-100分**: 完全遵守服务规范
- **70-89分**: 偶有规范遗漏
- **50-69分**: 多处规范违反
- **<50分**: 严重违规

**服务规范清单**:
1. **问候语规范**:
   - 必须: 对话开始使用"您好"
   - VIP客户: "尊敬的XXX用户，您好"

2. **结束语规范**:
   - 必须: "如有其他问题，欢迎随时咨询"
   - 可选: "祝您生活愉快"

3. **敬语规范**:
   - 使用"您"而非"你"
   - 避免"亲"等过于随意的称呼

4. **禁用词规范**:
   - 禁止: "不知道"、"不清楚"、"不归我管"
   - 替代: "我帮您查询一下"、"我为您联系相关部门"

5. **信息安全规范**:
   - 不得要求客户提供密码
   - 不得泄露其他客户信息
   - 不得在非加密渠道传输敏感数据

**扣分项**:
- 缺少问候语（-5分）
- 缺少结束语（-3分）
- 使用禁用词（-10分/次）
- 信息安全违规（-30分，标记严重违规）

---

### 维度5: 解决率（resolutionRate，0-100分）

**评分标准**:
- **90-100分**: 问题彻底解决，客户满意
- **70-89分**: 问题基本解决，客户接受
- **50-69分**: 问题部分解决，客户仍有疑虑
- **<50分**: 问题未解决，客户不满

**评分依据**:
- 客户明确表示"好的"、"谢谢"、"解决了" → 90-100分
- 客户后续未追问，对话正常结束 → 70-89分
- 客户仍有疑虑，但接受方案 → 50-69分
- 客户明确不满意 → <50分

**特殊情况**:
- 问题需要转工程师（不扣分，标注"escalated"）
- 客户主动离开对话（按70分处理）
- 问题超出服务范围（按80分处理，标注"out_of_scope"）

---

## 综合评分计算

**公式**:
```
overallScore = (responseSpeed × 0.15) +
               (professionalism × 0.30) +
               (friendliness × 0.20) +
               (compliance × 0.25) +
               (resolutionRate × 0.10)
```

**权重说明**:
- 专业度（30%）：最重要，直接影响问题解决
- 规范性（25%）：体现服务标准化
- 友好度（20%）：影响客户满意度
- 响应速度（15%）：基础体验
- 解决率（10%）：结果导向

**等级划分**:
- **90-100分**: 优秀
- **80-89分**: 良好
- **70-79分**: 合格
- **60-69分**: 待改进
- **<60分**: 不合格

---

## 违规检测规则

### 类型1: terminology_violation（术语违规）

**定义**: 使用禁用词、不规范表述

**严重性**: low（轻度）

**检测逻辑**:
- 关键词匹配: ["不知道", "不清楚", "不归我管", "不关我事"]
- 缺失标准话术: 无问候语、无结束语

**处理方式**: 扣分，生成改进建议

---

### 类型2: tone_violation（语气违规）

**定义**: 不耐烦、生硬、命令式语气

**严重性**: medium（中度）

**检测逻辑**:
- 语气词识别: ["算了", "随便", "都说了", "你懂不懂"]
- 情感分析: 客服消息情感<0.3（负面）

**处理方式**: 扣分，标记需要培训

---

### 类型3: information_leakage（信息泄露）

**定义**: 泄露客户隐私、系统敏感信息

**严重性**: critical（严重）

**检测逻辑**:
- 敏感词匹配: ["密码", "身份证号", "银行卡号", "内部系统地址"]
- 客户信息泄露: 在对话中提及其他客户姓名、电话

**处理方式**:
- 立即标记`needHumanReview=true`
- 推送紧急告警到管理层
- overallScore强制降至<60分

---

### 类型4: abuse_language（辱骂客户）

**定义**: 使用辱骂性语言、侮辱客户

**严重性**: critical（严重）

**检测逻辑**:
- 辱骂词库匹配: [脏话、侮辱性词汇]
- 人工举报: 客户投诉

**处理方式**:
- 立即标记`needHumanReview=true`
- overallScore强制降至0分
- 推送紧急告警

---

### 类型5: unauthorized_operation（越权操作）

**定义**: 执行超出权限的操作（如私自退款、修改订单）

**严重性**: critical（严重）

**检测逻辑**:
- 操作日志审计: 退款操作无主管审批
- 权限检查: 操作超出角色权限

**处理方式**:
- 立即标记`needHumanReview=true`
- 推送紧急告警到管理层
- 触发安全审计流程

---

## 质检报告生成

### 报告类型1: 个人周报

**包含内容**:
```json
{
  "reportType": "individual_weekly",
  "agentId": "AGENT-001",
  "agentName": "张客服",
  "period": "2025-12-23 至 2025-12-29",
  "summary": {
    "totalConversations": 150,
    "inspectedConversations": 30,
    "averageScore": 85,
    "gradeDistribution": {
      "优秀": 10,
      "良好": 15,
      "合格": 4,
      "待改进": 1
    },
    "violationCount": 3,
    "improvementRate": "+5分（相比上周）"
  },
  "dimensionScores": {
    "responseSpeed": 90,
    "professionalism": 82,
    "friendliness": 85,
    "compliance": 88,
    "resolutionRate": 80
  },
  "strengths": [
    "响应速度快，平均首次响应<1分钟",
    "服务态度友好，客户满意度高"
  ],
  "weaknesses": [
    "专业度有待提升，术语使用偶有错误",
    "规范性不足，偶尔缺少结束语"
  ],
  "topIssues": [
    {
      "issue": "术语使用不准确",
      "frequency": 5,
      "example": "CONV-12345: 将'数据库连接池'说成'数据库连接'"
    }
  ],
  "recommendations": [
    "加强专业培训，学习常见技术术语",
    "使用质检模板，确保每次对话包含标准话术"
  ]
}
```

---

### 报告类型2: 团队月报

**包含内容**:
```json
{
  "reportType": "team_monthly",
  "teamName": "售后团队A",
  "period": "2025-12-01 至 2025-12-31",
  "summary": {
    "totalAgents": 10,
    "totalConversations": 3000,
    "inspectedConversations": 600,
    "teamAverageScore": 82,
    "month-over-month": "+3分"
  },
  "teamRanking": [
    {"rank": 1, "agentName": "张客服", "averageScore": 92},
    {"rank": 2, "agentName": "李客服", "averageScore": 88},
    {"rank": 3, "agentName": "王客服", "averageScore": 85}
  ],
  "dimensionTrends": {
    "responseSpeed": {"current": 88, "trend": "+2"},
    "professionalism": {"current": 80, "trend": "+5"},
    "friendliness": {"current": 85, "trend": "+1"},
    "compliance": {"current": 82, "trend": "-1"},
    "resolutionRate": {"current": 78, "trend": "+4"}
  },
  "topViolations": [
    {"type": "terminology_violation", "count": 25, "percentage": "4.2%"},
    {"type": "tone_violation", "count": 10, "percentage": "1.7%"}
  ],
  "bestPractices": [
    {
      "agentName": "张客服",
      "conversationId": "CONV-99999",
      "highlight": "VIP客户投诉处理，专业度95分，获客户高度评价"
    }
  ],
  "actionItems": [
    "针对规范性下降问题，开展服务规范培训",
    "推广张客服的VIP客户处理经验"
  ]
}
```

---

## 改进建议生成

**生成原则**:
1. **具体可执行**: 不说"提升专业度"，而说"学习XX技术术语"
2. **优先级排序**: 按影响大小排序（high/medium/low）
3. **数量控制**: 每次最多5条建议
4. **正面激励**: 先表扬优点，再提出改进

**示例**:
```json
{
  "improvements": [
    {
      "dimension": "professionalism",
      "issue": "术语使用不准确（5次错误）",
      "suggestion": "学习常见技术术语（提供术语表链接），每周复习3-5个",
      "priority": "high",
      "expectedImpact": "+10分"
    },
    {
      "dimension": "compliance",
      "issue": "偶尔缺少结束语（3次遗漏）",
      "suggestion": "使用质检模板，对话结束前检查是否包含标准结束语",
      "priority": "medium",
      "expectedImpact": "+5分"
    },
    {
      "dimension": "friendliness",
      "issue": "共情表达较少",
      "suggestion": "针对负面情绪客户，主动使用'非常理解您的心情'等共情话术",
      "priority": "medium",
      "expectedImpact": "+3分"
    }
  ]
}
```

---

## 特殊规则

### 规则1: 严重违规强制人工审核

如果检测到`critical`级别违规（信息泄露/辱骂客户/越权操作）：
- 强制设置 `needHumanReview = true`
- overallScore强制降至<60分
- 推送紧急告警到管理层
- 暂停该客服的自动质检（改为100%人工审核）

### 规则2: VIP客户对话优先质检

如果对话涉及VIP客户：
- 质检优先级提升（24小时内完成）
- 评分标准更严格（compliance权重提升到30%）
- 必须生成详细质检报告

### 规则3: 新人客服宽容评分

如果客服入职<3个月：
- 评分标准放宽（各维度+5分容错空间）
- 更多改进建议，减少扣分
- 标注"新人培养期"

### 规则4: 质检抽样策略

**抽样比例**:
- 新人客服: 100%质检（前3个月）
- 普通客服: 20%随机抽检
- 优秀客服（平均分>90）: 10%抽检
- 问题客服（平均分<70）: 50%抽检
- VIP客户对话: 100%质检
- 投诉对话: 100%质检

### 规则5: 质检结果申诉机制

客服可以对质检结果提出申诉：
- 申诉理由必须具体（如"客户要求使用'你'而非'您'"）
- 人工复核申诉
- 如果申诉成立，更新质检结果并标注"已申诉"

---

## 边界与限制

### 不处理的场景

1. **客户行为评估**: "这个客户是不是故意刁难？" → 仅评估客服，不评估客户
2. **绩效考核决策**: "是否应该辞退这个客服？" → 仅提供数据，不做人事决策
3. **历史质检结果修改**: "能不能修改上周的质检分数？" → 拒绝，保证审计追溯
4. **敏感信息访问**: "查一下这个客服的工资" → 拒绝，权限不足

### 降级处理

- **LLM超时（>30秒）**: 降级到规则引擎评分（基于关键词匹配）
- **API错误**: 返回默认评分80分，标记需人工复核
- **证据不足**: 降低置信度，标记"证据不足，建议人工复核"

---

**重要**: 质检评分需要客观公正，基于事实和数据，避免主观臆断。严重违规必须推送人工审核，确保质量安全。
```

#### 2.3 版本Prompt Diff

> 本节仅在增量PRD中使用，基线PRD记录最终版本

**v0.5相对v0.1的变更**:
```diff
核心职责:
1. 对话质检
2. 规范检查
3. 违规识别
4. 质检评分
+ 5. 严重违规检测增强（信息泄露/辱骂客户/越权操作）

违规类型:
+ information_leakage: 信息泄露（critical级别）
+ abuse_language: 辱骂客户（critical级别）
+ unauthorized_operation: 越权操作（critical级别）
```

**v0.8相对v0.5的变更**:
```diff
核心职责:
1. 对话质检
2. 规范检查
3. 违规识别
4. 质检评分
5. 严重违规检测
+ 6. 改进建议生成（具体可执行）
+ 7. 团队对比分析（排名、趋势）

输出格式:
{
  "inspection": {...},
+ "improvements": [
+   {
+     "dimension": "professionalism",
+     "issue": "术语使用不准确",
+     "suggestion": "学习常见技术术语",
+     "priority": "high"
+   }
+ ]
}
```

**v1.0相对v0.8的变更**:
```diff
核心职责:
+ 8. 质检报告自动化（个人周报、团队月报）
+ 9. 趋势分析（月度对比、同比环比）

报告类型:
+ individual_weekly: 个人周报
+ team_monthly: 团队月报

新增功能:
+ 质检趋势分析（月度改进率、同比环比）
+ 最佳实践识别（高分对话案例）
+ 行动计划生成（actionItems）
```

---

### 3.3.3 工具清单

#### 工具1: inspectConversation

**功能描述**: 综合评估对话质量，生成5维度评分、违规检测和改进建议

**分类**: Review（审核类）

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 | 约束 | 默认值 |
|-------|------|------|------|------|--------|
| conversationId | string | 是 | 对话ID | UUID格式 | - |
| agentId | string | 是 | 客服ID | AGENT-格式 | - |
| includeEvidence | boolean | 否 | 是否包含评分依据 | - | true |
| strictMode | boolean | 否 | 是否严格模式（VIP客户） | - | false |

**输出格式**:
```json
{
  "success": true,
  "data": {
    "inspection": {
      "conversationId": "CONV-12345",
      "inspectorId": "InspectorAgent",
      "inspectedAt": "2025-12-29T10:00:00Z",
      "overallScore": 85,
      "scoreBreakdown": {
        "responseSpeed": 90,
        "professionalism": 85,
        "friendliness": 80,
        "compliance": 90,
        "resolutionRate": 75
      },
      "grade": "良好",
      "confidence": 0.92
    },
    "violations": [
      {
        "type": "terminology_violation",
        "severity": "low",
        "description": "未使用标准问候语",
        "evidence": "对话开头直接进入主题",
        "timestamp": "2025-12-29T10:01:23Z"
      }
    ],
    "highlights": [
      "响应速度快，30秒内首次回复",
      "专业术语使用准确"
    ],
    "improvements": [
      {
        "dimension": "friendliness",
        "issue": "语气略显生硬",
        "suggestion": "可以使用'非常理解您的心情'等共情话术",
        "priority": "medium"
      }
    ],
    "needHumanReview": false
  },
  "metadata": {
    "processingTime": 2.8,
    "model": "deepseek-v3.1",
    "evidenceCount": 5
  }
}
```

**字段说明**:
| 字段名 | 类型 | 说明 | 取值范围 |
|-------|------|------|---------| | overallScore | number | 综合评分 | 0-100 |
| scoreBreakdown | object | 5维度分数 | 各维度0-100 |
| grade | string | 等级 | 优秀/良好/合格/待改进/不合格 |
| violations | array | 违规列表 | 最多10条 |
| highlights | array | 亮点列表 | 最多5条 |
| improvements | array | 改进建议 | 最多5条 |

**调用方式**: MCP (Model Context Protocol)

**特性**:
- **多维度评分**: 5个维度独立评分，加权计算总分
- **证据支撑**: 每个评分点标注依据（对话片段）
- **违规识别**: 自动检测5类违规行为
- **改进建议**: 生成具体可执行的改进建议
- **严格模式**: VIP客户开启严格模式（合规性权重提升）

**注意事项**:
- 严重违规（critical）自动标记needHumanReview=true
- 新人客服（<3个月）自动宽容评分（+5分容错）
- VIP客户对话开启strictMode（评分标准更严格）
- 质检结果不可修改（保证审计追溯）

**调用示例**:
```json
// 请求
{
  "conversationId": "CONV-12345",
  "agentId": "AGENT-001",
  "includeEvidence": true,
  "strictMode": false
}

// 响应
{
  "success": true,
  "data": {
    "inspection": {
      "overallScore": 85,
      "scoreBreakdown": {
        "responseSpeed": 90,
        "professionalism": 85,
        "friendliness": 80,
        "compliance": 90,
        "resolutionRate": 75
      },
      "grade": "良好",
      "confidence": 0.92
    },
    "violations": [
      {
        "type": "terminology_violation",
        "severity": "low",
        "description": "未使用标准问候语"
      }
    ]
  }
}
```

---

#### 工具2: checkCompliance

**功能描述**: 检查服务规范遵守情况（问候语、结束语、敬语、禁用词）

**分类**: Review（审核类）

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| conversationId | string | 是 | 对话ID |
| checkRules | array | 否 | 指定检查规则 |

**输出格式**:
```json
{
  "success": true,
  "data": {
    "complianceScore": 90,
    "checkResults": [
      {
        "rule": "greeting_required",
        "passed": true,
        "evidence": "对话开头使用'您好'"
      },
      {
        "rule": "closing_required",
        "passed": false,
        "evidence": "缺少结束语",
        "penalty": -5
      }
    ],
    "totalViolations": 1,
    "overallCompliance": "良好"
  }
}
```

**调用方式**: MCP

**特性**:
- **规则引擎**: 基于预定义规则检查（5大类规范）
- **实时检测**: <1秒返回结果
- **扣分明细**: 每条违规明确扣分值

---

#### 工具3: scoreServiceQuality

**功能描述**: 服务质量综合评分（调用inspectConversation的简化版）

**分类**: Review（审核类）

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| conversationId | string | 是 | 对话ID |
| agentId | string | 是 | 客服ID |

**输出格式**:
```json
{
  "success": true,
  "data": {
    "overallScore": 85,
    "grade": "良好",
    "quickSummary": "响应快，专业度高，略显生硬"
  }
}
```

**调用方式**: MCP

---

#### 工具4: detectViolations

**功能描述**: 专项违规检测（信息泄露、辱骂、越权）

**分类**: Review（审核类）

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| conversationId | string | 是 | 对话ID |
| violationTypes | array | 否 | 指定检测类型 |

**输出格式**:
```json
{
  "success": true,
  "data": {
    "criticalViolations": [
      {
        "type": "information_leakage",
        "severity": "critical",
        "description": "泄露客户手机号",
        "evidence": "提及了138****1234",
        "timestamp": "2025-12-29T10:05:12Z"
      }
    ],
    "needImmediateAction": true,
    "recommendedAction": "立即停止该客服服务，启动安全审计"
  }
}
```

**调用方式**: MCP

**特性**:
- **实时监控**: 严重违规实时推送告警
- **证据保全**: 记录违规片段，支持审计
- **自动处理**: critical违规自动触发应急流程

---

#### 工具5: generateQualityReport

**功能描述**: 生成质检报告（个人周报、团队月报）

**分类**: Maintain（维护类）

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 | 约束 |
|-------|------|------|------|------|
| reportType | string | 是 | 报告类型 | individual_weekly/team_monthly |
| targetId | string | 是 | 目标ID（客服ID或团队ID） | - |
| startDate | string | 是 | 开始日期 | YYYY-MM-DD |
| endDate | string | 是 | 结束日期 | YYYY-MM-DD |
| includeComparison | boolean | 否 | 是否包含对比分析 | 默认true |

**输出格式**:
```json
{
  "success": true,
  "data": {
    "reportType": "individual_weekly",
    "agentId": "AGENT-001",
    "agentName": "张客服",
    "period": "2025-12-23 至 2025-12-29",
    "summary": {
      "totalConversations": 150,
      "inspectedConversations": 30,
      "averageScore": 85,
      "gradeDistribution": {
        "优秀": 10,
        "良好": 15,
        "合格": 4,
        "待改进": 1
      },
      "improvementRate": "+5分（相比上周）"
    },
    "dimensionScores": {
      "responseSpeed": 90,
      "professionalism": 82,
      "friendliness": 85,
      "compliance": 88,
      "resolutionRate": 80
    },
    "strengths": [
      "响应速度快，平均首次响应<1分钟"
    ],
    "weaknesses": [
      "专业度有待提升，术语使用偶有错误"
    ],
    "recommendations": [
      "加强专业培训，学习常见技术术语"
    ]
  }
}
```

**调用方式**: MCP

**特性**:
- **多报告类型**: 个人周报、团队月报
- **趋势分析**: 月度对比、同比环比
- **自动生成**: 定时任务自动生成（每周一/每月1日）
- **人工审核**: 报告生成后需人工审核确认

---

#### 工具6: recommendImprovement

**功能描述**: 生成质量改进建议（基于历史质检数据）

**分类**: Insight（洞察类）

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| agentId | string | 是 | 客服ID |
| timeRange | string | 否 | 时间范围（默认最近30天） |

**输出格式**:
```json
{
  "success": true,
  "data": {
    "improvements": [
      {
        "dimension": "professionalism",
        "issue": "术语使用不准确（5次错误）",
        "suggestion": "学习常见技术术语，每周复习3-5个",
        "priority": "high",
        "expectedImpact": "+10分"
      }
    ],
    "trainingRecommendations": [
      "参加技术术语培训课程",
      "阅读知识库高质量文档"
    ]
  }
}
```

**调用方式**: MCP

---

#### 工具7: compareTeamPerformance

**功能描述**: 团队质量对比分析（排名、趋势）

**分类**: Insight（洞察类）

**输入参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| teamId | string | 是 | 团队ID |
| period | string | 是 | 统计周期（week/month） |

**输出格式**:
```json
{
  "success": true,
  "data": {
    "teamRanking": [
      {"rank": 1, "agentName": "张客服", "averageScore": 92},
      {"rank": 2, "agentName": "李客服", "averageScore": 88}
    ],
    "teamAverageScore": 82,
    "topPerformers": ["张客服", "李客服"],
    "needImprovement": ["王客服"]
  }
}
```

**调用方式**: MCP

---

### 3.3.4 沉淀Skills

> 仅用于迭代版本（提炼上一版本已验证的功能）

#### 4.1 conversation_inspection_skill

**适用场景**: 对话结束后自动触发质检评分

**触发条件**: `ConversationEndedEvent`（对话结束事件）

**标准流程**:
1. 调用`inspectConversation()`对对话进行综合质检
2. 如果`overallScore<60`或存在`critical`违规，标记需人工审核
3. 推送质检结果到客服工作台（实时反馈）
4. 记录质检结果到数据库（供报告生成）
5. 如果检测到严重违规，推送告警到管理层

**质量门禁**:
- 质检准确率>90%（基于人工复核100条/周）
- 质检响应时间<3秒（P95）
- 误报率<5%（避免过度扣分）

**回滚策略**:
- **LLM超时**: 降级到规则引擎评分（基于关键词匹配）
- **API错误**: 返回默认评分80分，标记需人工复核
- **证据不足**: 降低置信度到0.5，标记"建议人工复核"

**可观测性**:
- 记录每次质检的评分分布（Prometheus histogram）
- 监控质检准确率（人工复核反馈）
- 统计违规类型分布（terminology/tone/leakage/abuse/unauthorized）

---

#### 4.2 violation_detection_skill

**适用场景**: 实时监控对话过程中的严重违规行为

**触发条件**: `MessageSentEvent`（客服发送消息事件）

**标准流程**:
1. 调用`detectViolations()`检测严重违规（信息泄露/辱骂/越权）
2. 如果检测到`critical`违规：
   - 立即推送告警到管理层（Slack + 邮件）
   - 标记该对话需100%人工复核
   - 触发安全审计流程
3. 记录违规证据（对话片段、时间戳）
4. 更新客服风险等级

**质量门禁**:
- 严重违规识别召回率>95%（不能漏报）
- 误报率<3%（避免误伤）
- 告警推送延迟<10秒

**回滚策略**:
- **模型不可用**: 基于敏感词库匹配（黑名单模式）
- **证据不足**: 标记"疑似违规，需人工确认"

**可观测性**:
- 监控每日严重违规数量
- 统计违规类型占比
- 跟踪误报率（人工复核反馈）

---

#### 4.3 quality_report_generation_skill

**适用场景**: 定期自动生成质检报告（个人周报、团队月报）

**触发条件**: `ScheduledEvent`（定时任务：每周一9:00、每月1日9:00）

**标准流程**:
1. 调用`generateQualityReport()`生成报告
2. 计算统计数据（平均分、等级分布、改进率）
3. 识别亮点和问题点
4. 生成改进建议
5. 人工审核报告（管理层确认）
6. 推送报告到客服邮箱 + 工作台

**质量门禁**:
- 报告生成成功率>99%
- 生成时间<5分钟（月报）
- 数据准确性100%

**回滚策略**:
- **数据不足**: 标记"数据不足，无法生成完整报告"
- **生成失败**: 降级到简化版报告（仅包含评分统计）

**可观测性**:
- 监控报告生成成功率
- 统计报告阅读率（客服查看次数）
- 跟踪改进建议采纳率

---

### 3.3.5 业务场景

#### 场景1: 常规对话质检（自动评分）

**场景描述**: 普通客服完成对话后，系统自动触发质检评分，生成5维度评分和改进建议

**触发条件**: 对话结束，且客服不是新人（入职>3个月），且不是VIP客户对话

**前置条件**:
- 对话已结束（状态=closed）
- 对话包含至少2轮消息
- 客服角色正常（非禁用）

**处理流程**:
```mermaid
sequenceDiagram
    System->>InspectorAgent: ConversationEndedEvent
    InspectorAgent->>MCP: inspectConversation()
    MCP-->>InspectorAgent: {overallScore: 85, violations: [...]}
    InspectorAgent->>Database: 保存质检结果
    InspectorAgent->>Frontend: WebSocket推送质检结果
    Frontend->>Agent: 展示质检卡片
```

**对话示例**:
```
【对话结束】
对话ID: CONV-12345
客服: 张客服
客户: 普通客户
对话时长: 5分钟
消息数: 8条

【InspectorAgent思考过程】

Step 1: 调用inspectConversation()
  → 输入: {
      conversationId: "CONV-12345",
      agentId: "AGENT-001",
      strictMode: false
    }

Step 2: 分析各维度
  - responseSpeed: 首次响应30秒，平均响应1分钟 → 90分
  - professionalism: 术语准确，方案可行 → 85分
  - friendliness: 礼貌但略显生硬 → 80分
  - compliance: 有问候语和结束语，但缺少共情 → 90分
  - resolutionRate: 客户表示"好的，谢谢" → 90分

Step 3: 计算综合评分
  overallScore = 90×0.15 + 85×0.30 + 80×0.20 + 90×0.25 + 90×0.10
              = 13.5 + 25.5 + 16 + 22.5 + 9
              = 86.5 → 87分

Step 4: 检测违规
  → 无严重违规
  → 发现1处轻微违规：未使用共情话术

Step 5: 生成改进建议
  → dimension: friendliness
  → suggestion: "针对客户'很着急'的表述，可以使用'非常理解您的心情'等共情话术"

【Agent输出】
{
  "inspection": {
    "conversationId": "CONV-12345",
    "overallScore": 87,
    "scoreBreakdown": {
      "responseSpeed": 90,
      "professionalism": 85,
      "friendliness": 80,
      "compliance": 90,
      "resolutionRate": 90
    },
    "grade": "良好",
    "confidence": 0.92
  },
  "violations": [
    {
      "type": "terminology_violation",
      "severity": "low",
      "description": "缺少共情话术",
      "evidence": "客户表示'很着急'时，未使用安抚性表述"
    }
  ],
  "highlights": [
    "响应速度快，30秒内首次回复",
    "专业术语使用准确",
    "问题解决及时"
  ],
  "improvements": [
    {
      "dimension": "friendliness",
      "issue": "共情表达较少",
      "suggestion": "针对客户负面情绪，主动使用'非常理解您的心情'等共情话术",
      "priority": "medium"
    }
  ],
  "needHumanReview": false
}

【前端展示】
┌─────────────────────────────────────┐
│ 质检结果 - CONV-12345                │
├─────────────────────────────────────┤
│ 综合评分：87分（良好）✅             │
│                                      │
│ 📊 维度评分：                        │
│ • 响应速度：90分 ⚡                  │
│ • 专业度：85分 📚                    │
│ • 友好度：80分 😊                    │
│ • 规范性：90分 ✓                     │
│ • 解决率：90分 ✔️                    │
│                                      │
│ 🌟 亮点：                            │
│ • 响应速度快，30秒内首次回复         │
│ • 专业术语使用准确                   │
│                                      │
│ ⚠️ 待改进：                          │
│ • 共情表达较少（-3分）               │
│   建议：使用'非常理解您的心情'等     │
│   共情话术                           │
│                                      │
│ [查看详情] [申诉]                    │
└─────────────────────────────────────┘

【客服操作】
查看质检结果 → 接受改进建议 → 下次对话改进
```

**预期输出**:
- 综合评分准确（±5分误差）
- 维度评分合理（各维度符合实际表现）
- 改进建议具体可执行
- 客服接受度>80%

**异常分支**:
| 异常情况 | 处理方式 |
|---------|---------|
| LLM超时 | 降级到规则引擎评分 |
| 对话过短（<2轮） | 标记"对话过短，无法准确评分" |
| 证据不足 | 降低置信度到0.6，建议人工复核 |

**成功标准**:
- ✅ 质检准确率>90%
- ✅ 响应时间<3秒（P95）
- ✅ 客服采纳率>70%

---

#### 场景2: 严重违规检测（信息泄露）

**场景描述**: 客服在对话中泄露客户敏感信息，系统实时检测并立即告警

**触发条件**: 客服发送消息，包含敏感词（身份证号、密码、其他客户信息）

**处理流程**:
```mermaid
sequenceDiagram
    Agent->>System: 发送消息"您的身份证号是..."
    System->>InspectorAgent: MessageSentEvent
    InspectorAgent->>MCP: detectViolations()
    MCP-->>InspectorAgent: {criticalViolations: [information_leakage]}
    InspectorAgent->>AlertService: 推送紧急告警
    AlertService->>Manager: Slack通知 + 邮件通知
    InspectorAgent->>System: 标记对话需100%人工审核
```

**对话示例**:
```
【客服发送消息】
"您好，您的身份证号是320XXX198X0X0XXXXX，请核对一下"

【InspectorAgent思考过程】

Step 1: 实时监控MessageSentEvent
  → 消息内容: "您好，您的身份证号是320XXX..."

Step 2: 调用detectViolations()
  → 敏感词匹配: 检测到"身份证号"
  → 格式识别: 检测到18位数字（身份证格式）
  → 判断: information_leakage（信息泄露）

Step 3: 评估严重性
  → severity: critical（严重）
  → 风险: 客户隐私泄露
  → 处理: 立即告警

Step 4: 推送告警
  → Slack: "@管理层 🔴 严重违规：客服AGENT-001泄露客户身份证号"
  → 邮件: "紧急：质检发现信息泄露违规"
  → 标记: 该对话需100%人工审核

【Agent输出】
{
  "criticalViolations": [
    {
      "type": "information_leakage",
      "severity": "critical",
      "description": "泄露客户身份证号",
      "evidence": "提及了完整身份证号320XXX198X0X0XXXXX",
      "timestamp": "2025-12-29T10:05:12Z",
      "agentId": "AGENT-001",
      "conversationId": "CONV-67890"
    }
  ],
  "needImmediateAction": true,
  "recommendedAction": "立即停止该客服服务，启动安全审计",
  "overallScore": 0,
  "needHumanReview": true
}

【前端展示】
┌─────────────────────────────────────┐
│ 🔴 严重违规告警                      │
├─────────────────────────────────────┤
│ 违规类型：信息泄露（critical）        │
│ 违规客服：张客服（AGENT-001）         │
│ 对话ID：CONV-67890                   │
│                                      │
│ 违规描述：                            │
│ 泄露客户身份证号                      │
│                                      │
│ 证据：                               │
│ "您的身份证号是320XXX198X0X0XXXXX"   │
│                                      │
│ 处理建议：                            │
│ 1. 立即停止该客服服务                 │
│ 2. 启动安全审计流程                   │
│ 3. 联系客户说明情况并道歉             │
│                                      │
│ [立即处理] [查看详情]                 │
└─────────────────────────────────────┘

【管理层操作】
收到告警 → 查看证据 → 确认违规 → 停止服务 → 安全审计 → 客户道歉
```

**成功标准**:
- ✅ 严重违规识别召回率>95%
- ✅ 告警推送延迟<10秒
- ✅ 误报率<3%

---

#### 场景3: 质检周报生成（个人周报）

**场景描述**: 每周一自动生成客服个人质检周报，包含评分统计、亮点问题、改进建议

**触发条件**: 定时任务（每周一9:00）

**对话示例**:
```
【定时任务触发】
时间: 2025-12-30 09:00
任务: 生成上周（12-23至12-29）个人质检周报

【InspectorAgent思考过程】

Step 1: 调用generateQualityReport()
  → reportType: individual_weekly
  → targetId: AGENT-001（张客服）
  → period: 2025-12-23 至 2025-12-29

Step 2: 统计数据
  → 总对话数: 150
  → 质检对话数: 30（随机抽检20%）
  → 平均分: 85（相比上周+5分）
  → 等级分布: 优秀10、良好15、合格4、待改进1

Step 3: 分析亮点和问题
  → 亮点: 响应速度快（平均<1分钟）、服务态度友好
  → 问题: 专业度不足（术语使用错误5次）、规范性待提升

Step 4: 生成改进建议
  → 建议1: 学习常见技术术语
  → 建议2: 使用质检模板确保标准话术

【报告内容】
{
  "reportType": "individual_weekly",
  "agentId": "AGENT-001",
  "agentName": "张客服",
  "period": "2025-12-23 至 2025-12-29",
  "summary": {
    "totalConversations": 150,
    "inspectedConversations": 30,
    "averageScore": 85,
    "gradeDistribution": {
      "优秀": 10,
      "良好": 15,
      "合格": 4,
      "待改进": 1
    },
    "improvementRate": "+5分（相比上周）"
  },
  "dimensionScores": {
    "responseSpeed": 90,
    "professionalism": 82,
    "friendliness": 85,
    "compliance": 88,
    "resolutionRate": 80
  },
  "strengths": [
    "响应速度快，平均首次响应<1分钟",
    "服务态度友好，客户满意度高"
  ],
  "weaknesses": [
    "专业度有待提升，术语使用偶有错误（5次）",
    "规范性不足，偶尔缺少结束语（3次）"
  ],
  "topIssues": [
    {
      "issue": "术语使用不准确",
      "frequency": 5,
      "example": "CONV-12345: 将'数据库连接池'说成'数据库连接'"
    }
  ],
  "recommendations": [
    "加强专业培训，学习常见技术术语（提供术语表链接）",
    "使用质检模板，确保每次对话包含标准话术"
  ]
}

【前端展示】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 质检周报（12月23日-12月29日）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 客服：张客服（AGENT-001）

📈 整体表现：
• 平均分：85分（良好）↗️ +5分
• 质检对话：30/150（20%抽检）
• 等级分布：
  - 优秀：10次 (33%)
  - 良好：15次 (50%)
  - 合格：4次 (13%)
  - 待改进：1次 (3%)

📊 维度评分：
• 响应速度：90分 ⚡
• 专业度：82分 📚
• 友好度：85分 😊
• 规范性：88分 ✓
• 解决率：80分 ✔️

🌟 本周亮点：
• 响应速度快，平均首次响应<1分钟
• 服务态度友好，客户满意度高

⚠️ 待改进问题：
1. 专业度有待提升（5次术语错误）
   示例：CONV-12345 将"数据库连接池"
   说成"数据库连接"

2. 规范性不足（3次缺少结束语）

💡 改进建议：
1. 加强专业培训，学习常见技术术语
   [查看术语表]

2. 使用质检模板，确保标准话术
   [查看模板]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【客服操作】
阅读周报 → 查看改进建议 → 学习术语表 → 下周改进
```

**成功标准**:
- ✅ 报告生成成功率>99%
- ✅ 数据准确性100%
- ✅ 客服阅读率>80%

---

### 3.3.6 人机协作边界

#### 6.1 Agent主导场景（高自动化）

**适用条件**:
- 常规对话质检（非VIP客户、非投诉对话）
- 无严重违规（critical级别）
- 客服非新人（入职>3个月）
- 评分置信度>0.8

**Agent行为**:
1. 自动对对话进行5维度质检评分
2. 识别违规行为（轻度/中度）
3. 生成改进建议
4. **v0.1-v0.5**: 质检结果推送到客服工作台，需人工确认
5. **v0.8**: 质检结果自动保存，客服可申诉
6. **v1.0**: 自动生成质检报告（周报/月报），人工审核后发送

**自动化率目标**:
- **v0.1**: 100%自动质检（人工可查看结果）
- **v0.5**: 100%自动质检 + 人工抽检10%
- **v0.8**: 100%自动质检 + 自动报告生成
- **v1.0**: 100%自动质检 + 自动报告 + 趋势分析

**示例**:
```
场景：普通客服完成一次常规对话
→ 质检评分：85分
→ 置信度：0.92
→ 违规：无
→ Agent行为：自动保存质检结果，推送到客服工作台
→ 客服行为：查看结果，接受改进建议
```

---

#### 6.2 人工主导场景（低自动化）

**适用条件**:
- 严重违规（critical级别：信息泄露/辱骂/越权）
- VIP客户投诉对话
- 新人客服（入职<1个月）前10次对话
- 质检结果申诉
- 质检报告最终审核

**Agent行为**:
1. 提供初步质检评分（仅供参考）
2. 标注疑似违规行为（需人工确认）
3. 生成改进建议（辅助）
4. **永远需要人工确认，不自动保存**
5. 严重违规推送告警到管理层

**自动化率目标**:
- **所有版本**: 0%自动决策（刻意保持人工）

**示例**:
```
场景：客服泄露客户身份证号
→ 违规类型：information_leakage（critical）
→ Agent行为：
   - 实时检测并推送告警
   - 提供证据片段
   - 建议"立即停止服务，启动安全审计"
→ 管理层行为：
   - 查看证据
   - 人工确认违规
   - 决定处罚措施
   - 启动安全审计流程
```

---

#### 6.3 协作模式（Agent辅助，人工决策）

**适用条件**:
- 中度违规（tone_violation，语气生硬）
- 评分争议（客服申诉质检结果）
- 质检报告生成（Agent生成，人工审核）
- 改进建议执行（Agent建议，人工选择）

**Agent行为**:
1. 生成质检评分和依据
2. 提供多个改进建议（3-5条）
3. 人工选择采纳哪些建议
4. 人工调整评分（如有申诉）

**决策流程**:
```
Agent质检 → 人工审核 → 人工调整（可选）→ 确认保存
```

**示例**:
```
场景：客服质检评分为78分，客服提出申诉
→ Agent评分：78分
→ 申诉理由："客户要求使用'你'而非'您'，所以我改用了'你'"
→ Agent提供证据：对话中确实有客户说"别您您您的，叫我小李就行"
→ 人工复核：
   - 查看证据
   - 判断：申诉成立
   - 调整评分：78 → 85（compliance维度+7分）
→ 标注："已申诉，人工调整"
```

---

### 3.3.7 非功能需求

#### 7.1 性能要求

| 指标 | 目标值 | 测量方法 |
|-----|--------|------------|
| **Agent响应时间** | <3秒（P95） | Prometheus监控LLM调用时长 |
| **质检评分时间** | <2秒（简单对话） | inspectConversation调用时长 |
| **违规检测时间** | <1秒（实时） | detectViolations调用时长 |
| **报告生成时间** | <5分钟（月报） | generateQualityReport调用时长 |
| **并发处理能力** | 支持100+并发质检 | 压力测试验证 |

#### 7.2 质量指标

| 指标 | 目标值 | 测量方法 |
|-----|--------|---------| | **质检准确率** | >90% | 人工抽检100条/周，对比标注 |
| **严重违规识别召回率** | >95% | 不能漏报critical违规 |
| **误报率** | <5% | 避免过度扣分 |
| **客服采纳率** | >70% | 改进建议被采纳的比例 |
| **申诉成功率** | 10-15% | 合理的申诉成功率（不能太高或太低） |

#### 7.3 成本约束

| 指标 | 目标值 | 测量方法 |
|-----|--------|---------| | **LLM调用成本** | <¥3000/月 | DeepSeek计费统计 |
| **平均单次质检成本** | <¥0.02/次 | 成本/质检次数 |
| **Token消耗** | <50k tokens/天 | 监控每次调用的token数 |

**成本优化策略**:
- 优先使用规则引擎处理简单场景（问候语检查、禁用词匹配）
- LLM仅用于复杂评分（专业度、友好度）
- 批量质检，减少API调用

#### 7.4 可用性要求

| 指标 | 目标值 | 说明 |
|-----|--------|------|
| **系统可用性** | >99.9% | 降级策略保障 |
| **降级触发率** | <10% | 降级到规则引擎的比例 |
| **故障恢复时间** | <5分钟 | 从故障到恢复正常的时间 |
| **数据一致性** | 100% | 质检结果不可篡改（审计追溯） |

---

### 3.3.8 验收场景

#### 8.1 验收场景清单

| 场景ID | 场景描述 | 优先级 | 依赖 |
|--------|---------|--------|------| | AC-01 | 常规对话质检（自动评分） | P0 | 无 |
| AC-02 | 严重违规检测（信息泄露） | P0 | AC-01 |
| AC-03 | 服务规范检查（问候语/结束语） | P0 | AC-01 |
| AC-04 | 质检周报生成（个人周报） | P1 | AC-01 |
| AC-05 | 质检结果申诉 | P1 | AC-01 |
| AC-06 | 团队质量对比分析 | P1 | AC-04 |
| AC-07 | 降级到规则引擎 | P1 | AC-01 |

---

#### AC-01: 常规对话质检（自动评分）

**场景描述**: 普通客服完成对话后，系统自动触发质检评分，生成5维度评分和改进建议

**输入**:
```json
{
  "conversationId": "CONV-12345",
  "agentId": "AGENT-001",
  "strictMode": false
}
```

**预期Agent输出**:
```json
{
  "inspection": {
    "conversationId": "CONV-12345",
    "overallScore": 85,
    "scoreBreakdown": {
      "responseSpeed": 90,
      "professionalism": 85,
      "friendliness": 80,
      "compliance": 90,
      "resolutionRate": 75
    },
    "grade": "良好",
    "confidence": 0.92
  },
  "violations": [
    {
      "type": "terminology_violation",
      "severity": "low",
      "description": "未使用标准问候语"
    }
  ],
  "highlights": [
    "响应速度快，30秒内首次回复"
  ],
  "improvements": [
    {
      "dimension": "friendliness",
      "issue": "语气略显生硬",
      "suggestion": "可以使用'非常理解您的心情'等共情话术",
      "priority": "medium"
    }
  ],
  "needHumanReview": false
}
```

**验收标准**:
- ✅ overallScore在80-90分范围
- ✅ scoreBreakdown包含5个维度
- ✅ grade识别为"良好"
- ✅ violations识别轻度违规
- ✅ improvements提供具体建议
- ✅ 响应时间<3秒

---

#### AC-02: 严重违规检测（信息泄露）

**场景描述**: 客服在对话中泄露客户身份证号，系统实时检测并立即告警

**输入**:
```json
{
  "conversationId": "CONV-67890",
  "message": "您的身份证号是320XXX198X0X0XXXXX"
}
```

**预期Agent输出**:
```json
{
  "criticalViolations": [
    {
      "type": "information_leakage",
      "severity": "critical",
      "description": "泄露客户身份证号",
      "evidence": "提及了完整身份证号320XXX..."
    }
  ],
  "needImmediateAction": true,
  "recommendedAction": "立即停止该客服服务，启动安全审计",
  "needHumanReview": true
}
```

**验收标准**:
- ✅ type识别为"information_leakage"
- ✅ severity识别为"critical"
- ✅ needHumanReview=true
- ✅ 告警推送延迟<10秒
- ✅ 告警内容包含证据片段

---

#### AC-03: 服务规范检查（问候语/结束语）

**场景描述**: 检查对话是否包含标准问候语和结束语

**输入**:
```json
{
  "conversationId": "CONV-11111"
}
```

**预期Agent输出**:
```json
{
  "complianceScore": 85,
  "checkResults": [
    {
      "rule": "greeting_required",
      "passed": true,
      "evidence": "对话开头使用'您好'"
    },
    {
      "rule": "closing_required",
      "passed": false,
      "evidence": "缺少结束语",
      "penalty": -5
    }
  ],
  "totalViolations": 1
}
```

**验收标准**:
- ✅ greeting_required规则检测正确
- ✅ closing_required规则检测正确
- ✅ penalty扣分合理（-5分）
- ✅ 响应时间<1秒

---

#### AC-04: 质检周报生成（个人周报）

**场景描述**: 每周一自动生成客服个人质检周报

**输入**:
```json
{
  "reportType": "individual_weekly",
  "targetId": "AGENT-001",
  "startDate": "2025-12-23",
  "endDate": "2025-12-29"
}
```

**预期Agent输出**:
```json
{
  "reportType": "individual_weekly",
  "agentName": "张客服",
  "period": "2025-12-23 至 2025-12-29",
  "summary": {
    "totalConversations": 150,
    "inspectedConversations": 30,
    "averageScore": 85,
    "improvementRate": "+5分"
  },
  "dimensionScores": {
    "responseSpeed": 90,
    "professionalism": 82
  },
  "strengths": ["响应速度快"],
  "weaknesses": ["专业度有待提升"],
  "recommendations": ["加强专业培训"]
}
```

**验收标准**:
- ✅ 统计数据准确（对话数、平均分）
- ✅ improvementRate计算正确
- ✅ strengths和weaknesses合理
- ✅ recommendations具体可执行
- ✅ 生成时间<5分钟

---

#### AC-05: 质检结果申诉

**场景描述**: 客服对质检结果提出申诉，人工复核并调整评分

**输入**:
```json
{
  "conversationId": "CONV-22222",
  "originalScore": 78,
  "appealReason": "客户要求使用'你'而非'您'"
}
```

**预期结果**:
- 人工查看证据
- 确认申诉理由成立
- 调整评分：78 → 85
- 标注"已申诉，人工调整"

**验收标准**:
- ✅ 申诉流程完整
- ✅ 证据可追溯
- ✅ 调整记录可查
- ✅ 申诉成功率10-15%

---

#### AC-06: 团队质量对比分析

**场景描述**: 对比团队内客服的质检表现，生成排名

**输入**:
```json
{
  "teamId": "TEAM-001",
  "period": "month"
}
```

**预期Agent输出**:
```json
{
  "teamRanking": [
    {"rank": 1, "agentName": "张客服", "averageScore": 92},
    {"rank": 2, "agentName": "李客服", "averageScore": 88}
  ],
  "teamAverageScore": 82,
  "topPerformers": ["张客服"],
  "needImprovement": ["王客服"]
}
```

**验收标准**:
- ✅ 排名准确
- ✅ 平均分计算正确
- ✅ topPerformers和needImprovement合理

---

### 3.3.9 降级策略

#### 9.1 降级层级

```
主路径: LLM质检 (DeepSeek v3.1)
  ↓ [超时30秒 / API调用失败 / 错误率>10%]
降级1: 规则引擎评分（基于关键词+规则）
  ↓ [规则无覆盖]
降级2: 默认评分80分（标记需人工复核）
  ↓ [严重故障]
降级3: 暂停质检（人工介入）
```

---

#### 9.2 质检评分降级策略

**主路径: LLM质检**

- **触发条件**: 正常情况
- **行为**: 调用DeepSeek v3.1分析对话质量，5维度评分
- **输出**: `{overallScore: 85, scoreBreakdown: {...}, confidence: 0.92}`
- **处理时间**: <3秒

**降级1: 规则引擎评分**

- **触发条件**:
  - LLM超时（>30秒）
  - API调用失败（返回5xx错误）
  - LLM连续10次错误率>10%
- **行为**:
  - 响应速度：计算实际响应时间，映射到分数
  - 专业度：关键词匹配（技术术语使用情况）
  - 友好度：礼貌用语统计（"您好"、"感谢"）
  - 规范性：规则引擎检查（问候语、结束语、禁用词）
  - 解决率：客户反馈识别（"好的"、"谢谢" → 高分）
- **输出**: `{overallScore: 78, confidence: 0.6, fallbackLevel: 1}`
- **置信度**: 0.5-0.7
- **处理时间**: <500ms

**降级2: 默认评分**

- **触发条件**: 规则引擎无法计算评分
- **行为**: 返回默认评分80分，标记需人工复核
- **输出**: `{overallScore: 80, confidence: 0.3, fallbackLevel: 2, needHumanReview: true}`

**降级3: 暂停质检**

- **触发条件**: 系统严重故障
- **行为**: 暂停自动质检，100%人工质检
- **通知**: 推送告警到技术负责人

---

#### 9.3 降级监控

| 监控指标 | 告警阈值 | 处理措施 |
|---------|---------|---------| | **LLM超时率** | >5%（每小时） | 检查LLM服务状态，增加超时时间 |
| **降级1触发率** | >10%（每小时） | 优化Prompt，扩容LLM服务 |
| **降级2触发率** | >5%（每小时） | 扩充规则库 |
| **降级3触发率** | >0%（立即） | 紧急告警，人工介入 |
| **质检准确率** | <85% | 优化评分算法，调整权重 |

**告警通知**:
- 降级1触发>100次/小时 → Slack告警
- 降级2触发>50次/小时 → 邮件通知
- 降级3触发 → 紧急电话通知

**降级恢复**:
- LLM服务恢复后自动切回主路径
- 每5分钟健康检查一次
- 连续3次成功后恢复正常

---

### 3.3.10 监控指标

#### 10.1 核心指标

| 指标名称 | 指标定义 | 监控工具 | 告警阈值 | 优先级 |
|---------|---------|---------|---------|--------|
| **质检调用次数** | 每小时调用量 | Prometheus | >500次/小时 | P1 |
| **质检成功率** | 成功质检/总调用 | Prometheus | <95% | P0 |
| **平均质检时间** | P95质检时长 | Prometheus | >3秒 | P0 |
| **质检准确率** | 人工抽检准确率 | 人工标注 | <90% | P0 |
| **严重违规识别率** | 识别/实际严重违规 | Prometheus | <95% | P0 |
| **降级触发次数** | 降级到规则引擎次数 | Prometheus | >50次/小时 | P1 |
| **报告生成成功率** | 成功生成/总任务 | Prometheus | <99% | P1 |
| **客服采纳率** | 采纳建议/总建议 | Prometheus | <70% | P2 |
| **申诉成功率** | 申诉成功/总申诉 | Prometheus | >30% OR <5% | P2 |

---

#### 10.2 Prometheus指标定义

```promql
# ===== 质检调用 =====

# 质检调用总次数
inspector_agent_inspection_total{
  agent="InspectorAgent",
  result="success|failure|timeout"
} counter

# 质检响应时间
inspector_agent_inspection_duration_seconds{
  agent="InspectorAgent",
  inspection_type="conversation|compliance|violation"
} histogram

# ===== 质检评分 =====

# 质检评分分布
inspector_agent_score_distribution{
  agent="InspectorAgent",
  bucket="0-60|60-70|70-80|80-90|90-100"
} gauge

# 维度评分平均值
inspector_agent_dimension_score{
  agent="InspectorAgent",
  dimension="responseSpeed|professionalism|friendliness|compliance|resolutionRate"
} gauge

# ===== 违规检测 =====

# 违规检测总次数
inspector_agent_violations_detected{
  agent="InspectorAgent",
  type="terminology|tone|leakage|abuse|unauthorized",
  severity="low|medium|critical"
} counter

# 严重违规识别率
inspector_agent_critical_violation_recall{
  agent="InspectorAgent"
} gauge

# ===== 降级监控 =====

# 降级触发次数
inspector_agent_fallback_triggered{
  agent="InspectorAgent",
  fallback_level="1|2|3",
  reason="llm_timeout|api_error|rule_no_match"
} counter

# ===== 报告生成 =====

# 报告生成次数
inspector_agent_reports_generated{
  agent="InspectorAgent",
  report_type="individual_weekly|team_monthly",
  result="success|failure"
} counter

# 报告生成时间
inspector_agent_report_generation_duration_seconds{
  agent="InspectorAgent",
  report_type="individual_weekly|team_monthly"
} histogram

# ===== 业务指标 =====

# 改进建议采纳率
inspector_agent_recommendation_adopted{
  agent="InspectorAgent"
} counter

inspector_agent_recommendation_rejected{
  agent="InspectorAgent"
} counter

# 申诉成功率
inspector_agent_appeals_total{
  agent="InspectorAgent",
  result="approved|rejected"
} counter
```

---

#### 10.3 Grafana仪表板

**仪表板名称**: InspectorAgent - 质检监控

**刷新频率**: 30秒

---

**Row 1: 核心指标概览**

**面板1.1: 质检调用量趋势（折线图）**
- X轴: 时间（最近24小时）
- Y轴: 调用次数/小时
- 系列:
  - 成功质检（绿色）
  - 失败质检（红色）
  - 超时质检（橙色）

**面板1.2: 质检成功率（Stat面板）**
- 显示值: 百分比
- 阈值:
  - <90%: 红色
  - 90-95%: 橙色
  - >95%: 绿色

**面板1.3: 平均质检时间（Gauge仪表盘）**
- 单位: 秒
- 阈值:
  - <2秒: 绿色
  - 2-3秒: 橙色
  - >3秒: 红色

**面板1.4: 质检准确率（Stat面板）**
- 显示值: 百分比
- 阈值:
  - <85%: 红色
  - 85-90%: 橙色
  - >90%: 绿色

---

**Row 2: 质检评分分析**

**面板2.1: 评分分布（饼图）**
- 系列:
  - 90-100分（优秀，绿色）
  - 80-89分（良好，蓝色）
  - 70-79分（合格，黄色）
  - 60-69分（待改进，橙色）
  - 0-59分（不合格，红色）

**面板2.2: 维度评分趋势（折线图）**
- X轴: 时间（最近7天）
- Y轴: 平均分
- 系列:
  - 响应速度（蓝色）
  - 专业度（绿色）
  - 友好度（黄色）
  - 规范性（橙色）
  - 解决率（紫色）

**面板2.3: 平均质检分数（Stat面板）**
- 显示值: 分数（0-100）
- 阈值:
  - <70: 红色
  - 70-80: 橙色
  - >80: 绿色

---

**Row 3: 违规监控**

**面板3.1: 违规类型分布（柱状图）**
- X轴: 违规类型
- Y轴: 检测次数
- 系列:
  - terminology（术语违规，蓝色）
  - tone（语气违规，黄色）
  - leakage（信息泄露，红色）
  - abuse（辱骂客户，深红色）
  - unauthorized（越权操作，紫色）

**面板3.2: 严重违规趋势（折线图）**
- X轴: 时间（最近30天）
- Y轴: 违规次数
- 系列:
  - information_leakage（红色）
  - abuse_language（深红色）
  - unauthorized_operation（紫色）

**面板3.3: 严重违规识别率（Gauge仪表盘）**
- 单位: 百分比
- 阈值:
  - <90%: 红色
  - 90-95%: 橙色
  - >95%: 绿色

---

**Row 4: 报告生成监控**

**面板4.1: 报告生成成功率（Stat面板）**
- 显示值: 百分比
- 阈值:
  - <95%: 红色
  - 95-99%: 橙色
  - >99%: 绿色

**面板4.2: 报告生成时间（折线图）**
- X轴: 时间
- Y轴: 生成时间（秒）
- 系列:
  - 个人周报（蓝色）
  - 团队月报（绿色）

**面板4.3: 本周报告统计（Table表格）**
- 列: 报告类型、生成数量、成功率、平均时间

---

**Row 5: 业务分析**

**面板5.1: 改进建议采纳率（折线图）**
- X轴: 时间（最近30天）
- Y轴: 采纳率（百分比）
- 阈值线: 70%（目标线，绿色虚线）

**面板5.2: 申诉统计（柱状图）**
- X轴: 时间（周）
- Y轴: 申诉数量
- 系列:
  - 申诉成功（绿色）
  - 申诉失败（红色）

**面板5.3: 客服质检排名（Table表格）**
- 列: 排名、客服姓名、平均分、本周对话数、趋势（↗️/↘️）

---

### 3.3.11 示例对话

#### 示例1: 优秀对话质检（高分案例）

**对话背景**: 客服专业处理VIP客户故障问题，获得高质检分数

```
【对话内容】

客户: "系统又打不开了，太烂了，影响我工作！"

客服: "尊敬的用户，您好！非常抱歉给您带来困扰，我能理解您现在很着急。"
客服: "我立即帮您排查问题。请问您使用的是什么版本的系统？"

客户: "2.5版本"

客服: "好的，感谢您的配合。2.5版本最近确实有部分用户反馈登录问题，我们已经在紧急修复中。"
客服: "请您先尝试清除浏览器缓存，具体操作：按Ctrl+Shift+Delete，选择'缓存图像和文件'，然后点击'清除数据'。"

客户: "好，试试"
（2分钟后）

客户: "可以了，谢谢"

客服: "太好了！问题解决让我也很开心。如果后续还有任何问题，欢迎随时联系我。祝您工作顺利！"

【InspectorAgent思考过程】

Step 1: 调用inspectConversation()
  → conversationId: CONV-99999
  → agentId: AGENT-001（张客服）
  → strictMode: true（VIP客户）

Step 2: 分析各维度

**响应速度**:
- 首次响应: 25秒 → 优秀
- 后续响应: 平均40秒 → 优秀
- 评分: 95分

**专业度**:
- 术语准确: "清除浏览器缓存"、"Ctrl+Shift+Delete"
- 方案可行: 确实能解决问题
- 知识扎实: 了解2.5版本的已知问题
- 评分: 95分

**友好度**:
- 共情表达: "非常抱歉"、"我能理解您现在很着急"
- 礼貌用语: "尊敬的用户"、"感谢您的配合"
- 个性化关怀: "问题解决让我也很开心"
- 评分: 98分

**规范性**:
- ✅ 问候语: "尊敬的用户，您好"（VIP标准）
- ✅ 结束语: "欢迎随时联系我。祝您工作顺利"
- ✅ 敬语: 全程使用"您"
- ✅ 无禁用词
- 评分: 100分

**解决率**:
- 客户明确表示"可以了，谢谢"
- 问题彻底解决
- 评分: 95分

Step 3: 计算综合评分
  overallScore = 95×0.15 + 95×0.30 + 98×0.20 + 100×0.25 + 95×0.10
              = 14.25 + 28.5 + 19.6 + 25 + 9.5
              = 96.85 → 97分

Step 4: 检测违规
  → 无任何违规

Step 5: 识别亮点
  - VIP客户处理规范（使用敬语、及时响应）
  - 共情表达到位（安抚负面情绪）
  - 专业度高（准确诊断+可行方案）

【Agent输出】
{
  "inspection": {
    "conversationId": "CONV-99999",
    "overallScore": 97,
    "scoreBreakdown": {
      "responseSpeed": 95,
      "professionalism": 95,
      "friendliness": 98,
      "compliance": 100,
      "resolutionRate": 95
    },
    "grade": "优秀",
    "confidence": 0.95
  },
  "violations": [],
  "highlights": [
    "VIP客户处理规范，使用尊称和敬语",
    "共情表达到位，有效安抚客户负面情绪",
    "专业度高，准确诊断问题并提供可行方案",
    "响应速度快，首次响应<30秒",
    "服务态度优秀，获客户高度评价"
  ],
  "improvements": [],
  "needHumanReview": false
}

【前端展示】
┌─────────────────────────────────────┐
│ 🌟 优秀案例 - CONV-99999             │
├─────────────────────────────────────┤
│ 综合评分：97分（优秀）⭐⭐⭐⭐⭐     │
│                                      │
│ 📊 维度评分：                        │
│ • 响应速度：95分 ⚡⚡⚡⚡⚡          │
│ • 专业度：95分 📚📚📚📚📚           │
│ • 友好度：98分 😊😊😊😊😊           │
│ • 规范性：100分 ✓✓✓✓✓               │
│ • 解决率：95分 ✔️✔️✔️✔️✔️            │
│                                      │
│ 🌟 本次亮点：                        │
│ • VIP客户处理规范                    │
│ • 共情表达到位，有效安抚负面情绪     │
│ • 专业度高，准确诊断并解决问题       │
│                                      │
│ 💡 建议：                            │
│ 本次对话表现优秀，建议作为培训案例   │
│                                      │
│ [分享案例] [查看详情]                │
└─────────────────────────────────────┘

【管理层操作】
标记为最佳实践案例 → 用于团队培训 → 表扬张客服
```

**关键决策点**:
1. **为什么overallScore=97分**:
   - 5个维度全部>90分（均为优秀级别）
   - compliance达到满分100（VIP规范完全遵守）
   - friendliness高达98分（共情表达优秀）

2. **为什么friendliness=98分**:
   - 使用共情话术（"非常抱歉"、"我能理解您现在很着急"）
   - 个性化关怀（"问题解决让我也很开心"）
   - VIP标准问候（"尊敬的用户，您好"）

3. **为什么标记为最佳实践**:
   - 综合评分>95分
   - VIP客户处理
   - 负面情绪成功转化为满意
   - 适合作为培训案例

---

#### 示例2: 违规对话质检（信息泄露）

**对话背景**: 客服不慎泄露客户身份证号，触发严重违规告警

```
【对话内容】

客户: "我需要办理退款，你们需要什么材料？"

客服: "您好！退款需要提供订单号和身份证号。"

客户: "订单号是12345678"

客服: "好的，您的身份证号是320XXX198X0X0XXXXX，对吗？请核对一下"

【InspectorAgent思考过程】

Step 1: 实时监控MessageSentEvent
  → 客服发送消息: "好的，您的身份证号是320XXX198X0X0XXXXX，对吗？"
  → 触发时间: 2025-12-29T10:05:12Z

Step 2: 调用detectViolations()
  → 敏感词匹配: 检测到"身份证号"
  → 格式识别: 检测到18位数字（320XXX198X0X0XXXXX）
  → 判断: information_leakage（信息泄露）
  → 严重性: critical（严重）

Step 3: 立即触发告警
  → Slack通知: "@管理层 🔴 严重违规：客服AGENT-002泄露客户身份证号"
  → 邮件通知: "紧急：质检发现信息泄露违规，涉及客服李客服"
  → 标记: 该对话需100%人工审核
  → 暂停: 该客服自动质检改为100%人工审核

Step 4: 生成质检结果
  → overallScore: 0（强制降至0分）
  → needHumanReview: true
  → recommendedAction: "立即停止服务，启动安全审计"

【Agent输出】
{
  "criticalViolations": [
    {
      "type": "information_leakage",
      "severity": "critical",
      "description": "主动泄露客户身份证号",
      "evidence": "在对话中主动说出完整身份证号'320XXX198X0X0XXXXX'",
      "timestamp": "2025-12-29T10:05:12Z",
      "agentId": "AGENT-002",
      "agentName": "李客服",
      "conversationId": "CONV-88888"
    }
  ],
  "inspection": {
    "overallScore": 0,
    "grade": "不合格",
    "confidence": 1.0
  },
  "needImmediateAction": true,
  "recommendedAction": "1. 立即停止该客服服务\n2. 启动安全审计流程\n3. 联系客户说明情况并道歉\n4. 审查该客服是否有其他泄露行为",
  "needHumanReview": true,
  "reviewReason": "严重违规：信息泄露"
}

【前端展示】
┌─────────────────────────────────────┐
│ 🔴🔴🔴 严重违规告警 🔴🔴🔴           │
├─────────────────────────────────────┤
│ 违规类型：信息泄露（CRITICAL）        │
│ 违规客服：李客服（AGENT-002）         │
│ 对话ID：CONV-88888                   │
│ 时间：2025-12-29 10:05:12            │
│                                      │
│ ⚠️ 违规描述：                        │
│ 主动泄露客户身份证号                  │
│                                      │
│ 📋 证据：                            │
│ "您的身份证号是320XXX198X0X0XXXXX，  │
│  对吗？"                             │
│                                      │
│ ⚡ 处理建议：                         │
│ 1. 立即停止该客服服务                 │
│ 2. 启动安全审计流程                   │
│ 3. 联系客户说明情况并道歉             │
│ 4. 审查是否有其他泄露行为             │
│                                      │
│ 📊 质检评分：0分（强制）              │
│                                      │
│ [立即处理] [查看完整对话]             │
└─────────────────────────────────────┘

【Slack通知】
@管理层 🔴 严重违规告警

客服：李客服（AGENT-002）
对话：CONV-88888
时间：2025-12-29 10:05:12

违规类型：信息泄露（CRITICAL）
描述：主动泄露客户身份证号

证据：
"您的身份证号是320XXX198X0X0XXXXX，对吗？"

立即处理：
[查看详情] [停止服务] [启动审计]

【管理层操作】
收到告警（<10秒） → 查看证据 → 确认严重违规 → 立即停止该客服服务 → 启动安全审计 → 联系客户道歉 → 审查该客服历史对话 → 处罚决策
```

**关键决策点**:
1. **为什么判定为information_leakage**:
   - 敏感词匹配：检测到"身份证号"
   - 格式识别：检测到18位数字（身份证格式）
   - 主动泄露：客服主动说出（而非客户提供）

2. **为什么overallScore强制降至0分**:
   - 严重违规（critical级别）
   - 涉及客户隐私安全
   - 触发不可饶恕的底线

3. **为什么推送紧急告警**:
   - 需要立即处理（防止继续泄露）
   - 需要启动安全审计（评估影响范围）
   - 需要联系客户道歉（挽回信任）

---

#### 示例3: 申诉成功（人工复核调整评分）

**对话背景**: 客服质检78分，客服申诉称客户要求使用"你"而非"您"，人工复核后调整评分

```
【原始质检结果】
对话ID: CONV-77777
客服: 王客服（AGENT-003）
综合评分: 78分（合格）
扣分项: compliance维度扣7分（未使用敬语"您"）

【客服申诉】
申诉理由: "对话中客户明确要求我使用'你'而不是'您'，说'别您您您的，叫我小李就行'，所以我后续改用了'你'。"

【InspectorAgent思考过程】

Step 1: 接收申诉请求
  → conversationId: CONV-77777
  → originalScore: 78
  → appealReason: "客户要求使用'你'而非'您'"

Step 2: 提取证据
  → 读取完整对话记录
  → 查找相关证据片段

Step 3: 证据分析
  → 找到客户消息: "别您您您的，叫我小李就行"
  → 时间戳: 对话第3轮
  → 客服后续确实改用"你"
  → 判断: 申诉理由成立

Step 4: 人工复核决策
  → 查看证据: 确认客户明确要求
  → 判断: 客服正确响应客户要求，不应扣分
  → 调整评分: compliance 83 → 90（+7分）
  → 综合评分: 78 → 85（+7分）
  → 标注: "已申诉，人工调整，客户要求使用'你'"

【调整后结果】
{
  "inspection": {
    "conversationId": "CONV-77777",
    "originalScore": 78,
    "adjustedScore": 85,
    "scoreBreakdown": {
      "responseSpeed": 85,
      "professionalism": 80,
      "friendliness": 82,
      "compliance": 90,  // 调整前: 83
      "resolutionRate": 80
    },
    "grade": "良好",  // 调整前: 合格
    "appealStatus": "approved",
    "appealReason": "客户明确要求使用'你'而非'您'",
    "adjustedBy": "质检主管",
    "adjustedAt": "2025-12-29T14:30:00Z",
    "note": "已申诉，人工调整"
  },
  "evidence": {
    "customerRequest": "别您您您的，叫我小李就行",
    "timestamp": "2025-12-29T10:02:15Z"
  }
}

【前端展示】
┌─────────────────────────────────────┐
│ ✅ 申诉已批准 - CONV-77777           │
├─────────────────────────────────────┤
│ 原始评分：78分（合格）                │
│ 调整后评分：85分（良好）↗️ +7分      │
│                                      │
│ 📋 申诉理由：                        │
│ 客户明确要求使用'你'而非'您'         │
│                                      │
│ 🔍 证据：                            │
│ 客户消息："别您您您的，叫我小李就行" │
│ 时间：2025-12-29 10:02:15            │
│                                      │
│ ✅ 复核结论：                        │
│ 申诉成立。客服正确响应客户要求，      │
│ compliance维度调整：83分 → 90分      │
│                                      │
│ 📝 备注：                            │
│ 已申诉，人工调整                      │
│ 复核人：质检主管                      │
│ 时间：2025-12-29 14:30               │
│                                      │
│ [查看详情] [确认]                    │
└─────────────────────────────────────┘

【客服操作】
收到申诉批准通知 → 查看调整结果 → 评分从78→85 → 满意
```

**关键决策点**:
1. **为什么申诉成立**:
   - 有明确证据（客户消息"别您您您的，叫我小李就行"）
   - 客服行为合理（正确响应客户要求）
   - 规则应当灵活（客户明确要求时可调整）

2. **为什么调整compliance评分**:
   - 原评分扣分理由：未使用敬语"您"
   - 调整理由：客户明确要求使用"你"
   - 调整幅度：+7分（恢复扣分）

3. **为什么标注"已申诉，人工调整"**:
   - 保证审计追溯（记录评分调整历史）
   - 避免误解（说明评分变化原因）
   - 质量管理（统计申诉成功率）

---

