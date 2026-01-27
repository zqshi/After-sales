import { z } from 'zod';

import { nonEmptyStringSchema, uuidSchema } from '@infrastructure/validation/CommonSchemas';

export interface AssignTaskRequestDTO {
  taskId: string;
  assigneeId: string;
}

export const AssignTaskRequestSchema = z.object({
  taskId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  assigneeId: uuidSchema.or(nonEmptyStringSchema.max(100)),
});
