import { DataSource, Repository } from 'typeorm';

import { CustomerProfile } from '@domain/customer/models/CustomerProfile';
import { ICustomerProfileRepository } from '@domain/customer/repositories/ICustomerProfileRepository';
import { CustomerProfileEntity } from '@infrastructure/database/entities/CustomerProfileEntity';

import { CustomerProfileMapper } from './mappers/CustomerProfileMapper';

export class CustomerProfileRepository implements ICustomerProfileRepository {
  private repository: Repository<CustomerProfileEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(CustomerProfileEntity);
  }

  async findById(customerId: string): Promise<CustomerProfile | null> {
    const entity = await this.repository.findOne({
      where: { customerId },
    });

    if (!entity) {
      return null;
    }

    return CustomerProfileMapper.toDomain(entity);
  }

  async save(profile: CustomerProfile): Promise<void> {
    const entity = CustomerProfileMapper.toEntity(profile);
    await this.repository.save(entity);
  }

  async findInteractions(customerId: string): Promise<Record<string, unknown>[]> {
    const profile = await this.findById(customerId);
    if (!profile) {
      return [];
    }

    return profile.interactions.map((interaction) => ({
      type: interaction.interactionType,
      occurredAt: interaction.occurredAt.toISOString(),
      notes: interaction.notes,
      channel: interaction.channel,
    }));
  }
}
