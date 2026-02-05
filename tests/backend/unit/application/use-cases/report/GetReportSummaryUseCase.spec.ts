import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetReportSummaryUseCase } from '@application/use-cases/report/GetReportSummaryUseCase';
import { ConversationEntity } from '@infrastructure/database/entities/ConversationEntity';
import { TaskEntity } from '@infrastructure/database/entities/TaskEntity';
import { MessageEntity } from '@infrastructure/database/entities/MessageEntity';

describe('GetReportSummaryUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T12:00:00Z'));
  });

  it('builds report summary with trends and rates', async () => {
    const now = new Date();
    const conv1 = {
      id: 'conv-1',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      status: 'closed',
      closedAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
      slaStatus: 'violated',
    };
    const conv2 = {
      id: 'conv-2',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      status: 'open',
      closedAt: null,
      slaStatus: 'ok',
    };

    const conversationRepo = {
      createQueryBuilder: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([conv1, conv2]),
      }),
    };

    const messageRepo = {
      createQueryBuilder: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ count: '1' }),
      }),
    };

    const qbTicketsCreated = {
      where: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(3),
    };
    const qbTicketsResolved = {
      where: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(1),
    };
    const qbHandle = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue({ avgSeconds: 3600 }),
    };
    const qbSatisfaction = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue({ avgScore: 4.2 }),
    };
    const qbTaskRows = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        { conversationId: 'conv-1', createdAt: new Date(conv1.createdAt.getTime() + 5 * 60 * 1000) },
      ]),
    };

    const taskRepo = {
      createQueryBuilder: vi
        .fn()
        .mockReturnValueOnce(qbTicketsCreated)
        .mockReturnValueOnce(qbTicketsResolved)
        .mockReturnValueOnce(qbHandle)
        .mockReturnValueOnce(qbSatisfaction)
        .mockReturnValueOnce(qbTaskRows),
    };

    const dataSource = {
      getRepository: vi
        .fn()
        .mockReturnValueOnce(conversationRepo)
        .mockReturnValueOnce(taskRepo)
        .mockReturnValueOnce(messageRepo),
      query: vi
        .fn()
        .mockResolvedValueOnce([
          {
            conversationId: 'conv-1',
            customerFirst: new Date(conv1.createdAt.getTime() + 60 * 1000).toISOString(),
            agentFirst: new Date(conv1.createdAt.getTime() + 3 * 60 * 1000).toISOString(),
          },
          {
            conversationId: 'conv-2',
            customerFirst: new Date(conv2.createdAt.getTime() + 60 * 1000).toISOString(),
            agentFirst: null,
          },
        ])
        .mockResolvedValueOnce([
          { conversationId: 'conv-1', senderType: 'customer', sentAt: new Date(conv1.createdAt.getTime() + 60 * 1000).toISOString() },
          { conversationId: 'conv-1', senderType: 'agent', sentAt: new Date(conv1.createdAt.getTime() + 5 * 60 * 1000).toISOString() },
          { conversationId: 'conv-2', senderType: 'customer', sentAt: new Date(conv2.createdAt.getTime() + 60 * 1000).toISOString() },
        ])
        .mockResolvedValueOnce([
          {
            conversationId: 'conv-1',
            customerFirst: new Date(conv1.createdAt.getTime() + 60 * 1000).toISOString(),
            agentFirst: new Date(conv1.createdAt.getTime() + 3 * 60 * 1000).toISOString(),
          },
        ]),
    };

    const useCase = new GetReportSummaryUseCase(dataSource as any);
    const summary = await useCase.execute(2);

    expect(summary.totalConversations).toBe(2);
    expect(summary.activeConversations).toBe(1);
    expect(summary.ticketsCreated).toBe(3);
    expect(summary.ticketsResolved).toBe(1);
    expect(summary.violationCount).toBe(1);
    expect(summary.avgFirstResponseMinutes).toBeGreaterThan(0);
    expect(summary.updateSyncRate).toBeCloseTo(0.5);
    expect(summary.escalationComplianceRate).toBeGreaterThan(0);
    expect(summary.trend.labels.length).toBe(2);
    expect(summary.trend.conversationCounts.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1);
  });
});
