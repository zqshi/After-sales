import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { validate as isUUID } from 'uuid';

import { IConversationRepository } from '@domain/conversation/repositories/IConversationRepository';
import { Conversation } from '@domain/conversation/models/Conversation';
import { ConversationEntity } from '@infrastructure/database/entities/ConversationEntity';
import { DomainEventEntity } from '@infrastructure/database/entities/DomainEventEntity';
import { ConversationMapper } from './mappers/ConversationMapper';
import { ConversationStatus, SLAStatus } from '@domain/conversation/types';

export interface ConversationFilters {
  status?: ConversationStatus;
  agentId?: string;
  customerId?: string;
  channel?: string;
  slaStatus?: SLAStatus;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}
export class ConversationRepository implements IConversationRepository {
  private repository: Repository<ConversationEntity>;
  private eventRepository: Repository<DomainEventEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(ConversationEntity);
    this.eventRepository = dataSource.getRepository(DomainEventEntity);
  }

  async save(conversation: Conversation): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entity = ConversationMapper.toEntity(conversation);
      await queryRunner.manager.save(entity);

      const events = conversation.getUncommittedEvents();
      for (const event of events) {
        const eventEntity = new DomainEventEntity();
        eventEntity.id = event.eventId;
        eventEntity.aggregateId = conversation.id;
        eventEntity.aggregateType = 'Conversation';
        eventEntity.eventType = event.eventType;
        eventEntity.eventData = event.payload as Record<string, unknown>;
        eventEntity.occurredAt = event.occurredAt;
        eventEntity.version = event.version;

        await queryRunner.manager.save(eventEntity);
      }

      conversation.clearEvents();
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string): Promise<Conversation | null> {
    if (!isUUID(id)) {
      return null;
    }
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['messages'],
    });

    if (!entity) {
      return null;
    }

    return ConversationMapper.toDomain(entity);
  }

  async findByCustomerId(customerId: string): Promise<Conversation[]> {
    const entities = await this.repository.find({
      where: { customerId },
      relations: ['messages'],
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => ConversationMapper.toDomain(entity));
  }

  async getEvents(conversationId: string): Promise<Record<string, unknown>[]> {
    const events = await this.eventRepository.find({
      where: {
        aggregateId: conversationId,
        aggregateType: 'Conversation',
      },
      order: { version: 'ASC' },
    });

    return events.map((event) => ({
      id: event.id,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      eventData: event.eventData,
      occurredAt: event.occurredAt,
      version: event.version,
    }));
  }

  async findByFilters(
    filters: ConversationFilters = {},
    pagination: PaginationOptions,
  ): Promise<Conversation[]> {
    const qb = this.repository.createQueryBuilder('conversation');
    qb.leftJoinAndSelect('conversation.messages', 'messages');
    qb.orderBy('conversation.updatedAt', 'DESC');
    qb.take(pagination.limit);
    qb.skip(pagination.offset);

    this.applyFilters(qb, filters);

    const entities = await qb.getMany();
    return entities.map((entity) => ConversationMapper.toDomain(entity));
  }

  async countByFilters(filters: ConversationFilters = {}): Promise<number> {
    const qb = this.repository.createQueryBuilder('conversation');
    this.applyFilters(qb, filters);
    return qb.getCount();
  }

  private applyFilters(
    qb: SelectQueryBuilder<ConversationEntity>,
    filters: ConversationFilters,
  ): void {
    if (filters.status) {
      qb.andWhere('conversation.status = :status', { status: filters.status });
    }
    if (filters.agentId) {
      qb.andWhere('conversation.agentId = :agentId', { agentId: filters.agentId });
    }
    if (filters.customerId) {
      qb.andWhere('conversation.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }
    if (filters.channel) {
      qb.andWhere('conversation.channel = :channel', { channel: filters.channel });
    }
    if (filters.slaStatus) {
      qb.andWhere('conversation.slaStatus = :slaStatus', {
        slaStatus: filters.slaStatus,
      });
    }
  }
}
