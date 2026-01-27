import { z } from 'zod';

import { requirementStatusSchema } from '@infrastructure/validation/CommonSchemas';

export interface UpdateStatusRequestDTO {
  status: 'pending' | 'approved' | 'resolved' | 'ignored' | 'cancelled';
}

export const UpdateRequirementStatusSchema = z.object({
  status: requirementStatusSchema,
});
