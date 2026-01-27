import { z } from 'zod';

import { metadataSchema, nonEmptyStringSchema, uuidSchema } from '@infrastructure/validation/CommonSchemas';

export type InitialMessageSenderType = 'internal' | 'external';

export interface InitialMessageDTO {
  senderId: string;
  senderType?: InitialMessageSenderType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CreateConversationRequestDTO {
  customerId: string;
  channel: string;
  agentId?: string;
  priority?: 'low' | 'normal' | 'high';
  slaDeadline?: string;
  metadata?: Record<string, unknown>;
  mode?: 'agent_auto' | 'agent_supervised' | 'human_first';
  initialMessage?: InitialMessageDTO;
}

export const CreateConversationRequestSchema = z.object({
  customerId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  channel: z.enum([
    'chat',
    'email',
    'phone',
    'web',
    'sms',
    'voice',
    'feishu',
    'wecom',
    'wechat',
    'qq',
    'dingtalk',
  ]),
  agentId: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  slaDeadline: z.string().datetime().optional(),
  metadata: metadataSchema,
  mode: z.enum(['agent_auto', 'agent_supervised', 'human_first']).optional(),
  initialMessage: z.object({
    senderId: uuidSchema.or(nonEmptyStringSchema.max(100)),
    senderType: z.enum(['internal', 'external']).optional(),
    content: nonEmptyStringSchema.max(5000),
    metadata: metadataSchema,
  }).optional(),
});
