import { z } from 'zod';

import { uuidSchema, nonEmptyStringSchema, prioritySchema, metadataSchema } from '@infrastructure/validation/CommonSchemas';

/**
 * CreateTask 请求验证 Schema
 */
export const CreateTaskRequestSchema = z.object({
  title: nonEmptyStringSchema.min(2, { message: 'Title must be at least 2 characters' })
    .max(200, { message: 'Title too long (max 200 characters)' }),
  description: z
    .string()
    .max(2000, { message: 'Description too long (max 2000 characters)' })
    .optional(),
  type: nonEmptyStringSchema.max(100).optional(),
  conversationId: uuidSchema.optional(),
  requirementId: uuidSchema.optional(),
  assigneeId: nonEmptyStringSchema.max(100).optional(),
  priority: prioritySchema.optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().positive().max(1000).optional(),
  metadata: metadataSchema,
});

export type CreateTaskRequestDTO = z.infer<typeof CreateTaskRequestSchema>;
