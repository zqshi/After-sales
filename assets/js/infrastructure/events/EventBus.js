/**
 * 事件总线 - 发布/订阅模式实现
 * 用于领域事件的发布和订阅,支持跨模块通信
 *
 * @example
 * import { eventBus } from '@/infrastructure/events/EventBus.js';
 *
 * // 订阅事件
 * const unsubscribe = eventBus.subscribe('MessageSent', (event) => {
 *   console.log('Message sent:', event);
 * });
 *
 * // 发布事件
 * await eventBus.publish({
 *   eventId: 'evt-001',
 *   eventType: 'MessageSent',
 *   occurredAt: new Date().toISOString(),
 *   conversationId: 'conv-123',
 *   messageId: 'msg-456',
 * });
 *
 * // 取消订阅
 * unsubscribe();
 */
export class EventBus {
  constructor() {
    this.subscribers = new Map(); // eventType -> Set<handler>
    this.eventStore = []; // 事件存储(可选)
    this.maxStoreSize = 1000; // 最大存储数量
    this.enabled = true; // 事件总线开关
  }

  /**
   * 订阅事件
   * @param {string} eventType - 事件类型 (如 'MessageSent')
   * @param {Function} handler - 处理函数 (event) => void | Promise<void>
   * @returns {Function} 取消订阅函数
   */
  subscribe(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('[EventBus] Handler must be a function');
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    this.subscribers.get(eventType).add(handler);

    // 返回取消订阅函数
    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        // 如果没有订阅者了,清理Map
        if (handlers.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * 发布事件
   * @param {Object} event - 领域事件对象
   * @param {string} event.eventId - 事件唯一ID
   * @param {string} event.eventType - 事件类型
   * @param {string} event.occurredAt - 事件发生时间(ISO 8601)
   * @returns {Promise<void>}
   */
  async publish(event) {
    if (!this.enabled) {
      console.warn('[EventBus] Event bus is disabled, event not published:', event.eventType);
      return;
    }

    // 验证事件
    this._validateEvent(event);

    // 存储事件(用于审计和调试)
    this._storeEvent(event);

    // 获取订阅者
    const handlers = this.subscribers.get(event.eventType);
    if (!handlers || handlers.size === 0) {
      if (import.meta.env.DEV) {
        console.warn(`[EventBus] No subscribers for event: ${event.eventType}`);
      }
      return;
    }

    // 异步执行所有处理器
    const promises = Array.from(handlers).map((handler) =>
      this._executeHandler(handler, event),
    );

    // 等待所有处理器完成
    const results = await Promise.allSettled(promises);

    // 记录失败
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length > 0) {
      console.error(
        `[EventBus] ${failures.length} handler(s) failed for ${event.eventType}:`,
        failures.map((f) => f.reason),
      );
    }
  }

  /**
   * 执行单个处理器
   * @private
   */
  async _executeHandler(handler, event) {
    try {
      await handler(event);
    } catch (err) {
      console.error(
        `[EventBus] Handler execution error for ${event.eventType}:`,
        err,
      );
      throw err;
    }
  }

  /**
   * 验证事件格式
   * @private
   */
  _validateEvent(event) {
    if (!event || typeof event !== 'object') {
      throw new Error('[EventBus] Event must be an object');
    }

    if (!event.eventType) {
      throw new Error('[EventBus] Event must have eventType property');
    }

    if (!event.eventId) {
      throw new Error('[EventBus] Event must have eventId property');
    }

    if (!event.occurredAt) {
      throw new Error('[EventBus] Event must have occurredAt property');
    }
  }

  /**
   * 存储事件(用于审计和重放)
   * @private
   */
  _storeEvent(event) {
    this.eventStore.push({
      ...event,
      storedAt: new Date().toISOString(),
    });

    // 限制存储大小(FIFO)
    if (this.eventStore.length > this.maxStoreSize) {
      this.eventStore.shift();
    }
  }

  /**
   * 获取事件历史
   * @param {Object} filter - 过滤条件
   * @param {string} filter.eventType - 事件类型
   * @param {string} filter.startTime - 开始时间
   * @param {string} filter.endTime - 结束时间
   * @returns {Array} 事件列表
   */
  getEventHistory(filter = {}) {
    let events = [...this.eventStore];

    if (filter.eventType) {
      events = events.filter((e) => e.eventType === filter.eventType);
    }

    if (filter.startTime) {
      events = events.filter((e) => e.occurredAt >= filter.startTime);
    }

    if (filter.endTime) {
      events = events.filter((e) => e.occurredAt <= filter.endTime);
    }

    return events;
  }

  /**
   * 清空订阅者(用于测试)
   */
  clear() {
    this.subscribers.clear();
  }

  /**
   * 清空事件历史
   */
  clearHistory() {
    this.eventStore = [];
  }

  /**
   * 启用事件总线
   */
  enable() {
    this.enabled = true;
  }

  /**
   * 禁用事件总线
   */
  disable() {
    this.enabled = false;
  }

  /**
   * 获取订阅统计
   * @returns {Object} 统计信息
   */
  getStats() {
    const stats = {
      totalEventTypes: this.subscribers.size,
      totalSubscribers: 0,
      eventTypes: {},
      eventsStored: this.eventStore.length,
      enabled: this.enabled,
    };

    for (const [eventType, handlers] of this.subscribers) {
      stats.eventTypes[eventType] = handlers.size;
      stats.totalSubscribers += handlers.size;
    }

    return stats;
  }

  /**
   * 获取单例实例
   * @returns {EventBus} EventBus 单例
   */
  static getInstance() {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }
}

// 导出单例
export const eventBus = new EventBus();
// 保存到静态属性
EventBus._instance = eventBus;
