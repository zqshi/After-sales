import { ValueObject } from '@domain/shared/ValueObject';

import { Message } from '../models/Message';

/**
 * MessageSummary - 消息摘要值对象
 *
 * 职责：
 * 1. 提供轻量级的消息统计信息（避免加载完整消息历史）
 * 2. 支持对话列表查询（只需要最近消息和统计）
 * 3. 支持业务决策（判断客户是否等待回复、对话是否活跃）
 *
 * 核心价值：
 * - 性能优化：加载对话列表时减少95%数据量
 * - 保持不变性：作为值对象，线程安全且易于缓存
 * - 业务语义：显式表达"消息摘要"这一领域概念
 *
 * 使用场景：
 * - Conversation聚合根保存messageSummary而非完整messages
 * - Repository查询对话列表时只返回摘要
 * - 需要完整消息历史时通过懒加载获取
 */

interface MessageSummaryProps {
  /**
   * 总消息数（包括历史消息）
   */
  totalCount: number;

  /**
   * 最近的消息（最多5条）
   *
   * 用途：
   * - 对话列表预览
   * - 快速判断对话上下文
   * - 无需加载完整消息历史
   */
  recentMessages: Message[];

  /**
   * 最后一条消息的时间
   */
  lastMessageAt: Date;

  /**
   * 最后一条消息的发送者类型
   *
   * 用途：
   * - 判断是否需要客服回复
   * - 优先级排序（客户最后发言的对话优先）
   */
  lastMessageBy: 'agent' | 'customer' | 'system';

  /**
   * 未读消息数（客服视角）
   *
   * 规则：
   * - 客户发送的消息计入未读
   * - 客服回复后重置为0
   * - 系统消息不计入未读
   */
  unreadCount: number;
}

export class MessageSummary extends ValueObject<MessageSummaryProps> {
  private static readonly MAX_RECENT_MESSAGES = 5;

  private constructor(props: MessageSummaryProps) {
    super(props);
    this.validate();
  }

  /**
   * 创建消息摘要
   */
  static create(data: {
    totalCount: number;
    recentMessages: Message[];
    lastMessageAt: Date;
    lastMessageBy: 'agent' | 'customer' | 'system';
    unreadCount?: number;
  }): MessageSummary {
    return new MessageSummary({
      totalCount: data.totalCount,
      recentMessages: data.recentMessages.slice(-MessageSummary.MAX_RECENT_MESSAGES),
      lastMessageAt: data.lastMessageAt,
      lastMessageBy: data.lastMessageBy,
      unreadCount: data.unreadCount ?? 0,
    });
  }

  /**
   * 创建空摘要（新对话）
   */
  static createEmpty(): MessageSummary {
    return new MessageSummary({
      totalCount: 0,
      recentMessages: [],
      lastMessageAt: new Date(),
      lastMessageBy: 'system',
      unreadCount: 0,
    });
  }

  private validate(): void {
    if (this.props.totalCount < 0) {
      throw new Error('totalCount must be non-negative');
    }
    if (this.props.unreadCount < 0) {
      throw new Error('unreadCount must be non-negative');
    }
    if (this.props.recentMessages.length > MessageSummary.MAX_RECENT_MESSAGES) {
      throw new Error(`recentMessages must not exceed ${MessageSummary.MAX_RECENT_MESSAGES}`);
    }
  }

  // ==================== Getters ====================

  get totalCount(): number {
    return this.props.totalCount;
  }

  get recentMessages(): Message[] {
    return [...this.props.recentMessages];
  }

  get lastMessageAt(): Date {
    return this.props.lastMessageAt;
  }

  get lastMessageBy(): 'agent' | 'customer' | 'system' {
    return this.props.lastMessageBy;
  }

  get unreadCount(): number {
    return this.props.unreadCount;
  }

  // ==================== 业务方法 ====================

  /**
   * 业务方法：判断是否有新消息（未读消息>0）
   */
  hasNewMessages(): boolean {
    return this.props.unreadCount > 0;
  }

