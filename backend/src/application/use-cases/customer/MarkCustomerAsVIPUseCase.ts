import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';
import { CustomerProfileResponseDTO } from '../../dto/customer/CustomerProfileResponseDTO';

export interface MarkCustomerAsVIPRequest {
  customerId: string;
  reason?: string;
}

export class MarkCustomerAsVIPUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
  ) {}

  async execute(request: MarkCustomerAsVIPRequest): Promise<CustomerProfileResponseDTO> {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }

    const profile = await this.customerProfileRepository.findById(request.customerId);
    if (!profile) {
      throw new Error(`Customer not found: ${request.customerId}`);
    }

    profile.markAsVIP(request.reason);
    await this.customerProfileRepository.save(profile);
    return CustomerProfileResponseDTO.fromAggregate(profile);
  }
}
