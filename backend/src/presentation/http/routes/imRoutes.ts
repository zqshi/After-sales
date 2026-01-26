/**
 * IM Routes - IM消息接入路由配置
 */

import { FastifyInstance } from 'fastify';
import { ImController } from '../controllers/ImController';

export async function imRoutes(
  fastify: FastifyInstance,
  controller: ImController,
): Promise<void> {
  /**
   * @swagger
   * /api/im/incoming-message:
   *   post:
   *     tags:
   *       - IM
   *     summary: IM消息接入（多渠道）
   *     description: |
   *       接收来自各渠道IM的消息，触发完整的Agent分析链路：
   *       1. 情绪识别（单条消息）
   *       2. 问题识别和需求分析
   *       3. 知识库检索和推荐
   *       4. 工单查询和关联
   *       5. Agent回复建议生成
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - customerId
   *               - content
   *               - channel
   *               - senderId
   *             properties:
   *               customerId:
   *                 type: string
   *                 description: 客户ID
   *                 example: "customer-001"
   *               content:
   *                 type: string
   *                 description: 消息内容
   *                 example: "我的订单退款还没到账，这是什么问题？"
   *               channel:
   *                 type: string
   *                 enum: [feishu, wecom, dingtalk, web]
   *                 description: IM渠道
   *                 example: "web"
   *               senderId:
   *                 type: string
   *                 description: 发送者ID
   *                 example: "user-001"
   *               metadata:
   *                 type: object
   *                 description: 额外元数据
   *     responses:
   *       200:
   *         description: 消息处理成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     conversationId:
   *                       type: string
   *                       example: "conv-123"
   *                     message:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         content:
   *                           type: string
   *                         sentiment:
   *                           type: object
   *                           properties:
   *                             emotion:
   *                               type: string
   *                               enum: [positive, neutral, negative]
   *                             score:
   *                               type: number
   *                             confidence:
   *                               type: number
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                     analysis:
   *                       type: object
   *                       properties:
   *                         hasRequirements:
   *                           type: boolean
   *                         requirements:
   *                           type: array
   *                           items:
   *                             type: object
   *                         knowledgeRecommendations:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                               title:
   *                                 type: string
   *                               url:
   *                                 type: string
   *                               score:
   *                                 type: number
   *                         relatedTasks:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                               title:
   *                                 type: string
   *                               url:
   *                                 type: string
   *                     agentSuggestion:
   *                       type: object
   *                       properties:
   *                         suggestedReply:
   *                           type: string
   *                         confidence:
   *                           type: number
   *                         needsHumanReview:
   *                           type: boolean
   *                     status:
   *                       type: string
   *                       enum: [auto_handled, needs_review, escalated]
   *       400:
   *         description: 请求参数错误
   *       500:
   *         description: 服务器内部错误
   */
  fastify.post('/im/incoming-message', {
    config: { permissions: ['im.write'] },
  }, async (request, reply) => {
    await controller.handleIncomingMessage(request, reply);
  });

  // 会话管理接口
  fastify.get('/im/conversations', {
    config: { permissions: ['im.read'] },
  }, async (request, reply) => {
    await controller.getConversations(request, reply);
  });

  fastify.get('/im/conversations/stats', {
    config: { permissions: ['im.read'] },
  }, async (request, reply) => {
    await controller.getConversationStats(request, reply);
  });

  fastify.post('/im/wecom/mock/sync', {
    config: { permissions: ['im.write'] },
  }, async (request, reply) => {
    await controller.syncWecomMockGroupChats(request, reply);
  });

  fastify.get('/im/conversations/:id/messages', {
    config: { permissions: ['im.read'] },
  }, async (request, reply) => {
    await controller.getConversationMessages(request, reply);
  });

  fastify.post('/im/conversations/:id/messages', {
    config: { permissions: ['im.write'] },
  }, async (request, reply) => {
    await controller.sendMessage(request, reply);
  });

  // ⚠️ 已废弃：消息回执状态更新接口
  // 废弃原因：接口仅记录数据，无业务逻辑，实际价值有限
  // 如需恢复，请先补充完整的业务逻辑（失败告警、已读统计等）
  /*
  fastify.post('/im/messages/receipt', {
    config: { permissions: ['im.write'] },
  }, async (request, reply) => {
    await controller.updateMessageReceipt(request, reply);
  });
  */

  fastify.post('/im/reviews/submit', {
    config: { permissions: ['im.write'] },
  }, async (request, reply) => {
    await controller.submitAgentReview(request, reply);
  });

  fastify.get('/im/reviews/pending', {
    config: { permissions: ['im.read'] },
  }, async (request, reply) => {
    await controller.getPendingReviews(request, reply);
  });

  fastify.get('/im/reviews/stream', {
    config: { permissions: ['im.read'] },
  }, async (request, reply) => {
    await controller.streamReviewRequests(request, reply);
  });

  fastify.get('/im/conversations/:id/problems', {
    config: { permissions: ['im.read'] },
  }, async (request, reply) => {
    await controller.getConversationProblems(request, reply);
  });

  fastify.patch('/im/conversations/:id/status', {
    config: { permissions: ['im.write'] },
  }, async (request, reply) => {
    await controller.updateConversationStatus(request, reply);
  });

  fastify.patch('/im/conversations/:id/mode', {
    config: { permissions: ['im.write'] },
  }, async (request, reply) => {
    await controller.setConversationMode(request, reply);
  });

  // 用户画像接口
  fastify.get('/profiles/:customerId', {
    config: { permissions: ['customers.read'] },
  }, async (request, reply) => {
    await controller.getCustomerProfile(request, reply);
  });

  fastify.get('/profiles/:customerId/interactions', {
    config: { permissions: ['customers.read'] },
  }, async (request, reply) => {
    await controller.getCustomerInteractions(request, reply);
  });

  // 质检接口
  fastify.get('/quality/:conversationId', {
    config: { permissions: ['tasks.read'] },
  }, async (request, reply) => {
    await controller.getConversationQuality(request, reply);
  });

  fastify.get('/quality/:conversationId/reports', {
    config: { permissions: ['tasks.read'] },
  }, async (request, reply) => {
    await controller.getConversationQualityReports(request, reply);
  });

  fastify.get('/quality/reports', {
    config: { permissions: ['tasks.read'] },
  }, async (request, reply) => {
    await controller.listQualityReports(request, reply);
  });

  // AI分析接口
  fastify.get('/im/conversations/:id/ai-analysis', {
    config: { permissions: ['ai.use'] },
  }, async (request, reply) => {
    await controller.getConversationAiAnalysis(request, reply);
  });

  /**
   * @swagger
   * /api/im/conversations/{id}/sentiment:
   *   get:
   *     tags:
   *       - IM
   *     summary: 获取对话情绪分析
   *     description: 分析对话中客户的情绪状态
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 对话ID
   *     responses:
   *       200:
   *         description: 情绪分析成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     sentiment:
   *                       type: object
   *                       properties:
   *                         type:
   *                           type: string
   *                           enum: [positive, neutral, negative, angry, frustrated, anxious]
   *                           example: "frustrated"
   *                         label:
   *                           type: string
   *                           example: "沮丧"
   *                         score:
   *                           type: number
   *                           example: 0.75
   *                         confidence:
   *                           type: number
   *                           example: 0.85
   *                     conversationId:
   *                       type: string
   *                       example: "conv-001"
   *       404:
   *         description: 对话未找到
   *       500:
   *         description: 服务器内部错误
   */
  fastify.get('/im/conversations/:id/sentiment', {
    config: { permissions: ['ai.use'] },
  }, async (request, reply) => {
    await controller.getConversationSentiment(request, reply);
  });
}
