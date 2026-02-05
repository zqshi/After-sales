import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerAdapter } from '@domain/conversation/anti-corruption/CustomerAdapter';

const makeProfile = (overrides: Record<string, any> = {}) => ({
  customerId: 'cust-1',
  name: '客户A',
  isVIP: false,
  riskLevel: 'low',
  metrics: { annualRevenue: 0 },
  calculateHealthScore: () => 80,
  slaInfo: {
    responseTimeTargetMinutes: 30,
    resolutionTimeTargetMinutes: 120,
  },
  interactions: [],
  serviceRecords: [],
  contactInfo: { email: 'a@example.com', phone: '123' },
  commitments: [],
  ...overrides,
});

describe('CustomerAdapter', () => {
  let repository: any;
  let adapter: CustomerAdapter;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findInteractions: vi.fn().mockResolvedValue([]),
    };
    adapter = new CustomerAdapter(repository);
  });

  it('returns null for missing customer', async () => {
    repository.findById.mockResolvedValue(null);
    const result = await adapter.getCustomerInfo('missing');
    expect(result).toBeNull();
  });

  it('maps customer info', async () => {
    repository.findById.mockResolvedValue(makeProfile({ isVIP: true }));
    const info = await adapter.getCustomerInfo('cust-1');
    expect(info?.tier).toBe('VIP');
    expect(info?.healthScore).toBe(80);
  });

  it('maps customer tier to KA and regular', async () => {
    repository.findById.mockResolvedValue(makeProfile({ metrics: { annualRevenue: 2000000 } }));
    const kaInfo = await adapter.getCustomerInfo('cust-1');
    expect(kaInfo?.tier).toBe('KA');

    repository.findById.mockResolvedValue(makeProfile({ metrics: { annualRevenue: 100 } }));
    const regularInfo = await adapter.getCustomerInfo('cust-1');
    expect(regularInfo?.tier).toBe('regular');
  });

  it('returns brief info', async () => {
    repository.findById.mockResolvedValue(makeProfile({ isVIP: true }));
    const info = await adapter.getCustomerBriefInfo('cust-1');
    expect(info?.isVIP).toBe(true);
  });

  it('returns batch brief info', async () => {
    repository.findById
      .mockResolvedValueOnce(makeProfile({ customerId: 'c1' }))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeProfile({ customerId: 'c3' }));

    const list = await adapter.getCustomersBriefInfo(['c1', 'c2', 'c3']);
    expect(list.length).toBe(2);
  });

  it('checks VIP and KA', async () => {
    repository.findById.mockResolvedValue(makeProfile({ isVIP: true }));
    expect(await adapter.isVIPCustomer('cust-1')).toBe(true);

    repository.findById.mockResolvedValue(
      makeProfile({ commitments: Array.from({ length: 11 }, () => ({})) }),
    );
    expect(await adapter.isKACustomer('cust-1')).toBe(true);
  });

  it('returns risk and health score', async () => {
    repository.findById.mockResolvedValue(makeProfile({ riskLevel: 'high' }));
    expect(await adapter.getCustomerRiskLevel('cust-1')).toBe('high');
    expect(await adapter.getCustomerHealthScore('cust-1')).toBe(80);
  });

  it('calculates familiarity score', async () => {
    repository.findInteractions.mockResolvedValue([
      { agentId: 'a1', occurredAt: new Date() },
      { agentId: 'a1', occurredAt: new Date() },
    ]);
    const info = await adapter.getCustomerFamiliarity('cust-1', 'a1');
    expect(info.interactionCount).toBe(2);
    expect(info.familiarityScore).toBeGreaterThan(0);
  });

  it('returns familiarity score when no interactions', async () => {
    repository.findInteractions.mockResolvedValue([]);
    const info = await adapter.getCustomerFamiliarity('cust-1', 'a1');
    expect(info.interactionCount).toBe(0);
    expect(info.familiarityScore).toBe(0);
    expect(info.lastInteractionDate).toBeUndefined();
  });

  it('calculates average satisfaction from service records', async () => {
    repository.findById.mockResolvedValue(makeProfile({
      serviceRecords: [{ satisfactionScore: 3 }, { satisfactionScore: 5 }, { satisfactionScore: null }],
    }));
    const info = await adapter.getCustomerInfo('cust-1');
    expect(info?.averageSatisfactionScore).toBe(4);
  });

  it('returns zero satisfaction when records missing scores', async () => {
    repository.findById.mockResolvedValue(makeProfile({
      serviceRecords: [{}, { satisfactionScore: null }],
    }));
    const info = await adapter.getCustomerInfo('cust-1');
    expect(info?.averageSatisfactionScore).toBe(0);
  });

  it('returns customer level info', async () => {
    repository.findById.mockResolvedValue(makeProfile());
    const level = await adapter.getCustomerCustomerLevel('cust-1');
    expect(level?.responseTime).toBe(30);
  });

  it('counts recent interactions', async () => {
    const recent = new Date();
    const old = new Date();
    old.setDate(old.getDate() - 40);
    repository.findById.mockResolvedValue(
      makeProfile({ interactions: [{ occurredAt: recent }, { occurredAt: old }] }),
    );
    const count = await adapter.getRecentInteractionCount('cust-1', 30);
    expect(count).toBe(1);
  });
});
