import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.mock('@fastify/websocket', () => ({ default: vi.fn() }), { virtual: true });
import { WebSocketService } from '@infrastructure/websocket/WebSocketService';
import { WebSocket } from 'ws';

const createFakeSocket = () => {
  const handlers: Record<string, Array<(...args: any[]) => void>> = {};
  return {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    close: vi.fn(),
    on(event: string, handler: (...args: any[]) => void) {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    },
    emit(event: string, ...args: any[]) {
      (handlers[event] || []).forEach((handler) => handler(...args));
    },
  };
};

const createFastify = () => {
  const routes: any[] = [];
  return {
    register: vi.fn().mockResolvedValue(undefined),
    get: vi.fn((path: string, _opts: any, handler: any) => {
      routes.push({ path, handler });
    }),
    routes,
  } as any;
};

describe('WebSocketService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registers ws route and handles messages', async () => {
    const fastify = createFastify();
    const service = new WebSocketService(fastify);

    await service.register();

    const route = fastify.routes.find((r: any) => r.path === '/ws/reviews');
    expect(route).toBeTruthy();

    const socket = createFakeSocket();
    const connection = { socket } as any;
    const req = { user: { id: 'u1' } } as any;

    route.handler(connection, req);

    expect(socket.send).toHaveBeenCalled();

    socket.emit('message', Buffer.from(JSON.stringify({ type: 'ping' })));
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong', data: {} }));

    socket.emit('close');
    expect(socket.close).toHaveBeenCalled();
  });

  it('notifies online users and removes closed sockets', async () => {
    const fastify = createFastify();
    const service = new WebSocketService(fastify);

    const socket = createFakeSocket();
    (service as any).connections.set('u1', {
      socket,
      userId: 'u1',
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    });

    await service.notifyReviewRequest({
      type: 'review_request',
      data: {
        reviewId: 'r1',
        conversationId: 'c1',
        customerId: 'cust',
        customerName: 'name',
        message: 'hi',
        suggestedReply: 'ok',
        priority: 'high',
        createdAt: new Date().toISOString(),
      },
    });

    expect(socket.send).toHaveBeenCalled();

    socket.readyState = 0;
    const result = await service.notifyUser('u1', {
      type: 'review_request',
      data: {
        reviewId: 'r2',
        conversationId: 'c2',
        customerId: 'cust',
        customerName: 'name',
        message: 'hi',
        suggestedReply: 'ok',
        priority: 'low',
        createdAt: new Date().toISOString(),
      },
    });

    expect(result).toBe(false);
    expect(service.getOnlineCount()).toBe(0);
  });

  it('cleans up idle connections and reports stats', async () => {
    const fastify = createFastify();
    const service = new WebSocketService(fastify);

    const socket = createFakeSocket();
    (service as any).connections.set('u2', {
      socket,
      userId: 'u2',
      connectedAt: Date.now() - 1000,
      lastActivity: Date.now() - 31 * 60 * 1000,
    });

    await service.register();

    const statsBefore = service.getConnectionStats();
    expect(statsBefore.total).toBe(1);

    await vi.advanceTimersByTimeAsync(60 * 1000);

    expect(service.getOnlineCount()).toBe(0);
  });

  it('responds to pong messages by updating activity', async () => {
    const fastify = createFastify();
    const service = new WebSocketService(fastify);

    const socket = createFakeSocket();
    (service as any).connections.set('u3', {
      socket,
      userId: 'u3',
      connectedAt: Date.now(),
      lastActivity: Date.now() - 1000,
    });

    (service as any).handleMessage('u3', { type: 'pong' });
    const stats = service.getConnectionStats();
    expect(stats.users[0].idleTime).toBeLessThan(31 * 60 * 1000);
  });
});
