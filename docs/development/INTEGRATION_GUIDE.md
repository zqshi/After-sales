# 新功能集成指南

本指南说明如何将新实现的P0功能集成到现有系统中。

## 1. 集成WebSocket服务

### 步骤1：安装依赖

```bash
npm install @fastify/websocket
```

### 步骤2：在app.ts中注册

在 `src/app.ts` 中添加以下代码：

```typescript
import { WebSocketService } from '@infrastructure/websocket/WebSocketService';

// 在创建Fastify实例后
const wsService = new WebSocketService(fastify);
await wsService.register();

// 将wsService实例传递给需要推送审核请求的服务
// 例如在ConversationTaskCoordinator中使用
```

### 步骤3：在审核流程中使用

修改 `src/application/services/ConversationTaskCoordinator.ts`:

```typescript
import { WebSocketService } from '@infrastructure/websocket/WebSocketService';

export class ConversationTaskCoordinator {
  constructor(
    // ... 其他依赖
    private wsService: WebSocketService,
  ) {}

  private async requestHumanReview(/* ... */): Promise<void> {
    // 创建审核请求
    const reviewRequest = await this.createReviewRequestUseCase.execute(/* ... */);

    // 推送WebSocket通知
    await this.wsService.notifyReviewRequest({
      type: 'review_request',
      data: {
        reviewId: reviewRequest.id,
        conversationId: conversation.id,
        customerId: conversation.customerId,
        customerName: 'Customer Name', // 从客户信息获取
        message: content,
        suggestedReply: reply,
        priority: 'high',
        createdAt: new Date().toISOString(),
      },
    });
  }
}
```

---

## 2. 集成IM适配器

### 步骤1：配置环境变量

在 `.env` 中添加：

```bash
# 飞书配置
FEISHU_APP_ID=your-app-id
FEISHU_APP_SECRET=your-app-secret
FEISHU_ENABLED=true
```

### 步骤2：创建IM服务管理器

创建 `src/infrastructure/im/IMServiceManager.ts`:

```typescript
import { FeishuAdapter } from './FeishuAdapter';
import { BaseIMAdapter } from './BaseIMAdapter';

export class IMServiceManager {
  private adapters: Map<string, BaseIMAdapter> = new Map();

  constructor() {
    // 初始化飞书适配器
    if (process.env.FEISHU_ENABLED === 'true') {
      const feishu = new FeishuAdapter({
        appId: process.env.FEISHU_APP_ID!,
        appSecret: process.env.FEISHU_APP_SECRET!,
        enabled: true,
      });
      this.adapters.set('feishu', feishu);
    }

    // 未来可以添加更多适配器
    // if (process.env.WECOM_ENABLED === 'true') { ... }
  }

  getAdapter(channel: string): BaseIMAdapter | null {
    return this.adapters.get(channel) || null;
  }

  async sendMessage(channel: string, chatId: string, content: string): Promise<boolean> {
    const adapter = this.getAdapter(channel);
    if (!adapter || !adapter.isEnabled()) {
      console.log(`IM适配器未启用: ${channel}`);
      return false;
    }

    const result = await adapter.sendText(chatId, content);
    return result.success;
  }
}
```

### 步骤3：在app.ts中初始化

```typescript
import { IMServiceManager } from '@infrastructure/im/IMServiceManager';

const imServiceManager = new IMServiceManager();

// 将imServiceManager传递给需要发送IM消息的服务
```

### 步骤4：在业务逻辑中使用

修改 `src/application/services/ConversationTaskCoordinator.ts`:

```typescript
export class ConversationTaskCoordinator {
  constructor(
    // ... 其他依赖
    private imServiceManager: IMServiceManager,
  ) {}

  private async notifyCustomer(
    conversation: Conversation,
    message: string,
  ): Promise<void> {
    const channel = conversation.getChannel().getValue();
    const chatId = conversation.getMetadata().chatId;

    if (!chatId) {
      console.log('无法发送通知：缺少chatId');
      return;
    }

    const success = await this.imServiceManager.sendMessage(
      channel,
      chatId,
      message,
    );

    if (success) {
      console.log(`通知已发送给客户: ${conversation.getCustomerId()}`);
    } else {
      console.log(`通知发送失败: ${conversation.getCustomerId()}`);
    }
  }
}
```

