import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface ConversationReadyToClosePayload {
  conversationId: string;
  reason: string;
  completedTasksCount?: number;
}

/**
 * ConversationReadyToCloseEvent
 *
 * 当Conversation关联的所有Task都完成时发布此事件
 * 这是Task到Conversation的跨域协调信号
 *
 * Handler应该：
 * 1. 生成对话总结
 * 2. (可选) 通知客户问题已解决
 * 3. 关闭Conversation或等待客户确认
 */
export class ConversationReadyToCloseEvent extends DomainEvent<ConversationReadyToClosePayload> {
  constructor(props: DomainEventProps, payload: ConversationReadyToClosePayload) {
    super('ConversationReadyToClose', props, payload);
  }
}
