import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';

import { CustomerProfileResponseDTO } from '../../dto/customer/CustomerProfileResponseDTO';

export interface GetCustomerProfileRequest {
  customerId: string;
}

export class GetCustomerProfileUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
  ) {}

  async execute(request: GetCustomerProfileRequest): Promise<CustomerProfileResponseDTO> {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }

    const profile = await this.customerProfileRepository.findById(request.customerId);
    if (!profile) {
      throw new Error(`Customer not found: ${request.customerId}`);
    }

    return CustomerProfileResponseDTO.fromAggregate(profile);
  }
}
