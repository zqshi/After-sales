import { describe, expect, it, vi } from 'vitest';

describe('server entry', () => {
  it('starts app and listens on configured port', async () => {
    vi.resetModules();
    const listenMock = vi.fn();
    const logInfoMock = vi.fn();
    const createAppMock = vi.fn().mockResolvedValue({
      listen: listenMock,
      log: { info: logInfoMock },
      outboxProcessor: { stop: vi.fn() },
    });
    const initMock = vi.fn().mockResolvedValue(undefined);
    const destroyMock = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);

    vi.doMock('../../../backend/src/app.js', () => ({ createApp: createAppMock }));
    vi.doMock('../../../backend/src/config/app.config.js', () => ({
      config: {
        port: 4001,
        env: 'test',
        logLevel: 'error',
        database: { host: '127.0.0.1', port: 5432, name: 'aftersales_test' },
      },
    }));
    vi.doMock('../../../backend/src/infrastructure/database/data-source.js', () => ({
      AppDataSource: {
        initialize: initMock,
        destroy: destroyMock,
        isInitialized: true,
      },
    }));

    await import('../../../backend/src/server.ts');

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledWith({ port: 4001, host: '0.0.0.0' });

    process.emit('SIGINT');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });

  it('exits with code 1 on startup failure', async () => {
    vi.resetModules();
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    vi.doMock('../../../backend/src/app.js', () => ({ createApp: vi.fn() }));
    vi.doMock('../../../backend/src/config/app.config.js', () => ({
      config: {
        port: 4001,
        env: 'test',
        logLevel: 'error',
        database: { host: '127.0.0.1', port: 5432, name: 'aftersales_test' },
      },
    }));
    vi.doMock('../../../backend/src/infrastructure/database/data-source.js', () => ({
      AppDataSource: {
        initialize: vi.fn().mockRejectedValue(new Error('fail')),
        destroy: vi.fn(),
        isInitialized: false,
      },
    }));

    await import('../../../backend/src/server.ts');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(exitMock).toHaveBeenCalledWith(1);
  });
});
