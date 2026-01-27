import { Conversation } from '@domain/conversation/models/Conversation';

export interface IConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
  findByCustomerId(customerId: string): Promise<Conversation[]>;
  getEvents(conversationId: string): Promise<Record<string, unknown>[]>;
  /**
   * ⚠️ updateMessageReceipt 已废弃并移除
   *
   * 废弃原因：
   * - 方法仅更新 metadata，无业务逻辑
   * - 缺少实际应用场景（失败告警、已读统计等）
   * - IM 渠道的消息送达状态追踪价值有限
   *
   * 如需恢复，请先明确业务场景并补充完整逻辑
   */
}
