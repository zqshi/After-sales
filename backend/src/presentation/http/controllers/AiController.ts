import { FastifyRequest, FastifyReply } from 'fastify';

import { AnalyzeConversationUseCase } from '../../../application/use-cases/ai/AnalyzeConversationUseCase';
import { ApplySolutionUseCase } from '../../../application/use-cases/ai/ApplySolutionUseCase';

export class AiController {
  constructor(
    private readonly analyzeUseCase: AnalyzeConversationUseCase,
    private readonly applySolutionUseCase: ApplySolutionUseCase,
  ) {}

  async analyze(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const payload = request.body as {
        conversationId: string;
        context?: string;
        model?: string;
        options?: Record<string, unknown>;
      };
      const result = await this.analyzeUseCase.execute(payload);
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async applySolution(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const payload = request.body as {
        conversationId: string;
        solutionType: string;
        solutionId?: string;
        messageTemplate?: string;
        customization?: Record<string, unknown>;
      };
      const result = await this.applySolutionUseCase.execute(payload);
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    if (error instanceof Error) {
      const status = this.getStatus(error.message);
      reply.code(status).send({
        success: false,
        error: { message: error.message, code: this.getCode(error.message) },
      });
      return;
    }
    reply.code(500).send({
      success: false,
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    });
  }

  private getStatus(message: string): number {
    if (message.includes('required') || message.includes('missing')) {
      return 400;
    }
    return 500;
  }

  private getCode(message: string): string {
    if (message.includes('required')) {
      return 'VALIDATION_ERROR';
    }
    return 'INTERNAL_ERROR';
  }
}
