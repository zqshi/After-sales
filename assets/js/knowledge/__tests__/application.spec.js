import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { initKnowledgeApplication } from '../application.js';

const showNotification = vi.fn();
const fetchKnowledge = vi.fn();
const fetchKnowledgeFull = vi.fn();
const isApiEnabled = vi.fn();
const searchKnowledge = vi.fn();

vi.mock('../../core/notifications.js', () => ({
  showNotification: (...args) => showNotification(...args),
}));

vi.mock('../../api.js', () => ({
  fetchKnowledge: (...args) => fetchKnowledge(...args),
  fetchKnowledgeFull: (...args) => fetchKnowledgeFull(...args),
  isApiEnabled: () => isApiEnabled(),
  searchKnowledge: (...args) => searchKnowledge(...args),
}));

const setupDom = () => {
  document.body.innerHTML = `
    <section id="knowledge-application">
      <div class="knowledge-app-header"></div>
      <div id="knowledge-app-shortcuts">
        <button class="knowledge-shortcut-btn" data-keyword="登录">登录</button>
      </div>
      <div id="knowledge-app-tips"></div>
      <input id="knowledge-app-search-input" />
      <button id="knowledge-app-search-btn"></button>
      <button id="knowledge-app-clear-input" class="hidden">clear</button>
      <div id="knowledge-app-results">
        <div class="knowledge-app-layout is-compact"></div>
      </div>
      <div id="knowledge-app-list"></div>
      <div id="knowledge-app-count"></div>
      <div id="knowledge-app-empty" class="hidden"></div>
      <div id="knowledge-app-detail" class="hidden"></div>
      <div id="knowledge-app-detail-title"></div>
      <div id="knowledge-app-detail-category"></div>
      <div id="knowledge-app-detail-updated"></div>
      <div id="knowledge-app-detail-summary"></div>
      <div id="knowledge-app-detail-content"></div>
      <div id="knowledge-app-detail-tags"></div>
      <button id="knowledge-app-detail-copy">复制内容</button>
    </section>
  `;
};

const sampleItem = (overrides = {}) => ({
  id: 'k1',
  title: '登录失败排查',
  category: '账号',
  summary: '排查步骤',
  content: '内容详情',
  tags: ['登录', '排查'],
  updatedAt: '2024-01-01',
  ...overrides,
});

describe('knowledge application', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDom();
    showNotification.mockReset();
    fetchKnowledge.mockReset();
    fetchKnowledgeFull.mockReset();
    isApiEnabled.mockReset();
    searchKnowledge.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(true),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders empty state when query cleared', async () => {
    initKnowledgeApplication();
    const input = document.querySelector('#knowledge-app-search-input');
    const clearBtn = document.querySelector('#knowledge-app-clear-input');

    input.value = '登录';
    input.dispatchEvent(new Event('input'));
    expect(clearBtn.classList.contains('hidden')).toBe(false);

    clearBtn.click();
    await vi.runAllTimersAsync();

    expect(document.querySelector('#knowledge-app-count').textContent).toContain('找到 0 条相关内容');
    expect(document.querySelector('#knowledge-app-results').classList.contains('hidden')).toBe(true);
  });

  it('warns when api is disabled', async () => {
    initKnowledgeApplication();
    isApiEnabled.mockReturnValue(false);
    const input = document.querySelector('#knowledge-app-search-input');
    input.value = '登录';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await vi.runAllTimersAsync();

    expect(showNotification).toHaveBeenCalledWith('知识检索需要先配置 API', 'warning');
  });

  it('renders merged results and detail panel', async () => {
    initKnowledgeApplication();
    isApiEnabled.mockReturnValue(true);

    searchKnowledge.mockResolvedValueOnce({ data: [sampleItem({ id: 'k1', content: '', summary: '' })] });
    fetchKnowledge.mockResolvedValueOnce({ data: [sampleItem({ id: 'k2', title: '登录问题', summary: '列表摘要', content: '' })] });
    searchKnowledge.mockResolvedValueOnce({ data: [sampleItem({ id: 'k1', title: '登录失败排查', content: '详情内容', summary: '摘要' })] });
    fetchKnowledgeFull.mockResolvedValueOnce({ data: sampleItem({ id: 'k2', title: '登录问题', content: '完整内容', summary: '完整摘要' }) });

    const input = document.querySelector('#knowledge-app-search-input');
    input.value = '登录';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    await vi.runAllTimersAsync();

    const list = document.querySelector('#knowledge-app-list');
    expect(list.textContent).toContain('登录失败排查');

    const detailBtn = list.querySelector('[data-knowledge-detail]');
    detailBtn.click();
    await Promise.resolve();

    expect(document.querySelector('#knowledge-app-detail').classList.contains('hidden')).toBe(false);
    expect(document.querySelector('#knowledge-app-detail-title').textContent).toBe('登录失败排查');
    expect(document.querySelector('#knowledge-app-detail-content').textContent).toContain('详情内容');

    const copyBtn = document.querySelector('#knowledge-app-detail-copy');
    copyBtn.click();
    await Promise.resolve();
    expect(copyBtn).not.toBeNull();
  });

  it('shows empty state when search returns no usable results', async () => {
    initKnowledgeApplication();
    isApiEnabled.mockReturnValue(true);
    searchKnowledge.mockResolvedValueOnce({ data: [] });
    fetchKnowledge.mockResolvedValueOnce({ data: [] });
    searchKnowledge.mockResolvedValueOnce({ data: [] });

    const input = document.querySelector('#knowledge-app-search-input');
    input.value = '账号';
    input.dispatchEvent(new Event('input'));
    document.querySelector('#knowledge-app-search-btn').click();

    await vi.runAllTimersAsync();

    const emptyState = document.querySelector('#knowledge-app-empty');
    expect(emptyState.textContent).toContain('暂无可用知识内容');
    expect(showNotification).not.toHaveBeenCalledWith('知识检索失败，请稍后再试', 'error');
  });

  it('keeps latest search results when multiple queries overlap', async () => {
    initKnowledgeApplication();
    isApiEnabled.mockReturnValue(true);

    let firstResolve;
    let secondResolve;

    searchKnowledge
      .mockImplementationOnce(() => new Promise((resolve) => {
        firstResolve = resolve;
      }))
      .mockImplementationOnce(() => new Promise((resolve) => {
        secondResolve = resolve;
      }))
      .mockImplementationOnce(() => Promise.resolve({ data: [sampleItem({ id: 'k9', title: '最新', content: '内容' })] }))
      .mockImplementationOnce(() => Promise.resolve({ data: [sampleItem({ id: 'k9', title: '最新', content: '内容' })] }));

    fetchKnowledge
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          setTimeout(() => resolve({ data: [sampleItem({ id: 'k-old', title: '旧结果', content: '' })] }), 10);
        }),
      )
      .mockImplementationOnce(() => Promise.resolve({ data: [sampleItem({ id: 'k-new', title: '新结果', content: '' })] }));

    const input = document.querySelector('#knowledge-app-search-input');
    input.value = '登录';
    input.dispatchEvent(new Event('input'));
    document.querySelector('#knowledge-app-search-btn').click();

    input.value = '账号';
    document.querySelector('#knowledge-app-search-btn').click();

    firstResolve({ data: [sampleItem({ id: 'k-old', title: '旧结果', content: '' })] });
    secondResolve({ data: [sampleItem({ id: 'k-new', title: '新结果', content: '' })] });

    await vi.runAllTimersAsync();

    const list = document.querySelector('#knowledge-app-list');
    expect(list.textContent).toContain('新结果');
  });
});
