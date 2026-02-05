import { describe, it, expect, vi, beforeEach } from 'vitest';

const notifications = { showNotification: vi.fn() };
const scroll = { scrollToBottom: vi.fn() };
const layout = { openAiAssistantPanel: vi.fn() };
const requirements = { analyzeRequirementText: vi.fn(), loadRequirementsData: vi.fn() };
const customer = { updateCustomerContext: vi.fn() };
const api = {
  fetchConversations: vi.fn(),
  fetchConversationAiAnalysis: vi.fn(),
  fetchSentimentAnalysis: vi.fn(),
  fetchConversationStats: vi.fn(),
  fetchMonitoringAlerts: vi.fn(),
  fetchAuditSummary: vi.fn(),
  createTask: vi.fn(),
  fetchTasks: vi.fn(),
  fetchQualityProfile: vi.fn(),
  isApiEnabled: vi.fn(),
};

vi.mock('../../core/notifications.js', () => notifications);
vi.mock('../../core/scroll.js', () => scroll);
vi.mock('../../ui/layout.js', () => layout);
vi.mock('../../requirements/index.js', () => requirements);
vi.mock('../../customer/index.js', () => customer);
vi.mock('../../api.js', () => api);
vi.mock('../../presentation/chat/UnifiedChatController.js', () => {
  return {
    UnifiedChatController: class {
      init = vi.fn();
      sendInput = vi.fn();
      setConversation = vi.fn();
      primeConversationCache = vi.fn();
    },
  };
});

function setupDom() {
  document.body.innerHTML = `
    <div class="conversation-list"></div>
    <div id="chat-messages"></div>
    <input id="message-input" />
    <button id="send-button"></button>
    <div id="low-confidence-warning" class="hidden"></div>
    <button id="emoji-button"></button>
    <div id="emoji-panel" class="hidden"></div>
    <div id="ai-assistant-panel" class="hidden"></div>
    <div id="ai-panel-reply"></div>
    <div id="ai-panel-solution"></div>
    <div id="ai-panel-action"></div>
    <div id="ai-panel-clarify"></div>
    <div id="ai-panel-requirements"></div>
    <div id="ai-assistant-title"></div>
    <div id="ai-assistant-badge"></div>
    <div id="ai-assistant-desc"></div>
    <div id="ai-reply-list"></div>
    <ul id="ai-solution-steps"></ul>
    <div id="ai-solution-references"></div>
    <div id="ai-action-content"></div>
    <div id="ai-clarify-content"></div>
    <div id="right-sidebar-overlay" class="hidden"></div>
    <div id="ai-plan-panel" class="hidden"></div>
    <div id="satisfaction-card" class="hidden"></div>
    <div id="action-modal-overlay" class="hidden"></div>
    <div id="action-modal-title"></div>
    <div id="action-modal-body"></div>
    <button id="action-modal-primary"></button>
    <input id="conversation-search-input" />
    <select id="filter-channel"></select>
    <select id="filter-urgency"></select>
    <select id="filter-sla"></select>
    <button id="filter-status-all" data-status="all"><span data-count></span></button>
    <button data-status="pending"><span data-count></span></button>
    <span data-count="all"></span>
    <span data-count="pending"></span>
    <div class="reply-suggestions"></div>
  `;
  const plan = document.getElementById('ai-plan-panel');
  plan.scrollIntoView = vi.fn();
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  setupDom();
  window.config = { userRole: 'agent', userId: 'u1' };
  navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
});


