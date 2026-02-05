import { describe, expect, it, vi } from 'vitest';
import { AiController } from '@presentation/http/controllers/AiController';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

describe('AiController', () => {
  const analyzeUseCase = { execute: vi.fn() };
  const applySolutionUseCase = { execute: vi.fn() };
  const controller = new AiController(analyzeUseCase as any, applySolutionUseCase as any);

  it('analyzes conversation', async () => {
    analyzeUseCase.execute.mockResolvedValue({ id: 'c1' });
    const reply = makeReply();
    await controller.analyze({ body: { conversationId: 'c1' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('applies solution', async () => {
    applySolutionUseCase.execute.mockResolvedValue({ message: 'ok' });
    const reply = makeReply();
    await controller.applySolution({ body: { conversationId: 'c1', solutionType: 'k' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('handles validation error', async () => {
    analyzeUseCase.execute.mockRejectedValue(new Error('conversationId required'));
    const reply = makeReply();
    await controller.analyze({ body: {} } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(400);
  });
});
