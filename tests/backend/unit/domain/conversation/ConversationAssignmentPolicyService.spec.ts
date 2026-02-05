import { describe, it, expect } from 'vitest';
import {
  ConversationAssignmentPolicyService,
  AssignmentCandidate,
  AssignmentContext,
} from '@domain/conversation/services/ConversationAssignmentPolicyService';

const baseContext: AssignmentContext = {
  conversationId: 'conv-1',
  customerId: 'cust-1',
  customerTier: 'Regular',
  customerRiskLevel: 'low',
  conversationPriority: 'medium',
  slaStatus: 'normal',
  channel: 'web',
};

const candidates: AssignmentCandidate[] = [
  {
    agentId: 'a1',
    agentName: 'A1',
    skillMatch: 0.6,
    workload: 40,
    averageQuality: 90,
    customerFamiliarity: 0.1,
    isOnline: true,
    averageResponseTime: 40,
  },
  {
    agentId: 'a2',
    agentName: 'A2',
    skillMatch: 0.8,
    workload: 20,
    averageQuality: 70,
    customerFamiliarity: 0.8,
    isOnline: true,
    averageResponseTime: 120,
  },
];

describe('ConversationAssignmentPolicyService', () => {
  it('returns no agent when no candidates', () => {
    const service = new ConversationAssignmentPolicyService();
    const result = service.selectBestAgent(baseContext, []);
    expect(result.selectedAgentId).toBeNull();
    expect(result.reason).toContain('无可用客服');
  });

  it('returns no agent when none online', () => {
    const service = new ConversationAssignmentPolicyService();
    const offline = candidates.map((c) => ({ ...c, isOnline: false }));
    const result = service.selectBestAgent(baseContext, offline);
    expect(result.selectedAgentId).toBeNull();
    expect(result.reason).toContain('无在线客服');
  });

  it('prefers high quality for VIP', () => {
    const service = new ConversationAssignmentPolicyService();
    const result = service.selectBestAgent(
      { ...baseContext, customerTier: 'VIP' },
      candidates,
    );
    expect(result.reason).toContain('VIP客户分配给高质量客服');
  });

  it('prefers familiar agent for high risk', () => {
    const service = new ConversationAssignmentPolicyService();
    const result = service.selectBestAgent(
      { ...baseContext, customerRiskLevel: 'high' },
      candidates,
    );
    expect(result.reason).toContain('高风险客户分配给熟悉的客服');
    expect(result.selectedAgentId).toBe('a2');
  });

  it('falls back to high quality when no familiarity', () => {
    const service = new ConversationAssignmentPolicyService();
    const lowFamiliarity = candidates.map((c) => ({ ...c, customerFamiliarity: 0 }));
    const result = service.selectBestAgent(
      { ...baseContext, customerRiskLevel: 'high' },
      lowFamiliarity,
    );
    expect(result.reason).toContain('VIP客户分配给高质量客服');
  });

  it('prefers low workload for urgent', () => {
    const service = new ConversationAssignmentPolicyService();
    const result = service.selectBestAgent(
      { ...baseContext, conversationPriority: 'urgent' },
      candidates,
    );
    expect(result.reason).toContain('紧急客户等级分配给低负载客服');
  });

  it('prefers comprehensive score for KA', () => {
    const service = new ConversationAssignmentPolicyService();
    const result = service.selectBestAgent(
      { ...baseContext, customerTier: 'KA' },
      candidates,
    );
    expect(result.reason).toContain('KA客户分配给综合高分客服');
  });

  it('uses comprehensive score for regular', () => {
    const service = new ConversationAssignmentPolicyService();
    const result = service.selectBestAgent(baseContext, candidates);
    expect(result.reason).toContain('常规综合评分分配');
  });

  it('checks availability and overload', () => {
    const service = new ConversationAssignmentPolicyService();
    expect(service.isOverloaded(90)).toBe(true);
    expect(service.isAvailable({
      agentId: 'a3',
      agentName: 'A3',
      skillMatch: 0.5,
      workload: 95,
      averageQuality: 50,
      customerFamiliarity: 0,
      isOnline: true,
      averageResponseTime: 100,
    })).toBe(false);
  });

  it('calculates skill match', () => {
    const service = new ConversationAssignmentPolicyService();
    expect(service.calculateSkillMatch(undefined, [])).toBe(0.5);
    expect(service.calculateSkillMatch('refund', ['Refund'])).toBeGreaterThan(0.5);
    expect(service.calculateSkillMatch('unknown', ['tech'])).toBe(0.3);
  });

  it('calculates customer familiarity', () => {
    const service = new ConversationAssignmentPolicyService();
    expect(service.calculateCustomerFamiliarity(0)).toBe(0);
    expect(service.calculateCustomerFamiliarity(10)).toBeGreaterThan(0.7);
  });
});
