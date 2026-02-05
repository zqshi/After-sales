import { describe, it, expect } from 'vitest';
import {
  DomainType,
  ConversationDomain,
  DomainClassifications,
  DomainsByType,
  getDomainClassification,
  getCoreDomains,
  isCoreDomain,
  getInvestmentPriority,
  generateDomainReport,
} from '@domain/DomainClassification';

describe('DomainClassification', () => {
  it('exports domain constants', () => {
    expect(ConversationDomain.classification.type).toBe(DomainType.CORE);
    expect(DomainClassifications.Conversation).toBeDefined();
    expect(DomainsByType[DomainType.CORE].length).toBeGreaterThan(0);
  });

  it('gets domain classification and priorities', () => {
    const domain = getDomainClassification('Conversation Context');
    expect(domain?.name).toContain('对话');
    expect(getCoreDomains().some((d) => d.contextName === 'Conversation Context')).toBe(true);
    expect(isCoreDomain('Conversation Context')).toBe(true);
    expect(getInvestmentPriority('Conversation Context')).toBe('P0');
  });

  it('generates a domain report', () => {
    const report = generateDomainReport();
    expect(report).toContain('# 领域分类报告');
    expect(report).toContain('Conversation Context');
  });
});
