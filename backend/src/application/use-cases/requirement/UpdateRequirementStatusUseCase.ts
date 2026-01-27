import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { nonEmptyStringSchema, uuidSchema } from '@infrastructure/validation/CommonSchemas';
import { Validator } from '@infrastructure/validation/Validator';

import { RequirementResponseDTO } from '../../dto/requirement/RequirementResponseDTO';
import { UpdateRequirementStatusSchema } from '../../dto/requirement/UpdateStatusRequestDTO';
import { ResourceAccessControl } from '../../services/ResourceAccessControl';

export interface UpdateRequirementStatusRequest {
  requirementId: string;
  status: 'pending' | 'approved' | 'resolved' | 'ignored' | 'cancelled';
  userId?: string;
}

const UpdateRequirementStatusRequestSchema = UpdateRequirementStatusSchema.extend({
  requirementId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  userId: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
});

export class UpdateRequirementStatusUseCase {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly accessControl?: ResourceAccessControl,
  ) {}

  async execute(
    request: UpdateRequirementStatusRequest,
  ): Promise<RequirementResponseDTO> {
    const validatedRequest = Validator.validate(UpdateRequirementStatusRequestSchema, request);

    if (validatedRequest.userId && this.accessControl) {
      await this.accessControl.checkRequirementAccess(
        validatedRequest.userId,
        validatedRequest.requirementId,
        'write',
      );
    }

    const requirement = await this.requirementRepository.findById(validatedRequest.requirementId);
    if (!requirement) {
      throw new Error(`Requirement not found: ${validatedRequest.requirementId}`);
    }

    requirement.updateStatus(validatedRequest.status);
    await this.requirementRepository.save(requirement);
    return RequirementResponseDTO.fromDomain(requirement);
  }
}
