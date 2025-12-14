# API设计文档

## 1. 概述

### 1.1 设计原则

本API遵循RESTful设计规范,提供售后服务管理系统的后端接口,支持对话管理、客户画像、需求追踪、任务管理、质量评估、AI分析、知识库和治理审计等核心功能。

**核心设计原则**:
- **资源导向**: URL表示资源,HTTP方法表示操作
- **无状态**: 每个请求独立,不依赖服务器状态
- **统一接口**: 一致的错误处理和响应格式
- **分层系统**: 支持负载均衡和缓存
- **按需编码**: 支持内容协商和压缩

### 1.2 基础配置

```javascript
// 全局配置
const config = {
  apiBaseUrl: 'https://api.example.com/v1',  // API基础URL
  authToken: 'Bearer xxx',                     // 认证令牌
};

// API配置
const API_CONFIG = {
  timeout: 30000,           // 30秒超时
  maxRetries: 3,            // 最大重试次数
  retryDelay: 1000,         // 初始重试延迟（指数退避）
  retryStatusCodes: [       // 可重试的HTTP状态码
    408,  // Request Timeout
    429,  // Too Many Requests
    500,  // Internal Server Error
    502,  // Bad Gateway
    503,  // Service Unavailable
    504,  // Gateway Timeout
  ],
};
```

### 1.3 版本控制

- **当前版本**: v1
- **版本策略**: URL路径版本控制 (`/v1/`, `/v2/`)
- **向后兼容**: 同一大版本内保持向后兼容
- **弃用策略**: 至少提前3个月通知版本弃用

## 2. 认证与授权

### 2.1 认证方式

使用Bearer Token认证:

```http
Authorization: Bearer <token>
```

**获取Token** (暂未实现,待后端开发):
```http
POST /auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password"
}

Response:
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "refreshToken": "refresh_token_here"
  }
}
```

### 2.2 权限模型

基于角色的访问控制(RBAC):

```http
GET /session/roles

Response:
{
  "code": 200,
  "data": {
    "userId": "user-123",
    "roles": ["agent", "team_lead"],
    "permissions": [
      "conversation.read",
      "conversation.write",
      "profile.read",
      "task.manage"
    ]
  }
}
```

**角色定义**:
- `agent`: 客服人员 - 基础操作权限
- `team_lead`: 团队主管 - 管理本团队
- `manager`: 经理 - 管理多个团队
- `admin`: 系统管理员 - 全部权限

## 3. 通用规范

