/**
 * ImController - IM消息接入控制器
 *
 * 职责：
 * 1. 接收模拟IM消息（飞书/企微/钉钉/Web）
 * 2. 调用ConversationTaskCoordinator处理消息
 * 3. 调用AiService分析情绪
 * 4. 查询知识库和工单
 * 5. 组装完整响应返回前端
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ConversationTaskCoordinator } from '@application/services/ConversationTaskCoordinator';
import { AiService } from '@application/services/AiService';
import { SearchKnowledgeUseCase } from '@application/use-cases/knowledge/SearchKnowledgeUseCase';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { ConversationRepository } from '@infrastructure/repositories/ConversationRepository';
import { config } from '@config/app.config';
import { v4 as uuidv4 } from 'uuid';

import { AgentMode } from '@domain/conversation/models/Conversation';

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
      const { limit = 20, offset = 0 } = request.query as any;

      // Mock数据：模拟会话列表
      const mockConversations = [
        {
          id: 'conv-001',
          conversationId: 'conv-001', // 前端期望的字段名
          customerId: 'customer-001',
          customerName: '张三',
          channel: 'web',
          status: 'open',
          mode: 'agent_auto', // Agent模式
          lastMessage: '我的订单退款还没到账，这是什么问题？',
          lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
          unreadCount: 2,
          agentId: 'agent-001',
          agentName: '客服小王',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'conv-002',
          conversationId: 'conv-002',
          customerId: 'customer-002',
          customerName: '李四',
          channel: 'feishu',
          status: 'open',
          mode: 'agent_supervised', // Agent监督模式
          lastMessage: '产品质量有问题，需要退换货',
          lastMessageTime: new Date(Date.now() - 7200000).toISOString(),
          unreadCount: 0,
          agentId: 'agent-002',
          agentName: '客服小李',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: 'conv-003',
          conversationId: 'conv-003',
          customerId: 'customer-003',
          customerName: '王五',
          channel: 'wecom',
          status: 'closed',
          mode: 'human_first', // 人工优先模式
          lastMessage: '感谢解决，问题已经处理好了',
          lastMessageTime: new Date(Date.now() - 14400000).toISOString(),
          unreadCount: 0,
          agentId: 'agent-001',
          agentName: '客服小王',
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ];

      const start = Number(offset);
      const end = start + Number(limit);
      const conversations = mockConversations.slice(start, end);

      reply.code(200).send({
        success: true,
        data: {
          conversations,
          total: mockConversations.length,
          limit: Number(limit),
          offset: Number(offset),
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

      // Mock数据：模拟历史消息
      const mockMessages = [
        {
          id: 'msg-001',
          conversationId: id,
          content: '你好，我想咨询一下订单问题',
          senderType: 'customer',
          senderId: 'customer-001',
          senderName: '张三',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          sentiment: {
            emotion: 'neutral',
            score: 0.5,
            confidence: 0.85,
          },
        },
        {
          id: 'msg-002',
          conversationId: id,
          content: '您好！我是客服小王，很高兴为您服务。请问您的订单号是多少？',
          senderType: 'agent',
          senderId: 'agent-001',
          senderName: '客服小王',
          timestamp: new Date(Date.now() - 3540000).toISOString(),
        },
        {
          id: 'msg-003',
          conversationId: id,
          content: '订单号是 ORD20231215001，我三天前申请的退款还没到账',
          senderType: 'customer',
          senderId: 'customer-001',
          senderName: '张三',
          timestamp: new Date(Date.now() - 3480000).toISOString(),
          sentiment: {
            emotion: 'negative',
            score: 0.3,
            confidence: 0.78,
          },
        },
        {
          id: 'msg-004',
          conversationId: id,
          content: '我帮您查询一下，请稍等...',
          senderType: 'agent',
          senderId: 'agent-001',
          senderName: '客服小王',
          timestamp: new Date(Date.now() - 3420000).toISOString(),
        },
        {
          id: 'msg-005',
          conversationId: id,
          content: '查询到您的退款已经审批通过，正在处理中。预计1-3个工作日到账，请您耐心等待。',
          senderType: 'agent',
          senderId: 'agent-001',
          senderName: '客服小王',
          timestamp: new Date(Date.now() - 3300000).toISOString(),
        },
        {
          id: 'msg-006',
          conversationId: id,
          content: '好的，谢谢！',
          senderType: 'customer',
          senderId: 'customer-001',
          senderName: '张三',
          timestamp: new Date(Date.now() - 3240000).toISOString(),
          sentiment: {
            emotion: 'positive',
            score: 0.8,
            confidence: 0.92,
          },
        },
      ];

      const start = Number(offset);
      const end = start + Number(limit);
      const messages = mockMessages.slice(start, end);

      reply.code(200).send({
        success: true,
        data: {
          messages,
          total: mockMessages.length,
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

      // Mock数据：模拟消息发送成功
      const newMessage = {
        id: `msg-${Date.now()}`,
        conversationId: id,
        content: body.content,
        senderType: 'agent',
        senderId: 'agent-001',
        senderName: '客服小王',
        timestamp: new Date().toISOString(),
        status: 'sent',
      };

      reply.code(200).send({
        success: true,
        data: newMessage,
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

      // Mock数据：模拟状态更新成功
      reply.code(200).send({
        success: true,
        data: {
          conversationId: id,
          status: body.status,
          updatedAt: new Date().toISOString(),
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

      // Mock数据：模拟用户画像
      const mockProfile = {
        id: customerId,
        name: '张三',
        level: 'VIP',
        phone: '138****8888',
        email: 'zhang***@example.com',
        registerDate: '2022-06-15',
        totalOrders: 45,
        totalAmount: 125800.0,
        lastOrderDate: '2023-12-10',
        tags: ['高价值客户', '活跃用户', '3C数码爱好者'],
        riskLevel: 'low',
        satisfactionScore: 4.8,
        preferredChannel: 'web',
        notes: '优质客户，购买力强，对价格不敏感',
      };

      reply.code(200).send({
        success: true,
        data: mockProfile,
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

      // Mock数据：模拟交互记录
      const mockInteractions = [
        {
          id: 'int-001',
          type: 'order',
          title: '购买商品：iPhone 15 Pro',
          amount: 8999.0,
          status: 'completed',
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 'int-002',
          type: 'refund',
          title: '退款申请：ORD20231215001',
          amount: 299.0,
          status: 'processing',
          timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          id: 'int-003',
          type: 'service',
          title: '售后咨询：产品保修问题',
          status: 'closed',
          timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: 'int-004',
          type: 'complaint',
          title: '投诉：物流配送延迟',
          status: 'resolved',
          timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
        },
      ];

      reply.code(200).send({
        success: true,
        data: {
          customerId,
          range,
          interactions: mockInteractions,
          total: mockInteractions.length,
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

      // Mock数据：模拟质检数据
      const mockQuality = {
        conversationId,
        overallScore: 8.5,
        dimensions: {
          responseSpeed: {
            score: 9.0,
            avgResponseTime: 45, // 秒
            label: '响应速度',
          },
          serviceAttitude: {
            score: 8.5,
            label: '服务态度',
          },
          problemSolving: {
            score: 8.0,
            label: '问题解决',
          },
          professionalKnowledge: {
            score: 9.0,
            label: '专业知识',
          },
          customerSatisfaction: {
            score: 8.5,
            label: '客户满意度',
          },
        },
        violations: [],
        highlights: [
          '响应及时，平均45秒内回复',
          '使用礼貌用语，态度专业',
          '准确理解客户问题',
        ],
        suggestions: ['可以主动提供相关产品推荐', '结束时可以询问是否还有其他问题'],
        checkedAt: new Date().toISOString(),
        checkedBy: 'AI质检系统',
      };

      reply.code(200).send({
        success: true,
        data: mockQuality,
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

      // 根据会话ID返回不同场景的Mock数据
      let mockAnalysis: any;

      // 场景1：conv-001 - 负面情绪+问题场景（退款延迟）- 显示AI辅助面板
      if (id === 'conv-001') {
        mockAnalysis = {
          conversationId: id,
          lastCustomerSentiment: {
            emotion: 'negative',
            score: 0.3,
            confidence: 0.78,
            messageContent: '订单号是 ORD20231215001，我三天前申请的退款还没到账',
          },
          replySuggestion: {
            suggestedReply: '非常抱歉让您久等了。我已经帮您查询了退款进度，您的退款已经审批通过，正在处理中。根据系统显示，预计会在1-3个工作日内到账。我们会持续关注，如有任何问题请随时联系我们。',
            confidence: 0.85,
            needsHumanReview: false,
            reason: '标准退款查询场景，置信度较高',
          },
          knowledgeRecommendations: [
            {
              id: 'kb-001',
              title: '退款处理流程和时效说明',
              category: '订单与退款',
              score: 0.92,
              url: 'http://localhost:3000/knowledge/kb-001',
              type: 'knowledge',
            },
            {
              id: 'kb-002',
              title: '退款到账时间常见问题',
              category: '订单与退款',
              score: 0.85,
              url: 'http://localhost:3000/knowledge/kb-002',
              type: 'knowledge',
            },
            {
              id: 'kb-003',
              title: '如何查询退款进度',
              category: '订单与退款',
              score: 0.78,
              url: 'http://localhost:3000/knowledge/kb-003',
              type: 'knowledge',
            },
          ],
          relatedTasks: [
            {
              id: 'task-001',
              title: '退款延迟处理 - ORD20231215001',
              priority: 'high',
              url: 'http://localhost:3000/tasks/task-001',
            },
            {
              id: 'task-002',
              title: '批量退款审核异常问题排查',
              priority: 'medium',
              url: 'http://localhost:3000/tasks/task-002',
            },
          ],
          detectedIssues: [
            {
              type: 'refund_delay',
              description: '客户反馈退款延迟',
              severity: 'medium',
              suggestedAction: '优先处理并跟进',
            },
          ],
          analyzedAt: new Date().toISOString(),
        };
      }
      // 场景2：conv-002 - 中性情绪+咨询场景（无问题）- 隐藏AI辅助面板
      else if (id === 'conv-002') {
        mockAnalysis = {
          conversationId: id,
          lastCustomerSentiment: {
            emotion: 'neutral',
            score: 0.65,
            confidence: 0.82,
            messageContent: '你好，我想咨询一下新产品的功能',
          },
          replySuggestion: {
            suggestedReply: '您好！很高兴为您介绍我们的新产品。请问您想了解哪方面的功能呢？我可以为您详细说明。',
            confidence: 0.9,
            needsHumanReview: false,
            reason: '常规咨询场景，无问题检测',
          },
          knowledgeRecommendations: [],
          relatedTasks: [],
          detectedIssues: [], // 无问题，面板应该隐藏
          analyzedAt: new Date().toISOString(),
        };
      }
      // 场景3：conv-003 - 积极情绪+感谢场景 - 隐藏AI辅助面板
      else if (id === 'conv-003') {
        mockAnalysis = {
          conversationId: id,
          lastCustomerSentiment: {
            emotion: 'positive',
            score: 0.85,
            confidence: 0.9,
            messageContent: '太好了，问题已经解决了，非常感谢！',
          },
          replySuggestion: {
            suggestedReply: '不客气！很高兴能帮到您。如果后续还有任何问题，欢迎随时联系我们。祝您生活愉快！',
            confidence: 0.95,
            needsHumanReview: false,
            reason: '客户满意，常规结束语',
          },
          knowledgeRecommendations: [],
          relatedTasks: [],
          detectedIssues: [], // 无问题，面板应该隐藏
          analyzedAt: new Date().toISOString(),
        };
      }
      // 场景4：其他会话 - 负面情绪+技术问题 - 显示AI辅助面板
      else {
        mockAnalysis = {
          conversationId: id,
          lastCustomerSentiment: {
            emotion: 'negative',
            score: 0.25,
            confidence: 0.85,
            messageContent: '系统一直报错，根本用不了',
          },
          replySuggestion: {
            suggestedReply: '非常抱歉给您带来不便。我能理解您的着急，让我立即帮您排查问题。请问您看到的错误提示是什么？或者您可以截图发给我，我马上为您处理。',
            confidence: 0.88,
            needsHumanReview: true,
            reason: '技术问题可能需要工程师介入',
          },
          knowledgeRecommendations: [
            {
              id: 'kb-101',
              title: '常见系统错误排查指南',
              category: '技术支持',
              score: 0.88,
              url: 'http://localhost:3000/knowledge/kb-101',
              type: 'knowledge',
            },
            {
              id: 'kb-102',
              title: '登录异常问题解决方案',
              category: '技术支持',
              score: 0.75,
              url: 'http://localhost:3000/knowledge/kb-102',
              type: 'knowledge',
            },
          ],
          relatedTasks: [
            {
              id: 'task-101',
              title: '系统报错问题跟进',
              priority: 'high',
              url: 'http://localhost:3000/tasks/task-101',
            },
          ],
          detectedIssues: [
            {
              type: 'technical_issue',
              description: '客户反馈系统错误',
              severity: 'high',
              suggestedAction: '立即排查，可能需要技术团队介入',
            },
          ],
          analyzedAt: new Date().toISOString(),
        };
      }

      reply.code(200).send({
        success: true,
        data: mockAnalysis,
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

      // 查找会话
      const conversation = await this.conversationRepository.findById(id);
      if (!conversation) {
        return reply.code(404).send({
          success: false,
          error: '会话不存在',
        });
      }

      // 设置模式
      conversation.setMode(mode);
      await this.conversationRepository.save(conversation);

      reply.code(200).send({
        success: true,
        data: {
          conversationId: id,
          mode: conversation.mode,
          updatedAt: conversation.updatedAt,
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

      // 1. 获取对话信息
      const conversation = await this.conversationRepository.findById(id);
      if (!conversation) {
        return reply.code(404).send({
          success: false,
          error: `对话 ${id} 未找到`,
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
}
