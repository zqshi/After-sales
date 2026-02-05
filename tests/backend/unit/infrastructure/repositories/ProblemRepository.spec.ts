import { beforeEach, describe, expect, it, vi } from 'vitest';

const outboxMocks = vi.hoisted(() => ({
  publishInTransaction: vi.fn(),
}));

vi.mock('@infrastructure/events/OutboxEventBus', () => ({
  OutboxEventBus: class {
    publishInTransaction = outboxMocks.publishInTransaction;
  },
}));

import { ProblemRepository } from '@infrastructure/repositories/ProblemRepository';
import { Problem } from '@domain/problem/models/Problem';

const makeEntity = (overrides: Partial<any> = {}) => ({
  id: 'p1',
  customerId: 'cust1',
  conversationId: 'c1',
  title: 'Issue',
  description: 'Details',
  status: 'new',
  intent: 'help',
  confidence: 0.8,
  metadata: { a: 1 },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
  resolvedAt: null,
  ...overrides,
});

describe('ProblemRepository', () => {
  beforeEach(() => {
    outboxMocks.publishInTransaction.mockReset();
  });

  it('finds by id', async () => {
    const repoMock = {
      findOne: vi.fn().mockResolvedValue(makeEntity()),
      createQueryBuilder: vi.fn(),
    };
    const dataSource = {
      getRepository: vi.fn().mockReturnValue(repoMock),
    };
    const repo = new ProblemRepository(dataSource as any);

    const result = await repo.findById('p1');

    expect(repoMock.findOne).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(result?.conversationId).toBe('c1');
  });

  it('filters by conversation, customer, status, pagination', async () => {
    const qb = {
      andWhere: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([makeEntity({ id: 'p2' })]),
    };
    const repoMock = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(qb),
    };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repoMock) };
    const repo = new ProblemRepository(dataSource as any);

    const results = await repo.findByFilters(
      { conversationId: 'c1', customerId: 'cust1', status: 'new' },
      { limit: 10, offset: 0 },
    );

    expect(qb.andWhere).toHaveBeenCalledWith('"problem"."conversation_id" = :conversationId', { conversationId: 'c1' });
    expect(qb.andWhere).toHaveBeenCalledWith('"problem"."customer_id" = :customerId', { customerId: 'cust1' });
    expect(qb.andWhere).toHaveBeenCalledWith('"problem"."status" = :status', { status: 'new' });
    expect(results[0].id).toBe('p2');
  });

  it('counts by filters', async () => {
    const qb = {
      andWhere: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(3),
    };
    const repoMock = { createQueryBuilder: vi.fn().mockReturnValue(qb), findOne: vi.fn() };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repoMock) };
    const repo = new ProblemRepository(dataSource as any);

    const count = await repo.countByFilters({ conversationId: 'c1', status: 'new' });

    expect(qb.andWhere).toHaveBeenCalledWith('"problem"."conversation_id" = :conversationId', { conversationId: 'c1' });
    expect(qb.andWhere).toHaveBeenCalledWith('"problem"."status" = :status', { status: 'new' });
    expect(count).toBe(3);
  });

  it('finds active and latest resolved problems', async () => {
    const activeQb = {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(makeEntity({ id: 'p3' })),
    };
    const repoMock = {
      createQueryBuilder: vi.fn().mockReturnValue(activeQb),
      findOne: vi.fn().mockResolvedValue(makeEntity({ id: 'p4', status: 'resolved' })),
    };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repoMock) };
    const repo = new ProblemRepository(dataSource as any);

    const active = await repo.findActiveByConversationId('c1');
    const latest = await repo.findLatestResolvedByConversationId('c1');

    expect(active?.id).toBe('p3');
    expect(latest?.id).toBe('p4');
  });

  it('saves problem and publishes outbox events', async () => {
    const queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: { save: vi.fn().mockResolvedValue(undefined) },
    };
    const dataSource = {
      getRepository: vi.fn().mockReturnValue({}),
      createQueryRunner: vi.fn().mockReturnValue(queryRunner),
    };
    const repo = new ProblemRepository(dataSource as any);

    const problem = Problem.create({ customerId: 'cust1', conversationId: 'c1', title: 'Issue' });
    problem.resolve('fixed');

    await repo.save(problem);

    expect(queryRunner.manager.save).toHaveBeenCalled();
    expect(outboxMocks.publishInTransaction).toHaveBeenCalledWith(
      expect.any(Array),
      'Problem',
      queryRunner,
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(problem.getUncommittedEvents().length).toBe(0);
  });

  it('rolls back on failure', async () => {
    const queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: { save: vi.fn().mockRejectedValue(new Error('boom')) },
    };
    const dataSource = {
      getRepository: vi.fn().mockReturnValue({}),
      createQueryRunner: vi.fn().mockReturnValue(queryRunner),
    };
    const repo = new ProblemRepository(dataSource as any);

    const problem = Problem.create({ customerId: 'cust1', conversationId: 'c1', title: 'Issue' });

    await expect(repo.save(problem)).rejects.toThrow('boom');
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });
});
