import { DomainEvent } from '@domain/shared/DomainEvent';
import { TaskCompletedEvent } from '@domain/task/events/TaskCompletedEvent';
import { ITaskRepository } from '@domain/task/repositories/ITaskRepository';
import { IConversationRepository } from '@domain/conversation/repositories/IConversationRepository';
import { EventBus } from '@infrastructure/events/EventBus';
import { ConversationReadyToCloseEvent } from '@domain/conversation/events/ConversationReadyToCloseEvent';

/**
 * TaskCompletedEventHandler
 *
 * 职责：当Task完成时，检查关联的Conversation是否所有Task都已完成
 * 如果全部完成，发布ConversationReadyToCloseEvent
 *
 * 这是实现工单生命周期串联流程的关键处理器
 */
export class TaskCompletedEventHandler {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: TaskCompletedEvent): Promise<void> {
    const { taskId, conversationId } = event.payload;

    console.log(`[TaskCompletedEventHandler] Processing task completion: ${taskId}`);

    // 如果Task没有关联Conversation，直接返回
    if (!conversationId) {
      console.log(`[TaskCompletedEventHandler] Task ${taskId} has no associated conversation`);
      return;
    }

    try {
      // 1. 获取该Conversation的所有Task
      const allTasks = await this.taskRepository.findByFilters({
        conversationId,
      });

      console.log(
        `[TaskCompletedEventHandler] Found ${allTasks.length} tasks for conversation ${conversationId}`,
      );

      // 2. 检查是否所有Task都已完成
      const incompleteTasks = allTasks.filter((task) => {
        const status = task.status;
        return status !== 'completed' && status !== 'cancelled';
      });

      console.log(
        `[TaskCompletedEventHandler] Incomplete tasks: ${incompleteTasks.length}`,
      );

      // 3. 如果所有Task都完成了，发布ConversationReadyToCloseEvent
      if (incompleteTasks.length === 0) {
        console.log(
          `[TaskCompletedEventHandler] All tasks completed for conversation ${conversationId}, publishing ConversationReadyToCloseEvent`,
        );

        // 验证Conversation存在
        const conversation = await this.conversationRepository.findById(conversationId);
        if (!conversation) {
          console.warn(
            `[TaskCompletedEventHandler] Conversation ${conversationId} not found`,
          );
          return;
        }

        // 如果对话已关闭，不再发布事件
        if (conversation.status === 'closed') {
          console.log(
            `[TaskCompletedEventHandler] Conversation ${conversationId} is already closed`,
          );
          return;
        }

        // 发布ConversationReadyToCloseEvent
        const readyToCloseEvent = new ConversationReadyToCloseEvent(
          {
            aggregateId: conversationId,
            occurredAt: new Date(),
          },
          {
            conversationId,
            reason: 'All associated tasks completed',
            completedTasksCount: allTasks.length,
          },
        );

        await this.eventBus.publish(readyToCloseEvent);
      } else {
        console.log(
          `[TaskCompletedEventHandler] Conversation ${conversationId} still has ${incompleteTasks.length} incomplete tasks`,
        );
      }
    } catch (error) {
      console.error(
        `[TaskCompletedEventHandler] Error processing task completion:`,
        error,
      );
      throw error;
    }
  }
}
