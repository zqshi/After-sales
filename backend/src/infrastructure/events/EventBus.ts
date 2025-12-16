/**
 * EventBus - 简单的事件总线实现
 * 用于发布和订阅领域事件
 */

export interface DomainEvent {
  eventType: string;
  occurredOn: Date;
  [key: string]: any;
}

type EventHandler = (event: DomainEvent) => void | Promise<void>;

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * 订阅事件
   */
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * 取消订阅
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 发布事件
   */
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType);
    if (handlers) {
      for (const handler of handlers) {
        await handler(event);
      }
    }
  }

  /**
   * 批量发布事件
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * 清空所有订阅
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * 获取事件类型的订阅数量
   */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }
}
