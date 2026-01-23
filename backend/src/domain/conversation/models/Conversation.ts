import { AggregateRoot } from '@domain/shared/AggregateRoot';
import { ConversationCreatedEvent } from '../events/ConversationCreatedEvent';
import { ConversationClosedEvent } from '../events/ConversationClosedEvent';
import { ConversationAssignedEvent } from '../events/ConversationAssignedEvent';
import { MessageSentEvent } from '../events/MessageSentEvent';
import { CustomerLevelViolatedEvent } from '../events/CustomerLevelViolatedEvent';
import { Message } from './Message';
import { Channel } from '../value-objects/Channel';
import { ConversationStatus, MessagePriority, CustomerLevelStatus } from '../types';
import { CustomerLevelCalculatorService, slaCalculator } from '../services/CustomerLevelCalculatorService';

export type AgentMode = 'agent_auto' | 'agent_supervised' | 'human_first';

interface ConversationProps {
  customerId: string;
  agentId?: string;
  channel: Channel;
  status: ConversationStatus;
  priority: MessagePriority;
  slaStatus: CustomerLevelStatus;
  slaDeadline?: Date;
  messages: Message[];
  mode?: AgentMode; // Agent处理模式
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  metadata?: Record<string, unknown>;
}

export class Conversation extends AggregateRoot<ConversationProps> {
  private readonly slaService: CustomerLevelCalculatorService;

  private constructor(props: ConversationProps, slaService: CustomerLevelCalculatorService, id?: string) {
    super(props, id);
    this.slaService = slaService;
  }

