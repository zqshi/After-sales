import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';
import { CustomerProfileResponseDTO } from '../../dto/customer/CustomerProfileResponseDTO';

export interface UpdateCommitmentProgressRequest {
  customerId: string;
  commitmentId: string;
  progress: number;
}

export class UpdateCommitmentProgressUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
  ) {}

  async execute(
    request: UpdateCommitmentProgressRequest,
  ): Promise<CustomerProfileResponseDTO> {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }
    if (!request.commitmentId) {
      throw new Error('commitmentId is required');
    }

    const profile = await this.customerProfileRepository.findById(request.customerId);
    if (!profile) {
      throw new Error(`Customer not found: ${request.customerId}`);
    }

    profile.updateCommitmentProgress(request.commitmentId, request.progress);

    await this.customerProfileRepository.save(profile);
    return CustomerProfileResponseDTO.fromAggregate(profile);
  }
}
