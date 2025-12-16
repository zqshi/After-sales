export interface TaskAssignmentCriteria {
  assigneeId?: string;
  skillMatch?: number;
  workload?: number;
}

export class TaskAssignmentService {
  bestMatch(candidates: TaskAssignmentCriteria[]): string | null {
    if (!candidates.length) {
      return null;
    }

    const sorted = [...candidates].sort((a, b) => {
      const scoreA = (a.skillMatch ?? 0) - (a.workload ?? 0);
      const scoreB = (b.skillMatch ?? 0) - (b.workload ?? 0);
      return scoreB - scoreA;
    });

    return sorted[0].assigneeId ?? null;
  }
}
