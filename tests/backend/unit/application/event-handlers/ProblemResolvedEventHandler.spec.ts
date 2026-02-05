import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProblemResolvedEventHandler } from '@application/event-handlers/ProblemResolvedEventHandler';
import { ProblemResolvedEvent } from '@domain/problem/events/ProblemResolvedEvent';

vi.mock('@config/app.config', () => ({
  config: {
    agentscope: {
      serviceUrl: 'http://localhost:5000',
      timeout: 1000,
    },
    quality: {
      lowScoreThreshold: 70,
    },
  },
}));

describe('ProblemResolvedEventHandler', () => {
  const qualityReportRepository = {
    save: vi.fn(),
  };

  beforeEach(() => {
    qualityReportRepository.save.mockReset();
  });

  it('saves quality report when inspection succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, quality_score: 85 }),
      text: vi.fn().mockResolvedValue(''),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const handler = new ProblemResolvedEventHandler(qualityReportRepository as any);
    const event = new ProblemResolvedEvent(
      { aggregateId: 'p1' },
      { problemId: 'p1', conversationId: 'c1', resolvedAt: new Date() },
    );

    await handler.handle(event);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(qualityReportRepository.save).toHaveBeenCalledTimes(1);
  });

  it('warns on low score', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, quality_score: 60 }),
      text: vi.fn().mockResolvedValue(''),
    });
    vi.stubGlobal('fetch', fetchMock);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const handler = new ProblemResolvedEventHandler();
    const event = new ProblemResolvedEvent(
      { aggregateId: 'p1' },
      { problemId: 'p1', conversationId: 'c1', resolvedAt: new Date() },
    );

    await handler.handle(event);
    expect(warnSpy).toHaveBeenCalled();
  });
});
