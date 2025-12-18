import { RequirementCreatedEvent } from '@domain/requirement/events/RequirementCreatedEvent';
import { CreateTaskUseCase } from '@application/use-cases/task/CreateTaskUseCase';
import { CreateConversationUseCase } from '@application/use-cases/CreateConversationUseCase';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';

/**
 * RequirementCreatedEventHandler
 *
 * 职责：当需求创建后，根据优先级和来源自动创建Task
 * 决策逻辑：
 * 1. 高优先级（urgent/high）→ 自动创建Task
 * 2. 客户来源（source=conversation）→ 自动创建Task
 * 3. 如果是客户需求但无Conversation → 可选创建Conversation（暂缓实现，需要IM集成）
 */
export class RequirementCreatedEventHandler {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly createConversationUseCase?: CreateConversationUseCase,  // 可选，Phase 2实现
  ) {}

  async handle(event: RequirementCreatedEvent): Promise<void> {
    const {
      requirementId,
      customerId,
      conversationId,
      title,
      priority,
      source,
    } = event.payload;

    console.log(
      `[RequirementCreatedEventHandler] Processing requirement creation: ${requirementId}`,
    );

    try {
      // 决策1：根据优先级决定是否自动创建Task
      const shouldCreateTask = this.shouldAutoCreateTask(priority, source);

      if (shouldCreateTask) {
        console.log(
          `[RequirementCreatedEventHandler] Auto-creating task for requirement ${requirementId}`,
        );

        // 映射Priority
        const taskPriority = this.mapRequirementPriorityToTaskPriority(priority);

        // 创建Task
        const taskRequest = {
          title: `需求跟进：${title}`,
          type: 'requirement',
          requirementId,
          conversationId,
          priority: taskPriority.value as 'low' | 'medium' | 'high',
          metadata: {
            autoCreated: true,
            source: 'RequirementCreatedEvent',
          },
        };

        await this.createTaskUseCase.execute(taskRequest);

        console.log(
          `[RequirementCreatedEventHandler] Task created successfully for requirement ${requirementId}`,
        );
      } else {
        console.log(
          `[RequirementCreatedEventHandler] Skipping task creation for low priority requirement ${requirementId}`,
        );
      }

      // TODO Phase 2: 如果是客户需求且无Conversation，创建Conversation（需要IM集成）
      // if (source === 'customer' && !conversationId && this.createConversationUseCase) {
      //   await this.createConversationUseCase.execute({
      //     customerId,
      //     channel: 'system',  // 系统触发的对话
      //     initialMessage: `系统检测到新需求：${title}`,
      //     metadata: {
      //       requirementId,
      //       autoCreated: true
      //     }
      //   });
      // }
    } catch (error) {
      console.error(
        `[RequirementCreatedEventHandler] Error processing requirement creation:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 决策逻辑：是否应该自动创建Task
   */
  private shouldAutoCreateTask(priority: string, source: string): boolean {
    // 规则1：紧急或高优先级 → 自动创建
    if (priority === 'urgent' || priority === 'high') {
      return true;
    }

    // 规则2：来自客户对话 → 自动创建
    if (source === 'conversation' || source === 'customer') {
      return true;
    }

    // 规则3：其他情况（低优先级、手动创建）→ 不自动创建
    return false;
  }

  /**
   * 映射Requirement优先级到Task优先级
   */
  private mapRequirementPriorityToTaskPriority(priority: string): TaskPriority {
    switch (priority) {
      case 'urgent':
        return TaskPriority.create('high');
      case 'high':
        return TaskPriority.create('high');
      case 'medium':
        return TaskPriority.create('medium');
      case 'low':
        return TaskPriority.create('low');
      default:
        return TaskPriority.create('medium');
    }
  }
}
