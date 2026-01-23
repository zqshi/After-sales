import { IProblemRepository } from '@domain/problem/repositories/IProblemRepository';
import { ProblemStatus } from '@domain/problem/types';

export class UpdateProblemStatusUseCase {
  constructor(private readonly problemRepository: IProblemRepository) {}

  async execute(input: {
    problemId: string;
    status: ProblemStatus;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const problem = await this.problemRepository.findById(input.problemId);
    if (!problem) {
      throw new Error(`Problem ${input.problemId} not found`);
    }

    if (input.metadata) {
      problem.updateMetadata(input.metadata);
    }

    if (input.status === 'resolved') {
      problem.resolve(input.reason);
    } else if (input.status === 'reopened') {
      problem.reopen(input.reason);
    } else if (input.status === 'in_progress') {
      problem.markInProgress(input.reason);
    } else if (input.status === 'waiting_customer') {
      problem.markWaitingCustomer(input.reason);
    } else {
      problem.updateStatus(input.status, input.reason);
    }

    await this.problemRepository.save(problem);
  }
}
