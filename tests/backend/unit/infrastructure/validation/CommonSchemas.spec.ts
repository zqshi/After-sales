import { describe, expect, it } from 'vitest';
import {
  uuidSchema,
  nonEmptyStringSchema,
  emailSchema,
  phoneSchema,
  paginationSchema,
  dateRangeSchema,
  prioritySchema,
  conversationStatusSchema,
  taskStatusSchema,
  requirementStatusSchema,
  metadataSchema,
} from '@infrastructure/validation/CommonSchemas';

describe('CommonSchemas', () => {
  it('validates primitive schemas', () => {
    expect(uuidSchema.safeParse('00000000-0000-0000-0000-000000000000').success).toBe(true);
    expect(nonEmptyStringSchema.safeParse('ok').success).toBe(true);
    expect(emailSchema.safeParse('a@b.com').success).toBe(true);
    expect(phoneSchema.safeParse('13800138000').success).toBe(true);
  });

  it('validates pagination defaults', () => {
    const parsed = paginationSchema.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
  });

  it('validates date ranges and enums', () => {
    const valid = dateRangeSchema.safeParse({ startDate: '2024-01-01', endDate: '2024-01-02' });
    expect(valid.success).toBe(true);

    const invalid = dateRangeSchema.safeParse({ startDate: '2024-01-02', endDate: '2024-01-01' });
    expect(invalid.success).toBe(false);

    expect(prioritySchema.safeParse('urgent').success).toBe(true);
    expect(conversationStatusSchema.safeParse('open').success).toBe(true);
    expect(taskStatusSchema.safeParse('completed').success).toBe(true);
    expect(requirementStatusSchema.safeParse('approved').success).toBe(true);
  });

  it('accepts metadata records', () => {
    expect(metadataSchema.safeParse({ a: 1, b: 'x' }).success).toBe(true);
    expect(metadataSchema.safeParse(undefined).success).toBe(true);
  });
});
