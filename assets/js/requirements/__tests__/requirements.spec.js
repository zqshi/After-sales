import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../core/notifications.js', () => ({
  showNotification: vi.fn(),
}));

vi.mock('../../customer/index.js', () => ({
  openHistoryDetail: vi.fn(),
}));

const fetchRequirementData = vi.fn();
const fetchRequirementStatistics = vi.fn();
const createRequirement = vi.fn();
const ignoreRequirement = vi.fn();
const isApiEnabled = vi.fn();

vi.mock('../../api.js', () => ({
  fetchRequirementData: (...args) => fetchRequirementData(...args),
  fetchRequirementStatistics: (...args) => fetchRequirementStatistics(...args),
  createRequirement: (...args) => createRequirement(...args),
  ignoreRequirement: (...args) => ignoreRequirement(...args),
  isApiEnabled: () => isApiEnabled(),
}));

describe('requirements tab', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchRequirementData.mockReset();
    fetchRequirementStatistics.mockReset();
    createRequirement.mockReset();
    ignoreRequirement.mockReset();
    isApiEnabled.mockReset();
    document.body.innerHTML = `
      <div id="unprocessed-requirements-list"></div>
      <div id="processed-requirements-list"></div>
      <canvas id="requirementsChart"></canvas>
      <div id="req-total-count"></div>
      <div id="req-pending-count"></div>
      <div id="req-done-count"></div>
      <div id="req-uncreated-count"></div>
      <button id="requirements-refresh"></button>
      <button id="requirements-rescan"></button>
      <select id="requirement-status-filter"><option>全部状态</option></select>
      <div id="right-sidebar">
        <button data-click="history-detail" data-label="H-1"></button>
        <button data-click="tool" data-label="诊断"></button>
      </div>
      <div id="action-modal-overlay" class="hidden"></div>
      <div id="action-modal-title"></div>
      <div id="action-modal-body"></div>
      <button id="action-modal-primary"></button>
      <div class="conversation-item is-active" data-id="conv-1" data-customer-id="cust-1"></div>
      <div id="chat-messages">
        <div class="message-bubble">需要导出功能</div>
      </div>
    `;

    window.Chart = class {
      constructor() {}
      destroy() {}
    };
  });

  it('initializes and renders requirements with API payload', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchRequirementData.mockResolvedValue({
      items: [
        { id: 'R-1', description: '需要导出', status: 'pending', customerId: 'cust-1' },
      ],
    });
    fetchRequirementStatistics.mockResolvedValue({ total: 1 });

    const requirements = await import('../index.js');
    await requirements.initRequirementsTab();

    const processed = document.querySelector('#processed-requirements-list');
    expect(processed.textContent).toContain('R-1');
    const unprocessed = document.querySelector('#unprocessed-requirements-list');
    expect(unprocessed.textContent).toContain('暂无未创建卡片的需求');
  });

  it('handles create and ignore flows', async () => {
    const { showNotification } = await import('../../core/notifications.js');
    const requirements = await import('../index.js');

    isApiEnabled.mockReturnValue(false);
    await requirements.createRequirementFromList('内容');
    expect(showNotification).toHaveBeenCalled();

    isApiEnabled.mockReturnValue(true);
    createRequirement.mockResolvedValue({});
    fetchRequirementData.mockResolvedValue({ items: [] });
    fetchRequirementStatistics.mockResolvedValue({ total: 0 });
    await requirements.createRequirementFromList('内容');
    expect(createRequirement).toHaveBeenCalled();
    expect(fetchRequirementData).toHaveBeenCalled();

    ignoreRequirement.mockResolvedValue({});
    await requirements.ignoreUnprocessedRequirement('R-1');
    expect(ignoreRequirement).toHaveBeenCalledWith('R-1');
  });

  it('binds right panel actions and scans conversation', async () => {
    const { openHistoryDetail } = await import('../../customer/index.js');
    const requirements = await import('../index.js');

    requirements.initRightPanelActions();
    const historyBtn = document.querySelector('[data-click="history-detail"]');
    historyBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(openHistoryDetail).toHaveBeenCalledWith('H-1');

    isApiEnabled.mockReturnValue(true);
    fetchRequirementData.mockResolvedValue({ items: [] });
    fetchRequirementStatistics.mockResolvedValue({ total: 0 });
    requirements.scanConversationForRequirements();
    expect(fetchRequirementData).toHaveBeenCalled();
  });

  it('opens requirement card view', async () => {
    const requirements = await import('../index.js');
    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    requirements.viewRequirementCard('R-1');
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