describe('chat module', () => {
  it('initChat loads conversations when API disabled', async () => {
    api.isApiEnabled.mockReturnValue(false);
    const mod = await import('../index.js');

    mod.initChat();

    const container = document.querySelector('.conversation-list');
    expect(container.textContent).toContain('暂无可用会话');
    expect(scroll.scrollToBottom).toHaveBeenCalled();
  });

  it('openAiReplyPanel shows empty state without conversation', async () => {
    api.isApiEnabled.mockReturnValue(false);
    const mod = await import('../index.js');

    await mod.openAiReplyPanel();

    expect(layout.openAiAssistantPanel).toHaveBeenCalled();
    expect(notifications.showNotification).toHaveBeenCalled();
    expect(document.querySelector('#ai-reply-list').innerHTML).toContain('请先选择会话');
  });

  it('openAiSolutionPanel renders steps and references', async () => {
    api.isApiEnabled.mockReturnValue(true);
    api.fetchConversations.mockResolvedValue({
      data: { items: [{ conversationId: 'c1', customerName: 'A', channel: 'im', urgency: 'normal', slaLevel: 'VIP' }] },
    });
    api.fetchConversationAiAnalysis.mockResolvedValue({
      data: {
        detectedIssues: [{ description: 'issue', severity: 'high', suggestedAction: 'act' }],
        knowledgeRecommendations: [{ title: 'KB1', category: 'cat' }],
      },
    });

    const mod = await import('../index.js');
    mod.initChat();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await mod.openAiSolutionPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector('#ai-solution-steps').innerHTML).toContain('问题描述');
    expect(document.querySelector('#ai-solution-references').innerHTML).toContain('KB1');
  });

  it('openRequirementPanel triggers requirement load', async () => {
    const mod = await import('../index.js');
    await mod.openRequirementPanel();
    expect(requirements.loadRequirementsData).toHaveBeenCalled();
  });

  it('openAssistCheck warns when no conversation', async () => {
    const mod = await import('../index.js');
    await mod.openAssistCheck();
    expect(notifications.showNotification).toHaveBeenCalled();
    expect(document.querySelector('#ai-action-content').innerHTML).toContain('请先选择会话');
  });

  it('openClarifyPanel builds question list', async () => {
    api.isApiEnabled.mockReturnValue(true);
    api.fetchConversations.mockResolvedValue({
      data: { items: [{ conversationId: 'c1', customerName: 'A', channel: 'im' }] },
    });
    api.fetchConversationAiAnalysis.mockResolvedValue({ data: { faultLevel: 'P1', issueProduct: '模块' } });
    const mod = await import('../index.js');

    const messages = document.getElementById('chat-messages');
    messages.innerHTML = `
      <div class="message-row" data-sender-role="customer">
        <div class="message-bubble"><p>需要帮助</p></div>
      </div>
    `;

    mod.initChat();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await mod.openClarifyPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('#ai-clarify-content').innerHTML).toContain('澄清问题');
  });

  it('sendMessage uses controller when ready', async () => {
    api.isApiEnabled.mockReturnValue(false);
    const mod = await import('../index.js');

    mod.initChat();
    mod.sendMessage();
    expect(notifications.showNotification).not.toHaveBeenCalled();
  });

  it('toggleAiPlan toggles visibility', async () => {
    const mod = await import('../index.js');
    const panel = document.getElementById('ai-plan-panel');
    expect(panel.classList.contains('hidden')).toBe(true);
    mod.toggleAiPlan();
    expect(panel.classList.contains('hidden')).toBe(false);
  });

  it('addMessage appends content and triggers requirement scan', async () => {
    const mod = await import('../index.js');
    mod.addMessage('customer', 'need export');
    const messages = document.getElementById('chat-messages');
    expect(messages.innerHTML).toContain('need export');
    expect(requirements.analyzeRequirementText).toHaveBeenCalled();
  });

  it('adoptSuggestion fills input', async () => {
    const mod = await import('../index.js');
    const input = document.getElementById('message-input');
    document.body.insertAdjacentHTML('beforeend', `
      <div class="suggestion-card" data-id="s1"><p>title</p><p>hello</p></div>
    `);
    mod.adoptSuggestion('s1');
    expect(input.value).toBe('hello');
  });

  it('optimizeMessage updates text', async () => {
    vi.useFakeTimers();
    const mod = await import('../index.js');
    const input = document.getElementById('message-input');
    input.value = 'hello';
    mod.optimizeMessage();
    vi.advanceTimersByTime(900);
    expect(input.value).toContain('感谢您的理解');
    vi.useRealTimers();
  });

  it('insertText and insertEmoji update cursor', async () => {
    const mod = await import('../index.js');
    const input = document.getElementById('message-input');
    input.value = 'ab';
    input.setSelectionRange(1, 1);
    mod.insertText('X');
    expect(input.value).toBe('aXb');
    mod.insertEmoji('😊');
    expect(input.value).toBe('aX😊b');
  });

  it('addToSuggestion inserts suggestion card', async () => {
    const mod = await import('../index.js');
    mod.addToSuggestion('Knowledge');
    const suggestions = document.querySelector('.reply-suggestions');
    expect(suggestions.innerHTML).toContain('Knowledge');
  });

  it('submitSatisfaction hides card', async () => {
    const mod = await import('../index.js');
    const card = document.getElementById('satisfaction-card');
    card.classList.remove('hidden');
    mod.submitSatisfaction(5);
    expect(card.classList.contains('hidden')).toBe(true);
  });

  it('resetFilters clears inputs and shows results message', async () => {
    api.isApiEnabled.mockReturnValue(false);
    const mod = await import('../index.js');
    const list = document.querySelector('.conversation-list');
    list.innerHTML = `
      <div class="conversation-item" data-status="pending" data-channel="im">
        <span class="text-sm font-medium">Alice</span>
        <p class="line-clamp-2">hello</p>
        <span class="text-xs text-red-600">紧急</span>
        <span class="px-2 py-0.5 rounded-full">VIP</span>
      </div>
    `;

    mod.resetFilters();

    const searchInput = document.getElementById('conversation-search-input');
    expect(searchInput.value).toBe('');
  });

  it('loads conversations and updates sentiment icon', async () => {
    api.isApiEnabled.mockReturnValue(true);
    api.fetchConversations.mockResolvedValue({
      data: {
        items: [
          {
            conversationId: 'c1',
            customerId: 'cust-1',
            customerName: 'Alice',
            channel: 'web',
            urgency: 'high',
            slaLevel: 'VIP',
            lastMessage: 'hello',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        ],
      },
    });
    api.fetchSentimentAnalysis.mockResolvedValue({ data: { sentiment: { type: 'positive', label: '积极' } } });

    const mod = await import('../index.js');
    mod.initChat();
    await flushPromises();
    await flushPromises();

    const list = document.querySelector('.conversation-list');
    expect(list.textContent).toContain('Alice');
    expect(list.querySelector('.sentiment-icon')?.textContent).toBe('😊');
  });

  it('shows empty list state when api returns no items', async () => {
    api.isApiEnabled.mockReturnValue(true);
    api.fetchConversations.mockResolvedValue({ data: { items: [] } });

    const mod = await import('../index.js');
    mod.initChat();
    await flushPromises();

    const list = document.querySelector('.conversation-list');
    expect(list.textContent).toContain('暂无可用会话');
    expect(document.querySelector('[data-count="all"]').textContent).toBe('0');
  });

  it('applies filters and shows no results message', async () => {
    api.isApiEnabled.mockReturnValue(false);
    const mod = await import('../index.js');
    mod.initChat();
    await flushPromises();

    const list = document.querySelector('.conversation-list');
    list.innerHTML = `
      <div class="conversation-item" data-status="pending" data-channel="im">
        <span class="text-sm font-medium">Bob</span>
        <p class="line-clamp-2">处理完成</p>
        <span class="text-xs text-red-600">紧急</span>
        <span class="px-2 py-0.5 rounded-full">VIP</span>
      </div>
    `;

    document.querySelector('#conversation-search-input').value = 'NotFound';
    document.querySelector('#conversation-search-input').dispatchEvent(new Event('input'));

    const noResult = list.querySelector('.no-results-message');
    expect(noResult).toBeTruthy();
    expect(noResult.textContent).toContain('未找到匹配的对话');
  });

  it('validates and blocks ticket creation when required fields missing', async () => {
    vi.useFakeTimers();
    const mod = await import('../index.js');
    mod.openTicket();
    vi.runAllTimers();
    vi.useRealTimers();

    document.querySelector('[data-action="create-ticket"]').click();
    const error = document.querySelector('[data-error-for="ticket-title"]');
    expect(error.classList.contains('hidden')).toBe(false);
  });

  it('warns when creating ticket with api disabled', async () => {
    api.isApiEnabled.mockReturnValue(false);
    vi.useFakeTimers();
    const mod = await import('../index.js');
    mod.openTicket();
    vi.runAllTimers();
    vi.useRealTimers();

    document.querySelector('#ticket-title').value = '故障';
    document.querySelector('#ticket-detail').value = '详情';
    document.querySelector('#ticket-tags').value = 'auth';
    document.querySelector('#ticket-date').value = '2025-01-01';
    document.querySelector('#ticket-time').value = '10:00';
    document.querySelector('#ticket-type').value = 'bug';
    document.querySelector('#ticket-product').value = 'cloud';
    document.querySelector('#ticket-impact').value = 'high';
    document.querySelector('#ticket-incident').value = 'yes';
    document.querySelector('#ticket-company').value = 'Acme';

    document.querySelector('[data-action="create-ticket"]').click();
    expect(notifications.showNotification).toHaveBeenCalledWith('API 未启用，无法创建工单', 'warning');
  });

  it('renders assist check content with knowledge and actions', async () => {
    api.isApiEnabled.mockReturnValue(true);
    api.fetchConversations.mockResolvedValue({
      data: { items: [{ conversationId: 'c1', customerName: 'A', channel: 'im' }] },
    });
    api.fetchConversationAiAnalysis.mockResolvedValue({
      data: {
        detectedIssues: [{ description: 'CPU 异常' }],
        knowledgeRecommendations: [{ title: 'KB', category: '指南' }],
        issueProduct: '登录',
        faultLevel: 'P1',
      },
    });

    const mod = await import('../index.js');
    mod.initChat();
    await flushPromises();

    await mod.openAssistCheck();
    await flushPromises();

    const action = document.querySelector('#ai-action-content');
    expect(action.textContent).toContain('CPU 异常');
    expect(action.textContent).toContain('KB');
  });

  it('shows warning when openFaultReport without conversation', async () => {
    const mod = await import('../index.js');
    await mod.openFaultReport();
    expect(notifications.showNotification).toHaveBeenCalledWith('请先选择会话', 'warning');
  });

  it('renders fault report with quality profile and AI analysis', async () => {
    api.isApiEnabled.mockReturnValue(true);
    api.fetchConversations.mockResolvedValue({
      data: { items: [{ conversationId: 'c1', customerName: 'A', channel: 'im' }] },
    });
    api.fetchQualityProfile.mockResolvedValue({
      data: { summary: '总结', actions: [{ description: '动作' }], tags: ['标签'], thread: [{ role: '客户', text: 'hi' }] },
    });
    api.fetchConversationAiAnalysis.mockResolvedValue({
      data: { detectedIssues: [{ suggestedAction: '建议' }] },
    });

    const mod = await import('../index.js');
    mod.initChat();
    await flushPromises();

    await mod.openFaultReport();
    await flushPromises();

    const action = document.querySelector('#ai-action-content');
    expect(action.textContent).toContain('总结');
    expect(action.textContent).toContain('动作');
    expect(action.textContent).toContain('标签');
  });

  it('supports manual check and copy actions in assist check', async () => {
    api.isApiEnabled.mockReturnValue(true);
    api.fetchConversations.mockResolvedValue({
      data: { items: [{ conversationId: 'c1', customerName: 'A', channel: 'im' }] },
    });
    api.fetchConversationAiAnalysis.mockResolvedValue({
      data: {
        detectedIssues: [{ description: 'CPU 异常' }],
        knowledgeRecommendations: [],
        issueProduct: '登录',
        faultLevel: 'P1',
      },
    });

    const mod = await import('../index.js');
    mod.initChat();
    await flushPromises();

    await mod.openAssistCheck();
    await flushPromises();

    const action = document.querySelector('#ai-action-content');
    action.insertAdjacentHTML('beforeend', `
      <div data-copy-source></div>
      <span data-tool-status="日志查询"></span>
    `);
    const copySource = action.querySelector('[data-copy-source]');
    copySource.innerText = 'copy me';

    const manualBtn = action.querySelector('[data-action="manual-check"]');
    manualBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(notifications.showNotification).toHaveBeenCalledWith('已发起手动排查：日志查询', 'info');

    const copyBtn = document.createElement('button');
    copyBtn.setAttribute('data-action', 'copy-collab');
    action.appendChild(copyBtn);
    copyBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('copy me');
  });

  it('opens ticket management and shows ticket detail modal', async () => {
    api.isApiEnabled.mockReturnValue(true);
    api.fetchTasks.mockResolvedValue({
      data: {
        items: [{ id: 't1', title: '工单A', description: '详情', customerId: 'cust', createdAt: '2025-01-01', status: '处理中', assigneeName: 'Alice', priority: 'high' }],
      },
    });

    const activeConv = document.createElement('div');
    activeConv.className = 'conversation-item is-active';
    activeConv.setAttribute('data-id', 'c1');
    document.body.appendChild(activeConv);

    const mod = await import('../index.js');
    await mod.openTicketManagementPanel();
    await flushPromises();

    const item = document.querySelector('.ticket-item');
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('#action-modal-overlay').classList.contains('hidden')).toBe(false);
  });
});
