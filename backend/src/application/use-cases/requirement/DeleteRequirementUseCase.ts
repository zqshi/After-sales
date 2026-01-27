import { z } from 'zod';

import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { nonEmptyStringSchema, uuidSchema } from '@infrastructure/validation/CommonSchemas';
import { Validator } from '@infrastructure/validation/Validator';
import { ResourceAccessControl } from '../../services/ResourceAccessControl';

export interface DeleteRequirementRequest {
  requirementId: string;
  userId?: string;
}

const DeleteRequirementRequestSchema = z.object({
  requirementId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  userId: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
});

export class DeleteRequirementUseCase {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly accessControl?: ResourceAccessControl,
  ) {}

  async execute(request: DeleteRequirementRequest): Promise<void> {
    const validatedRequest = Validator.validate(DeleteRequirementRequestSchema, request);

    if (validatedRequest.userId && this.accessControl) {
      await this.accessControl.checkRequirementAccess(
        validatedRequest.userId,
        validatedRequest.requirementId,
        'delete',
      );
    }

    const requirement = await this.requirementRepository.findById(validatedRequest.requirementId);
    if (!requirement) {
      throw new Error(`Requirement not found: ${validatedRequest.requirementId}`);
    }

    await this.requirementRepository.delete(validatedRequest.requirementId);
  }
}
