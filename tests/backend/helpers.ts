import { v4 as uuidv4 } from 'uuid';

// ============================================
// 对话（Conversation）测试数据工厂
// ============================================

export function createMockConversationData(overrides: Partial<{
  id: string;
  customerId: string;
  agentId: string;
  channel: string;
  status: string;
  priority: string;
}> = {}) {
  return {
    id: uuidv4(),
    customerId: 'test-customer-' + Date.now(),
    agentId: 'test-agent-001',
    channel: 'chat',
    status: 'open',
    priority: 'normal',
    ...overrides,
  };
}

export function createMockMessageData(conversationId: string, overrides: Partial<{
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  contentType: string;
}> = {}) {
  return {
    id: uuidv4(),
    conversationId,
    senderId: 'test-user-001',
    senderType: 'agent' as const,
    content: 'Test message content',
    contentType: 'text',
    ...overrides,
  };
}

// ============================================
// 客户（Customer Profile）测试数据工厂
// ============================================

export function createMockCustomerProfileData(overrides: Partial<{
  id: string;
  customerId: string;
  name: string;
  company: string;
  tags: string[];
  healthScore: number;
}> = {}) {
  return {
    id: uuidv4(),
    customerId: 'cust-' + Date.now(),
    name: 'Test Customer',
    company: 'Test Company',
    tags: ['test'],
    healthScore: 75,
    contactInfo: {
      email: 'test@example.com',
      phone: '13800138000',
    },
    slaInfo: {
      responseTime: 30,
      resolutionTime: 120,
    },
    metrics: {
      totalOrders: 10,
      totalRevenue: 100000,
    },
    ...overrides,
  };
}

// ============================================
// 需求（Requirement）测试数据工厂
// ============================================

export function createMockRequirementData(overrides: Partial<{
  id: string;
  conversationId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
}> = {}) {
  return {
    id: uuidv4(),
    conversationId: null,
    title: 'Test Requirement',
    description: 'This is a test requirement',
    category: 'feature',
    priority: 'medium',
    status: 'pending',
    source: 'manual',
    createdBy: 'test-user',
    ...overrides,
  };
}

// ============================================
// 任务（Task）测试数据工厂
// ============================================

export function createMockTaskData(overrides: Partial<{
  id: string;
  conversationId: string;
  title: string;
  description: string;
  assigneeId: string;
  status: string;
  priority: string;
  estimatedHours: number;
}> = {}) {
  return {
    id: uuidv4(),
    conversationId: null,
    title: 'Test Task',
    description: 'This is a test task',
    assigneeId: 'test-agent-001',
    status: 'pending',
    priority: 'medium',
    estimatedHours: 2.0,
    actualHours: null,
    qualityScore: null,
    ...overrides,
  };
}

// ============================================
// 领域事件测试数据工厂
// ============================================

export function createMockDomainEventData(overrides: Partial<{
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  version: number;
}> = {}) {
  return {
    id: uuidv4(),
    aggregateId: uuidv4(),
    aggregateType: 'Conversation',
    eventType: 'MessageSent',
    eventData: {
      messageId: uuidv4(),
      content: 'Test message',
    },
    version: 1,
    occurredAt: new Date(),
    ...overrides,
  };
}

// ============================================
// 测试辅助函数
// ============================================

/**
 * 等待指定毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成随机整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 创建未来的日期
 */
export function futureDate(hoursFromNow: number): Date {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date;
}

/**
 * 创建过去的日期
 */
export function pastDate(hoursAgo: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date;
}
