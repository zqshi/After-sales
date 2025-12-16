import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';

export interface DeleteRequirementRequest {
  requirementId: string;
}

export class DeleteRequirementUseCase {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(request: DeleteRequirementRequest): Promise<void> {
    if (!request.requirementId) {
      throw new Error('requirementId is required');
    }

    const requirement = await this.requirementRepository.findById(request.requirementId);
    if (!requirement) {
      throw new Error(`Requirement not found: ${request.requirementId}`);
    }

    await this.requirementRepository.delete(request.requirementId);
  }
}
