import { z } from 'zod';

/**
 * 通用验证 Schema
 */

// UUID 验证
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

// 非空字符串
export const nonEmptyStringSchema = z.string().min(1, { message: 'Cannot be empty' });

// 邮箱验证
export const emailSchema = z.string().email({ message: 'Invalid email format' });

// 手机号验证（中国）
export const phoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, { message: 'Invalid phone number format' });

// 分页参数
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// 日期范围
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// 优先级
export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: 'Invalid priority value' }),
});

// 状态
export const conversationStatusSchema = z.enum(['open', 'pending', 'closed'], {
  errorMap: () => ({ message: 'Invalid conversation status' }),
});

export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled'], {
  errorMap: () => ({ message: 'Invalid task status' }),
});

export const requirementStatusSchema = z.enum(['pending', 'approved', 'resolved', 'ignored', 'cancelled'], {
  errorMap: () => ({ message: 'Invalid requirement status' }),
});

// Metadata（宽松验证）
export const metadataSchema = z.record(z.unknown()).optional();
