import { DomainEvent, DomainEventProps } from '@domain/shared/DomainEvent';

export interface RequirementCreatedPayload {
  requirementId: string;
  customerId: string;
  conversationId?: string;  // 关联的会话ID
  title: string;
  category: string;
  priority: string;  // 优先级，用于决定是否自动创建Task
  source: string;  // 来源: conversation/manual/system
}

export class RequirementCreatedEvent extends DomainEvent<RequirementCreatedPayload> {
  constructor(props: DomainEventProps, payload: RequirementCreatedPayload) {
    super('RequirementCreated', props, payload);
  }
}
