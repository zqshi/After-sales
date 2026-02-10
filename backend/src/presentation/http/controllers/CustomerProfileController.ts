import { FastifyRequest, FastifyReply } from 'fastify';

import { GetCustomerInteractionsUseCase } from '../../../application/use-cases/customer/GetCustomerInteractionsUseCase';
import { CreateCustomerProfileUseCase } from '../../../application/use-cases/customer/CreateCustomerProfileUseCase';
import { BindExternalIdentityUseCase } from '../../../application/use-cases/customer/BindExternalIdentityUseCase';
import { GetCustomerBindingsUseCase } from '../../../application/use-cases/customer/GetCustomerBindingsUseCase';
import { UnbindExternalIdentityUseCase } from '../../../application/use-cases/customer/UnbindExternalIdentityUseCase';
import { GetCustomerProfileUseCase } from '../../../application/use-cases/customer/GetCustomerProfileUseCase';
import { RefreshCustomerProfileUseCase } from '../../../application/use-cases/customer/RefreshCustomerProfileUseCase';
import { CreateCustomerProfileRequestDTO } from '../../../application/dto/customer/CreateCustomerProfileRequestDTO';
import { BindExternalIdentityRequestDTO } from '../../../application/dto/customer/BindExternalIdentityRequestDTO';
import { UnbindExternalIdentityRequestDTO } from '../../../application/dto/customer/UnbindExternalIdentityRequestDTO';

export class CustomerProfileController {
  constructor(
    private readonly createCustomerProfileUseCase: CreateCustomerProfileUseCase,
    private readonly bindExternalIdentityUseCase: BindExternalIdentityUseCase,
    private readonly getCustomerBindingsUseCase: GetCustomerBindingsUseCase,
    private readonly unbindExternalIdentityUseCase: UnbindExternalIdentityUseCase,
    private readonly getCustomerProfileUseCase: GetCustomerProfileUseCase,
    private readonly refreshCustomerProfileUseCase: RefreshCustomerProfileUseCase,
    private readonly getCustomerInteractionsUseCase: GetCustomerInteractionsUseCase,
  ) {}

  async createProfile(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const payload = request.body as CreateCustomerProfileRequestDTO;
      const result = await this.createCustomerProfileUseCase.execute(payload);
      void reply.code(201).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getProfile(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const result = await this.getCustomerProfileUseCase.execute({
        customerId: id,
      });
      void reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async bindExternalIdentity(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const payload = request.body as Omit<BindExternalIdentityRequestDTO, 'customerId'>;
      await this.bindExternalIdentityUseCase.execute({
        customerId: id,
        system: payload.system,
        externalType: payload.externalType,
        externalId: payload.externalId,
        metadata: payload.metadata,
      });
      void reply.code(200).send({ success: true });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getBindings(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const result = await this.getCustomerBindingsUseCase.execute(id);
      void reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async unbindExternalIdentity(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const payload = request.body as Omit<UnbindExternalIdentityRequestDTO, 'customerId'>;
      await this.unbindExternalIdentityUseCase.execute({
        customerId: id,
        system: payload.system,
        externalType: payload.externalType,
        externalId: payload.externalId,
      });
      void reply.code(200).send({ success: true });
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
      void reply.code(200).send({ success: true, data: result });
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
      void reply.code(200).send({ success: true, data: result });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    if (error instanceof Error) {
      const statusCode = this.getStatusCode(error.message);
      void reply.code(statusCode).send({
        success: false,
        error: {
          message: error.message,
          code: this.getErrorCode(error.message),
        },
      });
      return;
    }

    void reply.code(500).send({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    });
  }

  private getStatusCode(message: string): number {
    if (message.includes('already exists') || message.includes('already bound')) {
      return 409;
    }
    if (message.includes('not found')) {
      return 404;
    }
    if (message.includes('required') || message.includes('invalid')) {
      return 400;
    }
    return 500;
  }

  private getErrorCode(message: string): string {
    if (message.includes('already exists') || message.includes('already bound')) {
      return 'CONFLICT';
    }
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
