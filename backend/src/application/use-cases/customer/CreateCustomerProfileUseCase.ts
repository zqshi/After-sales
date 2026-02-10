import { CustomerProfile } from '@domain/customer/models/CustomerProfile';
import { ContactInfo } from '@domain/customer/value-objects/ContactInfo';
import { CustomerLevelInfo } from '@domain/customer/value-objects/CustomerLevelInfo';
import { Metrics } from '@domain/customer/value-objects/Metrics';
import { ExternalIdentityRepository } from '@infrastructure/repositories/ExternalIdentityRepository';
import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';

import { CreateCustomerProfileRequestDTO } from '../../dto/customer/CreateCustomerProfileRequestDTO';
import { CustomerProfileResponseDTO } from '../../dto/customer/CustomerProfileResponseDTO';

export class CreateCustomerProfileUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly externalIdentityRepository: ExternalIdentityRepository,
  ) {}

  async execute(
    request: CreateCustomerProfileRequestDTO,
  ): Promise<CustomerProfileResponseDTO> {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }
    if (!request.name || !request.name.trim()) {
      throw new Error('name is required');
    }

    const existing = await this.customerProfileRepository.findById(request.customerId);
    if (existing) {
      throw new Error('customerId already exists');
    }

    if (request.externalBindings?.length) {
      for (const binding of request.externalBindings) {
        if (!binding.system || !binding.externalId) {
          throw new Error('external binding system and externalId are required');
        }
        const externalType = binding.externalType || 'customer';
        const found = await this.externalIdentityRepository.findByExternal(
          binding.system,
          externalType,
          binding.externalId,
        );
        if (found && found.customerId !== request.customerId) {
          throw new Error('external identity already bound');
        }
      }
    }

    const profile = CustomerProfile.create({
      customerId: request.customerId,
      name: request.name.trim(),
      contactInfo: ContactInfo.create({
        email: request.contactInfo?.email,
        phone: request.contactInfo?.phone,
        address: request.contactInfo?.address,
        preferredChannel: request.contactInfo?.preferredChannel,
      }),
      slaInfo: CustomerLevelInfo.create({
        serviceLevel: request.slaInfo?.serviceLevel ?? 'bronze',
        responseTimeTargetMinutes: request.slaInfo?.responseTimeTargetMinutes ?? 30,
        resolutionTimeTargetMinutes: request.slaInfo?.resolutionTimeTargetMinutes ?? 120,
        lastReviewedAt: request.slaInfo?.lastReviewedAt
          ? new Date(request.slaInfo.lastReviewedAt)
          : undefined,
      }),
      metrics: Metrics.create({
        satisfactionScore: request.metrics?.satisfactionScore ?? 0,
        issueCount: request.metrics?.issueCount ?? 0,
        averageResolutionMinutes: request.metrics?.averageResolutionMinutes ?? 0,
        lastUpdated: request.metrics?.lastUpdated
          ? new Date(request.metrics.lastUpdated)
          : undefined,
      }),
    });

    await this.customerProfileRepository.save(profile);

    if (request.externalBindings?.length) {
      for (const binding of request.externalBindings) {
        await this.externalIdentityRepository.upsert({
          customerId: request.customerId,
          channel: binding.system,
          externalType: binding.externalType || 'customer',
          externalId: binding.externalId,
          metadata: binding.metadata ?? {},
        });
      }
    }

    return CustomerProfileResponseDTO.fromAggregate(profile);
  }
}
