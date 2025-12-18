import { showNotification } from '../../core/notifications.js';

const DEFAULT_EVENTS = ['open', 'close', 'error', 'message'];

export class AgentWebSocket {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.socket = null;
    this.conversationId = null;
    this.listeners = {};
    DEFAULT_EVENTS.forEach((event) => {
      this.listeners[event] = [];
    });
  }

  async connect(conversationId) {
    if (!this.baseUrl || !conversationId) {
      return;
    }
    this.close();
    this.conversationId = conversationId;
    const normalized = this.baseUrl.replace(/\/$/, '');
    const prefix = normalized.startsWith('ws') ? normalized : normalized.replace(/^http/, 'ws');
    const url = `${prefix}/${encodeURIComponent(conversationId)}`;

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url);
      this.socket.addEventListener('open', () => {
        this._emit('open');
        resolve();
      });
      this.socket.addEventListener('close', () => this._emit('close'));
      this.socket.addEventListener('error', (err) => {
        this._emit('error', err);
        showNotification('Agent WebSocket 连接失败', 'warning');
        reject(err);
      });
      this.socket.addEventListener('message', (event) => {
        try {
          this._emit('message', JSON.parse(event.data));
        } catch (err) {
          this._emit('message', event.data);
        }
      });
    });
  }

  on(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event].push(handler);
    }
  }

  _emit(event, data) {
    (this.listeners[event] || []).forEach((handler) => handler(data));
  }

  sendHumanInput(content, metadata = {}) {
    this._send({ type: 'human_input', content, metadata });
  }

  sendInterrupt() {
    this._send({ type: 'interrupt' });
  }

  _send(payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
