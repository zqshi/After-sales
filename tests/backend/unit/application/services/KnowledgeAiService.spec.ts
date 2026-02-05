import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KnowledgeAiService } from '@application/services/KnowledgeAiService';

const generateMock = vi.fn();
const isEnabledMock = vi.fn();

vi.mock('@infrastructure/ai/LLMClient', () => ({
  LLMClient: vi.fn().mockImplementation(() => ({
    generate: generateMock,
    isEnabled: isEnabledMock,
  })),
}));

describe('KnowledgeAiService', () => {
  beforeEach(() => {
    generateMock.mockReset();
    isEnabledMock.mockReset();
  });

  it('returns empty summary when content is blank', async () => {
    const service = new KnowledgeAiService();
    generateMock.mockResolvedValue('{"summary":"ignored"}');
    const result = await service.generateSummary('T', '   ');
    expect(result).toBe('');
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('parses summary JSON response', async () => {
    const service = new KnowledgeAiService();
    generateMock.mockResolvedValue('prefix {"summary":"摘要内容"} suffix');
    const result = await service.generateSummary('标题', '正文内容');
    expect(result).toBe('摘要内容');
  });

  it('returns empty when faq JSON is invalid', async () => {
    const service = new KnowledgeAiService();
    generateMock.mockResolvedValue('not json');
    const result = await service.generateFaqs('标题', '内容', 2);
    expect(result).toEqual([]);
  });

  it('returns empty when faq count is less than 1', async () => {
    const service = new KnowledgeAiService();
    generateMock.mockResolvedValue('[{"question":"Q","answer":"A"}]');
    const result = await service.generateFaqs('标题', '内容', 0);
    expect(result).toEqual([]);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('filters faq entries with missing fields', async () => {
    const service = new KnowledgeAiService();
    generateMock.mockResolvedValue('[{"question":"Q1","answer":"A1"},{"question":"","answer":"A"}]');
    const result = await service.generateFaqs('标题', '内容', 2);
    expect(result).toEqual([{ question: 'Q1', answer: 'A1' }]);
  });

  it('returns empty tags when maxTags is less than 1', async () => {
    const service = new KnowledgeAiService();
    generateMock.mockResolvedValue('["a","b"]');
    const result = await service.generateTags('标题', '内容', 0);
    expect(result).toEqual([]);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('normalizes and deduplicates tags', async () => {
    const service = new KnowledgeAiService();
    generateMock.mockResolvedValue('["  AI  ","ai","知识库","知识库 "]');
    const result = await service.generateTags('标题', '内容', 10);
    expect(result).toEqual(['AI', '知识库']);
  });

  it('returns empty summary when JSON missing summary', async () => {
    const service = new KnowledgeAiService();
    generateMock.mockResolvedValue('{"foo":"bar"}');
    const result = await service.generateSummary('标题', '内容');
    expect(result).toBe('');
  });

  it('reports enabled status from llm client', async () => {
    const service = new KnowledgeAiService();
    isEnabledMock.mockReturnValue(true);
    expect(service.isEnabled()).toBe(true);
  });
});
