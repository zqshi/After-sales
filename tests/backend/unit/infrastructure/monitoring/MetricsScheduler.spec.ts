import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@infrastructure/monitoring/MetricsCollector', () => ({
  metricsCollector: {
    setTasksByStatus: vi.fn(),
    setConversationsByStatus: vi.fn(),
    setRequirementsByStatus: vi.fn(),
  },
}));

import { MetricsScheduler } from '@infrastructure/monitoring/MetricsScheduler';
import { metricsCollector } from '@infrastructure/monitoring/MetricsCollector';

describe('MetricsScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts and updates metrics', async () => {
    const taskRepo = { findAll: vi.fn().mockResolvedValue([{ status: 'pending' }]) };
    const convRepo = { findAll: vi.fn().mockResolvedValue([{ status: 'open' }]) };
    const reqRepo = { findAll: vi.fn().mockResolvedValue([{ status: 'open' }]) };

    const scheduler = new MetricsScheduler(taskRepo as any, convRepo as any, reqRepo as any);
    scheduler.start();

    await vi.runOnlyPendingTimersAsync();

    expect(metricsCollector.setTasksByStatus).toHaveBeenCalled();
    expect(metricsCollector.setConversationsByStatus).toHaveBeenCalled();
    expect(metricsCollector.setRequirementsByStatus).toHaveBeenCalled();

    scheduler.stop();
  });

  it('handles errors during updates', async () => {
    const taskRepo = { findAll: vi.fn().mockRejectedValue(new Error('fail')) };
    const convRepo = { findAll: vi.fn().mockRejectedValue(new Error('fail')) };
    const reqRepo = { findAll: vi.fn().mockRejectedValue(new Error('fail')) };

    const scheduler = new MetricsScheduler(taskRepo as any, convRepo as any, reqRepo as any);
    scheduler.start();

    await vi.runOnlyPendingTimersAsync();

    scheduler.stop();
  });
});