---

## 3. 集成任务智能分配

### 步骤1：在app.ts中初始化

```typescript
import { TaskAssignmentService } from '@application/services/TaskAssignmentService';

const taskAssignmentService = new TaskAssignmentService(taskRepository);
```

### 步骤2：创建工程师管理服务

创建 `src/application/services/EngineerService.ts`:

```typescript
import { Engineer } from '@application/services/TaskAssignmentService';

export class EngineerService {
  // 这里应该从数据库或配置中加载工程师信息
  // 暂时使用硬编码的示例数据
  async getAvailableEngineers(): Promise<Engineer[]> {
    return [
      {
        id: 'engineer-1',
        name: '张工',
        skills: ['数据库', 'API', '性能优化'],
        maxConcurrentTasks: 5,
        performanceScore: 85,
        availability: 'available',
      },
      {
        id: 'engineer-2',
        name: '李工',
        skills: ['前端', 'UI', 'API'],
        maxConcurrentTasks: 4,
        performanceScore: 90,
        availability: 'available',
      },
      {
        id: 'engineer-3',
        name: '王工',
        skills: ['数据库', '性能优化', '架构设计'],
        maxConcurrentTasks: 3,
        performanceScore: 95,
        availability: 'busy',
      },
    ];
  }
}
```

### 步骤3：在任务创建时自动分配

修改 `src/application/use-cases/task/CreateTaskUseCase.ts`:

```typescript
import { TaskAssignmentService } from '@application/services/TaskAssignmentService';
import { EngineerService } from '@application/services/EngineerService';

export class CreateTaskUseCase {
  constructor(
    private taskRepository: ITaskRepository,
    private eventBus: IEventBus,
    private taskAssignmentService: TaskAssignmentService,
    private engineerService: EngineerService,
  ) {}

  async execute(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    // 创建任务
    const task = Task.create({
      title: request.title,
      type: request.type,
      priority: TaskPriority.fromString(request.priority || 'medium'),
      conversationId: request.conversationId,
      requirementId: request.requirementId,
      metadata: request.metadata,
    });

    // 如果没有指定assigneeId，使用智能分配
    if (!request.assigneeId) {
      const engineers = await this.engineerService.getAvailableEngineers();
      const assignedEngineerId = await this.taskAssignmentService.assignTask(
        task,
        engineers,
      );

      if (assignedEngineerId) {
        task.assign(assignedEngineerId);
        console.log(`任务已自动分配给: ${assignedEngineerId}`);
      } else {
        console.log('无法自动分配任务，将保持未分配状态');
      }
    } else {
      task.assign(request.assigneeId);
    }

    // 保存任务
    await this.taskRepository.save(task);

    // 发布事件
    task.getUncommittedEvents().forEach((event) => {
      this.eventBus.publish(event);
    });
    task.clearUncommittedEvents();

    return {
      id: task.getId(),
      title: task.getTitle(),
      status: task.getStatus().getValue(),
      assigneeId: task.getAssigneeId(),
    };
  }
}
```

---

## 4. 集成Swagger文档

### 步骤1：在app.ts中注册

在 `src/app.ts` 的开头添加：

```typescript
import { registerSwagger } from '@config/swagger.config';

// 在注册其他插件之前注册Swagger
await registerSwagger(fastify);
```

### 步骤2：为路由添加Schema

示例：修改 `src/presentation/http/routes/conversationRoutes.ts`:

