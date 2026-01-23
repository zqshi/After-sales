import { generateId } from '../../../core/utils.js';
import { Channel } from './Channel.js';
import { Participant } from './Participant.js';

/**
 * Conversation聚合根
 *
 * 职责:
 * - 管理对话的完整生命周期
 * - 维护消息集合
 * - 计算客户等级状态
 * - 发布领域事件
 *
 * 不变量(Invariants):
 * - conversationId必须唯一
 * - 关闭的对话不能发送新消息
 * - 消息必须按时间顺序
 */

import { MessageSentEvent } from '../events/MessageSentEvent.js';
import { ConversationAssignedEvent } from '../events/ConversationAssignedEvent.js';
import { ConversationClosedEvent } from '../events/ConversationClosedEvent.js';
import { CustomerLevelViolatedEvent } from '../events/CustomerLevelViolatedEvent.js';

/**
 * 对话状态枚举
 */
export const ConversationStatus = {
  OPEN: 'open',
  PENDING: 'pending',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
};

/**
 * 对话优先级
 */
export const Priority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

/**
 * Message实体
 */
export class Message {
  constructor(data) {
    this.id = data.id || generateId();
    this.conversationId = data.conversationId;
    this.senderId = data.senderId;
    this.senderType = data.senderType; // 'customer' | 'agent' | 'system'
    this.senderName = data.senderName || '';
    this.content = data.content;
    this.messageType = data.messageType || 'text'; // 'text' | 'image' | 'file'
    this.attachments = data.attachments || [];
    this.isRead = data.isRead ?? false;
    this.sentiment = data.sentiment || null; // {score, label, confidence}
    this.timestamp = data.timestamp || new Date().toISOString();
  }

  /**
   * 标记为已读
   */
  markAsRead() {
    this.isRead = true;
  }

  /**
   * 是否来自客户
   */
  isFromCustomer() {
    return this.senderType === 'customer';
  }

  /**
   * 是否来自客服
   */
  isFromAgent() {
    return this.senderType === 'agent';
  }
}

/**
 * Conversation聚合根
 */
export class Conversation {
  constructor(data = {}) {
    // 聚合根标识
    this.id = data.id || generateId();

    // 基本信息
    this.customerId = data.customerId;
    this.customerName = data.customerName || '';
    this.agentId = data.agentId || null;
    this.agentName = data.agentName || '';

    // 渠道和状态
    this.channel = new Channel(data.channel || 'chat');
    this.status = data.status || ConversationStatus.OPEN;
    this.priority = data.priority || Priority.MEDIUM;

    // 主题和标签
    this.subject = data.subject || '';
    this.tags = data.tags || [];

    // 消息集合(实体集合)
    this.messages = (data.messages || []).map(m => new Message(m));

    // 参与者
    this.participants = (data.participants || []).map(p => new Participant(p));

    // 客户等级信息
    this.sla = {
      status: data.sla?.status || '银牌',
      firstResponseTarget: data.sla?.firstResponseTarget || 10, // 分钟
      resolutionTarget: data.sla?.resolutionTarget || 240, // 分钟
      firstResponseElapsed: data.sla?.firstResponseElapsed || 0,
      resolutionElapsed: data.sla?.resolutionElapsed || 0,
      isViolated: data.sla?.isViolated ?? false,
    };

    // 统计信息
    this.unreadCount = data.unreadCount || 0;
    this.messageCount = data.messageCount || this.messages.length;

    // 时间戳
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.closedAt = data.closedAt || null;

    // 领域事件(未提交)
    this._domainEvents = [];
  }

  // ============ 命令方法(改变状态) ============

  /**
   * 发送消息
   */
  sendMessage(senderId, content, options = {}) {
    // 业务规则:关闭的对话不能发送消息
    if (this.status === ConversationStatus.CLOSED) {
      throw new Error('Cannot send message to closed conversation');
    }

    const message = new Message({
      conversationId: this.id,
      senderId,
      senderType: options.senderType || 'agent',
      senderName: options.senderName || '',
      content,
      messageType: options.messageType || 'text',
      attachments: options.attachments || [],
    });

    this.messages.push(message);
    this.messageCount = this.messages.length;
    this.updatedAt = new Date().toISOString();

    // 更新未读数(如果是客户发的)
    if (message.isFromCustomer()) {
      this.unreadCount++;
    }

    // 发布领域事件
    this._addDomainEvent(
      new MessageSentEvent({
        conversationId: this.id,
        messageId: message.id,
        senderId: message.senderId,
        senderType: message.senderType,
        senderName: message.senderName,
        content: message.content,
        messageType: message.messageType,
        channel: this.channel.type,
        customerId: this.customerId,
        agentId: this.agentId,
      }),
    );

    return message;
  }

