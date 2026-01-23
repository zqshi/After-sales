import { beforeEach, describe, expect, it } from 'vitest';
import { CustomerProfile } from '@domain/customer/models/CustomerProfile';
import { ContactInfo } from '@domain/customer/value-objects/ContactInfo';
import { Insight } from '@domain/customer/value-objects/Insight';
import { Interaction } from '@domain/customer/value-objects/Interaction';
import { Metrics } from '@domain/customer/value-objects/Metrics';
import { ServiceRecord } from '@domain/customer/value-objects/ServiceRecord';
import { CustomerLevelInfo } from '@domain/customer/value-objects/CustomerLevelInfo';

const buildProfile = (): CustomerProfile => {
  return CustomerProfile.create({
    customerId: 'customer-123',
    name: 'Acme Corp',
    contactInfo: ContactInfo.create({
      email: 'hello@acme.com',
      phone: '+8613800138000',
      preferredChannel: 'chat',
    }),
    slaInfo: CustomerLevelInfo.create({
      serviceLevel: 'gold',
      responseTimeTargetMinutes: 5,
      resolutionTimeTargetMinutes: 30,
    }),
    metrics: Metrics.create({
      satisfactionScore: 85,
      issueCount: 0,
      averageResolutionMinutes: 25,
    }),
  });
};

describe('CustomerProfile aggregate', () => {
  let profile: CustomerProfile;

  beforeEach(() => {
    profile = buildProfile();
    profile.clearEvents();
  });

  it('refreshes the profile and fires expectation events', () => {
    const refreshedMetrics = Metrics.create({
      satisfactionScore: 32,
      issueCount: 22,
      averageResolutionMinutes: 95,
    });

    profile.refresh(
      {
        metrics: refreshedMetrics,
        insights: [
          Insight.create({
            title: 'Churn signals rising',
            detail: 'Multiple escalations in 48h',
          }),
        ],
        interactions: [
          Interaction.create({
            interactionType: 'call',
            occurredAt: new Date('2024-12-01T12:00:00Z'),
            notes: 'Discussed renewal terms',
            channel: 'phone',
          }),
        ],
        serviceRecords: [
          ServiceRecord.create({
            title: 'Premium follow-up',
            description: 'Scheduled executive demo',
            ownerId: 'agent-007',
          }),
        ],
      },
      'manual',
    );

    const events = profile.getUncommittedEvents();

    expect(profile.metrics.satisfactionScore).toBe(32);
    expect(profile.insights).toHaveLength(1);
    expect(profile.interactions).toHaveLength(1);
    expect(profile.serviceRecords).toHaveLength(1);
    expect(events.some((event) => event.eventType === 'ProfileRefreshed')).toBe(true);
    expect(events.some((event) => event.eventType === 'RiskLevelChanged')).toBe(true);
  });

  it('records service records and emits service record events', () => {
    const record = ServiceRecord.create({
      title: 'Support check-in',
      description: 'Resolved ticket #900',
      ownerId: 'agent-001',
    });

    profile.addServiceRecord({ record });

    const events = profile.getUncommittedEvents();

    expect(profile.serviceRecords).toHaveLength(1);
    expect(events.some((event) => event.eventType === 'ServiceRecordAdded')).toBe(true);
  });

  it('updates commitment progress and publishes progress events', () => {
    profile.updateCommitmentProgress('commit-1', 25);
    profile.clearEvents();
    profile.updateCommitmentProgress('commit-1', 60);

    const events = profile.getUncommittedEvents();
    const commitment = profile.commitments.find((item) => item.id === 'commit-1');

    expect(commitment?.progress).toBe(60);
    expect(events.some((event) => event.eventType === 'CommitmentProgressUpdated')).toBe(true);
  });

  it('logs interactions and publishes interaction events', () => {
    profile.addInteraction(
      Interaction.create({
        interactionType: 'chat',
        occurredAt: new Date(),
        notes: 'Customer needs analytics',
        channel: 'web',
      }),
    );

    const events = profile.getUncommittedEvents();

    expect(profile.interactions).toHaveLength(1);
    expect(events.some((event) => event.eventType === 'InteractionAdded')).toBe(true);
  });

  it('marks the profile as VIP and only emits once', () => {
    profile.markAsVIP('High ARR');
    profile.markAsVIP('Duplicate call should no-op');

    const events = profile.getUncommittedEvents().filter(
      (event) => event.eventType === 'CustomerMarkedAsVIP',
    );

    expect(profile.isVIP).toBe(true);
    expect(events).toHaveLength(1);
  });
});
