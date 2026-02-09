# AI Adapter User Prompt - Recommend Knowledge

```prompt
用户问题：{{query}}

{{context_section}}请推荐{{topK}}个最相关的知识库内容，以JSON格式返回：
{
  "recommendations": [
    {
      "title": "知识标题",
      "content": "知识摘要",
      "relevance": 0-1之间的相关度分数
    }
  ]
}
```
