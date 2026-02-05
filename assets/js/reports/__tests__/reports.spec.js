import { describe, it, expect, beforeEach, vi } from 'vitest';

const fetchAuditSummary = vi.fn();
const isApiEnabled = vi.fn();

vi.mock('../../api.js', () => ({
  fetchAuditSummary: (...args) => fetchAuditSummary(...args),
  isApiEnabled: () => isApiEnabled(),
}));

const setupDom = () => {
  document.body.innerHTML = `
    <canvas id="reportsChart"></canvas>
    <div data-report-field="totalConversations"></div>
    <div data-report-field="activeConversations"></div>
    <div data-report-field="ticketsCreated"></div>
    <div data-report-field="avgFirstResponse"></div>
    <div data-report-field="firstResponseSlaRate"></div>
    <div data-report-field="updateSyncRate"></div>
    <div data-report-field="resolutionRate"></div>
    <div data-report-field="satisfactionScore"></div>
    <div data-report-field="violationCount"></div>
    <div data-report-field="ticketsResolved"></div>
    <div data-report-field="avgTicketHandleTime"></div>
    <div data-report-field="escalationComplianceRate"></div>
  `;
};

describe('reports', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDom();
    fetchAuditSummary.mockReset();
    isApiEnabled.mockReset();
    window.Chart = class {
      constructor(_ctx, config) {
        this.config = config;
        return this;
      }
    };
  });

  it('renders empty state when api disabled', async () => {
    isApiEnabled.mockReturnValue(false);
    const { initReports } = await import('../index.js');
    await initReports();

    expect(document.querySelector('[data-report-field="totalConversations"]').textContent).toBe('--');
  });

  it('renders report summary and chart data', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchAuditSummary.mockResolvedValue({
      data: {
        report: {
          totalConversations: 12,
          activeConversations: 4,
          ticketsCreated: 3,
          avgFirstResponseMinutes: 2.5,
          firstResponseSlaRate: 0.9,
          updateSyncRate: 80,
          resolutionRate: 0.75,
          satisfactionScore: 4.6,
          violationCount: 1,
          ticketsResolved: 2,
          avgTicketHandleMinutes: 10,
          escalationComplianceRate: 0.5,
          trend: {
            labels: ['01-01', '01-02'],
            conversationCounts: [5, 7],
            firstResponseMinutes: [2, 3],
          },
        },
      },
    });

    const { initReports } = await import('../index.js');
    const chart = await initReports();
    expect(fetchAuditSummary).toHaveBeenCalled();
    expect(chart.config.type).toBe('line');
    expect(document.querySelector('[data-report-field="totalConversations"]').textContent).toContain('12');
  });
});
