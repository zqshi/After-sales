import { z } from 'zod';

export interface CompleteTaskRequestDTO {
  qualityScore?: {
    timeliness: number;
    completeness: number;
    satisfaction: number;
  };
}

export const CompleteTaskRequestSchema = z.object({
  qualityScore: z.object({
    timeliness: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    satisfaction: z.number().min(0).max(100),
  }).optional(),
});
