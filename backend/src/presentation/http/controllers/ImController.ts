/**
 * ImController - IM消息接入控制器
 *
 * 职责：
 * 1. 接收多渠道IM消息（飞书/企微/钉钉/Web）
 * 2. 调用ConversationTaskCoordinator处理消息
 * 3. 调用AiService分析情绪
 * 4. 查询知识库和工单
 * 5. 组装完整响应返回前端
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ConversationTaskCoordinator } from '@application/services/ConversationTaskCoordinator';
import { AiService } from '@application/services/AiService';
import { SearchKnowledgeUseCase } from '@application/use-cases/knowledge/SearchKnowledgeUseCase';
import { SendMessageUseCase } from '@application/use-cases/SendMessageUseCase';
import { CustomerProfileResponseDTO } from '@application/dto/customer/CustomerProfileResponseDTO';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { ConversationRepository } from '@infrastructure/repositories/ConversationRepository';
import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';
import { ProblemRepository } from '@infrastructure/repositories/ProblemRepository';
import { ReviewRequestRepository } from '@infrastructure/repositories/ReviewRequestRepository';
import { CompleteReviewRequestUseCase } from '@application/use-cases/review/CompleteReviewRequestUseCase';
import { CreateTaskUseCase } from '@application/use-cases/task/CreateTaskUseCase';
import { config } from '@config/app.config';
import { v4 as uuidv4 } from 'uuid';

import { AgentMode } from '@domain/conversation/models/Conversation';
import { Conversation } from '@domain/conversation/models/Conversation';
import { CustomerProfile } from '@domain/customer/models/CustomerProfile';
import { ContactInfo } from '@domain/customer/value-objects/ContactInfo';
import { CustomerLevelInfo } from '@domain/customer/value-objects/CustomerLevelInfo';
import { Metrics } from '@domain/customer/value-objects/Metrics';
import { promises as fs } from 'fs';
import path from 'path';

interface IncomingMessageRequest {
  customerId: string;
  content: string;
  channel: 'feishu' | 'wecom' | 'dingtalk' | 'web';
  senderId: string;
  mode?: AgentMode; // Agent处理模式
  metadata?: Record<string, unknown>;
}

export class ImController {
  constructor(
    private readonly coordinator: ConversationTaskCoordinator,
    private readonly aiService: AiService,
    private readonly searchKnowledgeUseCase: SearchKnowledgeUseCase,
    private readonly taskRepository: TaskRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly reviewRequestRepository: ReviewRequestRepository,
    private readonly completeReviewRequestUseCase: CompleteReviewRequestUseCase,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly problemRepository: ProblemRepository,
  ) {}

  /**
   * 处理IM消息接入
   *
   * POST /api/im/incoming-message
   */
  async handleIncomingMessage(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const body = request.body as IncomingMessageRequest;

      // 1. 参数验证
      if (!body.customerId || !body.content || !body.channel || !body.senderId) {
        return reply.code(400).send({
          success: false,
          error: '缺少必需参数：customerId, content, channel, senderId',
        });
      }

      // 2. 调用ConversationTaskCoordinator处理消息
      const processingResult = await this.coordinator.processCustomerMessage({
        customerId: body.customerId,
        content: body.content,
        channel: body.channel,
        senderId: body.senderId,
        mode: body.mode,
        metadata: body.metadata,
      });

      // 3. 分析单条消息的情绪（支持多轮对话上下文）
      let conversationHistory: Array<{ role: string; content: string }> = [];
      try {
        // 获取对话历史用于情绪趋势分析
        const conversation = await this.conversationRepository.findById(
          processingResult.conversationId,
        );
        if (conversation?.messages) {
          conversationHistory = conversation.messages
            .slice(-5) // 只取最近5条
            .map((msg: any) => ({
              role: msg.senderType === 'external' ? 'customer' : 'agent',
              content: msg.content,
            }));
        }
      } catch (err) {
        console.warn('[ImController] 获取对话历史失败，仅分析单条消息', err);
      }

      const sentiment = await this.aiService.analyzeSentiment(body.content, conversationHistory);

      // 4. 查询知识库推荐（优化：使用LLM提取关键词）
      let knowledgeRecommendations: Array<{
        id: string;
        title: string;
        category: string;
        score: number;
        url: string;
        type: 'knowledge';
      }> = [];

      try {
        // 4.1 使用LLM提取意图和关键词
        let searchQuery = body.content;
        let intentInfo = null;

        const llmClient = (this.aiService as any).llmClient;
        if (llmClient && llmClient.isEnabled()) {
          try {
            intentInfo = await llmClient.extractIntent(body.content);
            // 使用提取的关键词作为查询
            if (intentInfo.keywords && intentInfo.keywords.length > 0) {
              searchQuery = intentInfo.keywords.join(' ');
            }
          } catch (err) {
            console.warn('[ImController] LLM意图提取失败，使用原始查询', err);
          }
        }

        // 4.2 搜索知识库
        const knowledgeResults = await this.searchKnowledgeUseCase.execute({
          query: searchQuery,
          mode: 'keyword',
          filters: {
            limit: 10, // 多取一些，后面按相关性过滤
          },
        });

        // 4.3 计算相关性分数并过滤
        const baseUrl = config.app?.baseUrl || 'http://localhost:3000';
        knowledgeRecommendations = knowledgeResults
          .map((item) => {
            // 简单相关性计算：标题包含关键词
            let score = 0.5; // 基础分
            const keywords = intentInfo?.keywords || body.content.split(/\s+/).slice(0, 3);
            keywords.forEach((keyword: string) => {
              if (item.title.includes(keyword)) {
                score += 0.2;
              }
              if (item.tags?.includes(keyword)) {
                score += 0.15;
              }
            });
            score = Math.min(score, 0.99);

            return {
              id: item.id,
              title: item.title,
              category: item.category,
              score,
              url: `${baseUrl}/knowledge/${item.id}`,
              type: 'knowledge' as const,
            };
          })
          .filter((item) => item.score >= 0.6) // 过滤低相关性
          .sort((a, b) => b.score - a.score) // 按分数排序
          .slice(0, 5); // 取前5条
      } catch (err) {
        console.warn('[ImController] 知识库查询失败', err);
      }

      // 5. 查询关联工单
      let relatedTasks: Array<{
        id: string;
        title: string;
        priority: string;
        url: string;
      }> = [];

      try {
        const tasks = await this.taskRepository.findByFilters({
          conversationId: processingResult.conversationId,
        });

        const baseUrl = config.app?.baseUrl || 'http://localhost:3000';
        relatedTasks = tasks.map((task) => ({
          id: task.id,
          title: task.title,
          priority: task.priority.value,
          url: `${baseUrl}/tasks/${task.id}`,
        }));
      } catch (err) {
        console.warn('[ImController] 工单查询失败', err);
      }

      // 6. 组装完整响应
      const response = {
        success: true,
        data: {
          conversationId: processingResult.conversationId,
          message: {
            id: uuidv4(),
            content: body.content,
            sentiment: {
              emotion: sentiment.overallSentiment,
              score: sentiment.score,
              confidence: sentiment.confidence,
            },
            timestamp: new Date().toISOString(),
          },
          analysis: {
            hasRequirements:
              (processingResult.agentSuggestion?.detectedRequirements?.length || 0) > 0,
            requirements:
              processingResult.agentSuggestion?.detectedRequirements || [],
            knowledgeRecommendations,
            relatedTasks,
          },
          agentSuggestion: processingResult.agentSuggestion
            ? {
                suggestedReply: processingResult.agentSuggestion.suggestedReply,
                confidence: processingResult.agentSuggestion.confidence,
                needsHumanReview:
                  processingResult.agentSuggestion.needsHumanReview,
                reason: processingResult.agentSuggestion.reason,
                agentName: processingResult.agentSuggestion.agentName,
                mode: processingResult.agentSuggestion.mode,
                reviewRequestId: processingResult.agentSuggestion.reviewRequestId,
                recommendedTasks: processingResult.agentSuggestion.recommendedTasks || [],
              }
            : null,
          status: processingResult.status,
        },
      };

      reply.code(200).send(response);
    } catch (error) {
      console.error('[ImController] handleIncomingMessage error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 获取会话列表
   * GET /im/conversations
   */
  async getConversations(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const query = request.query as {
        limit?: string;
        offset?: string;
        page?: string;
        pageSize?: string;
        status?: string;
        agentId?: string;
        customerId?: string;
        channel?: string;
        includeProblem?: string;
      };

      const normalizedLimit = Number.parseInt(
        query.pageSize || query.limit || '20',
        10,
      );
      const normalizedOffset = Number.parseInt(
        query.offset || '0',
        10,
      );
      const page = query.page ? Number.parseInt(query.page, 10) : undefined;
      const offset = page && page > 0 ? (page - 1) * normalizedLimit : normalizedOffset;

      const statusFilter =
        query.status === 'active' ? 'open' : query.status;
      const filters = {
        status: statusFilter as any,
        agentId: query.agentId,
        customerId: query.customerId,
        channel: query.channel,
      };

      const userName = (request.user as { name?: string } | undefined)?.name?.trim();
      const shouldFilterByMembership =
        Boolean(userName) && (!query.channel || query.channel === 'wecom');

      let [conversationList, total] = await Promise.all([
        this.conversationRepository.findByFilters(filters, {
          limit: normalizedLimit,
          offset,
        }),
        this.conversationRepository.countByFilters(filters),
      ]);

      if (shouldFilterByMembership && total > 0) {
        if (conversationList.length < total) {
          conversationList = await this.conversationRepository.findByFilters(filters, {
            limit: total,
            offset: 0,
          });
        }

        const normalizedUserName = userName || '';
        const filtered = conversationList.filter((conversation) => {
          if (conversation.channel.value !== 'wecom') {
            return true;
          }

          const groupMembers = (conversation.metadata as Record<string, unknown> | undefined)
            ?.groupMembers;
          if (!Array.isArray(groupMembers) || groupMembers.length === 0) {
            return true;
          }

          return groupMembers.some(
            (member) => typeof member === 'string' && member.trim() === normalizedUserName,
          );
        });

        total = filtered.length;
        conversationList = filtered.slice(offset, offset + normalizedLimit);
      }

      const profiles = await Promise.all(
        conversationList.map((conversation) =>
          this.customerProfileRepository.findById(conversation.customerId),
        ),
      );

      const includeProblem = query.includeProblem === 'true' || query.includeProblem === '1';
      const problemResults = includeProblem
        ? await Promise.all(
            conversationList.map((conversation) =>
              this.evaluateConversationProblem(conversation),
            ),
          )
        : [];

      const conversations = conversationList.map((conversation, index) => {
        const profile = profiles[index];
        const lastMessage = [...conversation.messages]
          .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0];
        const lastMessageTime = lastMessage?.sentAt?.toISOString();
        const lastMessageSenderType =
          lastMessage?.senderType === 'agent' ? 'agent' : lastMessage ? 'customer' : null;
        const lastMessageMetadata = (lastMessage?.metadata || {}) as Record<string, unknown>;
        const conversationMetadata = (conversation.metadata || {}) as Record<string, unknown>;
        const groupMemberMap =
          ((lastMessageMetadata.groupMemberMap as Record<string, string> | undefined) ||
            (conversationMetadata.groupMemberMap as Record<string, string> | undefined) ||
            {}) as Record<string, string>;
        const metadataSenderId =
          (lastMessageMetadata.senderId as string | undefined) ||
          (lastMessageMetadata.sender_id as string | undefined);
        const mappedSenderName = metadataSenderId ? groupMemberMap[metadataSenderId] : undefined;
        const lastMessageSenderName =
          (lastMessageMetadata.senderName as string | undefined) ||
          mappedSenderName ||
          (lastMessageSenderType === 'agent' ? '客服' : profile?.name || '客户');
        const slaInfo = (profile as any)?.slaInfo as Record<string, unknown> | undefined;
        const serviceLevel = slaInfo?.serviceLevel as string | undefined;
        const severity =
          conversation.priority === 'high'
            ? 'high'
            : conversation.priority === 'low'
              ? 'low'
              : 'normal';
        const urgency = conversation.priority === 'high' ? 'high' : 'normal';

        const problem = includeProblem ? problemResults[index] : null;
        const isProblem = problem?.isProblem ?? null;
        const problemStatus =
          isProblem === true ? 'pending' : isProblem === false ? 'active' : undefined;

        return {
          id: conversation.id,
          conversationId: conversation.id,
          customerId: conversation.customerId,
          customerName: profile?.name || '客户',
          channel: conversation.channel.value,
          status: conversation.status,
          mode: conversation.mode,
          lastMessage: lastMessage?.content || '',
          lastMessageSenderType,
          lastMessageSenderName,
          lastMessageTime,
          unreadCount: 0,
          agentId: conversation.agentId || null,
          agentName: conversation.agentId ? '客服' : null,
          slaLevel: serviceLevel || (profile?.isVIP ? 'VIP' : '普通'),
          urgency,
          severity,
          createdAt: conversation.createdAt.toISOString(),
          updatedAt: conversation.updatedAt.toISOString(),
          isProblem,
          problemIntent: problem?.intent ?? null,
          problemConfidence: problem?.confidence ?? null,
          problemStatus,
        };
      });

      reply.code(200).send({
        success: true,
        data: {
          conversations,
          total,
          limit: normalizedLimit,
          offset,
        },
      });
    } catch (error) {
      console.error('[ImController] getConversations error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 获取会话统计（基于筛选维度 + LLM问题识别）
   * GET /im/conversations/stats
   */
  async getConversationStats(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const query = request.query as {
        channel?: string;
        urgency?: string;
        sla?: string;
      };

      const baseFilters = {
        channel: query.channel || undefined,
      };

      const total = await this.conversationRepository.countByFilters(baseFilters);
      if (total === 0) {
        reply.code(200).send({
          success: true,
          data: {
            statusCounts: { all: 0, pending: 0, active: 0 },
          },
        });
        return;
      }

      const conversations = await this.conversationRepository.findByFilters(baseFilters, {
        limit: total,
        offset: 0,
      });
      const profiles = await Promise.all(
        conversations.map((conversation) =>
          this.customerProfileRepository.findById(conversation.customerId),
        ),
      );

      const urgencyFilter = query.urgency?.toLowerCase();
      const slaFilter = query.sla?.toLowerCase();

      const filtered = conversations.filter((conversation, index) => {
        if (urgencyFilter) {
          const priority =
            conversation.priority === 'high'
              ? 'high'
              : conversation.priority === 'low'
                ? 'low'
                : 'normal';
          if (priority !== urgencyFilter) {
            return false;
          }
        }

        if (slaFilter) {
          const profile = profiles[index];
          const slaInfo = (profile as any)?.slaInfo as Record<string, unknown> | undefined;
          const serviceLevel = slaInfo?.serviceLevel as string | undefined;
          const slaLevel = (serviceLevel || (profile?.isVIP ? 'VIP' : '普通')).toLowerCase();
          if (slaLevel !== slaFilter) {
            return false;
          }
        }

        return true;
      });

      const problemResults = await Promise.all(
        filtered.map((conversation) => this.evaluateConversationProblem(conversation)),
      );

      const problemCount = problemResults.filter((result) => result?.isProblem).length;
      const llmEnabled = problemResults.some((result) => result?.isProblem !== null);
      const totalFiltered = filtered.length;

      reply.code(200).send({
        success: true,
        data: {
          statusCounts: {
            all: totalFiltered,
            pending: llmEnabled ? problemCount : null,
            active: llmEnabled ? totalFiltered - problemCount : null,
          },
        },
      });
    } catch (error) {
      console.error('[ImController] getConversationStats error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 同步企业微信Mock群聊数据（演示用）
   * POST /im/wecom/mock/sync
   */
  async syncWecomMockGroupChats(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const body = (request.body ?? {}) as { limit?: number; reset?: boolean };
      const data = await this.loadWecomMockData();
      const groupChats = data.groupChatList.group_chat_list || [];
      const limit = body.limit && body.limit > 0 ? Math.min(body.limit, groupChats.length) : groupChats.length;

      let customersCreated = 0;
      let messagesImported = 0;

      if (body.reset) {
        await this.conversationRepository.deleteByChannel('wecom');
      }

      for (const entry of groupChats.slice(0, limit)) {
        const chatId = entry.chat_id;
        const detail = data.groupChatDetails.group_chat_details?.[chatId]?.group_chat;
        if (!detail) {
          continue;
        }

        const customerId = `wecom-${chatId}`;
        if (body.reset) {
          await this.conversationRepository.deleteByCustomerId(customerId);
        }
        const profile = await this.customerProfileRepository.findById(customerId);
        if (!profile) {
          const contactInfo = ContactInfo.create({ preferredChannel: 'chat' });
          const slaInfo = CustomerLevelInfo.create({
            serviceLevel: 'silver',
            responseTimeTargetMinutes: 60,
            resolutionTimeTargetMinutes: 240,
          });
          const metrics = Metrics.create({
            satisfactionScore: 0,
            issueCount: 0,
            averageResolutionMinutes: 0,
          });

          const newProfile = CustomerProfile.create({
            customerId,
            name: detail.name || customerId,
            contactInfo,
            slaInfo,
            metrics,
          });
          await this.customerProfileRepository.save(newProfile);
          customersCreated += 1;
        }

        const groupMembers = Array.isArray(detail.member_list)
          ? detail.member_list
              .map((member: { name?: string }) => member?.name?.trim())
              .filter((name: string | undefined): name is string => Boolean(name))
          : [];
        const memberNameMap = Array.isArray(detail.member_list)
          ? detail.member_list.reduce((acc: Record<string, string>, member: { userid?: string; name?: string }) => {
              const userId = member?.userid?.trim();
              const name = member?.name?.trim();
              if (userId && name) {
                acc[userId] = name;
              }
              return acc;
            }, {})
          : {};
        const memberTypeMap = Array.isArray(detail.member_list)
          ? detail.member_list.reduce((acc: Record<string, number>, member: { userid?: string; type?: number }) => {
              const userId = member?.userid?.trim();
              const type = member?.type;
              if (userId && typeof type === 'number') {
                acc[userId] = type;
              }
              return acc;
            }, {})
          : {};
        const messages = data.groupChatMessages.group_chat_messages?.[chatId] || [];
        const sortedMessages = [...messages].sort(
          (a, b) => (a?.sent_at ?? 0) - (b?.sent_at ?? 0),
        );
        let activeConversation: Conversation | null = null;
        for (const message of sortedMessages) {
          if (!message?.content) {
            continue;
          }
          const memberType = memberTypeMap[message.sender_id];
          const normalizedSenderType =
            message.sender_type === 'agent' || memberType === 1 ? 'agent' : 'customer';
          const senderName = memberNameMap[message.sender_id] || undefined;
          const messageMetadata = {
            chatId,
            groupName: detail.name,
            groupMembers,
            groupMemberMap: memberNameMap,
            memberType,
            senderType: normalizedSenderType,
            senderId: message.sender_id,
            senderName,
            sentAt: message.sent_at,
            status: entry.status,
            issueProduct: message.issue_product,
            faultLevel: message.fault_level,
          };

          if (normalizedSenderType === 'customer') {
            const result = await this.coordinator.processCustomerMessage({
              customerId,
              content: message.content,
              channel: 'wecom',
              senderId: customerId,
              metadata: messageMetadata,
            });
            activeConversation = await this.conversationRepository.findById(result.conversationId);
            messagesImported += 1;
            continue;
          }

          if (!activeConversation) {
            const existing = await this.conversationRepository.findByFilters(
              { customerId, status: 'open' },
              { limit: 1, offset: 0 },
            );
            activeConversation = existing[0] ?? null;
          }

          if (!activeConversation) {
            continue;
          }

          const agentId = message.sender_id || 'agent-system';
          if (!activeConversation.agentId || activeConversation.agentId !== agentId) {
            activeConversation.assignAgent(agentId, {
              assignedBy: 'system',
              reason: 'auto',
              metadata: { source: 'wecom_mock' },
            });
            await this.conversationRepository.save(activeConversation);
          }

          await this.sendMessageUseCase.execute({
            conversationId: activeConversation.id,
            senderId: agentId,
            senderType: 'internal',
            content: message.content,
            metadata: messageMetadata,
          });
          messagesImported += 1;
        }
      }

      reply.code(200).send({
        success: true,
        data: {
          groupChats: limit,
          customersCreated,
          messagesImported,
        },
      });
    } catch (error) {
      console.error('[ImController] syncWecomMockGroupChats error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 获取会话历史消息
   * GET /im/conversations/:id/messages
   */
  async getConversationMessages(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const { limit = 40, offset = 0 } = request.query as any;
      const conversation = await this.conversationRepository.findById(id);
      if (!conversation) {
        reply.code(404).send({
          success: false,
          error: '会话不存在',
        });
        return;
      }

      const profile = await this.customerProfileRepository.findById(
        conversation.customerId,
      );

      const sortedMessages = [...conversation.messages].sort(
        (a, b) => a.sentAt.getTime() - b.sentAt.getTime(),
      );

      const start = Number(offset);
      const end = start + Number(limit);
      const slice = sortedMessages.slice(start, end);
      const conversationMetadata = (conversation.metadata || {}) as Record<string, unknown>;
      const groupMemberMap = (conversationMetadata.groupMemberMap || {}) as Record<string, string>;
      const messages = await Promise.all(
        slice.map(async (message, index) => {
          const senderType = message.senderType === 'agent' ? 'agent' : 'customer';
          const messageIndex = start + index;
          const history = sortedMessages
            .slice(Math.max(0, messageIndex - 5), messageIndex)
            .map((msg) => ({
              role: msg.senderType === 'agent' ? 'agent' : 'customer',
              content: msg.content,
            }));
          const sentimentResult =
            senderType === 'customer'
              ? await this.aiService.analyzeSentiment(message.content, history)
              : undefined;
          const sentiment = sentimentResult
            ? {
                emotion: sentimentResult.overallSentiment,
                score: sentimentResult.score,
                confidence: sentimentResult.confidence,
                emotions: sentimentResult.emotions,
                reasoning: sentimentResult.reasoning,
              }
            : undefined;
          const metadata = message.metadata || {};
          const fallbackName =
            senderType === 'agent' ? '客服' : profile?.name || '客户';
          const metadataSenderId =
            (metadata as { senderId?: string }).senderId ||
            (metadata as { sender_id?: string }).sender_id;
          const mappedSenderName = metadataSenderId ? groupMemberMap[metadataSenderId] : undefined;
          const senderName =
            (metadata as { senderName?: string }).senderName ||
            mappedSenderName ||
            metadataSenderId ||
            fallbackName;

          return {
            id: message.id,
            conversationId: conversation.id,
            content: message.content,
            senderType,
            senderId: message.senderId,
            senderName,
            timestamp: message.sentAt.toISOString(),
            sentAt: message.sentAt.toISOString(),
            metadata,
            sentiment,
          };
        }),
      );

      reply.code(200).send({
        success: true,
        data: {
          messages,
          total: sortedMessages.length,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      console.error('[ImController] getConversationMessages error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 发送消息
   * POST /im/conversations/:id/messages
   */
  async sendMessage(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { content: string; messageType?: string };

      if (!body.content) {
        return reply.code(400).send({
          success: false,
          error: '缺少必需参数：content',
        });
      }

      const conversation = await this.conversationRepository.findById(id);
      if (!conversation) {
        return reply.code(404).send({
          success: false,
          error: '会话不存在',
        });
      }

      const senderId = (request.user as any)?.sub || conversation.agentId || 'agent-system';
      if (!conversation.agentId && senderId !== conversation.customerId) {
        conversation.assignAgent(senderId, { assignedBy: senderId, reason: 'manual' });
        await this.conversationRepository.save(conversation);
      }

      const result = await this.sendMessageUseCase.execute({
        conversationId: id,
        senderId,
        senderType: 'internal',
        content: body.content,
      });

      reply.code(200).send({
        success: true,
        data: {
          id: result.messageId,
          conversationId: result.conversationId,
          content: result.message.content,
          senderType: result.message.senderType,
          senderId: result.message.senderId,
          senderName: '客服',
          timestamp: result.timestamp,
          status: 'sent',
        },
      });
    } catch (error) {
      console.error('[ImController] sendMessage error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 更新消息回执状态
   * POST /im/messages/receipt
   */
  async updateMessageReceipt(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const body = request.body as {
        messageId: string;
        conversationId?: string;
        status: 'delivered' | 'read' | 'failed';
        source?: string;
        metadata?: Record<string, unknown>;
        receivedAt?: string;
      };

      if (!body.messageId || !body.status) {
        return reply.code(400).send({
          success: false,
          error: '缺少必需参数：messageId, status',
        });
      }

      await this.conversationRepository.updateMessageReceipt(body.messageId, {
        status: body.status,
        source: body.source,
        metadata: body.metadata,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
      }, body.conversationId);

      reply.code(200).send({
        success: true,
        data: {
          messageId: body.messageId,
          status: body.status,
        },
      });
    } catch (error) {
      console.error('[ImController] updateMessageReceipt error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 提交人工审核结果
   * POST /im/reviews/submit
   */
  async submitAgentReview(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const body = request.body as {
        reviewId: string;
        status: 'approved' | 'rejected';
        reviewerNote?: string;
        createTasks?: boolean;
      };

      if (!body.reviewId || !body.status) {
        return reply.code(400).send({
          success: false,
          error: '缺少必需参数：reviewId, status',
        });
      }

      const review = await this.reviewRequestRepository.findById(body.reviewId);
      if (!review) {
        return reply.code(404).send({
          success: false,
          error: '审核任务不存在',
        });
      }

      const reviewerId = (request.user as { sub?: string } | undefined)?.sub;
      await this.completeReviewRequestUseCase.execute({
        reviewId: body.reviewId,
        status: body.status === 'approved' ? 'approved' : 'rejected',
        reviewerId,
        reviewerNote: body.reviewerNote,
      });

      let tasksCreated: string[] = [];
      if (body.status === 'approved' && body.createTasks !== false) {
        const suggestion = review.suggestion as any;
        const recommended = Array.isArray(suggestion?.recommendedTasks)
          ? suggestion.recommendedTasks
          : [];
        for (const task of recommended) {
          if (!task?.title) {
            continue;
          }
          const created = await this.createTaskUseCase.execute({
            title: task.title,
            type: 'support',
            conversationId: review.conversationId,
            requirementId: task.requirementId,
            priority: task.priority || 'medium',
          });
          tasksCreated.push(created.id);
        }
      }

      reply.code(200).send({
        success: true,
        data: {
          reviewId: body.reviewId,
          status: body.status,
          tasksCreated,
        },
      });
    } catch (error) {
      console.error('[ImController] submitAgentReview error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 获取会话问题列表
   * GET /im/conversations/:id/problems
   */
  async getConversationProblems(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const problems = await this.problemRepository.findByFilters({ conversationId: id }, { limit: 50, offset: 0 });
      reply.code(200).send({
        success: true,
        data: {
          problems: problems.map((problem) => ({
            id: problem.id,
            conversationId: problem.conversationId,
            customerId: problem.customerId,
            title: problem.title,
            description: problem.description,
            status: problem.status,
            intent: problem.intent,
            confidence: problem.confidence,
            createdAt: problem.createdAt.toISOString(),
            updatedAt: problem.updatedAt.toISOString(),
            resolvedAt: problem.resolvedAt?.toISOString(),
          })),
        },
      });
    } catch (error) {
      console.error('[ImController] getConversationProblems error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 更新会话状态
   * PATCH /im/conversations/:id/status
   */
  async updateConversationStatus(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { status: string };

      if (!body.status) {
        return reply.code(400).send({
          success: false,
          error: '缺少必需参数：status',
        });
      }

      const conversation = await this.conversationRepository.findById(id);
      if (!conversation) {
        return reply.code(404).send({
          success: false,
          error: '会话不存在',
        });
      }

      conversation.updateStatus(body.status as any);
      await this.conversationRepository.save(conversation);

      reply.code(200).send({
        success: true,
        data: {
          conversationId: conversation.id,
          status: conversation.status,
          updatedAt: conversation.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('[ImController] updateConversationStatus error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 获取用户画像
   * GET /profiles/:customerId
   */
  async getCustomerProfile(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { customerId } = request.params as { customerId: string };

      const profile = await this.customerProfileRepository.findById(customerId);
      if (!profile) {
        return reply.code(404).send({
          success: false,
          error: '客户不存在',
        });
      }

      reply.code(200).send({
        success: true,
        data: CustomerProfileResponseDTO.fromAggregate(profile),
      });
    } catch (error) {
      console.error('[ImController] getCustomerProfile error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 获取用户交互记录
   * GET /profiles/:customerId/interactions
   */
  async getCustomerInteractions(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { customerId } = request.params as { customerId: string };
      const { range = '7d' } = request.query as any;

      const interactions = await this.customerProfileRepository.findInteractions(customerId);

      reply.code(200).send({
        success: true,
        data: {
          customerId,
          range,
          interactions,
          total: interactions.length,
        },
      });
    } catch (error) {
      console.error('[ImController] getCustomerInteractions error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 获取会话质检数据
   * GET /quality/:conversationId
   */
  async getConversationQuality(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { conversationId } = request.params as { conversationId: string };

      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        return reply.code(404).send({
          success: false,
          error: '会话不存在',
        });
      }

      const profile = await this.customerProfileRepository.findById(
        conversation.customerId,
      );
      const messageContext = conversation.messages
        .slice(-10)
        .map((msg) => msg.content)
        .join('\n');

      const analysis = await this.aiService.analyzeConversation({
        conversationId,
        context: messageContext,
        options: {
          includeHistory: true,
          depth: 'brief',
        },
      });

      const qualityScore = Math.round((analysis.score || 0.8) * 100);
      const emotionScore = Math.round((analysis.result?.score || analysis.score || 0.7) * 100);
      const satisfactionScoreRaw =
        (profile?.metrics as any)?.satisfactionScore ?? 80;
      const satisfactionScore =
        satisfactionScoreRaw > 1 && satisfactionScoreRaw <= 5
          ? Math.round((satisfactionScoreRaw / 5) * 100)
          : Math.round(Number(satisfactionScoreRaw) || 80);
      const lastMessage = conversation.messages
        .slice(-1)[0];
      const urgency =
        conversation.priority === 'high'
          ? '高紧急'
          : conversation.status === 'closed'
            ? '已解决'
            : '处理中';

      reply.code(200).send({
        success: true,
        data: {
          conversationId,
          title: `${profile?.name || '客户'} · ${conversation.id}`,
          score: qualityScore,
          summary:
            analysis.summary ||
            lastMessage?.content ||
            '暂无质检摘要',
          urgency,
          urgencyClass: urgency === '高紧急' ? 'chip-urgent' : urgency === '已解决' ? 'chip-neutral' : 'chip-soft',
          tone: urgency === '高紧急' ? 'urgent' : urgency === '已解决' ? 'neutral' : 'soft',
          sla: (profile?.slaInfo as any)?.serviceLevel || (profile?.isVIP ? 'VIP' : '普通'),
          impact: analysis.issues?.length ? '需关注' : '影响未标注',
          channel: conversation.channel.value,
          time: lastMessage?.sentAt?.toISOString() || conversation.updatedAt.toISOString(),
          tags: (analysis.keyPhrases || []).map((item) => item.phrase).slice(0, 4),
          metrics: {
            urgency: `${emotionScore}%`,
            emotion: emotionScore,
            eta: conversation.slaDeadline ? conversation.slaDeadline.toISOString() : '--',
          },
          dimensions: {
            emotion: {
              score: emotionScore,
              label: analysis.overallSentiment || '中性',
              bar: emotionScore,
            },
            quality: {
              score: qualityScore,
              label: analysis.summary || '质检分析完成',
              bar: qualityScore,
            },
            satisfaction: {
              score: satisfactionScore,
              label: '客户满意度',
              bar: satisfactionScore,
            },
          },
          actions: analysis.improvementSuggestions || [],
          tip: analysis.improvementSuggestions?.[0] || '建议持续跟进客户问题',
          threadTitle: `对话节选 · ${conversation.id}`,
          thread: conversation.messages.slice(-3).map((msg) => ({
            role: msg.senderType === 'agent' ? '工程师' : '客户',
            text: msg.content,
            sentiment: msg.senderType === 'agent' ? '回复' : '客户反馈',
            tag: msg.senderType === 'agent' ? '客服回复' : '客户消息',
          })),
          insights: analysis.improvementSuggestions || [],
        },
      });
    } catch (error) {
      console.error('[ImController] getConversationQuality error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 获取会话AI分析（情感、回复建议、知识库、工单）
   * GET /im/conversations/:id/ai-analysis
   */
  async getConversationAiAnalysis(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const conversation = await this.conversationRepository.findById(id);
      if (!conversation) {
        return reply.code(404).send({
          success: false,
          error: '会话不存在',
        });
      }

      const history = conversation.messages
        .slice(-8)
        .map((msg) => ({
          role: msg.senderType === 'agent' ? 'agent' : 'customer',
          content: msg.content,
        }));

      const latestCustomerMessage = [...conversation.messages]
        .reverse()
        .find((msg) => msg.senderType === 'customer');

      const sentiment = latestCustomerMessage
        ? await this.aiService.analyzeSentiment(
            latestCustomerMessage.content,
            history,
          )
        : {
            overallSentiment: 'neutral' as const,
            score: 0.5,
            confidence: 0.5,
          };
      const issueSignals = this.extractIssueSignals(conversation);

      let knowledgeRecommendations: Array<{
        id: string;
        title: string;
        category: string;
        score: number;
        url: string;
        type: 'knowledge';
      }> = [];

      try {
        let query = latestCustomerMessage?.content || '';
        const llmClient = (this.aiService as any).llmClient;
        if (llmClient && llmClient.isEnabled()) {
          try {
            const intent = await llmClient.extractIntent(query);
            if (intent.keywords?.length) {
              query = intent.keywords.join(' ');
            }
          } catch (err) {
            console.warn('[ImController] LLM意图提取失败，使用原始查询', err);
          }
        }

        const knowledgeResults = await this.searchKnowledgeUseCase.execute({
          query: query || latestCustomerMessage?.content || '',
          mode: 'keyword',
          filters: { limit: 10 },
        });
        const baseUrl = config.app?.baseUrl || 'http://localhost:3000';
        knowledgeRecommendations = knowledgeResults
          .map((item) => ({
            id: item.id,
            title: item.title,
            category: item.category,
            score: item.score ?? 0.6,
            url: `${baseUrl}/knowledge/${item.id}`,
            type: 'knowledge' as const,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      } catch (err) {
        console.warn('[ImController] 知识库查询失败', err);
      }

      const tasks = await this.taskRepository.findByFilters({
        conversationId: conversation.id,
      });
      const baseUrl = config.app?.baseUrl || 'http://localhost:3000';
      const relatedTasks = tasks.map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority.value,
        url: `${baseUrl}/tasks/${task.id}`,
      }));

      const aiAnalysis = await this.aiService.analyzeConversation({
        conversationId: conversation.id,
        context: history.map((item) => item.content).join('\n'),
        options: {
          keywords: knowledgeRecommendations.map((item) => item.title).slice(0, 4),
        },
      });

      const detectedIssues = (aiAnalysis.issues || []).map((issue) => ({
        type: issue.type,
        description: issue.description,
        severity: issue.severity,
        suggestedAction: aiAnalysis.improvementSuggestions?.[0],
      }));

      let replySuggestion: {
        suggestedReply: string;
        confidence: number;
        needsHumanReview: boolean;
        reason?: string;
      } | null = null;

      try {
        const llmClient = (this.aiService as any).llmClient;
        if (llmClient && llmClient.isEnabled() && latestCustomerMessage) {
          const replyResult = await llmClient.generateReply(
            latestCustomerMessage.content,
            sentiment as any,
            knowledgeRecommendations.map((item) => ({
              title: item.title,
              url: item.url,
            })),
            history,
          );
          replySuggestion = {
            suggestedReply: replyResult.suggestedReply,
            confidence: replyResult.confidence,
            needsHumanReview: replyResult.confidence < 0.6,
            reason: replyResult.reasoning,
          };
        }
      } catch (err) {
        console.warn('[ImController] 回复生成失败，未返回建议', err);
      }
      if (!replySuggestion && latestCustomerMessage) {
        const issueProductLabel = issueSignals.issueProduct
          ? `关于${issueSignals.issueProduct}`
          : '关于您反馈的问题';
        const faultLevelText = issueSignals.faultLevel
          ? `我们已按${issueSignals.faultLevel}级别优先处理。`
          : '';
        const referenceTitle = knowledgeRecommendations[0]?.title;
        const referenceLine = referenceTitle ? `可先参考《${referenceTitle}》进行自查。` : '';
        const apology = sentiment.overallSentiment === 'negative' ? '给您带来不便非常抱歉，' : '';
        const suggestedReply = `${apology}已收到您${issueProductLabel}的反馈。${faultLevelText}请提供相关账号/区域/报错截图（如有），我们将继续跟进。${referenceLine}`.trim();
        replySuggestion = {
          suggestedReply,
          confidence: 0.56,
          needsHumanReview: true,
          reason: '本地模板生成',
        };
      }

      reply.code(200).send({
        success: true,
        data: {
          conversationId: conversation.id,
          lastCustomerSentiment: {
            emotion: sentiment.overallSentiment,
            score: sentiment.score,
            confidence: sentiment.confidence,
            messageContent: latestCustomerMessage?.content || '',
          },
          replySuggestion,
          knowledgeRecommendations,
          relatedTasks,
          detectedIssues,
          issueProduct: issueSignals.issueProduct,
          faultLevel: issueSignals.faultLevel,
          analyzedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[ImController] getConversationAiAnalysis error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 设置会话Agent模式
   * PATCH /im/conversations/:id/mode
   */
  async setConversationMode(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const { mode } = request.body as { mode: AgentMode };

      // 验证mode参数
      const validModes: AgentMode[] = ['agent_auto', 'agent_supervised', 'human_first'];
      if (!mode || !validModes.includes(mode)) {
        return reply.code(400).send({
          success: false,
          error: `无效的mode参数，必须是: ${validModes.join(', ')}`,
        });
      }

      // 查找会话（支持无持久化的演示会话）
      const conversation = await this.conversationRepository.findById(id);
      if (conversation) {
        conversation.setMode(mode);
        await this.conversationRepository.save(conversation);
      }

      reply.code(200).send({
        success: true,
        data: {
          conversationId: id,
          mode: conversation?.mode ?? mode,
          updatedAt: conversation?.updatedAt ?? new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[ImController] setConversationMode error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 获取对话情绪分析
   *
   * GET /api/im/conversations/:id/sentiment
   */
  async getConversationSentiment(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };

      if (!id) {
        return reply.code(400).send({
          success: false,
          error: '缺少对话ID参数',
        });
      }

      // 1. 获取对话信息（若无持久化记录则返回默认情绪）
      const conversation = await this.conversationRepository.findById(id);
      if (!conversation) {
        return reply.code(200).send({
          success: true,
          data: {
            conversationId: id,
            sentiment: {
              type: 'neutral',
              label: '中性',
              score: 0.5,
              confidence: 0.5,
            },
          },
        });
      }

      // 2. 提取最近的客户消息（用于分析情绪）
      const customerMessages = conversation.messages
        ?.filter((msg: any) => msg.senderType === 'external')
        ?.slice(-5) // 取最近5条客户消息
        ?.map((msg: any) => msg.content)
        || [];

      if (customerMessages.length === 0) {
        return reply.code(200).send({
          success: true,
          data: {
            conversationId: id,
            sentiment: {
              type: 'neutral',
              label: '中性',
              score: 0.5,
              confidence: 0.5,
            },
          },
        });
      }

      // 3. 分析情绪（使用最近的消息）
      const latestMessage = customerMessages[customerMessages.length - 1];
      const conversationHistory = conversation.messages
        ?.slice(-10)
        ?.map((msg: any) => ({
          role: msg.senderType === 'external' ? 'customer' : 'agent',
          content: msg.content,
        }))
        || [];

      const sentiment = await this.aiService.analyzeSentiment(
        latestMessage,
        conversationHistory,
      );

      // 4. 返回情绪分析结果
      reply.code(200).send({
        success: true,
        data: {
          conversationId: id,
          sentiment: {
            type: sentiment.emotion || 'neutral',
            label: sentiment.label || this.getSentimentLabel(sentiment.emotion),
            score: sentiment.score || 0.5,
            confidence: sentiment.confidence || 0.5,
          },
        },
      });
    } catch (error) {
      console.error('[ImController] getConversationSentiment error', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : '情绪分析失败',
      });
    }
  }

  private async evaluateConversationProblem(
    conversation: Conversation | null,
  ): Promise<{ isProblem: boolean | null; intent?: string; confidence?: number }> {
    if (!conversation) {
      return { isProblem: null };
    }

    const llmClient = (this.aiService as any).llmClient;
    if (!llmClient || !llmClient.isEnabled()) {
      return { isProblem: null };
    }

    const latestCustomerMessage = [...conversation.messages]
      .reverse()
      .find((msg) => msg.senderType === 'customer');
    if (!latestCustomerMessage?.content) {
      return { isProblem: false, confidence: 0 };
    }

    const history = conversation.messages
      .slice(-5)
      .map((msg) => ({
        role: msg.senderType === 'agent' ? 'agent' : 'customer',
        content: msg.content,
      }));

    try {
      const intent = await llmClient.extractIntent(latestCustomerMessage.content, history);
      const confidence = intent.confidence ?? 0;
      const isProblem =
        confidence >= 0.6 &&
        (intent.isQuestion || ['complaint', 'request', 'urgent'].includes(intent.intent));

      return {
        isProblem,
        intent: intent.intent,
        confidence,
      };
    } catch (err) {
      console.warn('[ImController] 问题识别失败', err);
      return { isProblem: null };
    }
  }

  /**
   * 获取情绪标签的中文描述
   */
  private getSentimentLabel(emotion: string): string {
    const labelMap: Record<string, string> = {
      positive: '积极',
      happy: '开心',
      satisfied: '满意',
      excited: '兴奋',
      grateful: '感激',
      neutral: '中性',
      calm: '平静',
      negative: '消极',
      unhappy: '不开心',
      frustrated: '沮丧',
      angry: '愤怒',
      anxious: '焦虑',
      worried: '担忧',
      confused: '困惑',
      urgent: '紧急',
    };
    return labelMap[emotion?.toLowerCase()] || '未知';
  }

  private extractIssueSignals(conversation: Conversation): {
    issueProduct?: string;
    faultLevel?: string;
  } {
    const latestCustomerMessage = [...conversation.messages]
      .reverse()
      .find((msg) => msg.senderType === 'customer');
    const metadata = (latestCustomerMessage?.metadata || {}) as Record<string, unknown>;
    const issueProduct =
      (metadata.issueProduct as string | undefined) ||
      (metadata.issue_product as string | undefined) ||
      (metadata.product as string | undefined);
    const faultLevel =
      (metadata.faultLevel as string | undefined) ||
      (metadata.fault_level as string | undefined) ||
      (metadata.severity as string | undefined);
    return {
      issueProduct,
      faultLevel,
    };
  }

  private async loadWecomMockData(): Promise<{
    groupChatList: { group_chat_list: Array<{ chat_id: string; status: number }> };
    groupChatDetails: { group_chat_details: Record<string, { group_chat: any }> };
    groupChatMessages: { group_chat_messages: Record<string, Array<any>> };
  }> {
    const groupChatList = await this.readWecomMockJson('groupchat_list.json');
    const groupChatDetails = await this.readWecomMockJson('groupchat_details.json');
    const groupChatMessages = await this.readWecomMockJson('groupchat_messages.json');
    return { groupChatList, groupChatDetails, groupChatMessages };
  }

  private async readWecomMockJson(filename: string): Promise<any> {
    const basePaths = [
      path.resolve(process.cwd(), 'tests', 'wecom'),
      path.resolve(process.cwd(), '..', 'tests', 'wecom'),
    ];

    let lastError: unknown = null;
    for (const basePath of basePaths) {
      const filePath = path.join(basePath, filename);
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(`WeCom mock data file not found: ${filename}. ${String(lastError || '')}`);
  }
}
