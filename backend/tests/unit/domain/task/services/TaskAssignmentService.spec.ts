import { describe, expect, it } from 'vitest';
import { TaskAssignmentService } from '@domain/task/services/TaskAssignmentService';

describe('TaskAssignmentService', () => {
  const service = new TaskAssignmentService();

  it('returns null when no candidates', () => {
    expect(service.bestMatch([])).toBeNull();
  });

  it('picks highest skill match minus workload', () => {
    const candidates = [
      { assigneeId: 'agent-1', skillMatch: 80, workload: 60 },
      { assigneeId: 'agent-2', skillMatch: 60, workload: 20 },
      { assigneeId: 'agent-3', skillMatch: 90, workload: 80 },
    ];

    expect(service.bestMatch(candidates)).toBe('agent-2');
  });
});