### 3.1 请求格式

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
Accept: application/json
```

**Query参数**:
- 使用驼峰命名: `pageSize`, `sortBy`
- 布尔值: `true`, `false`
- 数组: `tags=urgent&tags=bug` 或 `tags=urgent,bug`
- 日期: ISO 8601格式 `2024-01-15T10:30:00Z`

**Body格式**:
```json
{
  "field": "value",
  "nested": {
    "field": "value"
  },
  "array": ["item1", "item2"]
}
```

### 3.2 响应格式

#### 成功响应

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    // 响应数据
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 分页响应

```json
{
  "code": 200,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### 错误响应

```json
{
  "code": 400,
  "error": "Bad Request",
  "message": "Invalid parameter: customerId is required",
  "details": {
    "field": "customerId",
    "reason": "missing"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "traceId": "abc123"
}
```

### 3.3 HTTP状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功,无返回内容 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或Token过期 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突(如重复创建) |
| 422 | Unprocessable Entity | 语义错误(如业务规则验证失败) |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |
| 502 | Bad Gateway | 网关错误 |
| 503 | Service Unavailable | 服务暂时不可用 |
| 504 | Gateway Timeout | 网关超时 |

### 3.4 分页参数

```http
GET /resource?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

Parameters:
- page: 页码(从1开始,默认1)
- pageSize: 每页数量(默认20,最大100)
- sortBy: 排序字段(默认createdAt)
- sortOrder: 排序方向(asc/desc,默认desc)
```

### 3.5 过滤与搜索

```http
GET /resource?status=active&search=keyword&startDate=2024-01-01&endDate=2024-01-31

Parameters:
- status: 状态过滤
- search: 关键词搜索(支持多字段模糊匹配)
- startDate/endDate: 日期范围过滤
```

## 4. API端点详细设计

### 4.1 对话管理 (Conversation Management)

#### 4.1.1 获取对话列表

```http
GET /im/conversations

Query Parameters:
- page: number (页码,默认1)
- pageSize: number (每页大小,默认20)
- status: string (状态: 'open' | 'closed' | 'pending')
- priority: string (优先级: 'low' | 'medium' | 'high' | 'urgent')
- agentId: string (客服ID)
- customerId: string (客户ID)
- channel: string (渠道: 'chat' | 'email' | 'phone')
- startDate: string (开始日期, ISO 8601)
- endDate: string (结束日期, ISO 8601)
- search: string (搜索关键词)
- sortBy: string (排序字段: 'createdAt' | 'updatedAt' | 'priority')
- sortOrder: string ('asc' | 'desc')

Response 200:
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "conv-123",
        "customerId": "cust-456",
        "customerName": "张三",
        "agentId": "agent-789",
        "agentName": "李客服",
        "status": "open",
        "priority": "high",
        "channel": "chat",
        "subject": "产品功能咨询",
        "lastMessage": {
          "id": "msg-999",
          "content": "请问这个功能如何使用？",
          "senderId": "cust-456",
          "senderType": "customer",
          "timestamp": "2024-01-15T10:30:00Z"
        },
        "unreadCount": 2,
        "messageCount": 15,
        "tags": ["产品咨询", "功能问题"],
        "sla": {
          "status": "金牌",
          "firstResponseTarget": 5,
          "resolutionTarget": 120,
          "firstResponseElapsed": 3,
          "resolutionElapsed": 45,
          "isViolated": false
        },
        "createdAt": "2024-01-15T09:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalOpen": 120,
      "totalClosed": 30,
      "avgResponseTime": 3.5,
      "avgResolutionTime": 95.2
    }
  }
}

Error 401:
{
  "code": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}

Error 403:
{
  "code": 403,
  "error": "Forbidden",
  "message": "No permission to access conversations"
}
```

#### 4.1.2 获取对话消息列表

```http
GET /im/conversations/{conversationId}/messages

Path Parameters:
- conversationId: string (对话ID)

Query Parameters:
- page: number (页码)
- pageSize: number (每页大小,默认50)
- before: string (获取此消息ID之前的消息)
- after: string (获取此消息ID之后的消息)
- messageType: string ('text' | 'image' | 'file' | 'system')

Response 200:
{
  "code": 200,
  "data": {
    "conversationId": "conv-123",
    "items": [
      {
        "id": "msg-001",
        "conversationId": "conv-123",
        "senderId": "cust-456",
        "senderType": "customer",
        "senderName": "张三",
        "content": "你好,我想咨询一个问题",
        "messageType": "text",
        "attachments": [],
        "isRead": true,
        "sentiment": {
          "score": 0.7,
          "label": "positive",
          "confidence": 0.85
        },
        "timestamp": "2024-01-15T09:00:00Z"
      },
      {
        "id": "msg-002",
        "conversationId": "conv-123",
        "senderId": "agent-789",
        "senderType": "agent",
        "senderName": "李客服",
        "content": "您好!很高兴为您服务,请问有什么可以帮助您的?",
        "messageType": "text",
        "attachments": [],
        "isRead": true,
        "timestamp": "2024-01-15T09:02:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "total": 15,
      "hasNext": false,
      "hasPrev": false
    }
  }
}

Error 404:
{
  "code": 404,
  "error": "Not Found",
  "message": "Conversation not found: conv-123"
}
```

#### 4.1.3 发送消息

```http
POST /im/conversations/{conversationId}/messages

Path Parameters:
- conversationId: string

Request Body:
{
  "content": "感谢您的耐心等待,这个问题的解决方案是...",
  "messageType": "text",
  "attachments": [
    {
      "type": "image",
      "url": "https://cdn.example.com/image.png",
      "name": "screenshot.png",
      "size": 102400
    }
  ],
  "metadata": {
    "useAI": false,
    "knowledgeArticleId": "kb-123"
  }
}

Response 201:
{
  "code": 201,
  "message": "Message sent successfully",
  "data": {
    "id": "msg-new-001",
    "conversationId": "conv-123",
    "senderId": "agent-789",
    "senderType": "agent",
    "content": "感谢您的耐心等待,这个问题的解决方案是...",
    "messageType": "text",
    "timestamp": "2024-01-15T10:35:00Z",
    "attachments": [...]
  }
}

Error 400:
{
  "code": 400,
  "error": "Bad Request",
  "message": "Message content is required",
  "details": {
    "field": "content",
    "reason": "missing"
  }
}

Error 422:
{
  "code": 422,
  "error": "Unprocessable Entity",
  "message": "Cannot send message to closed conversation",
  "details": {
    "conversationStatus": "closed"
  }
}
```

#### 4.1.4 更新对话状态

```http
PATCH /im/conversations/{conversationId}/status

Path Parameters:
- conversationId: string

Request Body:
{
  "status": "closed",
  "resolution": "resolved",
  "resolutionNotes": "问题已通过知识库文章KB-123解决",
  "tags": ["已解决", "知识库"]
}

Response 200:
{
  "code": 200,
  "message": "Conversation status updated",
  "data": {
    "id": "conv-123",
    "status": "closed",
    "resolution": "resolved",
    "closedAt": "2024-01-15T10:40:00Z",
    "closedBy": "agent-789",
    "duration": 6000,
    "messageCount": 15
  }
}

Error 409:
{
  "code": 409,
  "error": "Conflict",
  "message": "Conversation is already closed"
}
```

### 4.2 客户画像 (Customer Profile)

#### 4.2.1 获取客户画像

```http
GET /profiles/{customerId}

Path Parameters:
- customerId: string

Response 200:
{
  "code": 200,
  "data": {
    "customerId": "cust-456",
    "name": "张三",
    "contacts": {
      "email": "zhangsan@example.com",
      "phone": "+86 138-0000-0000",
      "wechat": "zhangsan_wx"
    },
    "company": {
      "name": "某某科技有限公司",
      "industry": "软件开发",
      "size": "100-500人"
    },
    "sla": {
      "status": "金牌",
      "level": "premium",
      "startDate": "2023-01-01",
      "expiryDate": "2024-12-31",
      "terms": {
        "firstResponseTime": 5,
        "resolutionTime": 120,
        "availability": "7x24"
      }
    },
    "metrics": {
      "totalConversations": 48,
      "totalMessages": 320,
      "avgResponseTime": 3.2,
      "avgResolutionTime": 85.5,
      "satisfactionScore": 4.7,
      "lastInteractionAt": "2024-01-15T10:30:00Z",
      "firstInteractionAt": "2023-03-15T08:00:00Z"
    },
    "tags": ["重点客户", "金牌客户", "活跃用户"],
    "riskLevel": "low",
    "insights": [
      {
        "id": "insight-001",
        "type": "behavior",
        "title": "高频互动用户",
        "description": "近30天内发起了8次对话,平均每周2次",
        "priority": "medium",
        "actionable": true,
        "suggestedActions": ["定期主动回访", "推荐增值服务"],
        "generatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "commitments": [
      {
        "id": "commit-001",
        "content": "承诺在1月20日前提供API文档",
        "dueDate": "2024-01-20",
        "status": "pending",
        "risk": false,
        "conversationId": "conv-100"
      }
    ],
    "requirements": [
      {
        "id": "req-001",
        "category": "功能需求",
        "content": "希望支持批量导出功能",
        "priority": "high",
        "status": "in_progress",
        "extractedAt": "2024-01-10T14:30:00Z",
        "conversationId": "conv-098"
      }
    ],
    "createdAt": "2023-03-15T08:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}

Error 404:
{
  "code": 404,
  "error": "Not Found",
  "message": "Customer profile not found: cust-456"
}
```

#### 4.2.2 获取客户互动历史

```http
GET /profiles/{customerId}/interactions

Path Parameters:
- customerId: string

Query Parameters:
- page: number
- pageSize: number (默认20)
- type: string ('conversation' | 'task' | 'requirement' | 'all')
- startDate: string
- endDate: string

Response 200:
{
  "code": 200,
  "data": {
    "customerId": "cust-456",
    "items": [
      {
        "id": "interaction-001",
        "type": "conversation",
        "title": "产品功能咨询",
        "summary": "咨询批量导出功能的使用方法",
        "status": "closed",
        "result": "resolved",
        "agentId": "agent-789",
        "agentName": "李客服",
        "duration": 6000,
        "sentiment": "positive",
        "timestamp": "2024-01-15T09:00:00Z"
      },
      {
        "id": "interaction-002",
        "type": "requirement",
        "title": "需求: 支持批量导出",
        "summary": "客户希望系统支持批量导出报表功能",
        "status": "in_progress",
        "priority": "high",
        "timestamp": "2024-01-10T14:30:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### 4.2.3 刷新客户画像

```http
POST /profiles/{customerId}/refresh

Path Parameters:
- customerId: string

Request Body:
{
  "forceUpdate": false,
  "includeAIAnalysis": true
}

Response 200:
{
  "code": 200,
  "message": "Profile refresh initiated",
  "data": {
    "taskId": "refresh-task-001",
    "status": "processing",
    "estimatedTime": 5
  }
}

Response 202 (Accepted):
{
  "code": 202,
  "message": "Profile refresh in progress",
  "data": {
    "taskId": "refresh-task-001",
    "status": "processing"
  }
}
```

### 4.3 需求管理 (Requirement Management)

#### 4.3.1 获取需求列表

```http
GET /requirements

Query Parameters:
- page: number
- pageSize: number
- status: string ('pending' | 'in_progress' | 'resolved' | 'ignored')
- priority: string ('low' | 'medium' | 'high' | 'urgent')
- category: string ('功能需求' | '性能需求' | '问题反馈' | '优化建议')
- customerId: string
- assignedTo: string
- startDate: string
- endDate: string
- search: string

Response 200:
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "req-001",
        "conversationId": "conv-098",
        "customerId": "cust-456",
        "customerName": "张三",
        "category": "功能需求",
        "title": "支持批量导出功能",
        "description": "希望系统能够支持批量导出报表,包括PDF和Excel格式",
        "priority": "high",
        "status": "in_progress",
        "confidence": 0.92,
        "sourceMessages": ["msg-100", "msg-102"],
        "assignedTo": "product-manager-001",
        "assignedToName": "王产品",
        "estimatedEffort": 40,
        "tags": ["导出", "报表", "批量操作"],
        "extractedAt": "2024-01-10T14:30:00Z",
        "updatedAt": "2024-01-12T09:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### 4.3.2 创建需求

```http
POST /requirements

Request Body:
{
  "conversationId": "conv-123",
  "customerId": "cust-456",
  "category": "功能需求",
  "title": "支持暗黑模式",
  "description": "希望系统界面支持暗黑模式,保护眼睛",
  "priority": "medium",
  "sourceMessages": ["msg-200"],
  "tags": ["UI", "暗黑模式"]
}

Response 201:
{
  "code": 201,
  "message": "Requirement created successfully",
  "data": {
    "id": "req-new-001",
    "conversationId": "conv-123",
    "customerId": "cust-456",
    "category": "功能需求",
    "title": "支持暗黑模式",
    "status": "pending",
    "createdAt": "2024-01-15T11:00:00Z"
  }
}
```

#### 4.3.3 忽略需求

```http
POST /requirements/{requirementId}/ignore

Path Parameters:
- requirementId: string

Request Body:
{
  "reason": "该需求与产品规划不符",
  "notifyCustomer": false
}

Response 200:
{
  "code": 200,
  "message": "Requirement ignored",
  "data": {
    "id": "req-001",
    "status": "ignored",
    "ignoredAt": "2024-01-15T11:05:00Z",
    "ignoredBy": "product-manager-001"
  }
}
```

#### 4.3.4 获取需求统计

```http
GET /requirements/statistics

Query Parameters:
- startDate: string
- endDate: string
- groupBy: string ('status' | 'category' | 'priority')

Response 200:
{
  "code": 200,
  "data": {
    "total": 156,
    "byStatus": {
      "pending": 45,
      "in_progress": 68,
      "resolved": 38,
      "ignored": 5
    },
    "byCategory": {
      "功能需求": 89,
      "性能需求": 23,
      "问题反馈": 31,
      "优化建议": 13
    },
    "byPriority": {
      "urgent": 12,
      "high": 45,
      "medium": 67,
      "low": 32
    },
    "trends": {
      "newThisWeek": 18,
      "resolvedThisWeek": 12,
      "avgResolutionDays": 7.5
    }
  }
}
```

### 4.4 任务管理 (Task Management)

#### 4.4.1 获取任务列表

```http
GET /tasks

Query Parameters:
- page: number
- pageSize: number
- status: string ('todo' | 'in_progress' | 'completed' | 'cancelled')
- priority: string ('low' | 'medium' | 'high' | 'urgent')
- type: string ('follow_up' | 'requirement' | 'quality_issue' | 'sla_violation')
- assignedTo: string
- conversationId: string
- dueDate: string
- overdue: boolean

Response 200:
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "task-001",
        "conversationId": "conv-123",
        "type": "follow_up",
        "title": "跟进客户批量导出需求",
        "description": "与产品团队确认开发计划,并向客户反馈进度",
        "status": "in_progress",
        "priority": "high",
        "assignedTo": "agent-789",
        "assignedToName": "李客服",
        "assignedBy": "team-lead-001",
        "dueDate": "2024-01-20T18:00:00Z",
        "estimatedHours": 4,
        "actualHours": 2,
        "progress": 50,
        "tags": ["客户跟进", "需求"],
        "relatedRequirementId": "req-001",
        "createdAt": "2024-01-15T09:00:00Z",
        "updatedAt": "2024-01-15T11:00:00Z",
        "completedAt": null
      }
    ],
    "pagination": {...},
    "summary": {
      "totalTodo": 45,
      "totalInProgress": 32,
      "totalCompleted": 156,
      "totalOverdue": 8,
      "myTasks": 12
    }
  }
}
```

#### 4.4.2 创建任务

```http
POST /tasks

Request Body:
{
  "conversationId": "conv-123",
  "type": "follow_up",
  "title": "回访客户满意度",
  "description": "对话结束后3天回访客户,确认问题是否彻底解决",
  "priority": "medium",
  "assignedTo": "agent-789",
  "dueDate": "2024-01-18T18:00:00Z",
  "estimatedHours": 0.5,
  "tags": ["回访", "满意度"]
}

Response 201:
{
  "code": 201,
  "message": "Task created successfully",
  "data": {
    "id": "task-new-001",
    "title": "回访客户满意度",
    "status": "todo",
    "createdAt": "2024-01-15T11:10:00Z"
  }
}
```

#### 4.4.3 任务操作

```http
POST /tasks/{taskId}/actions

Path Parameters:
- taskId: string

Request Body (开始任务):
{
  "action": "start"
}

Request Body (完成任务):
{
  "action": "complete",
  "actualHours": 2.5,
  "completionNotes": "已与客户沟通,客户表示满意",
  "quality": 5
}

Request Body (取消任务):
{
  "action": "cancel",
  "reason": "客户需求已变更"
}

Request Body (重新分配):
{
  "action": "reassign",
  "assignedTo": "agent-999",
  "reason": "原负责人休假"
}

Response 200:
{
  "code": 200,
  "message": "Task action completed",
  "data": {
    "id": "task-001",
    "status": "completed",
    "completedAt": "2024-01-15T11:15:00Z",
    "actualHours": 2.5
  }
}
```

### 4.5 质量评估 (Quality Assessment)

#### 4.5.1 获取对话质量评估

```http
GET /quality/{conversationId}

Path Parameters:
- conversationId: string

Response 200:
{
  "code": 200,
  "data": {
    "conversationId": "conv-123",
    "overallScore": 87,
    "overallLevel": "excellent",
    "dimensions": [
      {
        "name": "响应质量",
        "score": 90,
        "level": "excellent",
        "details": {
          "avgResponseTime": 2.5,
          "responseCompleteness": 0.95,
          "accuracyRate": 0.92
        }
      },
      {
        "name": "解决质量",
        "score": 85,
        "level": "good",
        "details": {
          "resolutionTime": 95,
          "oneTimeResolution": true,
          "customerSatisfaction": 5
        }
      },
      {
        "name": "专业性",
        "score": 88,
        "level": "excellent",
        "details": {
          "languageQuality": 0.90,
          "knowledgeAccuracy": 0.95,
          "professionalism": 0.85
        }
      }
    ],
    "issues": [
      {
        "type": "response_quality",
        "severity": "low",
        "description": "第5条回复略显简短,可以补充更多细节",
        "messageId": "msg-105",
        "suggestion": "建议参考知识库文章KB-456,提供更详细的步骤说明"
      }
    ],
    "strengths": [
      "响应速度快,平均2.5分钟",
      "一次性解决问题,客户满意度5分",
      "语言表达专业,礼貌得体"
    ],
    "improvementSuggestions": [
      "可以在首次回复中提供更全面的信息",
      "建议主动提供相关知识库文章链接"
    ],
    "analyzedAt": "2024-01-15T10:45:00Z"
  }
}
```

### 4.6 AI分析 (AI Analysis)

#### 4.6.1 分析对话

```http
POST /ai/analyze

Request Body:
{
  "conversationId": "conv-123",
  "context": "sentiment",
  "model": "gpt-4",
  "options": {
    "includeHistory": true,
    "depth": "detailed"
  }
}

Context类型:
- sentiment: 情感分析
- requirement: 需求提取
- quality: 质量评估
- recommendation: 解决方案推荐
- insight: 客户洞察

Response 200:
{
  "code": 200,
  "data": {
    "conversationId": "conv-123",
    "analysisType": "sentiment",
    "result": {
      "overallSentiment": "positive",
      "score": 0.75,
      "confidence": 0.88,
      "emotions": ["satisfied", "grateful", "curious"],
      "timeline": [
        {
          "messageId": "msg-001",
          "sentiment": "neutral",
          "score": 0.5,
          "timestamp": "2024-01-15T09:00:00Z"
        },
        {
          "messageId": "msg-005",
          "sentiment": "positive",
          "score": 0.8,
          "timestamp": "2024-01-15T09:15:00Z"
        }
      ],
      "keyPhrases": [
        { "phrase": "非常满意", "sentiment": "positive", "score": 0.9 },
        { "phrase": "谢谢", "sentiment": "positive", "score": 0.85 }
      ]
    },
    "model": "gpt-4",
    "analyzedAt": "2024-01-15T11:20:00Z"
  }
}
```

#### 4.6.2 应用AI解决方案

```http
POST /ai/solutions

Request Body:
{
  "conversationId": "conv-123",
  "solutionType": "knowledge_article",
  "solutionId": "kb-123",
  "customization": {
    "tone": "professional",
    "includeSteps": true
  }
}

Response 200:
{
  "code": 200,
  "message": "Solution applied successfully",
  "data": {
    "messageId": "msg-new-002",
    "content": "根据您的问题,我为您找到了相关的解决方案...",
    "appliedSolution": {
      "type": "knowledge_article",
      "id": "kb-123",
      "title": "批量导出功能使用指南"
    }
  }
}
```

### 4.7 知识库 (Knowledge Base)

#### 4.7.1 搜索知识文章

```http
GET /knowledge

Query Parameters:
- search: string (搜索关键词)
- category: string (分类)
- tags: string[] (标签)
- page: number
- pageSize: number
- sortBy: string ('relevance' | 'createdAt' | 'views' | 'rating')

Response 200:
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "kb-123",
        "title": "批量导出功能使用指南",
        "category": "产品功能",
        "summary": "详细介绍批量导出功能的使用方法和注意事项",
        "tags": ["导出", "批量操作", "报表"],
        "author": "产品团队",
        "status": "published",
        "views": 1250,
        "rating": 4.8,
        "ratingCount": 45,
        "relevanceScore": 0.95,
        "createdAt": "2024-01-01T10:00:00Z",
        "updatedAt": "2024-01-10T15:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### 4.7.2 获取知识文章预览

```http
GET /knowledge/{id}/preview

Path Parameters:
- id: string

Response 200:
{
  "code": 200,
  "data": {
    "id": "kb-123",
    "title": "批量导出功能使用指南",
    "category": "产品功能",
    "summary": "详细介绍批量导出功能的使用方法和注意事项",
    "preview": "批量导出功能允许您一次性导出多个报表...(前200字)",
    "tags": ["导出", "批量操作", "报表"],
    "relatedArticles": [
      {
        "id": "kb-124",
        "title": "导出格式说明"
      }
    ]
  }
}
```

#### 4.7.3 获取完整知识文章

```http
GET /knowledge/{id}/full

Path Parameters:
- id: string

Response 200:
{
  "code": 200,
  "data": {
    "id": "kb-123",
    "title": "批量导出功能使用指南",
    "category": "产品功能",
    "content": "# 批量导出功能使用指南\n\n## 功能介绍\n...",
    "contentFormat": "markdown",
    "attachments": [
      {
        "type": "image",
        "url": "https://cdn.example.com/kb-123-img1.png",
        "name": "操作截图1"
      }
    ],
    "metadata": {
      "author": "产品团队",
      "authorId": "user-prod-001",
      "views": 1250,
      "rating": 4.8,
      "ratingCount": 45
    },
    "relatedArticles": [...],
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-10T15:00:00Z"
  }
}
```

### 4.8 审计与治理 (Audit & Governance)

#### 4.8.1 提交审计事件

```http
POST /audit/events

Request Body:
{
  "eventType": "conversation_closed",
  "userId": "agent-789",
  "resourceType": "conversation",
  "resourceId": "conv-123",
  "action": "close",
  "details": {
    "resolution": "resolved",
    "duration": 6000
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}

Response 201:
{
  "code": 201,
  "message": "Audit event recorded",
  "data": {
    "eventId": "audit-event-001",
    "timestamp": "2024-01-15T11:30:00Z"
  }
}
```

## 5. 错误处理

### 5.1 错误响应结构

```json
{
  "code": 400,
  "error": "Bad Request",
  "message": "人类可读的错误描述",
  "details": {
    "field": "字段名",
    "reason": "错误原因",
    "expected": "期望值",
    "actual": "实际值"
  },
  "timestamp": "2024-01-15T11:30:00Z",
  "traceId": "trace-abc-123",
  "path": "/api/v1/conversations"
}
```

### 5.2 常见错误码

#### 客户端错误 (4xx)

```javascript
// 400 Bad Request - 参数错误
{
  "code": 400,
  "error": "Bad Request",
  "message": "Invalid parameter: page must be a positive integer",
  "details": {
    "field": "page",
    "expected": "positive integer",
    "actual": "-1"
  }
}

// 401 Unauthorized - 未认证
{
  "code": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "details": {
    "reason": "token_expired",
    "expiredAt": "2024-01-15T10:00:00Z"
  }
}

// 403 Forbidden - 无权限
{
  "code": 403,
  "error": "Forbidden",
  "message": "No permission to access this resource",
  "details": {
    "requiredPermission": "conversation.write",
    "userPermissions": ["conversation.read"]
  }
}

// 404 Not Found - 资源不存在
{
  "code": 404,
  "error": "Not Found",
  "message": "Conversation not found: conv-999",
  "details": {
    "resourceType": "conversation",
    "resourceId": "conv-999"
  }
}

// 409 Conflict - 资源冲突
{
  "code": 409,
  "error": "Conflict",
  "message": "Conversation is already closed",
  "details": {
    "currentStatus": "closed",
    "requestedStatus": "open"
  }
}

// 422 Unprocessable Entity - 语义错误
{
  "code": 422,
  "error": "Unprocessable Entity",
  "message": "Cannot send message to closed conversation",
  "details": {
    "conversationStatus": "closed",
    "rule": "Messages can only be sent to open conversations"
  }
}

// 429 Too Many Requests - 频率限制
{
  "code": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "details": {
    "limit": 100,
    "window": "60s",
    "retryAfter": 45
  }
}
```

#### 服务器错误 (5xx)

```javascript
// 500 Internal Server Error - 服务器错误
{
  "code": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "traceId": "trace-xyz-789"
}

// 503 Service Unavailable - 服务不可用
{
  "code": 503,
  "error": "Service Unavailable",
  "message": "Service is temporarily unavailable",
  "details": {
    "reason": "maintenance",
    "estimatedRecovery": "2024-01-15T12:00:00Z"
  }
}
```

### 5.3 客户端重试策略

```javascript
// 指数退避重试
const API_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};

async function requestWithRetry(path, options, retryCount = 0) {
  try {
    return await request(path, options);
  } catch (error) {
    const shouldRetry =
      retryCount < API_CONFIG.maxRetries &&
      API_CONFIG.retryStatusCodes.includes(error.status);

    if (shouldRetry) {
      const delay = API_CONFIG.retryDelay * Math.pow(2, retryCount);
      await sleep(delay);
      return requestWithRetry(path, options, retryCount + 1);
    }

    throw error;
  }
}
```

## 6. 性能优化

### 6.1 缓存策略

**客户端缓存**:
```http
Cache-Control: public, max-age=300
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

**条件请求**:
```http
GET /knowledge/kb-123/full
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"

Response 304 Not Modified
```

### 6.2 字段选择

```http
GET /profiles/cust-456?fields=name,contacts,sla,metrics

Response:
{
  "code": 200,
  "data": {
    "name": "张三",
    "contacts": {...},
    "sla": {...},
    "metrics": {...}
  }
}
```

### 6.3 批量请求

```http
POST /batch

Request Body:
{
  "requests": [
    {
      "id": "req1",
      "method": "GET",
      "path": "/profiles/cust-456"
    },
    {
      "id": "req2",
      "method": "GET",
      "path": "/conversations/conv-123"
    }
  ]
}

Response:
{
  "code": 200,
  "data": {
    "responses": [
      {
        "id": "req1",
        "status": 200,
        "data": {...}
      },
      {
        "id": "req2",
        "status": 200,
        "data": {...}
      }
    ]
  }
}
```

### 6.4 压缩

```http
Accept-Encoding: gzip, deflate
Content-Encoding: gzip
```

## 7. 安全性

### 7.1 HTTPS

所有API请求必须使用HTTPS加密传输。

### 7.2 CORS配置

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### 7.3 请求签名 (可选)

对于高安全性要求的接口,使用HMAC-SHA256签名:

```http
X-Signature: sha256=5d41402abc4b2a76b9719d911017c592
X-Timestamp: 1705308000
X-Nonce: random-string-123
```

### 7.4 速率限制

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705308060
```

## 8. 监控与可观测性

### 8.1 健康检查

```http
GET /health

Response 200:
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-15T12:00:00Z",
  "dependencies": {
    "database": "healthy",
    "redis": "healthy",
    "ai_service": "healthy"
  }
}
```

### 8.2 指标端点

```http
GET /metrics

