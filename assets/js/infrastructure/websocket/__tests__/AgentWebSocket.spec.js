import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AgentWebSocket } from '../AgentWebSocket.js';

const showNotification = vi.fn();

vi.mock('../../../core/notifications.js', () => ({
  showNotification: (...args) => showNotification(...args),
}));

class FakeWebSocket {
  static instances = [];
  static OPEN = 1;
  static CONNECTING = 0;

  constructor(url) {
    this.url = url;
    this.listeners = {};
    this.readyState = FakeWebSocket.CONNECTING;
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  send(payload) {
    this.sent.push(payload);
  }

  close() {
    this.closed = true;
  }

  trigger(event, data) {
    (this.listeners[event] || []).forEach((handler) => handler(data));
  }
}

describe('AgentWebSocket', () => {
  beforeEach(() => {
    showNotification.mockReset();
    FakeWebSocket.instances = [];
    global.WebSocket = FakeWebSocket;
  });

  afterEach(() => {
    delete global.WebSocket;
  });

  it('builds websocket url with encoded conversation id', async () => {
    const client = new AgentWebSocket('https://example.com/ws');
    const promise = client.connect('conv 1');
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toBe('wss://example.com/ws/conv%201');
    socket.readyState = FakeWebSocket.OPEN;
    socket.trigger('open');
    await promise;
  });

  it('emits open and handles error', async () => {
    const client = new AgentWebSocket('http://localhost');
    const onOpen = vi.fn();
    const onError = vi.fn();
    client.on('open', onOpen);
    client.on('error', onError);

    const promise = client.connect('conv-1');
    const socket = FakeWebSocket.instances[0];
    socket.readyState = FakeWebSocket.OPEN;
    socket.trigger('open');
    await promise;
    expect(onOpen).toHaveBeenCalled();

    const errorPromise = client.connect('conv-2');
    const nextSocket = FakeWebSocket.instances[1];
    const err = new Error('boom');
    nextSocket.trigger('error', err);
    await expect(errorPromise).rejects.toThrow('boom');
    expect(onError).toHaveBeenCalledWith(err);
    expect(showNotification).toHaveBeenCalledWith('Agent WebSocket 连接失败', 'warning');
  });

  it('parses message payloads', async () => {
    const client = new AgentWebSocket('ws://example.com');
    const onMessage = vi.fn();
    client.on('message', onMessage);

    const promise = client.connect('c1');
    const socket = FakeWebSocket.instances[0];
    socket.readyState = FakeWebSocket.OPEN;
    socket.trigger('open');
    await promise;

    socket.trigger('message', { data: '{"type":"ping"}' });
    socket.trigger('message', { data: 'not-json' });

    expect(onMessage).toHaveBeenCalledWith({ type: 'ping' });
    expect(onMessage).toHaveBeenCalledWith('not-json');
  });

  it('sends payloads only when open', async () => {
    const client = new AgentWebSocket('ws://example.com');
    const promise = client.connect('c2');
    const socket = FakeWebSocket.instances[0];
    socket.readyState = FakeWebSocket.OPEN;
    socket.trigger('open');
    await promise;

    client.sendHumanInput('hello', { lang: 'zh' });
    client.sendInterrupt();

    expect(socket.sent).toHaveLength(2);
    expect(JSON.parse(socket.sent[0])).toEqual({ type: 'human_input', content: 'hello', metadata: { lang: 'zh' } });
    expect(JSON.parse(socket.sent[1])).toEqual({ type: 'interrupt' });

    socket.readyState = FakeWebSocket.CONNECTING;
    client.sendInterrupt();
    expect(socket.sent).toHaveLength(2);
  });

  it('closes existing socket', async () => {
    const client = new AgentWebSocket('ws://example.com');
    const promise = client.connect('c3');
    const socket = FakeWebSocket.instances[0];
    socket.readyState = FakeWebSocket.OPEN;
    socket.trigger('open');
    await promise;

    client.close();
    expect(socket.closed).toBe(true);
    expect(client.socket).toBeNull();
  });
});
