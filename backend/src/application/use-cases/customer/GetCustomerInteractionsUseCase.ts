import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';

export interface GetCustomerInteractionsRequest {
  customerId: string;
}

export class GetCustomerInteractionsUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
  ) {}

  async execute(request: GetCustomerInteractionsRequest): Promise<Record<string, unknown>[]> {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }

    return this.customerProfileRepository.findInteractions(request.customerId);
  }
}
