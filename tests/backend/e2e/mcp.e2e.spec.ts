/**
 * MCP API E2E Tests
 */

import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { createApp } from '../../src/app';
import { closeTestDataSource, getTestDataSource } from '../helpers/testDatabase';
import { ConversationEntity } from '../../src/infrastructure/database/entities/ConversationEntity';
import { v4 as uuidv4 } from 'uuid';

const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;

describeWithDb('MCP API E2E Tests', () => {
  let app: FastifyInstance;
  let dataSource: DataSource;

  const withApp = (options: Parameters<FastifyInstance['inject']>[0]) => app.inject(options);

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    app = await createApp(dataSource);
    await app.ready();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
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
    expect(toolNames).toContain('getConversationHistory');
    expect(toolNames).toContain('searchKnowledge');
    expect(toolNames).toContain('getCustomerProfile');
  });

  it('should call getConversationHistory after creating conversation', async () => {
    const conversation = await dataSource.getRepository(ConversationEntity).save({
      id: uuidv4(),
      customerId: 'CUST-MCP-001',
      agentId: null,
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

    const historyResponse = await withApp({
      method: 'POST',
      url: '/mcp',
      payload: {
        method: 'tools/call',
        params: {
          name: 'getConversationHistory',
          arguments: {
            conversationId: conversation.id,
            includeMetadata: false,
          },
        },
      },
    });

    expect(historyResponse.statusCode).toBe(200);
    const historyBody = JSON.parse(historyResponse.body);
    expect(Array.isArray(historyBody.result)).toBe(true);
    expect(historyBody.result.length).toBeGreaterThanOrEqual(0);
  });
});
