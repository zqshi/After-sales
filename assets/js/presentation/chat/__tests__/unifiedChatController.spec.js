import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const scrollToBottom = vi.fn();
const showNotification = vi.fn();
const fetchConversationMessages = vi.fn();
const fetchConversationAiAnalysis = vi.fn();
const sendIncomingMessage = vi.fn();
const setConversationMode = vi.fn();
const submitAgentReview = vi.fn();
const buildMessageNode = vi.fn();
const openAiAssistantPanel = vi.fn();

class MockAgentWebSocket {
  constructor(url) {
    this.url = url;
    this.handlers = {};
  }
  on(event, handler) {
    this.handlers[event] = handler;
  }
  async connect() {}
  close() {}
  sendInterrupt() {}
  sendHumanInput() {}
}

class MockAiAssistantPanel {
  constructor() {
    this.clear = vi.fn();
    this.hide = vi.fn();
    this.show = vi.fn();
    this.updateSentiment = vi.fn();
    this.updateReplySuggestion = vi.fn();
    this.updateSolutionSteps = vi.fn();
    this.updateKnowledgeBase = vi.fn();
    this.updateRelatedTasks = vi.fn();
  }
}

class MockAiAnalysisCache {
  constructor() {
    this.store = new Map();
  }
  get(key) {
    return this.store.get(key);
  }
  set(key, value) {
    this.store.set(key, value);
  }
}

class MockLRUCache {
  constructor() {
    this.store = new Map();
  }
  has(key) {
    return this.store.has(key);
  }
  get(key) {
    return this.store.get(key);
  }
  set(key, value) {
    this.store.set(key, value);
  }
}

vi.mock('../../../core/scroll.js', () => ({
  scrollToBottom: (...args) => scrollToBottom(...args),
}));

vi.mock('../../../core/notifications.js', () => ({
  showNotification: (...args) => showNotification(...args),
}));

vi.mock('../../../api.js', () => ({
  fetchConversationMessages: (...args) => fetchConversationMessages(...args),
  fetchConversationAiAnalysis: (...args) => fetchConversationAiAnalysis(...args),
  sendIncomingMessage: (...args) => sendIncomingMessage(...args),
  setConversationMode: (...args) => setConversationMode(...args),
  submitAgentReview: (...args) => submitAgentReview(...args),
}));

vi.mock('../AgentMessageRenderer.js', () => ({
  buildMessageNode: (...args) => buildMessageNode(...args),
}));

vi.mock('../../../infrastructure/websocket/AgentWebSocket.js', () => ({
  AgentWebSocket: MockAgentWebSocket,
}));

vi.mock('../AiAssistantPanel.js', () => ({
  AiAssistantPanel: MockAiAssistantPanel,
}));

vi.mock('../../../infrastructure/cache/AiAnalysisCache.js', () => ({
  AiAnalysisCache: MockAiAnalysisCache,
}));

vi.mock('../../../infrastructure/cache/LRUCache.js', () => ({
  LRUCache: MockLRUCache,
}));

vi.mock('../../../ui/layout.js', () => ({
  openAiAssistantPanel: (...args) => openAiAssistantPanel(...args),
}));

const setupDom = () => {
  document.body.innerHTML = `
    <div id="chat-messages"></div>
    <input id="message-input" />
    <button id="send-button"></button>
    <button data-chat-mode="agent_auto" class="mode-btn"></button>
    <button data-chat-mode="human_first" class="mode-btn"></button>
    <div id="agent-status-pill"></div>
    <div id="escalation-banner" class="hidden">
      <span class="escalation-text"></span>
      <button class="escalation-action"></button>
    </div>
    <div class="reply-suggestions"></div>
    <div id="agent-analysis-panel">
      <div class="requirements-list"></div>
      <div class="knowledge-recommendations"></div>
      <div class="related-tasks"></div>
    </div>
    <div id="ai-assistant-panel" class="hidden"></div>
    <div id="ai-panel-reply"></div>
    <div id="ai-panel-solution"></div>
    <div id="ai-panel-action"></div>
    <div id="ai-panel-clarify"></div>
    <div id="ai-panel-requirements"></div>
    <div id="ai-assistant-title"></div>
    <div id="ai-assistant-badge"></div>
    <div id="ai-assistant-desc"></div>
    <div id="ai-action-content"></div>
  `;
};