  /**
   * 标记消息为已读
   */
  markMessagesAsRead() {
    this.messages.forEach(m => {
      if (m.isFromCustomer() && !m.isRead) {
        m.markAsRead();
      }
    });
    this.unreadCount = 0;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 分配客服
   */
  assignAgent(agentId, agentName) {
    if (this.status === ConversationStatus.CLOSED) {
      throw new Error('Cannot assign agent to closed conversation');
    }

    this.agentId = agentId;
    this.agentName = agentName;
    this.updatedAt = new Date().toISOString();

    this._addDomainEvent(
      new ConversationAssignedEvent({
        conversationId: this.id,
        customerId: this.customerId,
        agentId,
        agentName,
        assignedBy: agentId, // 暂时使用agentId，实际应该传入操作人ID
        priority: this.priority,
        channel: this.channel.type,
      }),
    );
  }

  /**
   * 关闭对话
   */
  close(closedBy, resolution = 'resolved') {
    if (this.status === ConversationStatus.CLOSED) {
      throw new Error('Conversation is already closed');
    }

    this.status = ConversationStatus.CLOSED;
    this.closedAt = new Date().toISOString();
    this.updatedAt = this.closedAt;

    const duration = this._calculateDuration();

    this._addDomainEvent(
      new ConversationClosedEvent({
        conversationId: this.id,
        customerId: this.customerId,
        closedBy,
        resolution,
        duration,
        messageCount: this.messageCount,
        agentId: this.agentId,
        channel: this.channel.type,
        slaViolated: this.sla.isViolated,
        slaStatus: this.sla.isViolated ? '违规' : '达标',
      }),
    );
  }

  /**
   * 重新打开对话
   */
  reopen() {
    if (this.status !== ConversationStatus.CLOSED) {
      throw new Error('Only closed conversations can be reopened');
    }

    this.status = ConversationStatus.OPEN;
    this.closedAt = null;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 更新优先级
   */
  updatePriority(priority) {
    const validPriorities = Object.values(Priority);
    if (!validPriorities.includes(priority)) {
      throw new Error(`Invalid priority: ${priority}`);
    }

    this.priority = priority;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 添加标签
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date().toISOString();
    }
  }

  /**
   * 移除标签
   */
  removeTag(tag) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.updatedAt = new Date().toISOString();
    }
  }

  // ============ 查询方法(不改变状态) ============

  /**
   * 是否已关闭
   */
  isClosed() {
    return this.status === ConversationStatus.CLOSED;
  }

  /**
   * 是否有未读消息
   */
  hasUnreadMessages() {
    return this.unreadCount > 0;
  }

  /**
   * 获取最后一条消息
   */
  getLastMessage() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  /**
   * 获取客户消息
   */
  getCustomerMessages() {
    return this.messages.filter(m => m.isFromCustomer());
  }

  /**
   * 获取客服消息
   */
  getAgentMessages() {
    return this.messages.filter(m => m.isFromAgent());
  }

  /**
   * 计算对话持续时间(秒)
   */
  _calculateDuration() {
    if (!this.closedAt) {
      return 0;
    }
    const start = new Date(this.createdAt);
    const end = new Date(this.closedAt);
    return Math.floor((end - start) / 1000);
  }

  /**
   * 检查客户等级是否违反
   */
  checkCustomerLevelViolation() {
    // 简化的客户等级检查逻辑
    const firstResponseViolated = this.sla.firstResponseElapsed > this.sla.firstResponseTarget;
    const resolutionViolated = this.sla.resolutionElapsed > this.sla.resolutionTarget;

    this.sla.isViolated = firstResponseViolated || resolutionViolated;

    if (this.sla.isViolated) {
      this._addDomainEvent(
        new CustomerLevelViolatedEvent({
          conversationId: this.id,
          customerId: this.customerId,
          violationType: firstResponseViolated ? 'firstResponse' : 'resolution',
          expectedTime: firstResponseViolated
            ? this.sla.firstResponseTarget
            : this.sla.resolutionTarget,
          actualTime: firstResponseViolated
            ? this.sla.firstResponseElapsed
            : this.sla.resolutionElapsed,
          slaLevel: this.sla.status,
          severity: 'major',
          agentId: this.agentId,
          agentName: this.agentName,
          channel: this.channel.type,
        }),
      );
    }

    return this.sla.isViolated;
  }

  // ============ 领域事件管理 ============

  /**
   * 添加领域事件
   */
  _addDomainEvent(event) {
    this._domainEvents.push(event);
  }

  /**
   * 获取未提交的领域事件
   */
  getDomainEvents() {
    return [...this._domainEvents];
  }

  /**
   * 清空领域事件
   */
  clearDomainEvents() {
    this._domainEvents = [];
  }
}
