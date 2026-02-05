import { describe, expect, it, vi } from 'vitest';
import { buildKnowledgeTools } from '@infrastructure/agentscope/tools/KnowledgeTools';

describe('KnowledgeTools', () => {
  it('searches knowledge with filters', async () => {
    const deps = {
      searchKnowledgeUseCase: { execute: vi.fn().mockResolvedValue([]) },
      uploadDocumentUseCase: { execute: vi.fn() },
      getKnowledgeItemUseCase: { execute: vi.fn() },
    };
    const tools = buildKnowledgeTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'searchKnowledge')!.handler;

    await handler({ query: 'test', mode: 'semantic', filters: { category: 'faq' } });

    expect(deps.searchKnowledgeUseCase.execute).toHaveBeenCalledWith({
      query: 'test',
      mode: 'semantic',
      filters: { category: 'faq' },
    });
  });

  it('uploads document with base64 prefix', async () => {
    const deps = {
      searchKnowledgeUseCase: { execute: vi.fn() },
      uploadDocumentUseCase: { execute: vi.fn().mockResolvedValue({ id: 'k1' }) },
      getKnowledgeItemUseCase: { execute: vi.fn() },
    };
    const tools = buildKnowledgeTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'uploadDocument')!.handler;
    const base64 = Buffer.from('hello').toString('base64');

    await handler({ title: 'Doc', fileBase64: `data:text/plain;base64,${base64}` });

    const payload = deps.uploadDocumentUseCase.execute.mock.calls[0][0];
    expect(payload.title).toBe('Doc');
    expect(Buffer.isBuffer(payload.file)).toBe(true);
  });

  it('gets knowledge detail', async () => {
    const deps = {
      searchKnowledgeUseCase: { execute: vi.fn() },
      uploadDocumentUseCase: { execute: vi.fn() },
      getKnowledgeItemUseCase: { execute: vi.fn().mockResolvedValue({ id: 'k1' }) },
    };
    const tools = buildKnowledgeTools(deps as any);
    const handler = tools.find((tool) => tool.name === 'getKnowledgeDetail')!.handler;

    await handler({ knowledgeId: 'k1' });

    expect(deps.getKnowledgeItemUseCase.execute).toHaveBeenCalledWith({ knowledgeId: 'k1' });
  });
});