  static create(data: {
    customerId: string;
    channel: Channel;
    agentId?: string;
    priority?: MessagePriority;
    slaDeadline?: Date;
    mode?: AgentMode;
    metadata?: Record<string, unknown>;
  }, slaService: CustomerLevelCalculatorService = slaCalculator): Conversation {
    const now = new Date();

    const conversation = new Conversation(
      {
        customerId: data.customerId,
        agentId: data.agentId,
        channel: data.channel,
        status: 'open',
        priority: data.priority || 'normal',
        slaStatus: 'normal',
        slaDeadline: data.slaDeadline,
        messages: [],
        mode: data.mode || 'agent_auto', // 默认自动模式
        createdAt: now,
        updatedAt: now,
        closedAt: undefined,
        metadata: data.metadata || {},
      },
      slaService
    );

    conversation.addDomainEvent(
      new ConversationCreatedEvent(
        { aggregateId: conversation.id },
        {
          customerId: data.customerId,
          channel: data.channel.value,
          priority: conversation.props.priority,
        }
      )
    );

    if (data.slaDeadline) {
      conversation.evaluateCustomerLevel(now);
    }

    return conversation;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get agentId(): string | undefined {
    return this.props.agentId;
  }

  get channel(): Channel {
    return this.props.channel;
  }

  get status(): ConversationStatus {
    return this.props.status;
  }

  get priority(): MessagePriority {
    return this.props.priority;
  }

  get slaStatus(): CustomerLevelStatus {
    return this.props.slaStatus;
  }

  get slaDeadline(): Date | undefined {
    return this.props.slaDeadline;
  }

  get messages(): Message[] {
    return [...this.props.messages];
  }

  get closedAt(): Date | undefined {
    return this.props.closedAt;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  get mode(): AgentMode {
    return this.props.mode || 'agent_auto';
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public setMode(mode: AgentMode): void {
    if (this.status === 'closed') {
      throw new Error('无法修改已关闭对话的模式');
    }
    this.props.mode = mode;
    this.props.updatedAt = new Date();
  }

  public mergeMetadata(metadata: Record<string, unknown>): void {
    if (!metadata || Object.keys(metadata).length === 0) {
      return;
    }

    this.props.metadata = {
      ...(this.props.metadata || {}),
      ...metadata,
    };
    this.props.updatedAt = new Date();
  }

  public updateStatus(status: ConversationStatus, resolution?: string): void {
    if (this.status === 'closed' && status !== 'closed') {
      throw new Error('无法重新打开已关闭的对话');
    }

    if (status === 'closed') {
      this.close(resolution || 'Closed via API');
      return;
    }

    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  public sendMessage(data: {
    senderId: string;
    senderType: 'agent' | 'customer';
    content: string;
    contentType?: string;
    metadata?: Record<string, unknown>;
  }): void {
    if (this.status === 'closed') {
      throw new Error('无法向已关闭的对话发送消息');
    }

    const participants = new Set<string>([this.customerId]);
    if (this.agentId) {
      participants.add(this.agentId);
    }

    if (!participants.has(data.senderId)) {
      throw new Error('Sender is not a participant');
    }

    const message = Message.create({
      conversationId: this.id,
      senderId: data.senderId,
      senderType: data.senderType,
      content: data.content,
      contentType: data.contentType,
      metadata: data.metadata,
    });

    this.props.messages.push(message);
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new MessageSentEvent(
        { aggregateId: this.id },
        {
          messageId: message.id,
          senderId: message.senderId,
          senderType: message.senderType,
          content: message.content,
          contentType: message.contentType,
        }
      )
    );
  }

  public setCustomerLevelDeadline(deadline: Date): void {
    this.props.slaDeadline = deadline;
    this.props.updatedAt = new Date();

    this.evaluateCustomerLevel();
  }

  public checkCustomerLevelStatus(now: Date = new Date()): CustomerLevelStatus {
    this.evaluateCustomerLevel(now);
    return this.props.slaStatus;
  }

  public getCustomerLevelInfo(): {
    status: CustomerLevelStatus;
    responseTime: number;
    threshold: number;
    violated: boolean;
  } {
    const now = new Date();
    const deadline = this.props.slaDeadline;
    const hasDeadline = Boolean(deadline);
    const evaluation = hasDeadline
      ? this.slaService.evaluate(deadline as Date, now)
      : { status: 'normal' as CustomerLevelStatus, remainingMs: 0 };

    const responseTime = hasDeadline
      ? Math.max(0, deadline!.getTime() - now.getTime())
      : 0;
    const threshold = hasDeadline
      ? Math.max(0, deadline!.getTime() - this.props.createdAt.getTime())
      : 0;

    return {
      status: evaluation.status,
      responseTime,
      threshold,
      violated: evaluation.status === 'violated',
    };
  }

  public assignAgent(
    agentId: string,
    options: {
      assignedBy?: string;
      reason?: 'manual' | 'auto' | 'reassign';
      metadata?: Record<string, unknown>;
    } = {},
  ): void {
    if (this.status === 'closed') {
      throw new Error('无法为已关闭的对话分配客服');
    }

    this.props.agentId = agentId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ConversationAssignedEvent(
        { aggregateId: this.id },
        {
          agentId,
          assignedBy: options.assignedBy,
          reason: options.reason || 'manual',
          channel: this.channel.value,
          priority: this.priority,
          metadata: options.metadata ?? {},
        }
      )
    );
  }

  public close(resolution: string): void {
    if (this.status === 'closed') {
      throw new Error('对话已关闭');
    }

    this.props.status = 'closed';
    this.props.closedAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ConversationClosedEvent(
        { aggregateId: this.id },
        {
          resolution,
          closedAt: this.props.closedAt,
        }
      )
    );
  }

  private evaluateCustomerLevel(now: Date = new Date()): void {
    if (!this.props.slaDeadline) {
      return;
    }

    const evaluation = this.slaService.evaluate(this.props.slaDeadline, now);

    const previousStatus = this.props.slaStatus;
    this.props.slaStatus = evaluation.status;

    if (previousStatus !== 'violated' && evaluation.status === 'violated') {
      this.addDomainEvent(
        new CustomerLevelViolatedEvent(
          { aggregateId: this.id },
          {
            deadline: this.props.slaDeadline,
            violatedAt: now,
          }
        )
      );
    }
  }

  static rehydrate(
    props: ConversationProps,
    id: string,
    slaService: CustomerLevelCalculatorService = slaCalculator,
  ): Conversation {
    return new Conversation(props, slaService, id);
  }
}
