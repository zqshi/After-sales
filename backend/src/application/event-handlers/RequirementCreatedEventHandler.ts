/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
import { CreateTaskUseCase } from '@application/use-cases/task/CreateTaskUseCase';
import { RequirementCreatedEvent } from '@domain/requirement/events/RequirementCreatedEvent';
import { IRequirementRepository } from '@domain/requirement/repositories/IRequirementRepository';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';

/**
 * RequirementCreatedEventHandler
 *
 * 职责：当需求创建后，根据领域规则自动创建Task
 *
 * ✅ 重构后：业务规则在Requirement领域模型中，Handler只负责编排
 */
export class RequirementCreatedEventHandler {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly requirementRepository: IRequirementRepository,
  ) {}

  async handle(event: RequirementCreatedEvent): Promise<void> {
    const { requirementId, conversationId, title } = event.payload;

    console.log(
      `[RequirementCreatedEventHandler] Processing requirement creation: ${requirementId}`,
    );

    try {
      // ✅ 从Repository加载Requirement聚合根
      const requirement = await this.requirementRepository.findById(requirementId);

      if (!requirement) {
        console.warn(
          `[RequirementCreatedEventHandler] Requirement ${requirementId} not found`,
        );
        return;
      }

      // ✅ 使用领域模型的业务规则
      const shouldCreateTask = requirement.shouldAutoCreateTask();

      if (shouldCreateTask) {
        console.log(
          `[RequirementCreatedEventHandler] Auto-creating task for requirement ${requirementId}`,
        );

        // 映射Priority（保留映射逻辑在Application层是合理的）
        const taskPriority = this.mapRequirementPriorityToTaskPriority(
          requirement.priority.value,
        );

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
          `[RequirementCreatedEventHandler] Skipping task creation for requirement ${requirementId}`,
        );
      }

      // TODO Phase 2: 使用领域方法判断是否需要创建Conversation
      // if (requirement.needsCustomerCommunication() && this.createConversationUseCase) {
      //   await this.createConversationUseCase.execute({...});
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
   * 映射Requirement优先级到Task优先级
   *
   * 注：此映射逻辑保留在Application层是合理的，
   * 因为它是跨上下文的转换逻辑
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
