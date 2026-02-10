import { ExternalIdentityRepository } from '@infrastructure/repositories/ExternalIdentityRepository';
import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';

import { UnbindExternalIdentityRequestDTO } from '../../dto/customer/UnbindExternalIdentityRequestDTO';

export class UnbindExternalIdentityUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly externalIdentityRepository: ExternalIdentityRepository,
  ) {}

  async execute(request: UnbindExternalIdentityRequestDTO): Promise<void> {
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
    const deleted = await this.externalIdentityRepository.deleteByExternal(
      request.customerId,
      request.system,
      externalType,
      request.externalId,
    );

    if (deleted === 0) {
      throw new Error('external identity not found');
    }
  }
}
