import { describe, it, expect, beforeEach, vi } from 'vitest';

const fetchProfile = vi.fn();
const fetchProfileInteractions = vi.fn();
const isApiEnabled = vi.fn();

vi.mock('../../api.js', () => ({
  fetchProfile: (...args) => fetchProfile(...args),
  fetchProfileInteractions: (...args) => fetchProfileInteractions(...args),
  isApiEnabled: () => isApiEnabled(),
}));

vi.mock('../../ui/layout.js', () => ({
  toggleRightSidebar: vi.fn(),
}));

const buildDom = () => {
  document.body.innerHTML = `
    <div id="customer-name"></div>
    <div id="customer-title"></div>
    <div id="customer-phone"></div>
    <div id="customer-email"></div>
    <div id="customer-wechat"></div>
    <div id="customer-sla"></div>
    <div id="customer-sla-status"></div>
    <div id="customer-expire"></div>
    <div id="customer-sla-duplicate"></div>
    <div id="customer-sla-status-duplicate"></div>
    <div id="customer-expire-duplicate"></div>
    <div id="customer-contract-amount"></div>
    <div id="customer-satisfaction"></div>
    <div id="customer-duration"></div>
    <div id="customer-focus"></div>
    <div id="customer-updated-at-secondary"></div>
    <div id="customer-expire-secondary"></div>
    <div id="customer-updated-at"></div>
    <div id="customer-tags"></div>
    <ul id="customer-products"></ul>
    <div id="customer-insights"></div>
    <div id="customer-interactions"></div>
    <div id="conversation-timeline"></div>
    <div id="commitment-summary"></div>
    <div id="commitment-alerts"></div>
    <div id="service-records"></div>
    <div id="contract-range"></div>
    <select id="interaction-range-filter"><option value="7d">7d</option><option value="all">all</option></select>
    <select id="interaction-type-filter"><option value="全部">全部</option><option value="回访">回访</option></select>
    <select id="service-status-filter"><option value="全部">全部</option><option value="已完成">已完成</option></select>
    <select id="service-commitment-filter"><option value="全部">全部</option></select>
    <div id="action-modal-overlay" class="hidden"></div>
    <div id="action-modal-title"></div>
    <div id="action-modal-body"></div>
    <button id="action-modal-primary"></button>
    <div id="chat-messages"><div data-history-label="L1"></div></div>
  `;
};

