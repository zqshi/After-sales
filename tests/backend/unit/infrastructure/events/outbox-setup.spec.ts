import { beforeEach, describe, expect, it, vi } from 'vitest';

const { startMock, stopMock, initializeMock } = vi.hoisted(() => ({
  startMock: vi.fn(),
  stopMock: vi.fn(),
  initializeMock: vi.fn(),
}));

vi.mock('../../../../../backend/src/infrastructure/database/data-source', () => ({
  AppDataSource: {
    isInitialized: false,
    initialize: initializeMock,
  },
}));

vi.mock('../../../../../backend/src/infrastructure/events/EventBus', () => ({
  EventBus: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../../../../backend/src/infrastructure/events/OutboxEventBus', () => ({
  OutboxEventBus: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../../../../backend/src/infrastructure/events/OutboxProcessor', () => ({
  OutboxProcessor: vi.fn().mockImplementation(() => ({
    start: startMock,
    stop: stopMock,
  })),
}));

import { initializeOutboxProcessor, shutdownOutboxProcessor } from '../../../../../backend/src/infrastructure/events/outbox-setup';
import { AppDataSource } from '../../../../../backend/src/infrastructure/database/data-source';

describe('outbox-setup', () => {
  beforeEach(() => {
    startMock.mockReset();
    stopMock.mockReset();
    initializeMock.mockReset();
    (AppDataSource as any).isInitialized = false;
  });

  it('initializes data source and starts processor', async () => {
    initializeMock.mockResolvedValue(undefined);
    const processor = await initializeOutboxProcessor();
    expect(initializeMock).toHaveBeenCalledTimes(1);
    expect(startMock).toHaveBeenCalledWith(5000);
    await shutdownOutboxProcessor(processor as any);
    expect(stopMock).toHaveBeenCalledTimes(1);
  });
});
