import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';
import { CustomerProfileResponseDTO } from '../../dto/customer/CustomerProfileResponseDTO';
import { ServiceRecord } from '@domain/customer/value-objects/ServiceRecord';

export interface AddServiceRecordRequest {
  customerId: string;
  title: string;
  description: string;
  ownerId?: string;
  outcome?: string;
}

export class AddServiceRecordUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
  ) {}

  async execute(request: AddServiceRecordRequest): Promise<CustomerProfileResponseDTO> {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }

    const profile = await this.customerProfileRepository.findById(request.customerId);
    if (!profile) {
      throw new Error(`Customer not found: ${request.customerId}`);
    }

    profile.addServiceRecord({
      record: ServiceRecord.create({
        title: request.title,
        description: request.description,
        ownerId: request.ownerId,
        outcome: request.outcome,
      }),
    });

    await this.customerProfileRepository.save(profile);
    return CustomerProfileResponseDTO.fromAggregate(profile);
  }
}
