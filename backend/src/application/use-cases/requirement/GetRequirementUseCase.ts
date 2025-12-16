import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { RequirementResponseDTO } from '../../dto/requirement/RequirementResponseDTO';

export interface GetRequirementRequest {
  requirementId: string;
}

export class GetRequirementUseCase {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(request: GetRequirementRequest): Promise<RequirementResponseDTO> {
    if (!request.requirementId) {
      throw new Error('requirementId is required');
    }

    const requirement = await this.requirementRepository.findById(request.requirementId);
    if (!requirement) {
      throw new Error(`Requirement not found: ${request.requirementId}`);
    }

    return RequirementResponseDTO.fromDomain(requirement);
  }
}
