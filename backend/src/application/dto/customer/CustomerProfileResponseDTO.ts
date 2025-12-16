import { CustomerProfile } from '@domain/customer/models/CustomerProfile';

export class CustomerProfileResponseDTO {
  customerId: string;
  name: string;
  contactInfo: Record<string, unknown>;
  slaInfo: Record<string, unknown>;
  metrics: Record<string, unknown>;
  insights: Record<string, unknown>[];
  interactions: Record<string, unknown>[];
  serviceRecords: Record<string, unknown>[];
  commitments: Record<string, unknown>[];
  isVIP: boolean;
  riskLevel: string;
  healthScore: number;
  createdAt: string;
  updatedAt: string;

  static fromAggregate(profile: CustomerProfile): CustomerProfileResponseDTO {
    const dto = new CustomerProfileResponseDTO();
    dto.customerId = profile.customerId;
    dto.name = profile.name;
    dto.contactInfo = {
      email: profile.contactInfo.email,
      phone: profile.contactInfo.phone,
      address: profile.contactInfo.address,
      preferredChannel: profile.contactInfo.preferredChannel,
    };
    dto.slaInfo = {
      serviceLevel: profile.slaInfo.serviceLevel,
      responseTimeTargetMinutes: profile.slaInfo.responseTimeTargetMinutes,
      resolutionTimeTargetMinutes: profile.slaInfo.resolutionTimeTargetMinutes,
      lastReviewedAt: profile.slaInfo.lastReviewedAt?.toISOString(),
    };
    dto.metrics = {
      satisfactionScore: profile.metrics.satisfactionScore,
      issueCount: profile.metrics.issueCount,
      averageResolutionMinutes: profile.metrics.averageResolutionMinutes,
      lastUpdated: profile.metrics.lastUpdated?.toISOString(),
    };
    dto.insights = profile.insights.map((insight) => ({
      title: insight.title,
      detail: insight.detail,
      source: insight.source,
      createdAt: insight.createdAt.toISOString(),
    }));
    dto.interactions = profile.interactions.map((interaction) => ({
      type: interaction.interactionType,
      occurredAt: interaction.occurredAt.toISOString(),
      notes: interaction.notes,
      channel: interaction.channel,
    }));
    dto.serviceRecords = profile.serviceRecords.map((record) => ({
      title: record.title,
      description: record.description,
      recordedAt: record.recordedAt.toISOString(),
      ownerId: record.ownerId,
      outcome: record.outcome,
    }));
    dto.commitments = profile.commitments.map((commitment) => ({
      id: commitment.id,
      title: commitment.title,
      progress: commitment.progress,
    }));
    dto.isVIP = profile.isVIP;
    dto.riskLevel = profile.riskLevel;
    dto.healthScore = Math.round(profile.calculateHealthScore());
    dto.createdAt = profile.createdAt.toISOString();
    dto.updatedAt = profile.updatedAt.toISOString();
    return dto;
  }
}
