import { describe, it, expect, beforeEach, vi } from 'vitest';

const showNotification = vi.fn();
const fetchMonitoringAlerts = vi.fn();
const resolveMonitoringAlert = vi.fn();
const isApiEnabled = vi.fn();

vi.mock('../../core/notifications.js', () => ({
  showNotification: (...args) => showNotification(...args),
}));

vi.mock('../../api.js', () => ({
  fetchMonitoringAlerts: (...args) => fetchMonitoringAlerts(...args),
  resolveMonitoringAlert: (...args) => resolveMonitoringAlert(...args),
  isApiEnabled: () => isApiEnabled(),
}));

const setupDom = () => {
  document.body.innerHTML = `
    <div id="tools-tab">
      <button data-click="tool" data-label="服务状态监控">服务状态监控</button>
      <button data-click="tool" data-label="运行登录诊断">运行登录诊断</button>
      <div>
        <input value="最近1小时" />
        <button data-click="tool" data-label="查询日志">查询日志</button>
      </div>
      <button data-click="tool" data-label="查看会话">查看会话</button>
    </div>
  `;
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('tools module', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDom();
    showNotification.mockReset();
    fetchMonitoringAlerts.mockReset();
    resolveMonitoringAlert.mockReset();
    isApiEnabled.mockReset();
  });

  it('opens service monitor and resolves alert', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchMonitoringAlerts.mockResolvedValue({
      data: [
        { id: 'a1', title: 'CPU 高', level: 'critical', source: 'system' },
      ],
    });

    const { initTools } = await import('../index.js');
    initTools();

    document.querySelector('[data-label="服务状态监控"]').click();
    await flushPromises();

    const modal = document.querySelector('.modal-overlay');
    expect(modal).toBeTruthy();
    const resolveBtn = modal.querySelector('[data-action="resolve"]');
    resolveMonitoringAlert.mockResolvedValue({});
    resolveBtn.click();
    await flushPromises();
    expect(resolveMonitoringAlert).toHaveBeenCalledWith('a1');
  });

  it('handles async tool actions with timers', async () => {
    isApiEnabled.mockReturnValue(false);
    const { initTools } = await import('../index.js');
    initTools();

    vi.useFakeTimers();

    document.querySelector('[data-label="运行登录诊断"]').click();
    vi.advanceTimersByTime(1500);
    expect(document.querySelector('.modal-overlay')?.textContent).toContain('诊断结果');

    document.querySelector('[data-label="查询日志"]').click();
    vi.advanceTimersByTime(800);
    expect(document.querySelector('.modal-overlay')?.textContent).toContain('系统日志');

    document.querySelector('[data-label="查看会话"]').click();
    vi.advanceTimersByTime(600);
    expect(document.querySelector('.modal-overlay')?.textContent).toContain('用户会话管理');

    vi.useRealTimers();
  });
});
