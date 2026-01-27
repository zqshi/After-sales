import { ConversationRepository } from '@infrastructure/repositories/ConversationRepository';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';

/**
 * 权限拒绝错误
 */
export class ForbiddenError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * 资源级权限检查服务
 *
 * 验证用户是否有权访问特定资源
 */
export class ResourceAccessControl {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly taskRepo: TaskRepository,
    private readonly requirementRepo: RequirementRepository,
  ) {}

  /**
   * 检查用户是否有权访问对话
   *
   * @param userId 用户ID
   * @param conversationId 对话ID
   * @param action 操作类型（read, write, delete）
   * @throws ForbiddenError 无权访问时抛出
   */
  async checkConversationAccess(
    userId: string,
    conversationId: string,
    action: 'read' | 'write' | 'delete' = 'read',
  ): Promise<void> {
    const conversation = await this.conversationRepo.findById(conversationId);

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // 检查用户是否是对话参与者
    const isParticipant =
      conversation.customerId === userId || conversation.agentId === userId;

    if (!isParticipant) {
      throw new ForbiddenError(
        `You do not have ${action} access to conversation ${conversationId}`,
      );
    }

    // 客户只能读取，不能修改或删除
    if (action !== 'read' && conversation.customerId === userId) {
      throw new ForbiddenError('Customers can only read conversations');
    }
  }

  /**
   * 检查用户是否有权访问任务
   *
   * @param userId 用户ID
   * @param taskId 任务ID
   * @param action 操作类型
   * @throws ForbiddenError 无权访问时抛出
   */
  async checkTaskAccess(
    userId: string,
    taskId: string,
    action: 'read' | 'write' | 'delete' = 'read',
  ): Promise<void> {
    const task = await this.taskRepo.findById(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // 检查用户是否是任务负责人或创建者
    const isOwner = task.assigneeId === userId || task.createdBy === userId;

    if (!isOwner) {
      throw new ForbiddenError(`You do not have ${action} access to task ${taskId}`);
    }

    // 只有负责人可以修改任务
    if (action === 'write' && task.assigneeId !== userId) {
      throw new ForbiddenError('Only assignee can modify task');
    }

    // 只有创建者可以删除任务
    if (action === 'delete' && task.createdBy !== userId) {
      throw new ForbiddenError('Only creator can delete task');
    }
  }

  /**
   * 检查用户是否有权访问需求
   *
   * @param userId 用户ID
   * @param requirementId 需求ID
   * @param action 操作类型
   * @throws ForbiddenError 无权访问时抛出
   */
  async checkRequirementAccess(
    userId: string,
    requirementId: string,
    action: 'read' | 'write' | 'delete' = 'read',
  ): Promise<void> {
    const requirement = await this.requirementRepo.findById(requirementId);

    if (!requirement) {
      throw new Error(`Requirement not found: ${requirementId}`);
    }

    // 检查用户是否是需求创建者或客户
    const isOwner = requirement.customerId === userId || requirement.createdBy === userId;

    if (!isOwner) {
      throw new ForbiddenError(
        `You do not have ${action} access to requirement ${requirementId}`,
      );
    }

    // 客户只能读取自己的需求
    if (action !== 'read' && requirement.customerId === userId) {
      throw new ForbiddenError('Customers can only read requirements');
    }
  }

  /**
   * 检查用户是否有权访问对话的关联资源
   *
   * @param userId 用户ID
   * @param conversationId 对话ID
   * @throws ForbiddenError 无权访问时抛出
   */
  async checkConversationRelatedAccess(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    await this.checkConversationAccess(userId, conversationId, 'read');
  }
}
