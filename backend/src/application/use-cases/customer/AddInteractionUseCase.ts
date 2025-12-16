import { CustomerProfileRepository } from '@infrastructure/repositories/CustomerProfileRepository';
import { CustomerProfileResponseDTO } from '../../dto/customer/CustomerProfileResponseDTO';
import { Interaction } from '@domain/customer/value-objects/Interaction';

export interface AddInteractionRequest {
  customerId: string;
  interactionType: Interaction['interactionType'];
  occurredAt?: string;
  notes?: string;
  channel?: string;
}

export class AddInteractionUseCase {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
  ) {}

  async execute(request: AddInteractionRequest): Promise<CustomerProfileResponseDTO> {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }

    const profile = await this.customerProfileRepository.findById(request.customerId);
    if (!profile) {
      throw new Error(`Customer not found: ${request.customerId}`);
    }

    profile.addInteraction(
      Interaction.create({
        interactionType: request.interactionType,
        occurredAt: request.occurredAt ? new Date(request.occurredAt) : new Date(),
        notes: request.notes,
        channel: request.channel,
      }),
    );

    await this.customerProfileRepository.save(profile);
    return CustomerProfileResponseDTO.fromAggregate(profile);
  }
}
