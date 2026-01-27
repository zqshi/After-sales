# 输入验证和资源访问控制使用指南

## 一、输入验证（Zod）

### 1.1 基本使用

```typescript
import { Validator } from '@infrastructure/validation/Validator';
import { SendMessageRequestSchema } from '@application/dto/SendMessageRequestDTO';

// 在 Use Case 中验证输入
async execute(request: SendMessageRequest): Promise<SendMessageResponse> {
  // 验证输入（失败时抛出 ValidationError）
  const validatedRequest = Validator.validate(SendMessageRequestSchema, request);

  // 使用验证后的数据
  const conversation = await this.repo.findById(validatedRequest.conversationId);
  // ...
}
```

### 1.2 安全验证（不抛出异常）

```typescript
import { Validator } from '@infrastructure/validation/Validator';

const result = Validator.safeParse(SendMessageRequestSchema, request);

if (!result.success) {
  // 处理验证错误
  console.error('Validation errors:', result.errors);
  return { success: false, errors: result.errors };
}

// 使用验证后的数据
const data = result.data;
```

### 1.3 创建自定义 Schema

```typescript
import { z } from 'zod';
import { uuidSchema, nonEmptyStringSchema } from '@infrastructure/validation/CommonSchemas';

export const MyRequestSchema = z.object({
  id: uuidSchema,
  name: nonEmptyStringSchema.max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type MyRequestDTO = z.infer<typeof MyRequestSchema>;
```

### 1.4 常用验证规则

```typescript
// UUID
uuidSchema

// 非空字符串
nonEmptyStringSchema

// 邮箱
emailSchema

// 手机号（中国）
phoneSchema

// 优先级
prioritySchema // 'low' | 'medium' | 'high' | 'urgent'

// 对话状态
conversationStatusSchema // 'open' | 'pending' | 'closed'

// 任务状态
taskStatusSchema // 'pending' | 'in_progress' | 'completed' | 'cancelled'

// 分页参数
paginationSchema // { limit: number, offset: number }

// 日期范围
dateRangeSchema // { startDate: Date, endDate: Date }

// Metadata
metadataSchema // Record<string, unknown>
```

### 1.5 在 Controller 中处理验证错误

```typescript
import { ValidationError } from '@infrastructure/validation/Validator';

async createTask(request: FastifyRequest, reply: FastifyReply) {
  try {
    const result = await this.createTaskUseCase.execute(request.body);
    reply.code(201).send({ success: true, data: result });
  } catch (error) {
    if (error instanceof ValidationError) {
      reply.code(400).send({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }
    // 其他错误处理
    reply.code(500).send({ success: false, error: 'Internal server error' });
  }
}
```

---

## 二、资源访问控制

### 2.1 在 Use Case 中使用

```typescript
import { ResourceAccessControl } from '@application/services/ResourceAccessControl';

export class GetConversationUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly accessControl: ResourceAccessControl,
  ) {}

  async execute(userId: string, conversationId: string) {
    // 检查访问权限
    await this.accessControl.checkConversationAccess(userId, conversationId, 'read');

    // 权限检查通过，继续执行
    const conversation = await this.conversationRepo.findById(conversationId);
    return conversation;
  }
}
```

### 2.2 在路由中使用中间件

```typescript
import { ResourceAccessMiddleware } from '@presentation/http/middleware/resourceAccessMiddleware';

// 初始化中间件
const accessMiddleware = new ResourceAccessMiddleware(accessControl);

// 应用到路由
app.get(
  '/api/conversations/:id',
  {
    preHandler: [
      authMiddleware.authenticate, // 先认证
      accessMiddleware.checkConversationAccess('read'), // 再检查资源访问权限
    ],
  },
  conversationController.getConversation,
);

app.patch(
  '/api/conversations/:id',
  {
    preHandler: [
      authMiddleware.authenticate,
      accessMiddleware.checkConversationAccess('write'), // 写权限
    ],
  },
  conversationController.updateConversation,
);

app.delete(
  '/api/tasks/:id',
  {
    preHandler: [
      authMiddleware.authenticate,
      accessMiddleware.checkTaskAccess('delete'), // 删除权限
    ],
  },
  taskController.deleteTask,
);
```

