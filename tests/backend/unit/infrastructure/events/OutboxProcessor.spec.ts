import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OutboxProcessor } from '@infrastructure/events/OutboxProcessor';

const makeEvent = (overrides: Partial<any> = {}) => ({
  id: 'evt-1',
  eventType: 'TestEvent',
  aggregateId: 'agg-1',
  aggregateType: 'Conversation',
  occurredAt: new Date(),
  version: 1,
  eventData: { a: 1 },
  retryCount: 0,
  maxRetries: 1,
  createdAt: new Date(),
  lastRetryAt: new Date(),
  ...overrides,
});

describe('OutboxProcessor', () => {
  const outboxEventBus = {
    getPendingEvents: vi.fn(),
    markAsPublished: vi.fn(),
    markAsFailed: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(() => {
    outboxEventBus.getPendingEvents.mockReset();
    outboxEventBus.markAsPublished.mockReset();
    outboxEventBus.markAsFailed.mockReset();
    eventBus.publish.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('starts and stops', async () => {
    vi.useFakeTimers();
    outboxEventBus.getPendingEvents.mockResolvedValue([]);

    const processor = new OutboxProcessor(outboxEventBus as any, eventBus as any, {} as any);
    processor.start(10);
    processor.start(10);

    vi.advanceTimersByTime(20);
    processor.stop();

    expect(processor.getStatus().isRunning).toBe(false);
    vi.useRealTimers();
  });

  it('publishes pending events', async () => {
    outboxEventBus.getPendingEvents.mockResolvedValue([makeEvent()]);
    eventBus.publish.mockResolvedValue(undefined);

    const processor = new OutboxProcessor(outboxEventBus as any, eventBus as any, {} as any);
    await processor.processNow();

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(outboxEventBus.markAsPublished).toHaveBeenCalledTimes(1);
  });

  it('marks failed and sends dead letter alerts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, statusText: 'OK' });
    vi.stubGlobal('fetch', fetchMock);
    process.env.DEAD_LETTER_ALERT_WEBHOOK_URL = 'http://example.com';
    process.env.DEAD_LETTER_ALERT_EMAIL = 'alert@example.com';

    outboxEventBus.getPendingEvents.mockResolvedValue([makeEvent({ retryCount: 0, maxRetries: 1 })]);
    eventBus.publish.mockRejectedValue(new Error('boom'));

    const processor = new OutboxProcessor(outboxEventBus as any, eventBus as any, {} as any);
    await processor.processNow();

    expect(outboxEventBus.markAsFailed).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
