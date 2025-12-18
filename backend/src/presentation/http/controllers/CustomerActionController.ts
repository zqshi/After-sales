import { FastifyRequest, FastifyReply } from 'fastify';
import { AddServiceRecordUseCase } from '../../../application/use-cases/customer/AddServiceRecordUseCase';
import { UpdateCommitmentProgressUseCase } from '../../../application/use-cases/customer/UpdateCommitmentProgressUseCase';
import { AddInteractionUseCase } from '../../../application/use-cases/customer/AddInteractionUseCase';
import { MarkCustomerAsVIPUseCase } from '../../../application/use-cases/customer/MarkCustomerAsVIPUseCase';

export class CustomerActionController {
  constructor(
    private readonly addServiceRecordUseCase: AddServiceRecordUseCase,
    private readonly updateCommitmentProgressUseCase: UpdateCommitmentProgressUseCase,
    private readonly addInteractionUseCase: AddInteractionUseCase,
    private readonly markCustomerAsVIPUseCase: MarkCustomerAsVIPUseCase,
  ) {}

  async addServiceRecord(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const { title, description, ownerId, outcome } = request.body as {
        title: string;
        description: string;
        ownerId?: string;
        outcome?: string;
      };
      const result = await this.addServiceRecordUseCase.execute({
        customerId: id,
        title,
        description,
        ownerId,
        outcome,
      });
      reply.code(201).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async updateCommitment(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id, commitmentId } = request.params as { id: string; commitmentId: string };
      const { progress } = request.body as { progress: number };
      const result = await this.updateCommitmentProgressUseCase.execute({
        customerId: id,
        commitmentId,
        progress,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async addInteraction(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const { interactionType, occurredAt, notes, channel } = request.body as {
        interactionType: 'call' | 'chat' | 'email' | 'meeting';
        occurredAt?: string;
        notes?: string;
        channel?: string;
      };
      const result = await this.addInteractionUseCase.execute({
        customerId: id,
        interactionType,
        occurredAt,
        notes,
        channel,
      });
      reply.code(201).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async markAsVIP(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };
      const result = await this.markCustomerAsVIPUseCase.execute({
        customerId: id,
        reason,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    if (error instanceof Error) {
      const statusCode = this.getStatusCode(error.message);
      reply.code(statusCode).send({
        success: false,
        error: {
          message: error.message,
          code: this.getErrorCode(error.message),
        },
      });
      return;
    }

    reply.code(500).send({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    });
  }

  private getStatusCode(message: string): number {
    if (message.includes('not found')) {
      return 404;
    }
    if (message.includes('required') || message.includes('invalid')) {
      return 400;
    }
    return 500;
  }

  private getErrorCode(message: string): string {
    if (message.includes('not found')) {
      return 'NOT_FOUND';
    }
    if (message.includes('required')) {
      return 'VALIDATION_ERROR';
    }
    if (message.includes('invalid')) {
      return 'INVALID_INPUT';
    }
    return 'INTERNAL_ERROR';
  }
}