```typescript
export async function conversationRoutes(
  fastify: FastifyInstance,
  controller: ConversationController,
): Promise<void> {
  fastify.post(
    '/api/conversations',
    {
      schema: {
        tags: ['Conversations'],
        summary: '创建对话',
        description: '创建一个新的客户对话',
        body: {
          type: 'object',
          required: ['customerId', 'channel'],
          properties: {
            customerId: { type: 'string', description: '客户ID' },
            channel: {
              type: 'string',
              enum: ['feishu', 'wecom', 'dingtalk', 'web'],
              description: '对话渠道',
            },
            agentId: { type: 'string', description: '客服ID（可选）' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: '优先级',
            },
          },
        },
        response: {
          201: {
            description: '创建成功',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  customerId: { type: 'string' },
                  channel: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
          400: { $ref: '#/components/schemas/Error' },
          401: { $ref: '#/components/schemas/Error' },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.create.bind(controller),
  );

  // ... 其他路由
}
```

### 步骤3：验证文档

启动服务后访问: http://localhost:8080/docs

---

## 5. 完整的app.ts集成示例

```typescript
import fastify, { FastifyInstance } from 'fastify';
import { registerSwagger } from '@config/swagger.config';
import { WebSocketService } from '@infrastructure/websocket/WebSocketService';
import { IMServiceManager } from '@infrastructure/im/IMServiceManager';
import { TaskAssignmentService } from '@application/services/TaskAssignmentService';
import { EngineerService } from '@application/services/EngineerService';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: true,
  });

  // 1. 注册Swagger（必须在其他路由之前）
  await registerSwagger(app);

  // 2. 注册WebSocket
  const wsService = new WebSocketService(app);
  await wsService.register();

  // 3. 初始化IM服务
  const imServiceManager = new IMServiceManager();

  // 4. 初始化任务分配服务
  const taskAssignmentService = new TaskAssignmentService(taskRepository);
  const engineerService = new EngineerService();

  // 5. 初始化其他服务和依赖注入
  // ... 创建repositories, use cases, controllers等

  // 6. 注册路由
  // ... 注册所有路由

  // 7. 将服务实例传递给需要的地方
  // 例如：ConversationTaskCoordinator需要wsService和imServiceManager

  return app;
}
```

---

## 6. 测试新功能

### 测试WebSocket

```javascript
// 前端测试代码
const ws = new WebSocket('ws://localhost:8080/ws/reviews');

ws.onopen = () => {
  console.log('WebSocket连接成功');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到消息:', data);

  if (data.type === 'review_request') {
    // 处理审核请求
    console.log('审核请求:', data.data);

    // 发送审核响应
    ws.send(JSON.stringify({
      type: 'review_response',
      data: {
        reviewId: data.data.reviewId,
        action: 'approve',
        reason: '回复内容合适',
      },
    }));
  }
};
```

### 测试IM消息推送

```bash
# 使用curl测试
curl -X POST http://localhost:8080/api/v1/api/im/test-send \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "feishu",
    "chatId": "oc_xxx",
    "content": "测试消息"
  }'
```

### 测试任务智能分配

```bash
# 创建任务（不指定assigneeId）
curl -X POST http://localhost:8080/api/v1/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "修复数据库性能问题",
    "type": "数据库优化",
    "priority": "high"
  }'

# 查看任务是否已自动分配
curl http://localhost:8080/api/v1/api/tasks/{taskId} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 7. 常见问题

### Q: WebSocket连接失败？
A: 确保已安装 `@fastify/websocket` 依赖，并且在注册路由之前注册WebSocket服务。

### Q: IM消息发送失败？
A: 检查环境变量配置是否正确，特别是 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。

### Q: 任务没有自动分配？
A: 确保 `EngineerService` 返回了可用的工程师列表，并且工程师的 `availability` 为 `'available'`。

### Q: Swagger文档不显示？
A: 确保Swagger在所有路由注册之前注册，并且访问 `/docs` 路径。

---

## 8. 下一步

1. 根据本指南集成所有新功能
2. 运行测试验证功能正常
3. 查看 `DEPLOYMENT_CHECKLIST.md` 完成部署前检查
4. 投产后持续监控和改进

---

**最后更新**: 2026-01-26
