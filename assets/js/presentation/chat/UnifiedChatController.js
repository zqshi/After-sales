import { qs, qsa, on } from '../../core/dom.js';
import { scrollToBottom } from '../../core/scroll.js';
import { showNotification } from '../../core/notifications.js';
import { fetchConversationMessages } from '../../api.js';
import { buildMessageNode } from './AgentMessageRenderer.js';
import { AgentWebSocket } from '../../infrastructure/websocket/AgentWebSocket.js';

const DEFAULT_CUSTOMER = 'customer-001';
const DEFAULT_CONVERSATION = 'conv-001';

export class UnifiedChatController {
  constructor() {
    this.messagesContainer = qs('#chat-messages');
    this.input = qs('#message-input');
    this.sendButton = qs('#send-button');
    this.modeButtons = qsa('[data-chat-mode]');
    this.statusPill = qs('#agent-status-pill');
    this.escalationBanner = qs('#escalation-banner');
    this.escalationText = this.escalationBanner?.querySelector('.escalation-text');
    this.escalationAction = this.escalationBanner?.querySelector('.escalation-action');
    this.agentScopeUrl = window.config?.agentScopeUrl || '';
    this.wsBaseUrl = window.config?.agentScopeWebSocketUrl || '';
    this.websocket = null;
    this.mode = 'agent_auto';
    this.conversationId = DEFAULT_CONVERSATION;
    this.customerId = DEFAULT_CUSTOMER;
  }

  init() {
    this.modeButtons.forEach((button) => button.addEventListener('click', () => this.setMode(button.dataset.chatMode)));
    on(this.sendButton, 'click', () => this.sendInput());
    if (this.input) {
      this.input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          this.sendInput();
        }
      });
    }

    if (this.escalationAction) {
      this.escalationAction.addEventListener('click', () => {
        showNotification('已请求人工介入', 'warning');
        this.websocket?.sendInterrupt();
      });
    }

    this.setMode(this.mode);
    this.loadConversation(this.conversationId);
  }

  setMode(mode = 'agent_auto') {
    this.mode = mode;
    this.modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.chatMode === mode);
    });
  }

  async sendInput() {
    const text = this.input?.value.trim();
    if (!text) {
      showNotification('请输入消息内容', 'warning');
      return;
    }

    this.appendMessage({
      role: 'customer',
      author: '客户',
      content: text,
      timestamp: new Date().toISOString(),
    });

    if (this.input) {
      this.input.value = '';
    }
    scrollToBottom();

    if (!this.agentScopeUrl) {
      showNotification('AgentScope未配置，无法发送', 'error');
      return;
    }

    try {
      const response = await fetch(`${this.agentScopeUrl}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: this.conversationId,
          customer_id: this.customerId,
          message: text,
          metadata: { mode: this.mode },
        }),
      });

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.message || 'Agent服务未响应');
      }

      const author = payload.agent_name || 'Agent';
      const role = author.toLowerCase().includes('human') ? 'human' : 'agent';

      this.appendMessage({
        role,
        author,
        content: payload.message,
        timestamp: new Date().toISOString(),
      });
      scrollToBottom();
      this.applyMetadata(payload.metadata);
    } catch (error) {
      console.error('[UnifiedChat] sendInput error', error);
      showNotification('Agent 回复失败，请重试', 'error');
    }
  }

  applyMetadata(metadata = {}) {
    if (metadata.mode) {
      this.setMode(metadata.mode);
    }

    if (metadata.escalated || metadata.mode === 'human_first') {
      this.showEscalationBanner(metadata.escalationReason || 'Agent 建议人工介入');
    } else {
      this.hideEscalationBanner();
    }
  }

  appendMessage(message) {
    if (!this.messagesContainer) return;
    const node = buildMessageNode({
      role: message.role,
      author: message.author,
      content: message.content,
      timestamp: message.timestamp,
    });
    this.messagesContainer.appendChild(node);
  }

  clearMessages() {
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
  }

  async loadConversation(conversationId) {
    if (!conversationId) return;
    this.clearMessages();
    try {
      const payload = await fetchConversationMessages(conversationId, { limit: 40 });
      const data = payload?.data ?? payload ?? {};
      const items = data?.items ?? data?.messages ?? [];
      if (Array.isArray(items)) {
        items.forEach((entry) => {
          const role = entry.senderType === 'internal' ? 'agent' : 'customer';
          const author = entry.senderName || (role === 'agent' ? '客服' : '客户');
          this.appendMessage({
            role,
            author,
            content: entry.content,
            timestamp: entry.sentAt ?? entry.createdAt ?? entry.timestamp,
          });
        });
      }
    } catch (error) {
      console.warn('[UnifiedChat] 无法加载历史消息', error);
    }
    scrollToBottom();
    await this.connectWebSocket(conversationId);
  }

  async setConversation(conversationId, details = {}) {
    this.conversationId = conversationId || DEFAULT_CONVERSATION;
    this.customerId = details.customerId || this.customerId;
    this.updateHeader({
      title: `${details.customerName || '客户'} - ${details.company || '未知公司'}`,
      summary: details.summary || details.note || 'AgentScope 人机协同模式已激活',
      sla: details.sla || 'SLA 未知',
    });
    await this.loadConversation(this.conversationId);
  }

  updateHeader({ title, summary, sla } = {}) {
    const titleNode = qs('#chat-header-title');
    const summaryNode = qs('#chat-header-summary');
    const slaNode = qs('#chat-header-sla');

    if (titleNode && title) {
      titleNode.textContent = title;
    }
    if (summaryNode && summary) {
      summaryNode.innerHTML = `<span>智能摘要：</span><span>${summary}</span>`;
    }
    if (slaNode && sla) {
      slaNode.textContent = sla;
    }
  }

  async connectWebSocket(conversationId) {
    if (!this.wsBaseUrl) {
      this.updateStatus('offline', 'WS 未配置');
      return;
    }

    if (!conversationId) {
      return;
    }

    if (this.websocket) {
      this.websocket.close();
    }

    this.websocket = new AgentWebSocket(this.wsBaseUrl);
    this.websocket.on('open', () => this.updateStatus('online', 'Agent WebSocket 已连接'));
    this.websocket.on('close', () => this.updateStatus('offline', 'Agent WebSocket 已断开'));
    this.websocket.on('message', (payload) => this.handleSocketMessage(payload));
    this.websocket.on('error', () => this.updateStatus('offline', 'Agent WebSocket 错误'));

    try {
      await this.websocket.connect(conversationId);
    } catch (error) {
      console.warn('[UnifiedChat] WebSocket 连接失败', error);
    }
  }

  handleSocketMessage(payload) {
    if (!payload) {
      return;
    }
    if (payload.type === 'agent_suggestions') {
      showNotification('Agent 提供新建议，已同步到前端', 'info');
    }
    if (payload.type === 'human_input_required') {
      this.showEscalationBanner(payload.message || 'Agent 请求人工介入');
    }
  }

  updateStatus(state, label) {
    if (!this.statusPill) {
      return;
    }
    this.statusPill.textContent = label || 'Agent 未连接';
    this.statusPill.classList.remove('agent-status-online', 'agent-status-offline');
    this.statusPill.classList.add(state === 'online' ? 'agent-status-online' : 'agent-status-offline');
  }

  showEscalationBanner(text) {
    if (!this.escalationBanner) {
      return;
    }
    if (this.escalationText) {
      this.escalationText.textContent = text;
    }
    this.escalationBanner.classList.remove('hidden');
  }

  hideEscalationBanner() {
    this.escalationBanner?.classList.add('hidden');
  }
}