describe('UnifiedChatController', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDom();
    scrollToBottom.mockReset();
    showNotification.mockReset();
    fetchConversationMessages.mockReset();
    fetchConversationAiAnalysis.mockReset();
    sendIncomingMessage.mockReset();
    setConversationMode.mockReset();
    submitAgentReview.mockReset();
    buildMessageNode.mockReset();
    openAiAssistantPanel.mockReset();
    window.config = { agentScopeUrl: 'https://example.com', agentScopeWebSocketUrl: 'wss://ws.example.com' };
  });

  afterEach(() => {
    delete window.config;
  });

  it('sets mode and saves to backend', async () => {
    const { UnifiedChatController } = await import('../UnifiedChatController.js');
    const controller = new UnifiedChatController();
    controller.conversationId = 'conv-1';
    setConversationMode.mockResolvedValue({ ok: true });

    await controller.setMode('human_first');

    expect(setConversationMode).toHaveBeenCalledWith('conv-1', 'human_first');
    expect(showNotification).toHaveBeenCalledWith('已切换到人工优先模式', 'success');
    const buttons = document.querySelectorAll('[data-chat-mode]');
    const active = Array.from(buttons).find((btn) => btn.classList.contains('active'));
    expect(active.dataset.chatMode).toBe('human_first');
  });

  it('warns when input is empty or missing conversation', async () => {
    const { UnifiedChatController } = await import('../UnifiedChatController.js');
    const controller = new UnifiedChatController();

    controller.input.value = '   ';
    await controller.sendInput();
    expect(showNotification).toHaveBeenCalledWith('请输入消息内容', 'warning');

    controller.input.value = 'hi';
    controller.conversationId = null;
    controller.customerId = null;
    await controller.sendInput();
    expect(showNotification).toHaveBeenCalledWith('请先选择会话', 'warning');
  });

  it('sends message and updates panels on success', async () => {
    const { UnifiedChatController } = await import('../UnifiedChatController.js');
    const controller = new UnifiedChatController();

    controller.conversationId = 'conv-1';
    controller.customerId = 'cust-1';
    controller.input.value = 'hello';

    vi.spyOn(controller, 'appendMessage').mockReturnValue('msg-1');
    vi.spyOn(controller, 'storeMessage');
    vi.spyOn(controller, 'updateMessageSentiment');
    vi.spyOn(controller, 'updateAgentSuggestionPanel');
    vi.spyOn(controller, 'renderReviewRequest');
    vi.spyOn(controller, 'appendKnowledgeCards');
    vi.spyOn(controller, 'updateAnalysisPanel');

    sendIncomingMessage.mockResolvedValue({
      success: true,
      data: {
        message: { sentiment: { emotion: 'negative', score: 0.4 } },
        agentSuggestion: {
          suggestedReply: 'reply',
          needsHumanReview: true,
          reviewRequestId: 'review-1',
          confidence: 0.8,
        },
        analysis: {
          knowledgeRecommendations: [{ title: 'doc', category: 'cat', score: 0.9, url: 'https://doc' }],
        },
      },
    });

    await controller.sendInput();

    expect(controller.appendMessage).toHaveBeenCalled();
    expect(controller.storeMessage).toHaveBeenCalled();
    expect(controller.updateMessageSentiment).toHaveBeenCalled();
    expect(controller.updateAgentSuggestionPanel).toHaveBeenCalled();
    expect(controller.renderReviewRequest).toHaveBeenCalled();
    expect(controller.appendKnowledgeCards).toHaveBeenCalled();
    expect(controller.updateAnalysisPanel).toHaveBeenCalled();
    expect(controller.input.value).toBe('');
  });

  it('updates agent suggestion panel and adopts suggestion', async () => {
    const { UnifiedChatController } = await import('../UnifiedChatController.js');
    const controller = new UnifiedChatController();

    controller.updateAgentSuggestionPanel({
      suggestedReply: '建议回复',
      confidence: 0.7,
      needsHumanReview: true,
      reason: '复杂需求',
    });

    const adoptBtn = document.querySelector('.adopt-suggestion-btn');
    expect(adoptBtn).not.toBeNull();

    adoptBtn.click();
    expect(controller.input.value).toBe('建议回复');
    expect(showNotification).toHaveBeenCalledWith('已采纳AI建议，可编辑后发送', 'success');

    const alert = document.querySelector('.bg-yellow-50');
    expect(alert).not.toBeNull();
  });

  it('adds sentiment badge to last customer message', async () => {
    const { UnifiedChatController } = await import('../UnifiedChatController.js');
    const controller = new UnifiedChatController();
    const row = document.createElement('div');
    row.className = 'message-row';
    row.dataset.senderRole = 'customer';
    row.dataset.messageId = 'm1';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    row.appendChild(bubble);
    document.querySelector('#chat-messages').appendChild(row);

    const issueSpy = vi.spyOn(controller, 'updateMessageIssueIndicator');
    controller.updateMessageSentiment({ sentiment: { emotion: 'positive', score: 0.88 } });

    const badge = row.querySelector('.sentiment-badge');
    expect(badge).not.toBeNull();
    expect(row.dataset.sentiment).toBe('positive');
    expect(issueSpy).toHaveBeenCalledWith('m1', { sentiment: { emotion: 'positive', score: 0.88 } });
  });

  it('updates analysis panel sections', async () => {
    const { UnifiedChatController } = await import('../UnifiedChatController.js');
    const controller = new UnifiedChatController();

    controller.updateAnalysisPanel({
      requirements: [{ title: '需求1', priority: 'high' }],
      knowledgeRecommendations: [{ title: 'KB', score: 0.5, url: 'https://kb' }],
      relatedTasks: [{ title: '任务1', url: 'https://task' }],
    });

    expect(document.querySelector('.requirements-list').textContent).toContain('需求1');
    expect(document.querySelector('.knowledge-recommendations').textContent).toContain('KB');
    expect(document.querySelector('.related-tasks').textContent).toContain('任务1');
  });
});