describe('customer profile', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchProfile.mockReset();
    fetchProfileInteractions.mockReset();
    isApiEnabled.mockReset();
    buildDom();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders empty profile on init', async () => {
    const customer = await import('../index.js');
    customer.initCustomerProfile();
    expect(document.querySelector('#customer-name').textContent).toBe('客户');
    expect(document.querySelector('#customer-interactions').textContent).toContain('当前筛选时间窗暂无互动');
  });

  it('loads profile data when API enabled', async () => {
    const payload = {
      name: 'Alice',
      company: 'Acme',
      tags: ['VIP'],
      updatedAt: '2025-01-01',
      contactInfo: { phone: '123', email: 'a@b.com', preferredChannel: 'wechat' },
      slaInfo: { serviceLevel: 'VIP' },
      riskLevel: '高',
      metrics: { satisfactionScore: 0.8, totalRevenue: 200, averageResolutionMinutes: 30 },
      insights: [{ title: '洞察', detail: '细节', source: 'AI' }],
      products: ['产品A'],
      interactions: [{ title: '回访', notes: '描述', occurredAt: '2025-01-01', type: '回访', window: '7d', channel: 'phone', status: '已解决' }],
      conversationHistory: [{ id: 'H-1', summary: '问题A', anchorLabel: 'L1', detail: '详情', time: '10:00' }],
      serviceRecords: [{ id: 'S1', title: '服务A', recordedAt: '2025-01-02', outcome: '已完成', description: '处理', actualHours: 2, ownerId: 'Agent', relatedConversations: ['H-1'], actions: ['动作1'] }],
      commitments: [{ id: 'C1', title: '承诺A', progress: 50, status: '进行中' }],
      contractRange: '2024-2025',
    };

    isApiEnabled.mockReturnValue(true);
    fetchProfile.mockResolvedValue({ data: payload });
    fetchProfileInteractions.mockResolvedValue({ data: { interactions: payload.interactions } });

    const customer = await import('../index.js');
    customer.initCustomerProfile();
    customer.updateCustomerContext('conv-1', 'cust-1');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector('#customer-name').textContent).toBe('Alice');
    expect(document.querySelector('#customer-tags').textContent).toContain('VIP');
    expect(document.querySelector('#customer-products').textContent).toContain('产品A');
    expect(document.querySelector('#customer-interactions').textContent).toContain('回访');
    expect(document.querySelector('#service-records').textContent).toContain('服务A');
    expect(document.querySelector('#commitment-summary').textContent).toContain('承诺A');
  });

  it('opens history detail modal', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchProfile.mockResolvedValue({
      data: {
        name: 'Alice',
        serviceRecords: [{ id: 'S1', title: '服务A', recordedAt: '2025-01-02', outcome: '已完成', description: '处理' }],
      },
    });
    fetchProfileInteractions.mockResolvedValue({ data: [] });

    const customer = await import('../index.js');
    customer.updateCustomerContext('conv-1', 'cust-1');
    await new Promise((resolve) => setTimeout(resolve, 0));

    customer.openHistoryDetail('S1');
    expect(document.querySelector('#action-modal-overlay').classList.contains('hidden')).toBe(false);
  });

  it('filters interactions by type', async () => {
    const customer = await import('../index.js');
    customer.initCustomerProfile();

    const typeFilter = document.querySelector('#interaction-type-filter');
    typeFilter.value = '回访';
    typeFilter.dispatchEvent(new Event('change'));
    expect(document.querySelector('#customer-interactions').textContent).toContain('当前筛选时间窗暂无互动');
  });

  it('formats metrics and satisfaction score correctly', async () => {
    const payload = {
      name: 'Bob',
      metrics: { satisfactionScore: 3.5, totalRevenue: 1200, averageResolutionMinutes: 45 },
      contactInfo: {},
      slaInfo: {},
      interactions: [],
    };
    isApiEnabled.mockReturnValue(true);
    fetchProfile.mockResolvedValue({ data: payload });
    fetchProfileInteractions.mockResolvedValue({ data: [] });

    const customer = await import('../index.js');
    customer.updateCustomerContext('conv-1', 'cust-2');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector('#customer-contract-amount').textContent).toBe('¥1200');
    expect(document.querySelector('#customer-satisfaction').textContent).toBe('3.5/5');
    expect(document.querySelector('#customer-duration').textContent).toBe('45分钟');
  });

  it('falls back to empty profile when api disabled', async () => {
    isApiEnabled.mockReturnValue(false);
    const customer = await import('../index.js');
    customer.updateCustomerContext('conv-1', 'cust-3');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchProfile).not.toHaveBeenCalled();
    expect(document.querySelector('#customer-name').textContent).toBe('客户');
  });

  it('maps interactions from list/items response', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchProfile.mockResolvedValue({ data: { name: 'Alice', interactions: [] } });
    fetchProfileInteractions.mockResolvedValue({
      data: {
        items: [
          { title: '回访', interactionType: '回访', occurredAt: '2025-01-01', status: '已解决' },
        ],
      },
    });

    const customer = await import('../index.js');
    customer.updateCustomerContext('conv-1', 'cust-4');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector('#customer-interactions').textContent).toContain('回访');
    expect(document.querySelector('#customer-interactions').textContent).toContain('已解决');
  });

  it('resets to empty profile when customerId missing', async () => {
    const customer = await import('../index.js');
    customer.updateCustomerContext('conv-1', null);
    expect(document.querySelector('#customer-name').textContent).toBe('客户');
  });

  it('filters service records by status', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchProfile.mockResolvedValue({
      data: {
        name: 'Alice',
        serviceRecords: [
          { id: 'S1', title: '服务A', recordedAt: '2025-01-02', outcome: '已解决', description: '处理' },
          { id: 'S2', title: '服务B', recordedAt: '2025-01-03', outcome: '进行中', description: '处理中' },
        ],
        commitments: [],
      },
    });
    fetchProfileInteractions.mockResolvedValue({ data: [] });

    const customer = await import('../index.js');
    customer.updateCustomerContext('conv-1', 'cust-1');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const statusFilter = document.querySelector('#service-status-filter');
    statusFilter.value = '已完成';
    statusFilter.dispatchEvent(new Event('change'));
    expect(document.querySelector('#service-records').textContent).toContain('服务A');
  });
});
