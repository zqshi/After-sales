import { describe, it, expect, beforeEach, vi } from 'vitest';

const showNotification = vi.fn();
const createKnowledgeItem = vi.fn();
const deleteKnowledgeItem = vi.fn();
const fetchKnowledge = vi.fn();
const fetchKnowledgeProgress = vi.fn();
const isApiEnabled = vi.fn();
const fetchCurrentUser = vi.fn();
const retryKnowledgeUpload = vi.fn();
const syncKnowledgeItem = vi.fn();
const updateKnowledgeItem = vi.fn();
const uploadKnowledgeDocument = vi.fn();

vi.mock('../../core/notifications.js', () => ({
  showNotification: (...args) => showNotification(...args),
}));

vi.mock('../../api.js', () => ({
  createKnowledgeItem: (...args) => createKnowledgeItem(...args),
  deleteKnowledgeItem: (...args) => deleteKnowledgeItem(...args),
  fetchKnowledge: (...args) => fetchKnowledge(...args),
  fetchKnowledgeProgress: (...args) => fetchKnowledgeProgress(...args),
  isApiEnabled: () => isApiEnabled(),
  fetchCurrentUser: (...args) => fetchCurrentUser(...args),
  retryKnowledgeUpload: (...args) => retryKnowledgeUpload(...args),
  syncKnowledgeItem: (...args) => syncKnowledgeItem(...args),
  updateKnowledgeItem: (...args) => updateKnowledgeItem(...args),
  uploadKnowledgeDocument: (...args) => uploadKnowledgeDocument(...args),
}));

