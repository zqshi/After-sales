import { describe, expect, it, vi } from 'vitest';
import { OutboxEventBus } from '@infrastructure/events/OutboxEventBus';
import { DomainEvent } from '@domain/shared/DomainEvent';

class TestEvent extends DomainEvent<{ value: string }> {
  constructor() {
    super('TestEvent', { aggregateId: 'agg-1' }, { value: 'ok' });
  }
}

describe('OutboxEventBus', () => {
  it('publishes single event', async () => {
    const repository = { save: vi.fn().mockResolvedValue(undefined) };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repository) };
    const bus = new OutboxEventBus(dataSource as any);

    await bus.publish(new TestEvent(), 'Aggregate');

    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('publishes multiple events and skips empty list', async () => {
    const repository = { save: vi.fn().mockResolvedValue(undefined) };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repository) };
    const bus = new OutboxEventBus(dataSource as any);

    await bus.publishAll([], 'Aggregate');
    await bus.publishAll([new TestEvent(), new TestEvent()], 'Aggregate');

    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('publishes in transaction', async () => {
    const repository = { save: vi.fn().mockResolvedValue(undefined) };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repository) };
    const bus = new OutboxEventBus(dataSource as any);
    const queryRunner = { manager: { save: vi.fn().mockResolvedValue(undefined) } };

    await bus.publishInTransaction([new TestEvent()], 'Aggregate', queryRunner);

    expect(queryRunner.manager.save).toHaveBeenCalledTimes(1);
  });

  it('gets pending events and marks as published', async () => {
    const repository = {
      find: vi.fn().mockResolvedValue([{ id: 'e1' }]),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repository) };
    const bus = new OutboxEventBus(dataSource as any);

    const results = await bus.getPendingEvents(5);
    await bus.markAsPublished('e1');

    expect(results[0].id).toBe('e1');
    expect(repository.update).toHaveBeenCalledWith('e1', expect.any(Object));
  });

  it('marks failed with retry and dead letter', async () => {
    const repository = {
      findOne: vi.fn()
        .mockResolvedValueOnce({ id: 'e1', retryCount: 0, maxRetries: 2 })
        .mockResolvedValueOnce({ id: 'e2', retryCount: 1, maxRetries: 2 }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repository) };
    const bus = new OutboxEventBus(dataSource as any);

    await bus.markAsFailed('e1', 'err');
    await bus.markAsFailed('e2', 'err');

    expect(repository.update).toHaveBeenCalledTimes(2);
  });

  it('markAsFailed returns when event missing', async () => {
    const repository = {
      findOne: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repository) };
    const bus = new OutboxEventBus(dataSource as any);

    await bus.markAsFailed('missing', 'err');

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('handles dead letter operations', async () => {
    const repository = {
      update: vi.fn().mockResolvedValue(undefined),
      find: vi.fn().mockResolvedValue([{ id: 'd1' }]),
    };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repository) };
    const bus = new OutboxEventBus(dataSource as any);

    await bus.moveToDeadLetter('d1', 'err');
    const dead = await bus.getDeadLetterEvents();
    await bus.retryDeadLetterEvent('d1');

    expect(dead[0].id).toBe('d1');
    expect(repository.update).toHaveBeenCalledTimes(2);
  });

  it('cleans up published events', async () => {
    const qb = {
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ affected: 3 }),
    };
    const repository = {
      createQueryBuilder: vi.fn().mockReturnValue(qb),
    };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repository) };
    const bus = new OutboxEventBus(dataSource as any);

    const result = await bus.cleanupPublishedEvents(10);

    expect(result).toBe(3);
  });
});
