import { beforeEach, describe, expect, it, vi } from 'vitest';

const outboxMocks = vi.hoisted(() => ({
  publishInTransaction: vi.fn(),
}));

vi.mock('@infrastructure/events/OutboxEventBus', () => ({
  OutboxEventBus: class {
    publishInTransaction = outboxMocks.publishInTransaction;
  },
}));

import { ReviewRequestRepository } from '@infrastructure/repositories/ReviewRequestRepository';
import { ReviewRequest } from '@domain/review/models/ReviewRequest';

const makeEntity = (overrides: Partial<any> = {}) => ({
  id: 'r1',
  conversationId: 'c1',
  status: 'pending',
  suggestion: { a: 1 },
  confidence: 0.5,
  reviewerId: null,
  reviewerNote: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
  resolvedAt: null,
  ...overrides,
});

describe('ReviewRequestRepository', () => {
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
    const repo = new ReviewRequestRepository(dataSource as any);

    const result = await repo.findById('r1');

    expect(repoMock.findOne).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(result?.conversationId).toBe('c1');
  });

  it('filters by conversation, status, pagination', async () => {
    const qb = {
      andWhere: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([makeEntity({ id: 'r2' })]),
    };
    const repoMock = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(qb),
    };
    const dataSource = {
      getRepository: vi.fn().mockReturnValue(repoMock),
    };
    const repo = new ReviewRequestRepository(dataSource as any);

    const results = await repo.findByFilters(
      { conversationId: 'c1', status: 'pending' },
      { limit: 10, offset: 5 },
    );

    expect(qb.andWhere).toHaveBeenCalledWith('"review"."conversation_id" = :conversationId', { conversationId: 'c1' });
    expect(qb.andWhere).toHaveBeenCalledWith('"review"."status" = :status', { status: 'pending' });
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(results[0].id).toBe('r2');
  });

  it('finds latest pending by conversation', async () => {
    const repoMock = {
      findOne: vi.fn().mockResolvedValue(makeEntity({ status: 'pending' })),
      createQueryBuilder: vi.fn(),
    };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repoMock) };
    const repo = new ReviewRequestRepository(dataSource as any);

    const result = await repo.findLatestPendingByConversation('c1');

    expect(repoMock.findOne).toHaveBeenCalledWith({
      where: { conversationId: 'c1', status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    expect(result?.status).toBe('pending');
  });

  it('saves review and publishes outbox events', async () => {
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
    const repo = new ReviewRequestRepository(dataSource as any);

    const review = ReviewRequest.create({ conversationId: 'c1', suggestion: { a: 1 }, confidence: 0.2 });
    review.complete('approved', 'reviewer', 'note');

    await repo.save(review);

    expect(queryRunner.manager.save).toHaveBeenCalled();
    expect(outboxMocks.publishInTransaction).toHaveBeenCalledWith(
      expect.any(Array),
      'ReviewRequest',
      queryRunner,
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(review.getUncommittedEvents().length).toBe(0);
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
    const repo = new ReviewRequestRepository(dataSource as any);

    const review = ReviewRequest.create({ conversationId: 'c1', suggestion: { a: 1 } });

    await expect(repo.save(review)).rejects.toThrow('boom');
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });
});
