import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { RequirementResponseDTO } from '../../dto/requirement/RequirementResponseDTO';

export interface UpdateRequirementStatusRequest {
  requirementId: string;
  status: 'pending' | 'approved' | 'resolved' | 'ignored' | 'cancelled';
}

export class UpdateRequirementStatusUseCase {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(
    request: UpdateRequirementStatusRequest,
  ): Promise<RequirementResponseDTO> {
    if (!request.requirementId) {
      throw new Error('requirementId is required');
    }

    const requirement = await this.requirementRepository.findById(request.requirementId);
    if (!requirement) {
      throw new Error(`Requirement not found: ${request.requirementId}`);
    }

    requirement.updateStatus(request.status);
    await this.requirementRepository.save(requirement);
    return RequirementResponseDTO.fromDomain(requirement);
  }
}
