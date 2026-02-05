import { describe, it, expect, vi } from 'vitest';
import { CustomerProfileApplicationService } from '../CustomerProfileApplicationService.js';

function createProfile() {
  const events = [];
  const profile = {
    conversationId: 'conv-1',
    name: 'User',
    title: 'VIP',
    tags: [],
    contacts: [],
    sla: {},
    metrics: {},
    insights: ['i1'],
    interactions: [],
    serviceRecords: [],
    commitments: [{ id: 'cm1', progress: 0, status: 'pending' }],
    history: ['h1'],
    refresh: vi.fn(),
    addServiceRecord: vi.fn((record) => {
      const newRecord = { id: `rec-${Math.random()}`, ...record };
      profile.serviceRecords.push(newRecord);
      return newRecord;
    }),
    updateCommitmentProgress: vi.fn(),
    addInteraction: vi.fn((interaction) => {
      return interaction;
    }),
    markAsVIP: vi.fn(),
    getDomainEvents: vi.fn(() => events.slice()),
    clearDomainEvents: vi.fn(() => {
      events.length = 0;
    }),
    getRiskLevel: vi.fn(() => 'low'),
    isVIP: vi.fn(() => true),
    getActiveServiceCount: vi.fn(() => 1),
    getPendingCommitmentsCount: vi.fn(() => 1),
    hasHighRiskCommitments: vi.fn(() => false),
    updatedAt: 't1',
  };
  return profile;
}


describe('CustomerProfileApplicationService', () => {
  it('refreshProfile saves and publishes', async () => {
    const profile = createProfile();
    const repo = { findById: vi.fn().mockResolvedValue(profile), save: vi.fn() };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new CustomerProfileApplicationService({ profileRepository: repo, eventBus });

    const result = await service.refreshProfile({ customerId: 'c1', profileData: { a: 1 } });
    expect(result.success).toBe(true);
    expect(profile.refresh).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(profile);
  });

  it('addServiceRecord appends record', async () => {
    const profile = createProfile();
    const repo = { findById: vi.fn().mockResolvedValue(profile), save: vi.fn() };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new CustomerProfileApplicationService({ profileRepository: repo, eventBus });

    const result = await service.addServiceRecord({
      customerId: 'c1',
      title: 'Record',
      status: 'open',
      owner: 'agent',
      relatedConversationIds: ['conv-1'],
    });
    expect(result.success).toBe(true);
    expect(profile.addServiceRecord).toHaveBeenCalled();
  });

  it('updateCommitmentProgress updates progress', async () => {
    const profile = createProfile();
    profile.commitments = [{ id: 'cm1', progress: 10, status: 'pending' }];
    const repo = { findById: vi.fn().mockResolvedValue(profile), save: vi.fn() };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new CustomerProfileApplicationService({ profileRepository: repo, eventBus });

    const result = await service.updateCommitmentProgress({ customerId: 'c1', commitmentId: 'cm1', progress: 80 });
    expect(result.commitmentId).toBe('cm1');
    expect(profile.updateCommitmentProgress).toHaveBeenCalled();
  });

  it('addInteraction returns count', async () => {
    const profile = createProfile();
    profile.interactions = [{}];
    const repo = { findById: vi.fn().mockResolvedValue(profile), save: vi.fn() };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new CustomerProfileApplicationService({ profileRepository: repo, eventBus });

    const result = await service.addInteraction({ customerId: 'c1', interaction: { title: 'msg' } });
    expect(result.success).toBe(true);
  });

  it('markAsVIP returns status', async () => {
    const profile = createProfile();
    const repo = { findById: vi.fn().mockResolvedValue(profile), save: vi.fn() };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new CustomerProfileApplicationService({ profileRepository: repo, eventBus });

    const result = await service.markAsVIP({ customerId: 'c1', reason: 'vip', vipLevel: 'V1', markedBy: 'admin' });
    expect(result.isVIP).toBe(true);
    expect(profile.markAsVIP).toHaveBeenCalled();
  });

  it('getProfile maps fields', async () => {
    const profile = createProfile();
    const repo = { findById: vi.fn().mockResolvedValue(profile) };
    const eventBus = { publish: vi.fn() };
    const service = new CustomerProfileApplicationService({ profileRepository: repo, eventBus });

    const result = await service.getProfile({ customerId: 'c1', includeHistory: false, includeInsights: false });
    expect(result.name).toBe('User');
    expect(result.insights).toEqual([]);
    expect(result.history).toEqual([]);
  });
});