const setupDom = () => {
  document.body.innerHTML = `
    <input id="knowledge-tree-search" />
    <input id="knowledge-doc-search" />
    <button id="knowledge-add-btn"></button>
    <button id="knowledge-empty-add"></button>
    <button id="knowledge-tab-doc"></button>
    <button id="knowledge-tab-faq"></button>
    <input id="knowledge-faq-search" />
    <select id="knowledge-doc-status"><option value="">全部</option><option value="active">active</option></select>
    <select id="knowledge-doc-sort"><option value="updated_desc">updated_desc</option><option value="title_asc">title_asc</option></select>
    <button id="knowledge-faq-add-btn"></button>
    <button id="knowledge-faq-empty-add"></button>
    <input id="knowledge-add-files" type="file" />
    <button id="knowledge-add-submit"></button>
    <button id="knowledge-add-cancel"></button>
    <button id="knowledge-add-close"></button>
    <select id="knowledge-add-category"></select>
    <input id="knowledge-add-title" />
    <div id="knowledge-add-dropzone"></div>
    <input id="knowledge-faq-mining-toggle" type="checkbox" />
    <div id="knowledge-faq-mining-settings"></div>
    <input id="knowledge-faq-mining-count" value="3" />
    <button id="knowledge-detail-close"></button>
    <button id="knowledge-detail-dismiss"></button>
    <button id="knowledge-delete-cancel"></button>
    <button id="knowledge-delete-confirm"></button>
    <button id="knowledge-faq-close"></button>
    <button id="knowledge-faq-cancel"></button>
    <button id="knowledge-faq-save"></button>
    <button id="knowledge-faq-detect"></button>
    <button id="knowledge-faq-similar-add"></button>
    <button id="knowledge-faq-similar-generate"></button>
    <button id="knowledge-faq-delete-cancel"></button>
    <button id="knowledge-faq-delete-confirm"></button>

    <div id="knowledge-tree"></div>
    <div id="knowledge-breadcrumb"></div>
    <div id="knowledge-doc-list"></div>
    <div id="knowledge-faq-list"></div>

    <div id="knowledge-doc-panel"></div>
    <div id="knowledge-empty-state" class="hidden"></div>
    <div id="knowledge-faq-panel"></div>
    <div id="knowledge-faq-empty-state" class="hidden"></div>

    <div id="knowledge-doc-section"></div>
    <div id="knowledge-faq-section" class="hidden"></div>
    <div id="knowledge-doc-search-wrap"></div>
    <div id="knowledge-doc-status-wrap"></div>
    <div id="knowledge-doc-sort-wrap"></div>
    <div id="knowledge-faq-search-wrap"></div>
    <div id="knowledge-doc-add-btn"></div>
    <div id="knowledge-faq-add-btn"></div>
    <div id="knowledge-taxonomy-panel"></div>

    <div id="knowledge-detail-modal" class="hidden"></div>
    <div id="knowledge-add-modal" class="hidden"></div>
    <div id="knowledge-delete-modal" class="hidden"></div>
    <div id="knowledge-faq-modal" class="hidden"></div>
    <div id="knowledge-faq-delete-modal" class="hidden"></div>

    <div id="knowledge-detail-title"></div>
    <div id="knowledge-detail-status"></div>
    <div id="knowledge-detail-id"></div>
    <div id="knowledge-detail-upload-id"></div>
    <div id="knowledge-detail-progress"></div>
    <div id="knowledge-detail-category"></div>
    <div id="knowledge-detail-tags"></div>
    <div id="knowledge-detail-owner"></div>
    <div id="knowledge-detail-source"></div>
    <div id="knowledge-detail-created"></div>
    <div id="knowledge-detail-updated"></div>
    <div id="knowledge-detail-summary"></div>
    <div id="knowledge-detail-content"></div>
    <div id="knowledge-detail-faq-list"></div>
    <div id="knowledge-detail-faq-empty" class="hidden"></div>
    <div id="knowledge-detail-faq-count"></div>

    <div id="knowledge-delete-message"></div>
    <input id="knowledge-delete-related-faq" type="checkbox" />

    <div id="knowledge-faq-modal-title"></div>
    <select id="knowledge-faq-status"><option value="active">active</option></select>
    <div id="knowledge-faq-status-wrap"></div>
    <input id="knowledge-faq-question" />
    <textarea id="knowledge-faq-answer"></textarea>
    <div id="knowledge-faq-error" class="hidden"></div>
    <div id="knowledge-faq-detect-results" class="hidden"></div>
    <div id="knowledge-faq-source-list"></div>
    <div id="knowledge-faq-similar-list"></div>
    <input id="knowledge-faq-similar-input" />
    <div id="knowledge-faq-delete-message"></div>
  `;
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('knowledge base', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDom();
    showNotification.mockReset();
    createKnowledgeItem.mockReset();
    deleteKnowledgeItem.mockReset();
    fetchKnowledge.mockReset();
    fetchKnowledgeProgress.mockReset();
    isApiEnabled.mockReset();
    fetchCurrentUser.mockReset();
    retryKnowledgeUpload.mockReset();
    syncKnowledgeItem.mockReset();
    updateKnowledgeItem.mockReset();
    uploadKnowledgeDocument.mockReset();
  });

  it('renders default state when API disabled', async () => {
    isApiEnabled.mockReturnValue(false);

    const { initKnowledgeBase } = await import('../index.js');
    initKnowledgeBase();
    await flushPromises();

    expect(showNotification).toHaveBeenCalledWith('知识库 API 未配置', 'warning');
    expect(document.querySelector('#knowledge-empty-state').classList.contains('hidden')).toBe(false);
    expect(document.querySelector('#knowledge-breadcrumb').textContent).toContain('全部分类');
    expect(document.querySelector('#knowledge-add-category').textContent).toContain('默认分类');
  });

  it('loads data, shows lists, and handles doc delete', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchCurrentUser.mockResolvedValue({ data: { name: 'Tester' } });
    fetchKnowledge.mockResolvedValue({
      items: [
        {
          id: 'config-1',
          title: 'Knowledge Taxonomy Config',
          metadata: {
            type: 'category-config',
            taxonomy: [
              { id: 'cat-1', name: '产品', children: [{ id: 'cat-2', name: '安装', children: [] }] },
            ],
          },
        },
        {
          id: 'doc-1',
          title: '安装指南',
          content: '内容',
          tags: ['安装'],
          metadata: { taxonomyPath: '产品 / 安装', status: 'active', owner: 'Tester', source: 'manual', aiSummaryAt: 't', aiTagsAt: 't', taxkbSyncedAt: 't' },
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        },
        {
          id: 'faq-1',
          title: '如何安装',
          content: '步骤',
          category: 'faq',
          metadata: { status: 'active', sourceDocIds: ['doc-1'] },
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        },
      ],
    });

    const { initKnowledgeBase } = await import('../index.js');
    initKnowledgeBase();
    await flushPromises();
    await flushPromises();

    const docList = document.querySelector('#knowledge-doc-list');
    expect(docList.textContent).toContain('安装指南');
    const faqList = document.querySelector('#knowledge-faq-list');
    expect(faqList.textContent).toContain('如何安装');

    const viewBtn = docList.querySelector('[data-doc-action="view"]');
    viewBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('#knowledge-detail-modal').classList.contains('hidden')).toBe(false);

    const deleteBtn = docList.querySelector('[data-doc-action="delete"]');
    deleteBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('#knowledge-delete-modal').classList.contains('hidden')).toBe(false);

    deleteKnowledgeItem.mockResolvedValue({});
    document.querySelector('#knowledge-delete-related-faq').checked = true;
    document.querySelector('#knowledge-delete-confirm').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(deleteKnowledgeItem).toHaveBeenCalledWith('doc-1', { deleteRelatedFaq: true });
  });

  it('handles FAQ modal interactions and save', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchKnowledge.mockResolvedValue({
      items: [
        {
          id: 'doc-1',
          title: '安装指南',
          content: '内容',
          metadata: { taxonomyPath: '产品 / 安装', status: 'active', aiSummaryAt: 't', aiTagsAt: 't', taxkbSyncedAt: 't' },
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        },
      ],
    });

    const { initKnowledgeBase } = await import('../index.js');
    initKnowledgeBase();
    await flushPromises();
    await flushPromises();

    document.querySelector('#knowledge-faq-add-btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('#knowledge-faq-modal').classList.contains('hidden')).toBe(false);

    const question = document.querySelector('#knowledge-faq-question');
    const answer = document.querySelector('#knowledge-faq-answer');
    question.value = '如何安装';
    answer.value = '步骤说明';

    document.querySelector('#knowledge-faq-detect').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const detectList = document.querySelector('#knowledge-faq-detect-results');
    expect(detectList.classList.contains('hidden')).toBe(false);

    const addBtn = detectList.querySelector('[data-similar-add]');
    addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('#knowledge-faq-similar-list').textContent).toContain('如何安装');

    const sourceCheckbox = document.querySelector('#knowledge-faq-source-list input[type="checkbox"]');
    expect(sourceCheckbox).toBeTruthy();
    sourceCheckbox.checked = true;

    createKnowledgeItem.mockResolvedValue({
      id: 'faq-2',
      title: question.value,
      content: answer.value,
      category: 'faq',
      metadata: { status: 'active', sourceDocIds: ['doc-1'], similarQuestions: [] },
      createdAt: '2025-01-03',
      updatedAt: '2025-01-03',
    });

    document.querySelector('#knowledge-faq-save').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(createKnowledgeItem).toHaveBeenCalled();
    expect(document.querySelector('#knowledge-faq-list').textContent).toContain('如何安装');
  });
});
