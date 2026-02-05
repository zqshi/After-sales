import { describe, expect, it, vi } from 'vitest';
import path from 'path';

class MockTaxKBError extends Error {
  statusCode: number;
  details?: any;
  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

describe('init-taxkb script', () => {
  it('runs through initialization flow', async () => {
    vi.resetModules();

    const files = new Map<string, string>();
    const dirs = new Set<string>();
    const fsMock = {
      existsSync: (p: string) => p.includes('knowledge-base') || dirs.has(p),
      mkdirSync: (p: string) => {
        dirs.add(p);
      },
      readdirSync: () => ['seed.txt'],
      writeFileSync: (p: string, content: string) => {
        files.set(p, String(content));
      },
      readFileSync: (p: string) => {
        const content = files.get(p) ?? 'content';
        return Buffer.from(content);
      },
    };

    const adapterInstance = {
      semanticSearch: vi.fn().mockResolvedValue([{ doc_id: 'doc-1', content: 'c', score: 0.9 }]),
      uploadDocument: vi.fn().mockResolvedValue({ doc_id: 'doc-1' }),
      getProcessingProgress: vi.fn().mockResolvedValue({ overall_status: 'complete', overall_progress: 100 }),
      getDocument: vi.fn().mockResolvedValue({ doc_id: 'doc-1', content: 'ok' }),
      searchQA: vi.fn().mockResolvedValue([{ question: 'q', answer: 'a' }]),
    };

    vi.doMock('fs', () => ({ default: fsMock, ...fsMock }));
    vi.doMock('../../../../backend/src/infrastructure/adapters/TaxKBAdapter', () => ({
      TaxKBAdapter: vi.fn().mockImplementation(() => adapterInstance),
      TaxKBError: MockTaxKBError,
    }));
    vi.doMock('../../../../backend/src/config/taxkb.config', () => ({
      taxkbConfig: {
        enabled: false,
        baseUrl: 'http://localhost',
        apiKey: 'key',
        timeout: 3000,
      },
    }));

    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'clear').mockImplementation(() => undefined);
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);

    await import('../../../../backend/scripts/init-taxkb.ts');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(adapterInstance.semanticSearch).toHaveBeenCalled();
    expect(adapterInstance.uploadDocument).toHaveBeenCalled();
    expect(adapterInstance.searchQA).toHaveBeenCalled();
  });
});
