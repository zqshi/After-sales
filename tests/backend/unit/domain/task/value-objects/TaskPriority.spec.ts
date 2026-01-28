import { describe, expect, it } from 'vitest';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';

describe('TaskPriority value object', () => {
  it('normalizes and accepts supported priorities', () => {
    const priority = TaskPriority.create('  UrgenT ');
    expect(priority.value).toBe('urgent');
  });

  it('rejects unsupported priority values', () => {
    expect(() => TaskPriority.create('super-high')).toThrow('Unsupported task priority');
  });
});