  /**
   * 业务方法：获取最后一条消息内容
   *
   * @param maxLength - 最大长度（用于列表预览）
   * @returns 消息内容，如果没有消息则返回null
   */
  getLastMessageContent(maxLength: number = 50): string | null {
    if (this.props.recentMessages.length === 0) {
      return null;
    }

    const lastMessage = this.props.recentMessages[this.props.recentMessages.length - 1];
    const content = lastMessage.content;

    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength) + '...';
  }

  /**
   * 业务方法：判断客户是否在等待回复
   *
   * 规则：
   * - 最后一条消息由客户发送
   * - 有未读消息
   *
   * 用途：工作台显示"待回复"标签
   */
  isCustomerWaitingForResponse(): boolean {
    return this.props.lastMessageBy === 'customer' && this.props.unreadCount > 0;
  }

  /**
   * 业务方法：判断对话是否活跃
   *
   * 规则：最近24小时内有消息
   *
   * 用途：
   * - 对话列表排序（活跃对话优先）
   * - 自动关闭不活跃对话
   */
  isRecentlyActive(): boolean {
    const now = new Date();
    const hoursSinceLastMessage =
      (now.getTime() - this.props.lastMessageAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastMessage < 24;
  }

  /**
   * 业务方法：判断对话是否长时间无响应
   *
   * @param hours - 小时数阈值（默认4小时）
   * @returns 是否长时间无响应
   *
   * 用途：客户等级监控、告警
   */
  isIdleForHours(hours: number = 4): boolean {
    const now = new Date();
    const hoursSinceLastMessage =
      (now.getTime() - this.props.lastMessageAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastMessage >= hours;
  }

  /**
   * 业务方法：获取对话活跃度描述
   *
   * @returns 活跃度描述（刚刚/N分钟前/N小时前/N天前）
   */
  getActivityDescription(): string {
    const now = new Date();
    const minutesSinceLastMessage =
      (now.getTime() - this.props.lastMessageAt.getTime()) / (1000 * 60);

    if (minutesSinceLastMessage < 1) {
      return '刚刚';
    }

    if (minutesSinceLastMessage < 60) {
      return `${Math.floor(minutesSinceLastMessage)}分钟前`;
    }

    const hoursSinceLastMessage = minutesSinceLastMessage / 60;
    if (hoursSinceLastMessage < 24) {
      return `${Math.floor(hoursSinceLastMessage)}小时前`;
    }

    const daysSinceLastMessage = hoursSinceLastMessage / 24;
    return `${Math.floor(daysSinceLastMessage)}天前`;
  }

  // ==================== 状态转换方法 ====================

  /**
   * 添加新消息后更新摘要
   *
   * @param message - 新消息
   * @returns 新的MessageSummary（不变性）
   *
   * 业务规则：
   * - totalCount +1
   * - 将message添加到recentMessages（保留最近5条）
   * - 更新lastMessageAt和lastMessageBy
   * - 如果是客户消息，unreadCount +1
   */
  withNewMessage(message: Message): MessageSummary {
    const newRecentMessages = [...this.props.recentMessages, message].slice(
      -MessageSummary.MAX_RECENT_MESSAGES,
    );

    return new MessageSummary({
      totalCount: this.props.totalCount + 1,
      recentMessages: newRecentMessages,
      lastMessageAt: message.sentAt,
      lastMessageBy: message.senderType,
      unreadCount:
        message.senderType === 'customer'
          ? this.props.unreadCount + 1
          : this.props.unreadCount,
    });
  }

  /**
   * 标记所有消息已读
   *
   * @returns 新的MessageSummary（unreadCount重置为0）
   *
   * 用途：客服打开对话时自动标记已读
   */
  markAsRead(): MessageSummary {
    if (this.props.unreadCount === 0) {
      return this; // 已读，无需创建新对象
    }

    return new MessageSummary({
      ...this.props,
      unreadCount: 0,
    });
  }

  /**
   * 标记指定数量消息已读
   *
   * @param count - 已读消息数量
   * @returns 新的MessageSummary
   *
   * 用途：部分已读（滚动加载时逐步标记）
   */
  markAsReadPartial(count: number): MessageSummary {
    const newUnreadCount = Math.max(0, this.props.unreadCount - count);

    if (newUnreadCount === this.props.unreadCount) {
      return this; // 无变化
    }

    return new MessageSummary({
      ...this.props,
      unreadCount: newUnreadCount,
    });
  }

  // ==================== 查询方法 ====================

  /**
   * 获取最近N条消息
   *
   * @param count - 消息数量（默认3）
   * @returns 最近N条消息
   */
  getRecentMessages(count: number = 3): Message[] {
    return this.props.recentMessages.slice(-count);
  }

  /**
   * 判断是否为空对话（无消息）
   */
  isEmpty(): boolean {
    return this.props.totalCount === 0;
  }

  /**
   * 判断是否为新对话（消息数<=3）
   */
  isNewConversation(): boolean {
    return this.props.totalCount <= 3;
  }

  /**
   * 判断是否为长对话（消息数>50）
   */
  isLongConversation(): boolean {
    return this.props.totalCount > 50;
  }

  /**
   * 获取统计摘要
   *
   * @returns 统计信息对象
   */
  getStatistics(): {
    totalMessages: number;
    unreadMessages: number;
    lastActivity: string;
    isActive: boolean;
  } {
    return {
      totalMessages: this.props.totalCount,
      unreadMessages: this.props.unreadCount,
      lastActivity: this.getActivityDescription(),
      isActive: this.isRecentlyActive(),
    };
  }
}
