import { z } from 'zod';

import { RequirementPriorityType } from '@domain/requirement/value-objects/Priority';
import { RequirementSourceType } from '@domain/requirement/value-objects/RequirementSource';
import { metadataSchema, nonEmptyStringSchema, prioritySchema, uuidSchema } from '@infrastructure/validation/CommonSchemas';

export interface CreateRequirementRequestDTO {
  customerId: string;
  conversationId?: string;
  title: string;
  description?: string;
  category: string;
  priority?: RequirementPriorityType;
  source?: RequirementSourceType;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export const CreateRequirementRequestSchema = z.object({
  customerId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  conversationId: uuidSchema.optional(),
  title: nonEmptyStringSchema.max(200),
  description: z.string().max(5000).optional(),
  category: nonEmptyStringSchema.max(100),
  priority: prioritySchema.optional(),
  source: z.enum(['conversation', 'ticket', 'manual']).optional(),
  createdBy: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
  metadata: metadataSchema,
});
