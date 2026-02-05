import { describe, it, expect, beforeEach, vi } from 'vitest';

const showNotification = vi.fn();
const addMessage = vi.fn();
const createRelatedTask = vi.fn();
const analyzeConversation = vi.fn();
const applySolution = vi.fn();
const isApiEnabled = vi.fn();

vi.mock('../../core/notifications.js', () => ({
  showNotification: (...args) => showNotification(...args),
}));

vi.mock('../../chat/index.js', () => ({
  addMessage: (...args) => addMessage(...args),
}));

vi.mock('../../tasks/index.js', () => ({
  createRelatedTask: (...args) => createRelatedTask(...args),
}));

vi.mock('../../api.js', () => ({
  analyzeConversation: (...args) => analyzeConversation(...args),
  applySolution: (...args) => applySolution(...args),
  isApiEnabled: () => isApiEnabled(),
}));

const setupDom = () => {
  document.body.innerHTML = `
    <button id="reanalyze-btn">重新分析</button>
    <div id="analysis-result"></div>
    <button class="apply-solution" data-solution="login-diagnosis" data-template="建议" >应用</button>
    <div class="conversation-item is-active" data-id="conv-1"></div>
  `;
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ai module', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDom();
    showNotification.mockReset();
    addMessage.mockReset();
    createRelatedTask.mockReset();
    analyzeConversation.mockReset();
    applySolution.mockReset();
    isApiEnabled.mockReset();
  });

  it('renders fallback when api disabled', async () => {
    isApiEnabled.mockReturnValue(false);
    const { initAiSolutions } = await import('../index.js');
    initAiSolutions();

    document.querySelector('#reanalyze-btn').click();
    await flushPromises();

    expect(document.querySelector('#analysis-result').textContent).toContain('暂无数据');
    expect(showNotification).toHaveBeenCalledWith('对话分析完成', 'success');
  });

  it('applies solution and creates task', async () => {
    isApiEnabled.mockReturnValue(true);
    analyzeConversation.mockResolvedValue({ data: { summary: 'OK', issues: ['a'] } });
    applySolution.mockResolvedValue({ data: { message: '回复', title: '任务', taskDraft: { title: '任务' } } });

    const { initAiSolutions } = await import('../index.js');
    initAiSolutions();

    document.querySelector('.apply-solution').click();
    await flushPromises();

    expect(addMessage).toHaveBeenCalled();
    expect(createRelatedTask).toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith('已应用解决方案', 'success');
  });
});
