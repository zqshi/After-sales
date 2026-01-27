import { Insight } from '@domain/customer/value-objects/Insight';
import { Interaction } from '@domain/customer/value-objects/Interaction';
import { Metrics } from '@domain/customer/value-objects/Metrics';
import { ServiceRecord } from '@domain/customer/value-objects/ServiceRecord';
import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';

import { CustomerProfileResponseDTO } from '../../dto/customer/CustomerProfileResponseDTO';

export interface RefreshCustomerProfileRequest {
  customerId: string;
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
    interactionType: Interaction['interactionType'];
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
}

export class RefreshCustomerProfileUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
  ) {}

  async execute(request: RefreshCustomerProfileRequest): Promise<CustomerProfileResponseDTO> {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }

    const profile = await this.customerProfileRepository.findById(request.customerId);
    if (!profile) {
      throw new Error(`Customer not found: ${request.customerId}`);
    }

    profile.refresh(
      {
        metrics: request.metrics
          ? Metrics.create(request.metrics)
          : undefined,
        insights: request.insights?.map((item) =>
          Insight.create({
            title: item.title,
            detail: item.detail,
            source: item.source,
            createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
          }),
        ),
        interactions: request.interactions?.map((item) =>
          Interaction.create({
            interactionType: item.interactionType,
            occurredAt: new Date(item.occurredAt),
            notes: item.notes,
            channel: item.channel,
          }),
        ),
        serviceRecords: request.serviceRecords?.map((item) =>
          ServiceRecord.create({
            title: item.title,
            description: item.description,
            recordedAt: item.recordedAt ? new Date(item.recordedAt) : undefined,
            ownerId: item.ownerId,
            outcome: item.outcome,
          }),
        ),
      },
      request.source,
    );

    await this.customerProfileRepository.save(profile);
    return CustomerProfileResponseDTO.fromAggregate(profile);
  }
}
