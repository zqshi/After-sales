import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';

import { CreateRequirementUseCase } from '@application/use-cases/requirement/CreateRequirementUseCase';
import { DeleteRequirementUseCase } from '@application/use-cases/requirement/DeleteRequirementUseCase';
import { ListRequirementsUseCase } from '@application/use-cases/requirement/ListRequirementsUseCase';
import { UpdateRequirementStatusUseCase } from '@application/use-cases/requirement/UpdateRequirementStatusUseCase';
import { RequirementListQueryDTO } from '@application/dto/requirement/RequirementListQueryDTO';
import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { closeTestDataSource, getTestDataSource } from '../../helpers/testDatabase';

describe('Requirement use cases (integration)', () => {
  let dataSource: DataSource;
  let repository: RequirementRepository;
  let createUseCase: CreateRequirementUseCase;
  let listUseCase: ListRequirementsUseCase;
  let updateStatusUseCase: UpdateRequirementStatusUseCase;
  let deleteUseCase: DeleteRequirementUseCase;

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    repository = new RequirementRepository(dataSource);
    createUseCase = new CreateRequirementUseCase(repository);
    listUseCase = new ListRequirementsUseCase(repository);
    updateStatusUseCase = new UpdateRequirementStatusUseCase(repository);
    deleteUseCase = new DeleteRequirementUseCase(repository);
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await closeTestDataSource();
  });

  it('creates and lists requirements with pagination', async () => {
    const createRequest = {
      customerId: 'CUST-REQ-UC-01',
      title: 'Improve onboarding',
      category: 'ux',
      description: 'More contextual help',
    };

    const result = await createUseCase.execute(createRequest);

    expect(result.id).toBeDefined();
    expect(result.status).toBe('pending');

    const query: RequirementListQueryDTO = {
      customerId: 'CUST-REQ-UC-01',
      page: 1,
      limit: 10,
    };

    const list = await listUseCase.execute(query);

    expect(list.items).toHaveLength(1);
    expect(list.total).toBe(1);
    expect(list.items[0].title).toBe(createRequest.title);
  });

  it('updates status and deletes a requirement', async () => {
    const created = await createUseCase.execute({
      customerId: 'CUST-REQ-UC-02',
      title: 'Support audit logs',
      category: 'security',
    });

    const updated = await updateStatusUseCase.execute({
      requirementId: created.id,
      status: 'approved',
    });

    expect(updated.status).toBe('approved');

    await deleteUseCase.execute({ requirementId: created.id });
    const afterDeletion = await repository.findById(created.id);
    expect(afterDeletion).toBeNull();
  });
});
