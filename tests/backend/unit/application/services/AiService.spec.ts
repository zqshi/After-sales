import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AiService } from '@application/services/AiService';
import { LLMClient } from '@infrastructure/ai/LLMClient';

const createService = () => {
  const knowledgeRepository = {
    findByFilters: vi.fn().mockResolvedValue([
      {
        id: 'k1',
        title: '重置密码指南',
        tags: ['登录', '密码'],
        category: { value: 'faq' },
      },
      {
        id: 'k2',
        title: '退款流程说明',
        tags: ['退款'],
        category: { value: 'billing' },
      },
    ]),
    findById: vi.fn().mockResolvedValue({
      id: 'k1',
      title: '重置密码指南',
      tags: ['登录', '密码'],
      category: { value: 'faq' },
    }),
  };
  const knowledgeRecommender = {
    recommendByKeywords: vi.fn().mockReturnValue([
      { knowledgeId: 'k1', score: 0.88 },
      { knowledgeId: 'k2', score: 0.62 },
    ]),
  };
  return {
    service: new AiService(knowledgeRepository as any, knowledgeRecommender as any),
    knowledgeRepository,
    knowledgeRecommender,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AiService', () => {
  it('should fallback assessRisk when model disabled', async () => {
    const { service } = createService();
    const result = await service.assessRisk('系统崩溃需要退款');
    expect(result.riskLevel).toBe('high');
    expect(result.indicators.length).toBeGreaterThan(0);
  });

  it('should use model result when generateJson returns data', async () => {
    vi.spyOn(LLMClient.prototype, 'isEnabled').mockReturnValue(true);
    vi.spyOn(LLMClient.prototype, 'generate').mockResolvedValue(
      '{"riskLevel":"high","score":0.9,"indicators":["x"],"reasoning":"ok"}',
    );
    const { service } = createService();
    const result = await service.assessRisk('test');
    expect(result.riskLevel).toBe('high');
    expect(result.score).toBe(0.9);
  });

  it('should extract requirements with fallback heuristic', async () => {
    const { service } = createService();
    const result = await service.extractRequirements('需要导出功能');
    expect(result.length).toBe(1);
    expect(result[0].title).toContain('需要');
  });

  it('should return default action for urgent contexts', async () => {
    const { service } = createService();
    const result = await service.recommendNextAction({ urgent: true });
    expect(result.action).toBe('escalate_to_human');
  });

  it('should analyze logs with fallback signatures', async () => {
    const { service } = createService();
    const result = await service.analyzeLogs('Error: fail to connect');
    expect(result.error_signatures).toContain('error');
  });

  it('should analyze logs without error keywords', async () => {
    const { service } = createService();
    const result = await service.analyzeLogs('all good');
    expect(result.error_signatures).toEqual([]);
  });

  it('should classify issue with heuristic rules', async () => {
    const { service } = createService();
    const result = await service.classifyIssue('系统崩溃无法登录');
    expect(result.issue_type).toBe('fault');
    expect(result.severity).toBe('P1');
  });

  it('should classify inquiry when not urgent', async () => {
    const { service } = createService();
    const result = await service.classifyIssue('咨询功能');
    expect(result.issue_type).toBe('inquiry');
  });

  it('should recommend solution with fallback steps', async () => {
    const { service } = createService();
    const result = await service.recommendSolution('服务异常');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('should estimate resolution time', async () => {
    const { service } = createService();
    const result = await service.estimateResolutionTime('P1');
    expect(result.estimate).toBe('2小时内');
  });

  it('returns default estimate for unknown severity', async () => {
    const { service } = createService();
    const result = await service.estimateResolutionTime('P9');
    expect(result.estimate).toBe('待评估');
  });

  it('should check compliance and detect violations', async () => {
    const { service } = createService();
    const result = await service.checkCompliance('保证100%退款');
    expect(result.compliant).toBe(false);
    const violations = await service.detectViolations('必须赔偿');
    expect(violations.violations.length).toBeGreaterThan(0);
  });

  it('recommends next action when not urgent', async () => {
    const { service } = createService();
    const result = await service.recommendNextAction({ riskLevel: 'low', urgent: false });
    expect(result.action).toBe('reply_with_suggestion');
  });

  it('should analyze conversation with fallback recommendations', async () => {
    const { service } = createService();
    const result = await service.analyzeConversation({
      conversationId: 'c1',
      options: { keywords: ['登录', '密码'] },
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.summary).toContain('关键词');
  });

  it('should summarize conversation with fallback', async () => {
    const { service } = createService();
    const summary = await service.summarizeConversation('c2');
    expect(summary).toContain('c2');
  });

  it('should analyze sentiment with fallback rules', async () => {
    const { service } = createService();
    const result = await service.analyzeSentiment('问题解决了，谢谢');
    expect(result.overallSentiment).toBe('positive');
  });

  it('should detect problem intent with heuristic keywords', async () => {
    const { service } = createService();
    const result = await service.detectProblemIntent('出现报错');
    expect(result.isProblem).toBe(true);
  });

  it('should detect problem resolution with keywords', async () => {
    const { service } = createService();
    const resolved = await service.detectProblemResolution('问题已经解决，谢谢');
    expect(resolved.resolved).toBe(true);
    const reopened = await service.detectProblemResolution('还是报错没解决');
    expect(reopened.reopened).toBe(true);
  });

  it('should apply solution with knowledge item fallback', async () => {
    const { service } = createService();
    const result = await service.applySolution({
      conversationId: 'c3',
      solutionType: 'knowledge',
      solutionId: 'k1',
    });
    expect(result.message).toContain('重置密码指南');
    expect(result.taskDraft?.title).toContain('重置密码指南');
  });

  it('throws when applySolution missing params', async () => {
    const { service } = createService();
    await expect(service.applySolution({ conversationId: '', solutionType: 'knowledge' } as any)).rejects.toThrow(
      'conversationId is required',
    );
    await expect(service.applySolution({ conversationId: 'c1', solutionType: '' } as any)).rejects.toThrow(
      'solutionType is required',
    );
  });

  it('applies solution using template placeholders', async () => {
    const { service } = createService();
    const result = await service.applySolution({
      conversationId: 'c4',
      solutionType: 'knowledge',
      solutionId: 'k1',
      messageTemplate: '参考{{title}} ({{category}}) 处理对话 {{conversationId}}',
    });

    expect(result.message).toContain('重置密码指南');
    expect(result.message).toContain('faq');
    expect(result.message).toContain('c4');
  });

  it('should compare team performance', async () => {
    const { service } = createService();
    const result = await service.compareTeamPerformance([
      { teamId: 'a', qualityScore: 80 },
      { teamId: 'a', qualityScore: 60 },
      { teamId: 'b', qualityScore: 90 },
    ]);
    expect(result.averages.a).toBe(70);
    expect(result.overall).toBeCloseTo(76.67, 2);
  });

  it('throws when analyzeConversation missing conversationId', async () => {
    const { service } = createService();
    await expect(service.analyzeConversation({ conversationId: '' })).rejects.toThrow('conversationId is required');
  });

  it('returns neutral sentiment on empty content', async () => {
    const { service } = createService();
    const result = await service.analyzeSentiment('');
    expect(result.overallSentiment).toBe('neutral');
  });

  it('detects no problem intent when heuristic misses', async () => {
    const { service } = createService();
    const result = await service.detectProblemIntent('很高兴');
    expect(result.isProblem).toBe(false);
  });

  it('detects unresolved when no resolution keywords', async () => {
    const { service } = createService();
    const result = await service.detectProblemResolution('继续观察');
    expect(result.resolved).toBe(false);
    expect(result.reopened).toBe(false);
  });

  it('applies solution without knowledge item', async () => {
    const { service, knowledgeRepository } = createService();
    knowledgeRepository.findById.mockResolvedValue(null);
    knowledgeRepository.findByFilters.mockResolvedValue([]);
    const result = await service.applySolution({ conversationId: 'c1', solutionType: 'template' });
    expect(result.taskDraft).toBeUndefined();
  });

  it('resolves knowledge from pool when solutionId missing', async () => {
    const { service, knowledgeRepository } = createService();
    knowledgeRepository.findById.mockResolvedValue(null);
    knowledgeRepository.findByFilters.mockResolvedValue([
      { id: 'k3', title: '常见问题', tags: [], category: { value: 'faq' } },
    ]);

    const result = await service.applySolution({ conversationId: 'c5', solutionType: 'knowledge' });
    expect(result.title).toBe('常见问题');
    expect(result.taskDraft?.title).toContain('常见问题');
  });

  it('returns compliant when no violations', async () => {
    const { service } = createService();
    const result = await service.checkCompliance('正常描述');
    expect(result.compliant).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('normalizes keywords fallback when empty', async () => {
    const { service } = createService();
    const result = await service.analyzeConversation({ conversationId: 'c1', options: { keywords: ['  '] } });
    expect(result.summary).toContain('关键词');
  });

  it('uses llm sentiment result when enabled', async () => {
    vi.spyOn(LLMClient.prototype, 'isEnabled').mockReturnValue(true);
    vi.spyOn(LLMClient.prototype, 'analyzeSentiment').mockResolvedValue({
      overallSentiment: 'negative',
      score: 0.2,
      confidence: 0.9,
      emotions: ['不满'],
      reasoning: 'mock',
    } as any);
    const { service } = createService();
    const result = await service.analyzeSentiment('bad');
    expect(result.overallSentiment).toBe('negative');
  });

  it('uses llm intent when enabled', async () => {
    vi.spyOn(LLMClient.prototype, 'isEnabled').mockReturnValue(true);
    vi.spyOn(LLMClient.prototype, 'extractIntent').mockResolvedValue({
      intent: 'complaint',
      confidence: 0.7,
      isQuestion: false,
      keywords: ['关键字'],
    } as any);
    const { service } = createService();
    const result = await service.detectProblemIntent('投诉');
    expect(result.isProblem).toBe(true);
    expect(result.title).toContain('关键字');
  });

  it('uses llm resolution result when enabled', async () => {
    vi.spyOn(LLMClient.prototype, 'isEnabled').mockReturnValue(true);
    vi.spyOn(LLMClient.prototype, 'generate').mockResolvedValue('{"resolved":true,"reopened":false,"confidence":0.8,"reasoning":"ok"}');
    const { service } = createService();
    const result = await service.detectProblemResolution('已解决');
    expect(result.resolved).toBe(true);
  });

  it('uses external analyze when configured', async () => {
    vi.resetModules();
    vi.doMock('@config/app.config', () => ({
      config: { ai: { serviceUrl: 'http://ai', apiKey: 'k' } },
    }));
    const { AiService: ExternalAiService } = await import('@application/services/AiService');
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { conversationId: 'c1' } }),
    } as any);
    const deps = createService();
    const service = new ExternalAiService(deps.knowledgeRepository as any, deps.knowledgeRecommender as any);
    const result = await service.analyzeConversation({ conversationId: 'c1' });
    expect(fetchMock).toHaveBeenCalled();
    expect(result.conversationId).toBe('c1');
  });

  it('uses external apply solution when configured', async () => {
    vi.resetModules();
    vi.doMock('@config/app.config', () => ({
      config: { ai: { serviceUrl: 'http://ai', apiKey: 'k' } },
    }));
    const { AiService: ExternalAiService } = await import('@application/services/AiService');
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { message: 'ok', title: 't', appliedSolution: { type: 'k' } } }),
    } as any);
    const deps = createService();
    const service = new ExternalAiService(deps.knowledgeRepository as any, deps.knowledgeRecommender as any);
    const result = await service.applySolution({ conversationId: 'c1', solutionType: 'knowledge' });
    expect(fetchMock).toHaveBeenCalled();
    expect(result.message).toBe('ok');
  });

  it('falls back when external analyze fails', async () => {
    vi.resetModules();
    vi.doMock('@config/app.config', () => ({
      config: { ai: { serviceUrl: 'http://ai' } },
    }));
    const { AiService: ExternalAiService } = await import('@application/services/AiService');
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as any);
    const deps = createService();
    const service = new ExternalAiService(deps.knowledgeRepository as any, deps.knowledgeRecommender as any);
    const result = await service.analyzeConversation({ conversationId: 'c1' });
    expect(result.summary).toContain('关键词');
  });

  it('uses external summarize when available', async () => {
    vi.resetModules();
    vi.doMock('@config/app.config', () => ({
      config: { ai: { serviceUrl: 'http://ai', apiKey: 'k' } },
    }));
    const { AiService: ExternalAiService } = await import('@application/services/AiService');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ summary: 'external summary' }),
    } as any);
    const deps = createService();
    const service = new ExternalAiService(deps.knowledgeRepository as any, deps.knowledgeRecommender as any);
    const summary = await service.summarizeConversation('c1');
    expect(summary).toBe('external summary');
  });

  it('falls back sentiment when llm throws', async () => {
    vi.spyOn(LLMClient.prototype, 'isEnabled').mockReturnValue(true);
    vi.spyOn(LLMClient.prototype, 'analyzeSentiment').mockRejectedValue(new Error('boom'));
    const { service } = createService();
    const result = await service.analyzeSentiment('不满');
    expect(result.overallSentiment).toBe('negative');
  });

  it('falls back resolution when llm returns invalid json', async () => {
    vi.spyOn(LLMClient.prototype, 'isEnabled').mockReturnValue(true);
    vi.spyOn(LLMClient.prototype, 'generate').mockResolvedValue('no json');
    const { service } = createService();
    const result = await service.detectProblemResolution('没解决');
    expect(result.reopened).toBe(true);
  });
});
