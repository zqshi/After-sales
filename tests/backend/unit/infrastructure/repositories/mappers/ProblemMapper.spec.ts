import { describe, expect, it } from 'vitest';
import { ProblemMapper } from '@infrastructure/repositories/mappers/ProblemMapper';
import { Problem } from '@domain/problem/models/Problem';


describe('ProblemMapper', () => {
  it('maps entity to domain and back', () => {
    const entity: any = {
      id: 'p1',
      customerId: 'cust-1',
      conversationId: 'conv-1',
      title: 'Title',
      description: null,
      status: 'open',
      intent: 'intent',
      confidence: 0.6,
      metadata: { a: 1 },
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
      resolvedAt: null,
    };

    const domain = ProblemMapper.toDomain(entity);
    expect(domain.id).toBe('p1');

    const back = ProblemMapper.toEntity(domain);
    expect(back.customerId).toBe('cust-1');
    expect(back.description).toBeNull();
  });

  it('keeps resolvedAt when present', () => {
    const problem = Problem.create({
      customerId: 'cust-2',
      conversationId: 'conv-2',
      title: 'Title',
      description: 'Desc',
      intent: 'intent',
      confidence: 0.7,
    });
    problem.resolve('done');

    const entity = ProblemMapper.toEntity(problem);
    expect(entity.resolvedAt).not.toBeNull();
  });
});
