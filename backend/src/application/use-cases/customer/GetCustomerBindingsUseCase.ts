import { ExternalIdentityRepository } from '@infrastructure/repositories/ExternalIdentityRepository';
import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';

export interface CustomerBindingDTO {
  system: string;
  externalType: string;
  externalId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class GetCustomerBindingsUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly externalIdentityRepository: ExternalIdentityRepository,
  ) {}

  async execute(customerId: string): Promise<CustomerBindingDTO[]> {
    if (!customerId) {
      throw new Error('customerId is required');
    }

    const existingCustomer = await this.customerProfileRepository.findById(customerId);
    if (!existingCustomer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const bindings = await this.externalIdentityRepository.findByCustomerId(customerId);
    return bindings.map((binding) => ({
      system: binding.channel,
      externalType: binding.externalType,
      externalId: binding.externalId,
      metadata: binding.metadata ?? {},
      createdAt: binding.createdAt.toISOString(),
      updatedAt: binding.updatedAt.toISOString(),
    }));
  }
}