### 2.3 权限检查规则

#### 对话（Conversation）
- **读权限**: 对话参与者（客户或客服）
- **写权限**: 仅客服
- **删除权限**: 仅客服

#### 任务（Task）
- **读权限**: 任务负责人或创建者
- **写权限**: 仅任务负责人
- **删除权限**: 仅创建者

#### 需求（Requirement）
- **读权限**: 需求创建者或客户
- **写权限**: 仅创建者（客服）
- **删除权限**: 仅创建者

### 2.4 处理权限错误

```typescript
import { ForbiddenError } from '@application/services/ResourceAccessControl';

try {
  await this.accessControl.checkConversationAccess(userId, conversationId, 'write');
  // 执行操作
} catch (error) {
  if (error instanceof ForbiddenError) {
    // 返回 403 Forbidden
    reply.code(403).send({ success: false, error: error.message });
    return;
  }
  throw error;
}
```

### 2.5 自定义权限检查

```typescript
// 在 ResourceAccessControl 中添加自定义方法
async checkCustomAccess(userId: string, resourceId: string): Promise<void> {
  // 自定义权限逻辑
  const resource = await this.repo.findById(resourceId);

  if (!resource) {
    throw new Error('Resource not found');
  }

  // 检查自定义规则
  if (resource.ownerId !== userId && !resource.sharedWith.includes(userId)) {
    throw new ForbiddenError('Access denied');
  }
}
```

---

## 三、完整示例

### 3.1 Use Case 完整示例

```typescript
import { Validator } from '@infrastructure/validation/Validator';
import { ResourceAccessControl } from '@application/services/ResourceAccessControl';
import { UpdateTaskRequestSchema } from '@application/dto/UpdateTaskRequestDTO';

export class UpdateTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly accessControl: ResourceAccessControl,
  ) {}

  async execute(userId: string, taskId: string, request: unknown) {
    // 1. 验证输入
    const validatedRequest = Validator.validate(UpdateTaskRequestSchema, request);

    // 2. 检查访问权限
    await this.accessControl.checkTaskAccess(userId, taskId, 'write');

    // 3. 加载聚合根
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // 4. 执行业务逻辑
    if (validatedRequest.status) {
      task.updateStatus(validatedRequest.status);
    }
    if (validatedRequest.priority) {
      task.updatePriority(validatedRequest.priority);
    }

    // 5. 保存
    await this.taskRepo.save(task);

    return task;
  }
}
```

### 3.2 Controller 完整示例

```typescript
import { ValidationError } from '@infrastructure/validation/Validator';
import { ForbiddenError } from '@application/services/ResourceAccessControl';

export class TaskController {
  async updateTask(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as { sub: string };
      const taskId = (request.params as { id: string }).id;

      const result = await this.updateTaskUseCase.execute(
        user.sub,
        taskId,
        request.body,
      );

      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      if (error instanceof ValidationError) {
        reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      if (error instanceof ForbiddenError) {
        reply.code(403).send({ success: false, error: error.message });
        return;
      }

      console.error('[TaskController] updateTask error:', error);
      reply.code(500).send({ success: false, error: 'Internal server error' });
    }
  }
}
```

---

## 四、测试

### 4.1 验证测试

```typescript
import { Validator, ValidationError } from '@infrastructure/validation/Validator';
import { SendMessageRequestSchema } from '@application/dto/SendMessageRequestDTO';

describe('SendMessageRequest Validation', () => {
  it('should validate valid request', () => {
    const request = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      senderId: 'user-123',
      senderType: 'internal',
      content: 'Hello world',
    };

    const result = Validator.validate(SendMessageRequestSchema, request);
    expect(result).toEqual(request);
  });

  it('should reject invalid UUID', () => {
    const request = {
      conversationId: 'invalid-uuid',
      senderId: 'user-123',
      senderType: 'internal',
      content: 'Hello',
    };

    expect(() => Validator.validate(SendMessageRequestSchema, request))
      .toThrow(ValidationError);
  });

  it('should reject empty content', () => {
    const request = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      senderId: 'user-123',
      senderType: 'internal',
      content: '',
    };

    expect(() => Validator.validate(SendMessageRequestSchema, request))
      .toThrow(ValidationError);
  });
});
```