Response:
{
  "requests_total": 150000,
  "requests_success": 148500,
  "requests_failed": 1500,
  "avg_response_time": 125,
  "p95_response_time": 350,
  "p99_response_time": 800
}
```

### 8.3 追踪ID

每个请求返回唯一的追踪ID:

```http
X-Trace-Id: trace-abc-123-def-456
```

## 9. 版本迁移指南

### 9.1 API版本声明

```http
GET /v2/conversations
API-Version: 2.0
```

### 9.2 废弃通知

```http
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: <https://api.example.com/v2/conversations>; rel="alternate"
```

### 9.3 向后兼容性

- 添加新字段: 兼容
- 添加新端点: 兼容
- 修改字段类型: 不兼容(需要新版本)
- 删除字段: 不兼容(需要新版本)
- 修改HTTP方法: 不兼容(需要新版本)

## 10. SDK示例

### 10.1 JavaScript/TypeScript

```typescript
import { APIClient } from '@example/api-client';

const client = new APIClient({
  baseURL: 'https://api.example.com/v1',
  token: 'your-auth-token',
  timeout: 30000,
});

// 获取对话列表
const conversations = await client.conversations.list({
  status: 'open',
  page: 1,
  pageSize: 20,
});

// 发送消息
const message = await client.conversations.sendMessage('conv-123', {
  content: 'Hello!',
  messageType: 'text',
});

// 获取客户画像
const profile = await client.profiles.get('cust-456');
```

### 10.2 Python

```python
from example_api import APIClient

client = APIClient(
    base_url='https://api.example.com/v1',
    token='your-auth-token',
    timeout=30
)

# 获取对话列表
conversations = client.conversations.list(
    status='open',
    page=1,
    page_size=20
)

# 发送消息
message = client.conversations.send_message(
    'conv-123',
    content='Hello!',
    message_type='text'
)

# 获取客户画像
profile = client.profiles.get('cust-456')
```

---

**文档版本**: 1.0
**API版本**: v1
**最后更新**: 2024年
**维护者**: 后端团队
