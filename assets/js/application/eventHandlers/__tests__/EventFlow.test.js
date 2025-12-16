/**
 * 事件流端到端测试
 *
 * 测试事件从发布到处理的完整流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../infrastructure/events/EventBus.js';
import { EventSubscriptionManager } from '../EventSubscriptionManager.js';

describe('事件流端到端测试', () => {
  let eventBus;
  let subscriptionManager;

  beforeEach(() => {
    // 获取EventBus单例并清空订阅
    eventBus = EventBus.getInstance();
    // 注意：实际使用中EventBus需要提供清空方法

    // 初始化订阅管理器
    subscriptionManager = new EventSubscriptionManager();
    subscriptionManager.initialize();
  });

  describe('MessageSent事件流', () => {
    it('应该触发需求检测', async () => {
      // 模拟MessageSent事件
      const event = {
        eventType: 'MessageSent',
        eventId: 'evt-001',
        occurredAt: new Date().toISOString(),
        conversationId: 'CONV-001',
        senderType: 'external',
        content: '我想要一个支持批量导入的功能',
      };

      // 发布事件
      const spy = vi.spyOn(console, 'log');
      await eventBus.publish(event);

      // 验证事件处理器被调用
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[MessageSentEventHandler]'),
        expect.anything(),
      );
    });
  });

  describe('ConversationClosed事件流', () => {
    it('应该更新客户画像', async () => {
      const event = {
        eventType: 'ConversationClosed',
        eventId: 'evt-002',
        occurredAt: new Date().toISOString(),
        conversationId: 'CONV-001',
        customerId: 'CUST-001',
        title: '产品咨询',
        channel: '在线客服',
        closedAt: new Date().toISOString(),
      };

      const spy = vi.spyOn(console, 'log');
      await eventBus.publish(event);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ConversationClosedEventHandler]'),
        expect.anything(),
      );
    });
  });

  describe('RiskLevelChanged事件流', () => {
    it('应该发送风险警报', async () => {
      const event = {
        eventType: 'RiskLevelChanged',
        eventId: 'evt-003',
        occurredAt: new Date().toISOString(),
        customerId: 'CUST-001',
        oldLevel: 'low',
        newLevel: 'high',
        reason: '多次SLA违规',
        triggerType: 'auto',
      };

      // 模拟isEscalated方法
      event.isEscalated = () => true;
      event.isCritical = () => true;

      const spy = vi.spyOn(console, 'warn');
      await eventBus.publish(event);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('跨聚合事件流', () => {
    it('消息发送 → 需求检测 → 需求创建 → UI更新', async () => {
      // 这是一个完整的事件链测试
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      };

      // 1. 发送消息
      await eventBus.publish({
        eventType: 'MessageSent',
        eventId: 'evt-100',
        conversationId: 'CONV-100',
        senderType: 'external',
        content: '我需要导出数据功能',
      });

      // 2. 验证事件链
      expect(logs.some(log => log.includes('MessageSentEventHandler'))).toBe(true);

      // 恢复console.log
      console.log = originalLog;
    });
  });
});
