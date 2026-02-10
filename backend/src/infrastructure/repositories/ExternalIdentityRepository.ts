import { DataSource, Repository } from 'typeorm';

import { ExternalIdentityEntity } from '@infrastructure/database/entities/ExternalIdentityEntity';

export interface ExternalIdentityUpsertInput {
  customerId: string;
  channel: string;
  externalType: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}

export class ExternalIdentityRepository {
  private repository: Repository<ExternalIdentityEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = dataSource.getRepository(ExternalIdentityEntity);
  }

  async upsert(input: ExternalIdentityUpsertInput): Promise<void> {
    await this.repository.query(
      `
      INSERT INTO external_identities (
        id,
        customer_id,
        channel,
        external_type,
        external_id,
        metadata,
        created_at,
        updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (channel, external_type, external_id)
      DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        input.customerId,
        input.channel,
        input.externalType,
        input.externalId,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  async findByExternal(
    channel: string,
    externalType: string,
    externalId: string,
  ): Promise<ExternalIdentityEntity | null> {
    return this.repository.findOne({
      where: {
        channel,
        externalType,
        externalId,
      },
    });
  }

  async findByCustomerId(customerId: string): Promise<ExternalIdentityEntity[]> {
    return this.repository.find({
      where: {
        customerId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async deleteByExternal(
    customerId: string,
    channel: string,
    externalType: string,
    externalId: string,
  ): Promise<number> {
    const result = await this.repository.delete({
      customerId,
      channel,
      externalType,
      externalId,
    });
    return result.affected ?? 0;
  }
}
