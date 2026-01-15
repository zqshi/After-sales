import { Message } from '../models/Message';

/**
 * IMessageRepository - 消息仓储接口
 *
 * 职责：
 * 1. 消息持久化和查询
 * 2. 支持Conversation聚合根的消息懒加载
 * 3. 提供消息摘要统计
 *
 * 注意：
 * - Message不是独立的聚合根，生命周期由Conversation管理
 * - Repository只负责持久化，不负责业务逻辑
 * - 支持分页查询（性能优化）
 */

export interface MessagePagination {
  limit: number;
  offset: number;
}

export interface IMessageRepository {
  /**
   * 保存单条消息
   *
   * 场景：
   * - Conversation.sendMessage()后持久化消息
   * - Application层协调聚合根保存和消息保存
   */
  save(message: Message): Promise<void>;

  /**
   * 批量保存消息
   *
   * 场景：
   * - 导入历史对话
   * - 批量创建消息
   */
  saveMany(messages: Message[]): Promise<void>;

  /**
   * 根据ID查询单条消息
   *
   * 场景：
   * - 消息详情查看
   * - 消息引用/回复
   */
  findById(id: string): Promise<Message | null>;

  /**
   * 查询对话的所有消息
   *
   * 场景：
   * - Conversation.getFullMessages()懒加载
   * - 导出对话历史
   * - 质检审查
   *
   * @param conversationId - 对话ID
   * @param pagination - 分页参数（可选，不提供则查询全部）
   * @returns 消息列表（按sentAt升序排序）
   */
  findByConversationId(
    conversationId: string,
    pagination?: MessagePagination,
  ): Promise<Message[]>;

  /**
   * 统计对话的消息数量
   *
   * 场景：
   * - 计算messageSummary.totalCount
   * - 分页查询的总数
   */
  countByConversationId(conversationId: string): Promise<number>;

  /**
   * 获取对话的消息摘要
   *
   * 核心方法：支持ConversationRepository构建MessageSummary
   *
   * 返回：
   * - totalCount: 总消息数
   * - recentMessages: 最近5条消息
   * - lastMessageAt: 最后消息时间
   * - lastMessageBy: 最后发送者类型
   * - unreadCount: 未读消息数（客服视角）
   *
   * 实现提示：
   * - 使用SQL子查询或窗口函数优化性能
   * - 示例SQL：
   *   ```sql
   *   SELECT
   *     COUNT(*) as total_count,
   *     (SELECT json_agg(m) FROM (
   *       SELECT * FROM messages WHERE conversation_id = $1
   *       ORDER BY sent_at DESC LIMIT 5
   *     ) m) as recent_messages,
   *     MAX(sent_at) as last_message_at,
   *     (SELECT sender_type FROM messages WHERE conversation_id = $1 ORDER BY sent_at DESC LIMIT 1) as last_message_by,
   *     COUNT(*) FILTER (WHERE sender_type = 'customer' AND read_at IS NULL) as unread_count
   *   FROM messages
   *   WHERE conversation_id = $1;
   *   ```
   */
  getMessageSummary(conversationId: string): Promise<{
    totalCount: number;
    recentMessages: Message[];
    lastMessageAt: Date;
    lastMessageBy: 'agent' | 'customer' | 'system';
    unreadCount: number;
  }>;

  /**
   * 标记消息已读
   *
   * 场景：
   * - 客服打开对话时自动标记
   * - Conversation.markMessagesAsRead()
   *
   * @param conversationId - 对话ID
   * @param readBy - 读取者ID（客服ID）
   * @param readAt - 读取时间（默认当前时间）
   */
  markAsRead(
    conversationId: string,
    readBy: string,
    readAt?: Date,
  ): Promise<number>; // 返回标记数量

  /**
   * 删除对话的所有消息
   *
   * 场景：
   * - 对话归档后清理
   * - GDPR数据删除
   *
   * 注意：
   * - 软删除（标记deleted_at）而非物理删除
   * - 需要保留审计日志
   */
  deleteByConversationId(conversationId: string): Promise<number>; // 返回删除数量

  /**
   * 搜索消息
   *
   * 场景：
   * - 全文搜索对话内容
   * - 查找特定关键词的消息
   *
   * @param query - 搜索关键词
   * @param options - 搜索选项（可选）
   */
  search(
    query: string,
    options?: {
      conversationId?: string; // 限定对话范围
      senderType?: 'agent' | 'customer' | 'system'; // 限定发送者类型
      startDate?: Date; // 时间范围起始
      endDate?: Date; // 时间范围结束
      limit?: number; // 结果数量限制
    },
  ): Promise<Message[]>;
}

/**
 * 使用示例：Repository在Application层注入
 */

/**
 * 示例1: SendMessageUseCase（Application层）
 */
/*
export class SendMessageUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
    private readonly messageRepository: IMessageRepository,
  ) {}

  async execute(command: SendMessageCommand): Promise<void> {
    // 1. 加载Conversation（不含完整消息）
    const conversation = await this.conversationRepository.findById(command.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // 2. 发送消息（更新messageSummary）
    const message = conversation.sendMessage({
      senderId: command.senderId,
      senderType: command.senderType,
      content: command.content,
    });

    // 3. 持久化消息（新增）
    await this.messageRepository.save(message);

    // 4. 持久化Conversation（更新messageSummary）
    await this.conversationRepository.save(conversation);

    // ✅ 性能优化：不保存完整messages数组
  }
}
*/

/**
 * 示例2: GetConversationDetailUseCase（Application层）
 */
/*
export class GetConversationDetailUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
    private readonly messageRepository: IMessageRepository,
  ) {}

  async execute(conversationId: string): Promise<ConversationDetailDTO> {
    // 1. 加载Conversation（只含messageSummary）
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // 2. 懒加载完整消息（按需）
    const messages = await conversation.getFullMessages(this.messageRepository);

    // 3. 组装DTO
    return {
      id: conversation.id,
      customerId: conversation.customerId,
      agentId: conversation.agentId,
      status: conversation.status,
      messageSummary: {
        totalCount: conversation.messageSummary.totalCount,
        unreadCount: conversation.messageSummary.unreadCount,
        lastActivity: conversation.messageSummary.getActivityDescription(),
      },
      messages: messages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        senderType: msg.senderType,
        content: msg.content,
        sentAt: msg.sentAt,
      })),
    };

    // ✅ 按需加载：只在需要时才加载完整消息
  }
}
*/
