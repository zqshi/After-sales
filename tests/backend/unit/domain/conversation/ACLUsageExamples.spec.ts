import { describe, it, expect, vi } from 'vitest';
import {
  ConversationAssignmentExample,
  AIAssistantExample,
  CustomerSupportSagaWithACL,
  setupAntiCorruptionLayers,
  BadExample,
  GoodExample,
} from '@domain/conversation/anti-corruption/ACL_USAGE_EXAMPLES';

const makeCustomerInfo = (overrides: Record<string, any> = {}) => ({
  customerId: 'cust-1',
  name: '客户',
  tier: 'VIP',
  riskLevel: 'low',
  healthScore: 80,
  slaInfo: { responseTime: 30, resolutionTime: 120 },
  recentInteractionCount: 0,
  primaryContact: {},
  ...overrides,
});

describe('ACL_USAGE_EXAMPLES', () => {
  it('assigns conversation with customer adapter', async () => {
    const customerAdapter = {
      getCustomerInfo: vi.fn().mockResolvedValue(makeCustomerInfo({ tier: 'VIP' })),
      getCustomerFamiliarity: vi.fn().mockResolvedValue({ familiarityScore: 0.5, interactionCount: 2 }),
    };
    const example = new ConversationAssignmentExample(customerAdapter as any);
    const result = await example.assignConversation('conv-1', 'cust-1');
    expect(result.customerTier).toBe('VIP');
    const familiarity = await example.calculateAgentFamiliarity('cust-1', 'agent-1');
    expect(familiarity).toBe(0.5);
  });

  it('recommends knowledge via adapter', async () => {
    const knowledgeAdapter = {
      getRecommendedKnowledge: vi.fn().mockResolvedValue([
        { id: 'k1', title: 't', content: 'c', relevanceScore: 0.9 },
      ]),
      searchKnowledge: vi.fn().mockResolvedValue([{ id: 'k2' }]),
    };
    const example = new AIAssistantExample(knowledgeAdapter as any);
    const recs = await example.getRecommendedKnowledge('conv-1', 'msg');
    expect(recs.length).toBe(1);
    const results = await example.searchKnowledgeForAgent('query');
    expect(results.length).toBe(1);
  });

  it('processes customer message with ACL saga', async () => {
    const customerAdapter = {
      getCustomerInfo: vi.fn().mockResolvedValue(makeCustomerInfo({ tier: 'regular', riskLevel: 'high' })),
    };
    const knowledgeAdapter = {
      searchKnowledge: vi.fn().mockResolvedValue([{ id: 'k1' }]),
    };
    const saga = new CustomerSupportSagaWithACL(customerAdapter as any, knowledgeAdapter as any);
    const result = await saga.processCustomerMessage('cust-1', 'msg');
    expect(result.priority).toBe('high');
    expect(result.needsHumanReview).toBe(true);
  });

  it('sets up anti-corruption layers', () => {
    const setup = setupAntiCorruptionLayers({} as any, {} as any);
    expect(setup.knowledgeAdapter).toBeDefined();
    expect(setup.customerAdapter).toBeDefined();
  });

  it('bad and good examples run with mock repos', async () => {
    const profile = {
      isVIP: true,
      calculateHealthScore: () => 90,
      metrics: {},
    };
    const bad = new BadExample(
      { findById: vi.fn().mockResolvedValue(profile) } as any,
      { findById: vi.fn().mockResolvedValue(profile) } as any,
    );
    await bad.processMessage('cust');

    const good = new GoodExample({ getCustomerInfo: vi.fn().mockResolvedValue(makeCustomerInfo()) } as any);
    await good.processMessage('cust');
  });
});
