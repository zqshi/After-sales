import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';

import { Requirement } from '@domain/requirement/models/Requirement';
import { Priority } from '@domain/requirement/value-objects/Priority';
import { RequirementSource } from '@domain/requirement/value-objects/RequirementSource';
import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { closeTestDataSource, getTestDataSource } from '../../helpers/testDatabase';

describe('RequirementRepository (integration)', () => {
  let dataSource: DataSource;
  let repository: RequirementRepository;

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    repository = new RequirementRepository(dataSource);
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await closeTestDataSource();
  });

  it('persists and retrieves a requirement by id', async () => {
    const requirement = Requirement.create({
      customerId: 'CUST-REQ-INT-01',
      title: 'Improve API latency',
      category: 'performance',
      priority: Priority.create('high'),
      source: RequirementSource.create('manual'),
    });

    await repository.save(requirement);

    const found = await repository.findById(requirement.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(requirement.id);
    expect(found?.category).toBe('performance');
  });

  it('filters, paginates, and counts requirements', async () => {
    await repository.save(
      Requirement.create({
        customerId: 'CUST-REQ-INT-02',
        title: 'Add dark theme',
        category: 'ux',
        priority: Priority.create('medium'),
        source: RequirementSource.create('manual'),
      }),
    );

    await repository.save(
      Requirement.create({
        customerId: 'CUST-REQ-INT-02',
        title: 'Support refunds',
        category: 'finance',
        priority: Priority.create('urgent'),
        source: RequirementSource.create('manual'),
      }),
    );

    const [paginated] = await Promise.all([
      repository.findByFilters({ customerId: 'CUST-REQ-INT-02', category: 'ux' }, { limit: 1, offset: 0 }),
      repository.countByFilters({ customerId: 'CUST-REQ-INT-02' }),
    ]);

    expect(paginated).toHaveLength(1);
    expect(paginated[0].category).toBe('ux');
  });

  it('deletes a requirement', async () => {
    const requirement = Requirement.create({
      customerId: 'CUST-REQ-INT-03',
      title: 'Document pricing',
      category: 'documentation',
      priority: Priority.create('low'),
      source: RequirementSource.create('manual'),
    });

    await repository.save(requirement);
    await repository.delete(requirement.id);

    const found = await repository.findById(requirement.id);
    expect(found).toBeNull();
  });
});
