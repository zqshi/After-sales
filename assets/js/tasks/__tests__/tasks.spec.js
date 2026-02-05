import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const showNotification = vi.fn();
const toggleRightSidebar = vi.fn();
const isApiEnabled = vi.fn();
const fetchTasks = vi.fn();
const actionTask = vi.fn();
const fetchQualityProfile = vi.fn();

const listTasks = vi.fn();
const createTask = vi.fn();
const getTask = vi.fn();

vi.mock('../../core/notifications.js', () => ({
  showNotification: (...args) => showNotification(...args),
}));

vi.mock('../../ui/layout.js', () => ({
  toggleRightSidebar: (...args) => toggleRightSidebar(...args),
}));

vi.mock('../../api.js', () => ({
  isApiEnabled: () => isApiEnabled(),
  fetchTasks: (...args) => fetchTasks(...args),
  actionTask: (...args) => actionTask(...args),
  fetchQualityProfile: (...args) => fetchQualityProfile(...args),
}));

vi.mock('../../presentation/task/TaskController.js', () => ({
  taskController: {
    listTasks: (...args) => listTasks(...args),
    createTask: (...args) => createTask(...args),
    getTask: (...args) => getTask(...args),
  },
}));

const add = (tag, id, parent = document.body) => {
  const el = document.createElement(tag);
  if (id) {
    el.id = id;
  }
  parent.appendChild(el);
  return el;
};

