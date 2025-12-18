/**
 * EventSubscriptionManager - 事件订阅管理器
 *
 * 负责注册所有领域事件的订阅关系
 */

import { EventBus } from '../../infrastructure/events/EventBus.js';

// Conversation事件处理器
import { MessageSentEventHandler } from './conversation/MessageSentEventHandler.js';
import { ConversationClosedEventHandler } from './conversation/ConversationClosedEventHandler.js';
import { SLAViolatedEventHandler } from './conversation/SLAViolatedEventHandler.js';

// Customer事件处理器
import { ProfileRefreshedEventHandler } from './customer/ProfileRefreshedEventHandler.js';
import { RiskLevelChangedEventHandler } from './customer/RiskLevelChangedEventHandler.js';

// Requirement事件处理器
import { RequirementCreatedEventHandler } from './requirement/RequirementCreatedEventHandler.js';

// Task事件处理器
import { TaskStartedEventHandler } from './task/TaskStartedEventHandler.js';
import { TaskCompletedEventHandler } from './task/TaskCompletedEventHandler.js';
import { TaskCancelledEventHandler } from './task/TaskCancelledEventHandler.js';
import { TaskReassignedEventHandler } from './task/TaskReassignedEventHandler.js';
import { KnowledgeItemCreatedEventHandler } from './knowledge/KnowledgeItemCreatedEventHandler.js';
import { KnowledgeItemUpdatedEventHandler } from './knowledge/KnowledgeItemUpdatedEventHandler.js';

export class EventSubscriptionManager {
  constructor() {
    this.eventBus = EventBus.getInstance();
    this.handlers = new Map();
  }

  /**
   * 初始化所有事件订阅
   */
  initialize() {
    console.log('[EventSubscriptionManager] 初始化事件订阅...');

    // 实例化所有处理器
    this.handlers.set('messageSent', new MessageSentEventHandler());
    this.handlers.set('conversationClosed', new ConversationClosedEventHandler());
    this.handlers.set('slaViolated', new SLAViolatedEventHandler());
    this.handlers.set('profileRefreshed', new ProfileRefreshedEventHandler());
    this.handlers.set('riskLevelChanged', new RiskLevelChangedEventHandler());
    this.handlers.set('requirementCreated', new RequirementCreatedEventHandler());
    this.handlers.set('taskStarted', new TaskStartedEventHandler());
    this.handlers.set('taskCompleted', new TaskCompletedEventHandler());
    this.handlers.set('taskCancelled', new TaskCancelledEventHandler());
    this.handlers.set('taskReassigned', new TaskReassignedEventHandler());
    this.handlers.set('knowledgeItemCreated', new KnowledgeItemCreatedEventHandler());
    this.handlers.set('knowledgeItemUpdated', new KnowledgeItemUpdatedEventHandler());

    // 注册订阅
    this._registerConversationEvents();
    this._registerCustomerEvents();
    this._registerRequirementEvents();
    this._registerTaskEvents();
    this._registerKnowledgeEvents();

    console.log('[EventSubscriptionManager] 事件订阅初始化完成，共订阅', this.handlers.size, '个处理器');
  }

  /**
   * 注册对话相关事件
   * @private
   */
  _registerConversationEvents() {
    // MessageSent事件 → 需求检测
    this.eventBus.subscribe('MessageSent', async (event) => {
      await this.handlers.get('messageSent').handle(event);
    });

    // ConversationClosed事件 → 更新客户画像
    this.eventBus.subscribe('ConversationClosed', async (event) => {
      await this.handlers.get('conversationClosed').handle(event);
    });

    // SLAViolated事件 → 发送警报
    this.eventBus.subscribe('SLAViolated', async (event) => {
      await this.handlers.get('slaViolated').handle(event);
    });

    console.log('[EventSubscriptionManager] 对话事件订阅完成 (3个)');
  }

  /**
   * 注册客户相关事件
   * @private
   */
  _registerCustomerEvents() {
    // ProfileRefreshed事件 → 刷新UI
    this.eventBus.subscribe('ProfileRefreshed', async (event) => {
      await this.handlers.get('profileRefreshed').handle(event);
    });

    // RiskLevelChanged事件 → 风险警报
    this.eventBus.subscribe('RiskLevelChanged', async (event) => {
      await this.handlers.get('riskLevelChanged').handle(event);
    });

    // 其他客户事件（可扩展）
    this.eventBus.subscribe('ServiceRecordAdded', async (event) => {
      console.log('[EventSubscriptionManager] ServiceRecordAdded事件:', event.eventId);
      // 可添加专门的处理器
    });

    this.eventBus.subscribe('CommitmentProgressUpdated', async (event) => {
      console.log('[EventSubscriptionManager] CommitmentProgressUpdated事件:', event.eventId);
      // 可添加专门的处理器
    });

    this.eventBus.subscribe('InteractionAdded', async (event) => {
      console.log('[EventSubscriptionManager] InteractionAdded事件:', event.eventId);
      // 可添加专门的处理器
    });

    this.eventBus.subscribe('CustomerMarkedAsVIP', async (event) => {
      console.log('[EventSubscriptionManager] CustomerMarkedAsVIP事件:', event.eventId);
      // 可添加专门的处理器，如发送祝贺邮件
    });

    console.log('[EventSubscriptionManager] 客户事件订阅完成 (6个)');
  }

  /**
   * 注册需求相关事件
   * @private
   */
  _registerRequirementEvents() {
    // RequirementCreated事件 → 刷新需求列表
    this.eventBus.subscribe('RequirementCreated', async (event) => {
      await this.handlers.get('requirementCreated').handle(event);
    });

    // 其他需求事件（可扩展）
    this.eventBus.subscribe('RequirementStatusChanged', async (event) => {
      console.log('[EventSubscriptionManager] RequirementStatusChanged事件:', event.eventId);
      // 可添加专门的处理器
    });

    console.log('[EventSubscriptionManager] 需求事件订阅完成 (2个)');
  }

  /**
   * 注册任务相关事件
   * @private
   */
  _registerTaskEvents() {
    this.eventBus.subscribe('TaskStarted', async (event) => {
      await this.handlers.get('taskStarted').handle(event);
    });

    this.eventBus.subscribe('TaskCompleted', async (event) => {
      await this.handlers.get('taskCompleted').handle(event);
    });

    this.eventBus.subscribe('TaskCancelled', async (event) => {
      await this.handlers.get('taskCancelled').handle(event);
    });

    this.eventBus.subscribe('TaskReassigned', async (event) => {
      await this.handlers.get('taskReassigned').handle(event);
    });

    console.log('[EventSubscriptionManager] 任务事件订阅完成 (4个)');
  }

  /**
   * 注册知识相关事件
   * @private
   */
  _registerKnowledgeEvents() {
    this.eventBus.subscribe('KnowledgeItemCreated', async (event) => {
      await this.handlers.get('knowledgeItemCreated').handle(event);
    });

    this.eventBus.subscribe('KnowledgeItemUpdated', async (event) => {
      await this.handlers.get('knowledgeItemUpdated').handle(event);
    });

    console.log('[EventSubscriptionManager] 知识事件订阅完成 (2个)');
  }

  /**
   * 取消所有订阅（用于测试或清理）
   */
  unsubscribeAll() {
    console.log('[EventSubscriptionManager] 取消所有事件订阅');
    // EventBus的unsubscribeAll方法
    // this.eventBus.unsubscribeAll();
  }
}