### 4.2 权限测试

```typescript
import { ResourceAccessControl, ForbiddenError } from '@application/services/ResourceAccessControl';

describe('ResourceAccessControl', () => {
  it('should allow conversation participant to read', async () => {
    const userId = 'agent-123';
    const conversationId = 'conv-123';

    // Mock conversation with agent as participant
    jest.spyOn(conversationRepo, 'findById').mockResolvedValue({
      id: conversationId,
      agentId: userId,
      customerId: 'customer-456',
    });

    await expect(
      accessControl.checkConversationAccess(userId, conversationId, 'read')
    ).resolves.not.toThrow();
  });

  it('should deny non-participant access', async () => {
    const userId = 'other-user';
    const conversationId = 'conv-123';

    jest.spyOn(conversationRepo, 'findById').mockResolvedValue({
      id: conversationId,
      agentId: 'agent-123',
      customerId: 'customer-456',
    });

    await expect(
      accessControl.checkConversationAccess(userId, conversationId, 'read')
    ).rejects.toThrow(ForbiddenError);
  });

  it('should deny customer write access', async () => {
    const userId = 'customer-456';
    const conversationId = 'conv-123';

    jest.spyOn(conversationRepo, 'findById').mockResolvedValue({
      id: conversationId,
      agentId: 'agent-123',
      customerId: userId,
    });

    await expect(
      accessControl.checkConversationAccess(userId, conversationId, 'write')
    ).rejects.toThrow(ForbiddenError);
  });
});
```

---

## 五、最佳实践

### 5.1 验证

1. ✅ **在 Use Case 入口验证** - 确保所有输入都经过验证
2. ✅ **使用类型推断** - 利用 `z.infer<typeof Schema>` 自动生成类型
3. ✅ **提供清晰的错误消息** - 帮助用户理解验证失败原因
4. ✅ **验证嵌套对象** - 确保深层数据也被验证
5. ❌ **不要过度验证** - 避免验证已经由数据库约束保证的内容

### 5.2 权限控制

1. ✅ **最小权限原则** - 默认拒绝，显式授权
2. ✅ **在 Use Case 层检查** - 确保业务逻辑层有权限保护
3. ✅ **在路由层添加中间件** - 提供额外的防护层
4. ✅ **记录权限拒绝** - 便于审计和安全分析
5. ❌ **不要在领域层检查权限** - 保持领域模型纯粹

### 5.3 错误处理

1. ✅ **区分错误类型** - ValidationError, ForbiddenError, NotFoundError
2. ✅ **返回适当的 HTTP 状态码** - 400, 403, 404, 500
3. ✅ **提供有用的错误信息** - 但不泄露敏感信息
4. ✅ **记录错误日志** - 便于调试和监控
5. ❌ **不要暴露内部实现细节** - 避免安全风险

---

## 六、迁移指南

### 6.1 现有 Use Case 迁移

**步骤**:
1. 创建验证 Schema
2. 替换手动验证为 `Validator.validate()`
3. 添加资源访问权限检查
4. 更新错误处理

**示例**:
```typescript
// 迁移前
async execute(request: MyRequest) {
  if (!request.id) throw new Error('id required');
  if (!request.name) throw new Error('name required');
  // ...
}

// 迁移后
async execute(userId: string, request: unknown) {
  const validated = Validator.validate(MyRequestSchema, request);
  await this.accessControl.checkMyResourceAccess(userId, validated.id, 'write');
  // ...
}
```

### 6.2 现有路由迁移

**步骤**:
1. 添加资源访问中间件到 preHandler
2. 更新 Controller 错误处理
3. 测试权限检查

**示例**:
```typescript
// 迁移前
app.get('/api/tasks/:id', taskController.getTask);

// 迁移后
app.get(
  '/api/tasks/:id',
  {
    preHandler: [
      authMiddleware.authenticate,
      accessMiddleware.checkTaskAccess('read'),
    ],
  },
  taskController.getTask,
);
```
