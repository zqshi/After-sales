import { z } from 'zod';

import { uuidSchema, nonEmptyStringSchema, metadataSchema } from '@infrastructure/validation/CommonSchemas';

/**
 * SendMessage 请求验证 Schema
 */
export const SendMessageRequestSchema = z.object({
  conversationId: uuidSchema,
  senderId: nonEmptyStringSchema.max(50, { message: 'Sender ID too long' }),
  senderType: z.enum(['internal', 'external'], {
    errorMap: () => ({ message: 'Sender type must be internal or external' }),
  }),
  content: z
    .string()
    .min(1, { message: 'Content cannot be empty' })
    .max(5000, { message: 'Content too long (max 5000 characters)' }),
  metadata: metadataSchema,
  conversationMetadata: metadataSchema,
});

export type SendMessageRequestDTO = z.infer<typeof SendMessageRequestSchema>;
