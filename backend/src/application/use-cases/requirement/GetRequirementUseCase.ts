import { z } from 'zod';

import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { nonEmptyStringSchema, uuidSchema } from '@infrastructure/validation/CommonSchemas';
import { Validator } from '@infrastructure/validation/Validator';

import { RequirementResponseDTO } from '../../dto/requirement/RequirementResponseDTO';
import { ResourceAccessControl } from '../../services/ResourceAccessControl';

export interface GetRequirementRequest {
  requirementId: string;
  userId?: string;
}

const GetRequirementRequestSchema = z.object({
  requirementId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  userId: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
});

export class GetRequirementUseCase {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly accessControl?: ResourceAccessControl,
  ) {}

  async execute(request: GetRequirementRequest): Promise<RequirementResponseDTO> {
    const validatedRequest = Validator.validate(GetRequirementRequestSchema, request);

    if (validatedRequest.userId && this.accessControl) {
      await this.accessControl.checkRequirementAccess(
        validatedRequest.userId,
        validatedRequest.requirementId,
        'read',
      );
    }

    const requirement = await this.requirementRepository.findById(validatedRequest.requirementId);
    if (!requirement) {
      throw new Error(`Requirement not found: ${validatedRequest.requirementId}`);
    }

    return RequirementResponseDTO.fromDomain(requirement);
  }
}
