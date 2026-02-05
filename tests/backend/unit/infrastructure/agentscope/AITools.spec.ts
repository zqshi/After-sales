import { describe, expect, it, vi } from 'vitest';
import { buildAITools } from '@infrastructure/agentscope/tools/AITools';

const getTool = (tools: any[], name: string) => tools.find((tool) => tool.name === name);

describe('AITools', () => {
  it('analyzeConversation builds options', async () => {
    const analyzeConversationUseCase = { execute: vi.fn().mockResolvedValue({ ok: true }) };
    const tools = buildAITools({ analyzeConversationUseCase } as any);
    const tool = getTool(tools, 'analyzeConversation');

    await tool.handler({ conversationId: 'c1', keywords: [' foo ', ''], includeHistory: true });

    expect(analyzeConversationUseCase.execute).toHaveBeenCalledWith({
      conversationId: 'c1',
      context: undefined,
      options: { keywords: ['foo'], includeHistory: true },
    });
  });

  it('recommends knowledge with limit', async () => {
    const knowledgeRepository = {
      findByFilters: vi.fn().mockResolvedValue([
        { id: 'k1', title: 'T1', tags: ['a'], category: { value: 'faq' } },
        { id: 'k2', title: 'T2', tags: ['b'], category: { value: 'faq' } },
      ]),
    };
    const knowledgeRecommender = { recommendByKeywords: vi.fn().mockReturnValue([{ id: 'k1' }, { id: 'k2' }]) };
    const tools = buildAITools({ knowledgeRepository, knowledgeRecommender } as any);
    const tool = getTool(tools, 'recommendKnowledge');

    const result = await tool.handler({ keywords: ['  a ', ''], limit: 1 });

    expect(knowledgeRepository.findByFilters).toHaveBeenCalledWith({}, { limit: 3, offset: 0 });
    expect(result.length).toBe(1);
  });

  it('creates survey and validates questions', async () => {
    const surveyRepository = { save: vi.fn().mockResolvedValue({ id: 's1' }) };
    const tools = buildAITools({ surveyRepository } as any);
    const tool = getTool(tools, 'createSurvey');

    await expect(tool.handler({ customerId: 'c1', questions: [] })).rejects.toThrow('questions is required');
    const result = await tool.handler({ customerId: 'c1', questions: ['Q1'] });
    expect(result.surveyId).toBe('s1');
  });

  it('returns system status with stats and degraded when failing', async () => {
    const depsOk = {
      conversationRepository: { countByFilters: vi.fn().mockResolvedValue(2) },
      taskRepository: { countByFilters: vi.fn().mockResolvedValue(3) },
      knowledgeRepository: { countByFilters: vi.fn().mockResolvedValue(4) },
    };
    const toolsOk = buildAITools(depsOk as any);
    const statusTool = getTool(toolsOk, 'getSystemStatus');
    const ok = await statusTool.handler({ includeStats: true });
    expect(ok.status).toBe('ok');
    expect(ok.stats.conversations).toBe(2);

    const depsFail = {
      conversationRepository: { countByFilters: vi.fn().mockRejectedValue(new Error('db')) },
      taskRepository: { countByFilters: vi.fn() },
      knowledgeRepository: { countByFilters: vi.fn() },
    };
    const toolsFail = buildAITools(depsFail as any);
    const statusToolFail = getTool(toolsFail, 'getSystemStatus');
    const degraded = await statusToolFail.handler({ includeStats: false });
    expect(degraded.status).toBe('degraded');
  });

  it('classifyIntent uses llmClient when enabled', async () => {
    const aiService = { llmClient: { isEnabled: vi.fn().mockReturnValue(true), extractIntent: vi.fn().mockResolvedValue({ intent: 'x' }) } };
    const tools = buildAITools({ aiService } as any);
    const tool = getTool(tools, 'classifyIntent');

    const result = await tool.handler({ content: 'Hello?' });

    expect(result.intent).toBe('x');
  });

  it('classifyIntent falls back when llmClient disabled', async () => {
    const aiService = { llmClient: { isEnabled: vi.fn().mockReturnValue(false) } };
    const tools = buildAITools({ aiService } as any);
    const tool = getTool(tools, 'classifyIntent');

    const result = await tool.handler({ content: 'Hello?' });

    expect(result.isQuestion).toBe(true);
    expect(result.intent).toBe('inquiry');
  });
});
