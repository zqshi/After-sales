# 业务模式说明与修正

## ❌ 错误理解

之前我错误地假设了一个"工程师调度"的场景，实现了任务智能分配服务（TaskAssignmentService），这与实际业务模式不符。

## ✅ 正确的业务模式

### 核心业务流程

1. **售后人员通过IM登录**
   - 售后人员使用飞书/企微等IM工具
   - 每个售后人员只能看到自己所在的群聊
   - 一个售后人员可能在多个群聊中

2. **群聊与客户的关系**
   - 每个群聊对应一个或多个客户
   - 售后人员在群聊中直接服务客户
   - 不存在"分配任务给工程师"的概念

3. **对话（Conversation）的创建**
   - 当客户在群聊中发送消息时，系统自动创建或复用Conversation
   - Conversation关联到：
     - `customerId`: 客户ID
     - `channel`: IM渠道（feishu/wecom）
     - `metadata.chatId`: 群聊ID
     - `agentId`: 售后人员ID（从群聊成员中获取）

4. **任务（Task）的创建**
   - 任务是从对话中识别出的需求自动创建的
   - 任务自动关联到对话所属的售后人员
   - `assigneeId` 应该是对话的 `agentId`，而不是通过算法分配

### 数据流转

```
客户在群聊发消息
  ↓
IM平台推送到系统 (/api/im/incoming-message)
  ↓
系统识别/创建Conversation
  - customerId: 客户ID
  - channel: feishu/wecom
  - agentId: 群聊中的售后人员ID
  - metadata.chatId: 群聊ID
  ↓
AI分析消息，识别需求
  ↓
创建Requirement（如果有需求）
  ↓
创建Task（如果需求优先级高）
  - assigneeId = conversation.agentId （自动关联到售后人员）
  ↓
售后人员在IM中看到任务提醒
  ↓
售后人员在群聊中回复客户
```

---

## 🔧 需要修正的代码

### 1. Task创建逻辑

**当前问题**: Task的assigneeId可能为空，期望通过"智能分配"来填充

**正确做法**: Task的assigneeId应该直接从Conversation的agentId获取

**修改位置**: `src/application/use-cases/task/CreateTaskUseCase.ts`

```typescript
// ❌ 错误：期望后续通过智能分配
const task = Task.create({
  title: request.title,
  assigneeId: request.assigneeId, // 可能为空
});

// ✅ 正确：从Conversation获取agentId
const conversation = await conversationRepository.findById(request.conversationId);
const task = Task.create({
  title: request.title,
  assigneeId: conversation.getAgentId(), // 自动关联到售后人员
});
```

### 2. ConversationTaskCoordinator

**当前问题**: 创建任务时没有自动设置assigneeId

**正确做法**: 从当前对话获取agentId

**修改位置**: `src/application/services/ConversationTaskCoordinator.ts`

在创建任务时，应该传入conversation的agentId：

```typescript
await this.createTaskUseCase.execute({
  title: `处理需求：${requirement.title}`,
  type: requirement.category,
  priority: requirement.priority,
  conversationId: conversation.id,
  requirementId: requirement.id,
  assigneeId: conversation.getAgentId(), // 添加这一行
});
```

### 3. Task领域模型

**当前状态**: assigneeId是可选的

**建议**: 保持可选，但在创建时应该总是有值（除非是系统自动创建的任务）

**修改位置**: `src/domain/task/models/Task.ts`

添加验证逻辑：

```typescript
static create(data: TaskCreateData): Task {
  // 如果有conversationId，必须有assigneeId
  if (data.conversationId && !data.assigneeId) {
    throw new Error('从对话创建的任务必须指定assigneeId');
  }

  return new Task({
    id: data.id || uuidv4(),
    title: data.title,
    assigneeId: data.assigneeId,
    // ...
  });
}
```

---

## 📋 修正清单

### 立即删除的文件

- [x] `src/application/services/TaskAssignmentService.ts` - 已删除

### 需要修改的文件

1. [ ] `src/application/use-cases/task/CreateTaskUseCase.ts`
   - 添加从Conversation获取agentId的逻辑

2. [ ] `src/application/services/ConversationTaskCoordinator.ts`
   - 创建任务时传入conversation.agentId

3. [ ] `src/domain/task/models/Task.ts`
   - 添加验证逻辑（可选）

4. [ ] `INTEGRATION_GUIDE.md`
   - 删除任务智能分配相关的内容

5. [ ] `DELIVERY_REPORT.md`
   - 删除任务智能分配相关的内容

6. [ ] `DEPLOYMENT_CHECKLIST.md`
   - 删除任务智能分配相关的内容

---

## 🎯 正确的任务分配逻辑

### 场景1：客户在群聊发消息

```typescript
// 1. 接收IM消息
POST /api/im/incoming-message
{
  "customerId": "customer-123",
  "senderId": "customer-123",
  "content": "我的订单有问题",
  "channel": "feishu",
  "chatId": "oc_xxx", // 群聊ID
  "metadata": {
    "agentId": "agent-456" // 群聊中的售后人员ID
  }
}

// 2. 系统创建/复用Conversation
conversation = {
  customerId: "customer-123",
  channel: "feishu",
  agentId: "agent-456", // 从metadata中获取
  metadata: {
    chatId: "oc_xxx"
  }
}

// 3. AI识别需求，创建Task
task = {
  title: "处理订单问题",
  assigneeId: "agent-456", // 直接使用conversation.agentId
  conversationId: conversation.id
}
```

### 场景2：售后人员主动创建任务

```typescript
// 售后人员在前端创建任务
POST /api/v1/api/tasks
{
  "title": "跟进客户需求",
  "conversationId": "conv-123",
  // 不需要传assigneeId，系统自动从conversation获取
}

// 系统处理
const conversation = await conversationRepository.findById(request.conversationId);
const task = Task.create({
  title: request.title,
  assigneeId: conversation.getAgentId(), // 自动填充
  conversationId: request.conversationId
});
```

---

## 💡 关键理解

1. **售后人员 = 群聊成员**
   - 售后人员通过IM群聊与客户交互
   - 一个售后人员可能在多个群聊中
   - 每个群聊有固定的售后人员

2. **任务 = 对话的延伸**
   - 任务总是从对话中产生
   - 任务的负责人就是对话的负责人
   - 不需要"分配"任务，任务天然属于对话的售后人员

3. **没有"工程师池"的概念**
   - 不存在"可用工程师列表"
   - 不需要"负载均衡"
   - 不需要"技能匹配"

---

## 🔄 下一步行动

1. 修改CreateTaskUseCase，自动从Conversation获取agentId
2. 修改ConversationTaskCoordinator，创建任务时传入agentId
3. 更新所有相关文档，删除任务智能分配的内容
4. 测试验证修改后的逻辑

---

**最后更新**: 2026-01-26
**状态**: 业务逻辑错误已识别，正在修正中
