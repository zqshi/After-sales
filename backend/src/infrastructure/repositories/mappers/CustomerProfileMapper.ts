import { CustomerProfile } from '@domain/customer/models/CustomerProfile';
import { ContactInfo } from '@domain/customer/value-objects/ContactInfo';
import { SLAInfo } from '@domain/customer/value-objects/SLAInfo';
import { Metrics } from '@domain/customer/value-objects/Metrics';
import { Insight } from '@domain/customer/value-objects/Insight';
import { Interaction } from '@domain/customer/value-objects/Interaction';
import { ServiceRecord } from '@domain/customer/value-objects/ServiceRecord';
import { CustomerProfileEntity } from '@infrastructure/database/entities/CustomerProfileEntity';

export class CustomerProfileMapper {
  static toDomain(entity: CustomerProfileEntity): CustomerProfile {
    const insights = (entity.insights || []).map((insight) =>
      Insight.create({
        title: (insight.title as string) ?? 'Insight',
        detail: (insight.detail as string) ?? '',
        source: insight.source as string | undefined,
        createdAt: insight.createdAt ? new Date(insight.createdAt as string) : new Date(),
      }),
    );

    const interactions = (entity.interactions || []).map((interaction) =>
      Interaction.create({
        interactionType: (interaction.interactionType as Interaction['interactionType']) ?? 'chat',
        occurredAt: interaction.occurredAt ? new Date(interaction.occurredAt as string) : new Date(),
        notes: interaction.notes as string | undefined,
        channel: interaction.channel as string | undefined,
      }),
    );

    const serviceRecords = (entity.serviceRecords || []).map((record) =>
      ServiceRecord.create({
        title: (record.title as string) ?? 'Record',
        description: (record.description as string) ?? '',
        ownerId: record.ownerId as string | undefined,
        outcome: record.outcome as string | undefined,
        recordedAt: record.recordedAt ? new Date(record.recordedAt as string) : new Date(),
      }),
    );

    const commitments = (entity.commitments || []).map((commitment) => ({
      id: (commitment.id as string) ?? 'unknown',
      title: (commitment.title as string) ?? 'Commitment',
      progress: Number(commitment.progress ?? 0),
    }));

    return CustomerProfile.rehydrate(
      {
        customerId: entity.customerId,
        name: entity.name,
        contactInfo: ContactInfo.create({
          email: entity.contactInfo?.email as string | undefined,
          phone: entity.contactInfo?.phone as string | undefined,
          address: entity.contactInfo?.address as string | undefined,
          preferredChannel: entity.contactInfo?.preferredChannel as any,
        }),
        slaInfo: SLAInfo.create({
          serviceLevel: entity.slaInfo.serviceLevel as any || 'bronze',
          responseTimeTargetMinutes: Number(entity.slaInfo.responseTimeTargetMinutes ?? 30),
          resolutionTimeTargetMinutes: Number(entity.slaInfo.resolutionTimeTargetMinutes ?? 120),
          lastReviewedAt: entity.slaInfo?.lastReviewedAt ? new Date(entity.slaInfo.lastReviewedAt) : undefined,
        }),
        metrics: Metrics.create({
          satisfactionScore: Number(entity.metrics.satisfactionScore ?? 0),
          issueCount: Number(entity.metrics.issueCount ?? 0),
          averageResolutionMinutes: Number(entity.metrics.averageResolutionMinutes ?? 0),
        }),
        insights,
        interactions,
        serviceRecords,
        commitments,
        isVIP: entity.isVIP,
        riskLevel: entity.riskLevel as 'low' | 'medium' | 'high',
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
      entity.id,
    );
  }

  static toEntity(profile: CustomerProfile): CustomerProfileEntity {
    const entity = new CustomerProfileEntity();
    entity.id = profile.id;
    entity.customerId = profile.customerId;
    entity.name = profile.name;
    entity.company = profile.contactInfo.address ?? null;
    entity.tags = [];
    entity.healthScore = Math.round(profile.calculateHealthScore());
    entity.contactInfo = {
      email: profile.contactInfo.email,
      phone: profile.contactInfo.phone,
      address: profile.contactInfo.address,
      preferredChannel: profile.contactInfo.preferredChannel,
    };
    entity.slaInfo = {
      serviceLevel: profile.slaInfo.serviceLevel,
      responseTimeTargetMinutes: profile.slaInfo.responseTimeTargetMinutes,
      resolutionTimeTargetMinutes: profile.slaInfo.resolutionTimeTargetMinutes,
      lastReviewedAt: profile.slaInfo.lastReviewedAt,
    };
    entity.metrics = {
      satisfactionScore: profile.metrics.satisfactionScore,
      issueCount: profile.metrics.issueCount,
      averageResolutionMinutes: profile.metrics.averageResolutionMinutes,
      lastUpdated: profile.metrics.lastUpdated,
    };
    entity.insights = profile.insights.map((insight) => ({
      title: insight.title,
      detail: insight.detail,
      createdAt: insight.createdAt,
      source: insight.source,
    }));
    entity.interactions = profile.interactions.map((interaction) => ({
      interactionType: interaction.interactionType,
      occurredAt: interaction.occurredAt,
      notes: interaction.notes,
      channel: interaction.channel,
    }));
    entity.serviceRecords = profile.serviceRecords.map((record) => ({
      title: record.title,
      description: record.description,
      recordedAt: record.recordedAt,
      ownerId: record.ownerId,
      outcome: record.outcome,
    }));
    entity.commitments = profile.commitments.map((commitment) => ({
      id: commitment.id,
      title: commitment.title,
      progress: commitment.progress,
    }));
    entity.isVIP = profile.isVIP;
    entity.riskLevel = profile.riskLevel;
    entity.createdAt = profile.createdAt;
    entity.updatedAt = profile.updatedAt;
    return entity;
  }
}
