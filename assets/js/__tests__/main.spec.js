import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMockModule = (names) => {
  const api = {};
  names.forEach((name) => {
    api[name] = vi.fn();
  });
  return api;
};

vi.mock('../ui/layout.js', () => createMockModule(['initLayout', 'toggleRightSidebar', 'openFullAnalysisPanel', 'openAiAssistantPanel']));
vi.mock('../ui/dock.js', () => createMockModule(['initDockNavigation']));
vi.mock('../chat/index.js', () => createMockModule([
  'initChat',
  'sendMessage',
  'adoptSuggestion',
  'optimizeMessage',
  'insertText',
  'insertEmoji',
  'addToSuggestion',
  'submitSatisfaction',
  'toggleAiPlan',
  'openAiReplyPanel',
  'openAiSolutionPanel',
  'openAssistCheck',
  'openClarifyPanel',
  'openFaultReport',
  'openTicket',
  'openTicketManagementPanel',
  'openRequirementPanel',
]));
vi.mock('../knowledge/index.js', () => createMockModule([
  'initKnowledgeBase',
  'openKnowledgePreview',
  'toggleKnowledgePreviewExpand',
  'closeKnowledgePreview',
  'openKnowledgeSource',
]));
vi.mock('../knowledge/application.js', () => createMockModule(['initKnowledgeApplication']));
vi.mock('../requirements/index.js', () => createMockModule([
  'initRequirementsTab',
  'loadRequirementsData',
  'createRequirementFromList',
  'ignoreUnprocessedRequirement',
  'viewRequirementCard',
  'initRightPanelActions',
  'closeActionModal',
  'scanConversationForRequirements',
]));
vi.mock('../ai/index.js', () => createMockModule(['initAiSolutions', 'analyzeConversation']));
vi.mock('../tasks/index.js', () => createMockModule(['initAgentTasks', 'createRelatedTask', 'openAnalysisPanelClassic']));
vi.mock('../tools/index.js', () => createMockModule(['initTools']));
vi.mock('../reports/index.js', () => createMockModule(['initReports']));
vi.mock('../permissions/index.js', () => createMockModule(['initPermissionManager']));
vi.mock('../core/scroll.js', () => createMockModule(['scrollToBottom']));
vi.mock('../customer/index.js', () => createMockModule(['initCustomerProfile', 'updateCustomerContext', 'openHistoryDetail']));
vi.mock('../roles.js', () => createMockModule(['initRoleSwitcher']));
vi.mock('../application/container/bootstrap.js', () => ({ initializeContainer: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../application/eventHandlers/EventSubscriptionManager.js', () => {
  return { EventSubscriptionManager: class {
    initialize() {}
  } };
});

function setupDom() {
  document.body.innerHTML = `
    <div id="action-modal-overlay"></div>
    <button id="user-menu-toggle"></button>
    <div id="user-menu" class="hidden"></div>
    <button id="logout-button"></button>
  `;
}

beforeEach(() => {
  vi.resetModules();
  setupDom();
  const store = new Map();
  global.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  global.fetch = vi.fn();
  Object.defineProperty(window, 'location', {
    value: { href: 'http://localhost:3000/app.html' },
    writable: true,
  });
  Object.defineProperty(window, 'config', {
    value: { apiBaseUrl: 'http://api', authToken: 'token' },
    writable: true,
  });
});


describe('main', () => {
  it('redirects to login if no auth token', async () => {
    window.config.authToken = '';

    await import('../main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(window.location.href).toBe('index.html');
  });

  it('initializes app when auth ok', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'u1', role: 'admin' } }),
    });

    await import('../main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(localStorage.getItem('authUser')).toContain('u1');
    expect(window.config.userId).toBe('u1');
    expect(window.config.userRole).toBe('admin');
  });

  it('handles auth failure', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'bad' }),
    });

    await import('../main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(localStorage.getItem('authToken')).toBe(null);
  });

  it('user menu toggles and closes', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'u1', role: 'admin' } }),
    });

    await import('../main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const toggle = document.getElementById('user-menu-toggle');
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).not.toBe(null);
  });
});
