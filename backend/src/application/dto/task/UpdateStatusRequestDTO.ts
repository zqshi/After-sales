import { z } from 'zod';

import { taskStatusSchema } from '@infrastructure/validation/CommonSchemas';

export interface UpdateStatusRequestDTO {
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export const UpdateTaskStatusSchema = z.object({
  status: taskStatusSchema,
});
