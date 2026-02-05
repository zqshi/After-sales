/**
 * MCP API E2E Tests
 */

import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { createApp } from '../../../backend/src/app';
import { closeTestDataSource, getTestDataSource } from '../helpers/testDatabase';
import { ConversationEntity } from '../../../backend/src/infrastructure/database/entities/ConversationEntity';
import { CustomerProfileEntity } from '../../../backend/src/infrastructure/database/entities/CustomerProfileEntity';
import { KnowledgeItemEntity } from '../../../backend/src/infrastructure/database/entities/KnowledgeItemEntity';
import { v4 as uuidv4 } from 'uuid';

const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;

describeWithDb('MCP API E2E Tests', () => {
  let app: FastifyInstance;
  let dataSource: DataSource;
  let conversationId: string;
  let customerId: string;
  let knowledgeId: string;

  const withApp = (options: Parameters<FastifyInstance['inject']>[0]) => app.inject(options);
  const callTool = async (name: string, args: Record<string, unknown>) => {
    const response = await withApp({
      method: 'POST',
      url: '/mcp',
      payload: {
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    return body.result;
  };

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    app = await createApp(dataSource);
    await app.ready();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    customerId = 'CUST-MCP-001';
    conversationId = uuidv4();
    knowledgeId = uuidv4();

    await dataSource.getRepository(ConversationEntity).save({
      id: conversationId,
      customerId,
      agentId: 'agent-001',
      channel: 'web',
      status: 'open',
      priority: 'normal',
      slaStatus: 'normal',
      slaDeadline: null,
      mode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
      metadata: {},
      messages: [],
    });

    await dataSource.getRepository(CustomerProfileEntity).save({
      id: uuidv4(),
      customerId,
      name: 'Test Customer',
      company: 'Test Company',
      tags: ['test'],
      healthScore: 80,
      contactInfo: { email: 'test@example.com' },
      slaInfo: { responseTime: 30, resolutionTime: 120 },
      metrics: { totalOrders: 5 },
      insights: [],
      interactions: [],
      serviceRecords: [],
      commitments: [],
      isVIP: false,
      riskLevel: 'low',
    });

    await dataSource.getRepository(KnowledgeItemEntity).save({
      id: knowledgeId,
      title: '退款多久到账',
      content: '退款预计 1-3 个工作日到账。',
      category: 'policy',
      tags: ['refund'],
      source: 'local',
      metadata: {},
      isArchived: false,
    });
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  it('should list MCP tools', async () => {
    const response = await withApp({
      method: 'GET',
      url: '/mcp/tools',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body.tools)).toBe(true);
    const toolNames = body.tools.map((tool: { name: string }) => tool.name);
    expect(toolNames).toEqual(expect.arrayContaining([
      'analyzeConversation',
      'createSurvey',
      'createTask',
      'generateQualityReport',
      'getConversationHistory',
      'getCustomerHistory',
      'getCustomerProfile',
      'getSystemStatus',
      'inspectConversation',
      'saveQualityReport',
      'searchKnowledge',
      'searchTickets',
    ]));
  });

  it('should return tools list for empty MCP payload', async () => {
    const response = await withApp({
      method: 'POST',
      url: '/mcp',
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body.tools)).toBe(true);
  });

  it('should call core MCP tools', async () => {
    const history = await callTool('getConversationHistory', {
      conversationId,
      includeMetadata: false,
    });
    expect(Array.isArray(history)).toBe(true);

    const profile = await callTool('getCustomerProfile', { customerId });
    expect(profile.customerId).toBe(customerId);

    const customerHistory = await callTool('getCustomerHistory', { customerId, limit: 10, page: 1 });
    expect(Array.isArray(customerHistory.items)).toBe(true);
    expect(customerHistory.total).toBeGreaterThanOrEqual(1);

    const knowledge = await callTool('searchKnowledge', { query: '退款', mode: 'keyword' });
    expect(Array.isArray(knowledge)).toBe(true);
    expect(knowledge.length).toBeGreaterThan(0);
    const knowledgeIds = knowledge.map((item: { id: string }) => item.id);
    expect(knowledgeIds).toContain(knowledgeId);

    const task = await callTool('createTask', {
      title: 'MCP E2E Task',
      conversationId,
      priority: 'high',
    });
    expect(task.id).toBeTruthy();

    const tickets = await callTool('searchTickets', { query: 'MCP E2E Task' });
    expect(Array.isArray(tickets)).toBe(true);

    const systemStatus = await callTool('getSystemStatus', { includeStats: true });
    expect(systemStatus.status).toBeTruthy();
    expect(systemStatus.components).toBeTruthy();

    const analysis = await callTool('analyzeConversation', {
      conversationId,
      includeHistory: true,
    });
    expect(analysis.conversationId).toBe(conversationId);

    const inspection = await callTool('inspectConversation', { conversationId });
    expect(inspection.conversationId).toBe(conversationId);

    const qualityReport = await callTool('generateQualityReport', { conversationId });
    expect(qualityReport.conversationId).toBe(conversationId);

    const savedReport = await callTool('saveQualityReport', {
      conversationId,
      qualityScore: 85,
      report: { summary: 'Test report' },
    });
    expect(savedReport.reportId).toBeTruthy();

    const survey = await callTool('createSurvey', {
      customerId,
      conversationId,
      questions: ['满意度评分？', '是否需要进一步协助？'],
    });
    expect(survey.surveyId).toBeTruthy();
  });
});
