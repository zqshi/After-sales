import { Problem } from '@domain/problem/models/Problem';
import { IProblemRepository } from '@domain/problem/repositories/IProblemRepository';

export class CreateProblemUseCase {
  constructor(private readonly problemRepository: IProblemRepository) {}

  async execute(input: {
    customerId: string;
    conversationId: string;
    title: string;
    description?: string;
    intent?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }): Promise<Problem> {
    const problem = Problem.create({
      customerId: input.customerId,
      conversationId: input.conversationId,
      title: input.title,
      description: input.description,
      intent: input.intent,
      confidence: input.confidence,
      metadata: input.metadata,
    });
    await this.problemRepository.save(problem);
    return problem;
  }
}
