# AI Adapter User Prompt - Analyze Conversation

```prompt
请分析以下客服对话的质量：

{{context_section}}{{keywords_section}}{{messages_section}}{{conversation_id_section}}
请以JSON格式返回分析结果，包含以下字段：
{
  "summary": "对话摘要",
  "sentiment": "positive/neutral/negative",
  "score": 0-1之间的分数,
  "confidence": 0-1之间的置信度,
  "issues": [{"type": "问题类型", "severity": "low/medium/high", "description": "问题描述"}],
  "suggestions": ["改进建议1", "改进建议2"],
  "keyPhrases": ["关键词1", "关键词2"]
}
```
