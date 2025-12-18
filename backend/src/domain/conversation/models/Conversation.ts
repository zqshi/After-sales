import { AggregateRoot } from '@domain/shared/AggregateRoot';
import { ConversationCreatedEvent } from '../events/ConversationCreatedEvent';
import { ConversationClosedEvent } from '../events/ConversationClosedEvent';
import { ConversationAssignedEvent } from '../events/ConversationAssignedEvent';
import { MessageSentEvent } from '../events/MessageSentEvent';
import { SLAViolatedEvent } from '../events/SLAViolatedEvent';
import { Message } from './Message';
import { Channel } from '../value-objects/Channel';
import { ConversationStatus, MessagePriority, SLAStatus } from '../types';
import { SLACalculatorService, slaCalculator } from '../services/SLACalculatorService';

interface ConversationProps {
  customerId: string;
  agentId?: string;
  channel: Channel;
  status: ConversationStatus;
  priority: MessagePriority;
  slaStatus: SLAStatus;
  slaDeadline?: Date;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  metadata?: Record<string, unknown>;
}

export class Conversation extends AggregateRoot<ConversationProps> {
  private readonly slaService: SLACalculatorService;

  private constructor(props: ConversationProps, slaService: SLACalculatorService, id?: string) {
    super(props, id);
    this.slaService = slaService;
  }

  static create(data: {
    customerId: string;
    channel: Channel;
    agentId?: string;
    priority?: MessagePriority;
    slaDeadline?: Date;
    metadata?: Record<string, unknown>;
  }, slaService: SLACalculatorService = slaCalculator): Conversation {
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
      conversation.evaluateSLA(now);
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

  get slaStatus(): SLAStatus {
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

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
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

  public setSLADeadline(deadline: Date): void {
    this.props.slaDeadline = deadline;
    this.props.updatedAt = new Date();

    this.evaluateSLA();
  }

  public checkSLAStatus(now: Date = new Date()): SLAStatus {
    this.evaluateSLA(now);
    return this.props.slaStatus;
  }

  public getSLAInfo(): {
    status: SLAStatus;
    responseTime: number;
    threshold: number;
    violated: boolean;
  } {
    const now = new Date();
    const deadline = this.props.slaDeadline;
    const hasDeadline = Boolean(deadline);
    const evaluation = hasDeadline
      ? this.slaService.evaluate(deadline as Date, now)
      : { status: 'normal' as SLAStatus, remainingMs: 0 };

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

  private evaluateSLA(now: Date = new Date()): void {
    if (!this.props.slaDeadline) {
      return;
    }

    const evaluation = this.slaService.evaluate(this.props.slaDeadline, now);

    const previousStatus = this.props.slaStatus;
    this.props.slaStatus = evaluation.status;

    if (previousStatus !== 'violated' && evaluation.status === 'violated') {
      this.addDomainEvent(
        new SLAViolatedEvent(
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
    slaService: SLACalculatorService = slaCalculator,
  ): Conversation {
    return new Conversation(props, slaService, id);
  }
}
