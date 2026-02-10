import { ExternalIdentityRepository } from '@infrastructure/repositories/ExternalIdentityRepository';
import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';

import { BindExternalIdentityRequestDTO } from '../../dto/customer/BindExternalIdentityRequestDTO';

export class BindExternalIdentityUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly externalIdentityRepository: ExternalIdentityRepository,
  ) {}

  async execute(request: BindExternalIdentityRequestDTO): Promise<void> {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }
    if (!request.system || !request.externalId) {
      throw new Error('external binding system and externalId are required');
    }

    const existingCustomer = await this.customerProfileRepository.findById(request.customerId);
    if (!existingCustomer) {
      throw new Error(`Customer not found: ${request.customerId}`);
    }

    const externalType = request.externalType || 'customer';
    const existingBinding = await this.externalIdentityRepository.findByExternal(
      request.system,
      externalType,
      request.externalId,
    );

    if (existingBinding && existingBinding.customerId !== request.customerId) {
      throw new Error('external identity already bound');
    }

    await this.externalIdentityRepository.upsert({
      customerId: request.customerId,
      channel: request.system,
      externalType,
      externalId: request.externalId,
      metadata: request.metadata ?? {},
    });
  }
}
