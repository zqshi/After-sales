/**
 * Conversation Routes - 对话路由配置
 */

import { FastifyInstance } from 'fastify';

import { ConversationController } from '../controllers/ConversationController';
import { ResourceAccessMiddleware } from '../middleware/resourceAccessMiddleware';

export function conversationRoutes(
  fastify: FastifyInstance,
  controller: ConversationController,
  accessMiddleware: ResourceAccessMiddleware,
): void {
  /**
   * @swagger
   * /api/conversations:
   *   post:
   *     tags:
   *       - Conversations
   *     summary: 创建对话
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - customerId
   *               - channel
   *             properties:
   *               customerId:
   *                 type: string
   *               channel:
   *                 type: string
   *                 enum: [chat, email, phone, web, sms, voice]
   *               agentId:
   *                 type: string
   *               priority:
   *                 type: string
   *                 enum: [low, normal, high]
   *               slaDeadline:
   *                 type: string
   *                 format: date-time
   *               metadata:
   *                 type: object
   *               initialMessage:
   *                 type: object
   *                 required:
   *                   - senderId
   *                   - content
   *                 properties:
   *                   senderId:
   *                     type: string
   *                   senderType:
   *                     type: string
   *                     enum: [internal, external]
   *                   content:
   *                     type: string
   *     responses:
   *       201:
   *         description: 对话创建成功
   *       400:
   *         description: 请求参数错误
   */
  fastify.post(
    '/api/conversations',
    { config: { permissions: ['conversations.write'] } },
    async (request, reply) => {
      await controller.createConversation(request, reply);
    },
  );

  /**
   * @swagger
   * /api/conversations:
   *   get:
   *     tags:
   *       - Conversations
   *     summary: 查询对话列表
   *     parameters:
   *       - name: status
   *         in: query
   *         schema:
   *           type: string
   *           enum: [open, pending, closed]
   *       - name: agentId
   *         in: query
   *         schema:
   *           type: string
   *       - name: customerId
   *         in: query
   *         schema:
   *           type: string
   *       - name: channel
   *         in: query
   *         schema:
   *           type: string
   *       - name: slaStatus
   *         in: query
   *         schema:
   *           type: string
   *           enum: [normal, warning, violated]
   *       - name: page
   *         in: query
   *         schema:
   *           type: integer
   *           minimum: 1
   *       - name: limit
   *         in: query
   *         schema:
   *           type: integer
   *           minimum: 1
   *     responses:
   *       200:
   *         description: 对话列表
   */
  fastify.get(
    '/api/conversations',
    { config: { permissions: ['conversations.read'] } },
    async (request, reply) => {
      await controller.listConversations(request, reply);
    },
  );

  /**
   * @swagger
   * /api/conversations/{id}/assign:
   *   post:
   *     tags:
   *       - Conversations
   *     summary: 分配客服
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - agentId
   *             properties:
   *               agentId:
   *                 type: string
   *               assignedBy:
   *                 type: string
   *               reason:
   *                 type: string
   *                 enum: [manual, auto, reassign]
   *     responses:
   *       200:
   *         description: 分配成功
   *       404:
   *         description: 对话不存在
   */
  fastify.post(
    '/api/conversations/:id/assign',
    {
      config: { permissions: ['conversations.write'] },
      preHandler: [accessMiddleware.checkConversationAccess('write')],
    },
    async (request, reply) => {
      await controller.assignAgent(request, reply);
    },
  );

  /**
   * @swagger
   * /api/conversations/{id}:
   *   get:
   *     tags:
   *       - Conversations
   *     summary: 获取对话详情
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *       - name: includeMessages
   *         in: query
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: 对话详情
   *       404:
   *         description: 对话不存在
   */
  fastify.get(
    '/api/conversations/:id',
    {
      config: { permissions: ['conversations.read'] },
      preHandler: [accessMiddleware.checkConversationAccess('read')],
    },
    async (request, reply) => {
      await controller.getConversation(request, reply);
    },
  );

  /**
   * @swagger
   * /api/conversations/{id}:
   *   put:
   *     tags:
   *       - Conversations
   *     summary: 更新对话（mode/metadata/status）
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *               mode:
   *                 type: string
   *               metadata:
   *                 type: object
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: 更新成功
   */
  fastify.put(
    '/api/conversations/:id',
    {
      config: { permissions: ['conversations.write'] },
      preHandler: [accessMiddleware.checkConversationAccess('write')],
    },
    async (request, reply) => {
      await controller.updateConversation(request, reply);
    },
  );

  /**
   * @swagger
   * /api/conversations/{id}/messages:
   *   post:
   *     tags:
   *       - Conversations
   *     summary: 发送消息
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - senderId
   *               - senderType
   *               - content
   *             properties:
   *               senderId:
   *                 type: string
   *               senderType:
   *                 type: string
   *                 enum: [internal, external]
   *               content:
   *                 type: string
   *     responses:
   *       201:
   *         description: 消息发送成功
   *       400:
   *         description: 请求参数错误
   *       404:
   *         description: 对话不存在
   */
  fastify.post(
    '/api/conversations/:id/messages',
    {
      config: { permissions: ['conversations.write'] },
      preHandler: [accessMiddleware.checkConversationAccess('write')],
    },
    async (request, reply) => {
      await controller.sendMessage(request, reply);
    },
  );

  /**
   * @swagger
   * /api/conversations/{id}/close:
   *   post:
   *     tags:
   *       - Conversations
   *     summary: 关闭对话
   *     description: |
   *       非IM渠道可关闭对话。IM渠道（企微/飞书/钉钉）不允许关闭，会返回 400。
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - closedBy
   *             properties:
   *               closedBy:
   *                 type: string
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: 对话关闭成功
   *       400:
   *         description: IM渠道不支持关闭对话
   *       404:
   *         description: 对话不存在
   */
  fastify.post(
    '/api/conversations/:id/close',
    {
      config: { permissions: ['conversations.write'] },
      preHandler: [accessMiddleware.checkConversationAccess('write')],
    },
    async (request, reply) => {
      await controller.closeConversation(request, reply);
    },
  );

}