const setupDom = () => {
  document.body.innerHTML = '';
  add('div', 'tasks-list');
  const form = add('div', 'new-task-form');
  form.classList.add('hidden');
  add('button', 'new-task-btn');
  add('button', 'cancel-task-btn');
  add('button', 'save-task-btn');
  add('input', 'task-name');
  add('input', 'task-description');
  const priority = add('select', 'task-priority');
  priority.innerHTML = '<option value="medium">medium</option><option value="high">high</option>';
  const agent = add('select', 'task-agent');
  agent.innerHTML = '<option value="primary">primary</option><option value="backup">backup</option>';

  add('div', 'task-editor-panel');
  add('div', 'task-detail-wrapper');
  add('button', 'open-task-editor');
  add('button', 'close-task-editor');
  add('input', 'custom-task-title');
  add('textarea', 'custom-task-desc');
  const customPriority = add('select', 'custom-task-priority');
  customPriority.innerHTML = '<option value="medium">medium</option><option value="high">high</option>';
  add('input', 'custom-task-owner');
  add('button', 'save-custom-task');

  add('input', 'layout-command-input');
  add('div', 'layout-preview');
  add('div', 'layout-style-label');
  add('button', 'apply-layout-btn');
  const layoutChip = document.createElement('button');
  layoutChip.className = 'command-chip';
  layoutChip.dataset.layout = 'board';
  document.body.appendChild(layoutChip);

  add('button', 'sidebar-create-task');
  add('div', 'sidebar-tasks-list');

  add('input', 'task-command-input');
  add('button', 'task-command-btn');
  add('div', 'task-command-log');
  const cmdChip = document.createElement('button');
  cmdChip.className = 'command-chip';
  cmdChip.setAttribute('data-command', '检查日志');
  document.body.appendChild(cmdChip);

  add('div', 'workspace-tasks-tab');
  add('div', 'task-quality-overview');
  const conversationArea = add('div', 'task-conversation-area');
  conversationArea.classList.add('hidden');
  add('div', 'task-agent-log');
  add('input', 'task-agent-command-input');
  add('button', 'task-agent-send');
  const agentChip = document.createElement('button');
  agentChip.className = 'task-agent-chip';
  agentChip.setAttribute('data-command', '生成回访任务');
  document.body.appendChild(agentChip);
  add('button', 'back-to-quality');
  const startBtn = add('button', 'start-task-conversation');
  startBtn.textContent = '对话驱动任务';

  const qcBtn = document.createElement('button');
  qcBtn.setAttribute('data-open-qc', '');
  qcBtn.setAttribute('data-conv-id', 'conv-1');
  document.body.appendChild(qcBtn);

  const activeConv = document.createElement('div');
  activeConv.className = 'conversation-item is-active';
  activeConv.setAttribute('data-id', 'conv-1');
  document.body.appendChild(activeConv);

  add('div', 'right-sidebar');
  add('div', 'qc-lean-container');
  add('div', 'analysis-classic');
  add('div', 'rail-card-metrics');
  add('div', 'rail-card-history');

  // analysis / qc content ids
  [
    'analysis-case-title',
    'analysis-case-summary',
    'analysis-urgency-chip',
    'analysis-sla-chip',
    'analysis-impact-chip',
    'analysis-metric-urgency',
    'analysis-metric-emotion',
    'analysis-metric-eta',
    'tm-urgency',
    'tm-response',
    'tm-emotion',
    'analysis-tip',
    'qc-updated-at',
    'rail-emotion-value',
    'rail-quality-value',
    'rail-satisfaction-value',
    'qc-title',
    'qc-urgency',
    'qc-channel',
    'qc-time',
    'qc-summary',
    'qc-tags',
    'qc-thread-title',
    'qc-thread',
    'qc-insights-list',
    'qc-action-tip',
    'qc-emotion-score',
    'qc-quality-score',
    'qc-satisfaction-score',
    'qc-emotion-score-compact',
    'qc-quality-score-compact',
    'qc-satisfaction-score-compact',
    'qc-emotion-label',
    'qc-quality-label',
    'qc-satisfaction-label',
    'qc-emotion-label-compact',
    'qc-quality-label-compact',
    'qc-satisfaction-label-compact',
    'qc-emotion-bar',
    'qc-quality-bar',
    'qc-satisfaction-bar',
    'qc-emotion-bar-compact',
    'qc-quality-bar-compact',
    'qc-satisfaction-bar-compact',
  ].forEach((id) => add('div', id));
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('tasks module', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDom();
    showNotification.mockReset();
    toggleRightSidebar.mockReset();
    isApiEnabled.mockReset();
    fetchTasks.mockReset();
    actionTask.mockReset();
    fetchQualityProfile.mockReset();
    listTasks.mockReset();
    createTask.mockReset();
    getTask.mockReset();
    window.config = { userId: 'user-1' };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a task and executes it with progress', async () => {
    isApiEnabled.mockReturnValue(true);
    listTasks.mockResolvedValue({ items: [] });
    actionTask.mockResolvedValue({});

    const { initAgentTasks } = await import('../index.js');
    initAgentTasks();

    document.querySelector('#new-task-btn').click();
    document.querySelector('#task-name').value = '修复登录';
    document.querySelector('#task-description').value = '排查错误日志';
    document.querySelector('#save-task-btn').click();

    const list = document.querySelector('#tasks-list');
    expect(list.textContent).toContain('修复登录');

    const executeBtn = list.querySelector('.execute-task');
    expect(executeBtn).toBeTruthy();

    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1);
    executeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(actionTask).toHaveBeenCalled();

    for (let i = 0; i < 6; i += 1) {
      vi.advanceTimersByTime(800);
    }

    expect(list.textContent).toContain('已完成');
    randomSpy.mockRestore();
  });

  it('creates custom task and adds sidebar item when API disabled', async () => {
    isApiEnabled.mockReturnValue(false);
    listTasks.mockResolvedValue({ items: [] });

    const { initAgentTasks } = await import('../index.js');
    initAgentTasks();

    document.querySelector('#open-task-editor').click();
    document.querySelector('#custom-task-title').value = '自定义任务';
    document.querySelector('#custom-task-desc').value = '处理客户回访';
    document.querySelector('#custom-task-owner').value = 'Alice';
    document.querySelector('#save-custom-task').click();

    expect(document.querySelector('#sidebar-tasks-list').textContent).toContain('自定义任务');
    expect(showNotification).toHaveBeenCalled();
  });

  it('handles command console and task conversation flow', async () => {
    isApiEnabled.mockReturnValue(true);
    listTasks.mockResolvedValue({ items: [] });
    createTask.mockResolvedValue({ data: { id: 'task-1' } });

    fetchQualityProfile.mockResolvedValue({
      data: {
        title: '质检',
        summary: '摘要',
        urgency: '高紧急',
        urgencyClass: 'chip-urgent',
        sla: 'VIP',
        impact: '高',
        metrics: { urgency: '高', eta: '30m' },
        dimensions: {
          emotion: { score: 80, label: '积极', bar: 80 },
          quality: { score: 90, label: '优秀', bar: 90 },
          satisfaction: { score: 85, label: '满意', bar: 85 },
        },
        tags: ['重要'],
        threadTitle: '对话',
        thread: [{ role: '客户', text: '你好' }],
        insights: ['跟进'],
        tip: '注意回访',
        time: '刚刚',
        channel: 'chat',
        tone: 'urgent',
      },
    });

    const { initAgentTasks } = await import('../index.js');
    initAgentTasks();
    await flushPromises();

    document.querySelector('#task-command-input').value = '检查日志';
    document.querySelector('#task-command-btn').click();
    expect(document.querySelector('#task-command-log').textContent).toContain('已派发');

    document.querySelector('#task-agent-command-input').value = '创建任务';
    document.querySelector('#task-agent-send').click();
    await flushPromises();

    const log = document.querySelector('#task-agent-log');
    expect(log.textContent).toContain('已创建任务');

    const qcBtn = document.querySelector('[data-open-qc]');
    qcBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(document.querySelector('#analysis-case-title').textContent).toContain('质检');
  });

  it('adds tasks with priority/agent labels and action buttons', async () => {
    const { addTaskToList } = await import('../index.js');
    addTaskToList('t1', '任务A', '描述A', 'high', 'backup', 'pending');
    addTaskToList('t2', '任务B', '描述B', 'low', 'specialist', 'completed');

    const list = document.querySelector('#tasks-list');
    expect(list.textContent).toContain('任务A');
    expect(list.textContent).toContain('优先级: 高 | 执行Agent: 备用Agent');
    expect(list.querySelector('[data-task-id="t1"].execute-task')).toBeTruthy();

    expect(list.textContent).toContain('任务B');
    expect(list.textContent).toContain('优先级: 低 | 执行Agent: 专家Agent');
    expect(list.querySelector('[data-task-id="t2"].view-task')).toBeTruthy();
  });

  it('opens classic analysis panel and toggles sidebar', async () => {
    const { openAnalysisPanelClassic } = await import('../index.js');
    const sidebar = document.querySelector('#right-sidebar');

    openAnalysisPanelClassic();

    expect(sidebar.classList.contains('analysis-restricted')).toBe(true);
    expect(toggleRightSidebar).toHaveBeenCalledWith(true);
  });

  it('creates related task via API and renders list', async () => {
    isApiEnabled.mockReturnValue(true);
    createTask.mockResolvedValue({ data: { id: 'task-99', title: '自动任务', priority: 'high', owner: 'primary', status: 'completed' } });
    listTasks.mockResolvedValue({ items: [] });

    const { initAgentTasks, createRelatedTask } = await import('../index.js');
    initAgentTasks();
    await flushPromises();

    await createRelatedTask('login-diagnosis', '登录问题跟进');
    await flushPromises();

    const list = document.querySelector('#tasks-list');
    expect(list.textContent).toContain('自动任务');
  });

  it('shows task detail warnings on missing or error', async () => {
    isApiEnabled.mockReturnValue(true);
    listTasks.mockResolvedValue({ items: [] });
    getTask.mockResolvedValue(null);

    const { initAgentTasks, addTaskToList } = await import('../index.js');
    initAgentTasks();
    await flushPromises();

    addTaskToList('t1', '任务A', '描述', 'medium', 'primary', 'completed');

    const viewBtn = document.querySelector('.view-task');
    if (viewBtn) {
      viewBtn.click();
    }
    await flushPromises();
    expect(showNotification.mock.calls.some((call) => call[0].includes('未找到任务') && call[1] === 'warning')).toBe(true);

    getTask.mockRejectedValue(new Error('fail'));
    if (viewBtn) {
      viewBtn.click();
    }
    await flushPromises();
    expect(showNotification).toHaveBeenCalledWith('任务详情加载失败，请稍后重试', 'error');
  });
});
