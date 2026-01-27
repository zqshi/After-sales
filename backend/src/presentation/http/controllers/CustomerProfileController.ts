import { FastifyRequest, FastifyReply } from 'fastify';

import { GetCustomerInteractionsUseCase } from '../../../application/use-cases/customer/GetCustomerInteractionsUseCase';
import { GetCustomerProfileUseCase } from '../../../application/use-cases/customer/GetCustomerProfileUseCase';
import { RefreshCustomerProfileUseCase } from '../../../application/use-cases/customer/RefreshCustomerProfileUseCase';

export class CustomerProfileController {
  constructor(
    private readonly getCustomerProfileUseCase: GetCustomerProfileUseCase,
    private readonly refreshCustomerProfileUseCase: RefreshCustomerProfileUseCase,
    private readonly getCustomerInteractionsUseCase: GetCustomerInteractionsUseCase,
  ) {}

  async getProfile(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const result = await this.getCustomerProfileUseCase.execute({
        customerId: id,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async refreshProfile(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const payload = request.body as {
        source: string;
        metrics?: {
          satisfactionScore: number;
          issueCount: number;
          averageResolutionMinutes: number;
        };
        insights?: {
          title: string;
          detail: string;
          source?: string;
          createdAt?: string;
        }[];
        interactions?: {
          interactionType: 'call' | 'chat' | 'email' | 'meeting';
          occurredAt: string;
          notes?: string;
          channel?: string;
        }[];
        serviceRecords?: {
          title: string;
          description: string;
          recordedAt?: string;
          ownerId?: string;
          outcome?: string;
        }[];
      };
      const result = await this.refreshCustomerProfileUseCase.execute({
        customerId: id,
        source: payload.source,
        metrics: payload.metrics,
        insights: payload.insights,
        interactions: payload.interactions,
        serviceRecords: payload.serviceRecords,
      });
      reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getInteractions(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const result = await this.getCustomerInteractionsUseCase.execute({
        customerId: id,
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
