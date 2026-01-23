# API使用手册

## 认证

所有API请求需要携带JWT Token：
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 会话管理

### 创建会话
```http
POST /api/conversations
Content-Type: application/json

{
  "customerId": "customer-123",
  "channel": "feishu",
  "initialMessage": "我需要帮助"
}
```

### 发送消息
```http
POST /api/conversations/:id/messages
Content-Type: application/json

{
  "senderId": "agent-001",
  "senderType": "internal",
  "content": "您好！有什么可以帮您？"
}
```

## 任务管理

### 创建任务
```http
POST /api/tasks
Content-Type: application/json

{
  "title": "处理客户退款申请",
  "priority": "high",
  "conversationId": "conv-123",
  "requirementId": "req-456"
}
```

### 完成任务
```http
PUT /api/tasks/:id/complete
Content-Type: application/json

{
  "qualityScore": {
    "timeliness": 0.9,
    "accuracy": 0.95,
    "satisfaction": 0.85
  }
}
```

## 知识库

### 搜索知识
```http
POST /api/knowledge/search
Content-Type: application/json

{
  "query": "如何重置密码",
  "limit": 5
}
```

## 错误码

- 400: 请求参数错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 500: 服务器错误
