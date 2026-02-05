import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initKnowledgeBase, openKnowledgePreview, toggleKnowledgePreviewExpand, closeKnowledgePreview, openKnowledgeSource } from '../index.js';

const showNotification = vi.fn();
const fetchKnowledge = vi.fn();
const fetchKnowledgeProgress = vi.fn();
const fetchCurrentUser = vi.fn();
const createKnowledgeItem = vi.fn();
const deleteKnowledgeItem = vi.fn();
const retryKnowledgeUpload = vi.fn();
const syncKnowledgeItem = vi.fn();
const updateKnowledgeItem = vi.fn();
const uploadKnowledgeDocument = vi.fn();
const isApiEnabled = vi.fn();

vi.mock('../../core/notifications.js', () => ({
  showNotification: (...args) => showNotification(...args),
}));

vi.mock('../../api.js', () => ({
  createKnowledgeItem: (...args) => createKnowledgeItem(...args),
  deleteKnowledgeItem: (...args) => deleteKnowledgeItem(...args),
  fetchKnowledge: (...args) => fetchKnowledge(...args),
  fetchKnowledgeProgress: (...args) => fetchKnowledgeProgress(...args),
  fetchCurrentUser: (...args) => fetchCurrentUser(...args),
  retryKnowledgeUpload: (...args) => retryKnowledgeUpload(...args),
  syncKnowledgeItem: (...args) => syncKnowledgeItem(...args),
  updateKnowledgeItem: (...args) => updateKnowledgeItem(...args),
  uploadKnowledgeDocument: (...args) => uploadKnowledgeDocument(...args),
  isApiEnabled: () => isApiEnabled(),
}));

const setupDom = () => {
  document.body.innerHTML = `
    <div id="knowledge-tree"></div>
    <input id="knowledge-tree-search" />
    <div id="knowledge-breadcrumb"></div>

    <div id="knowledge-panel">
      <div class="knowledge-page">
        <aside></aside>
      </div>
    </div>

    <button id="knowledge-tab-doc"></button>
    <button id="knowledge-tab-faq"></button>

    <div id="knowledge-doc-section"></div>
    <div id="knowledge-faq-section" class="hidden"></div>
    <div id="knowledge-doc-search-wrap"></div>
    <div id="knowledge-faq-search-wrap" class="hidden"></div>
    <div id="knowledge-doc-status-wrap"></div>
    <div id="knowledge-doc-sort-wrap"></div>
    <button id="knowledge-add-btn"></button>
    <button id="knowledge-empty-add"></button>
    <button id="knowledge-faq-add-btn"></button>
    <button id="knowledge-faq-empty-add"></button>

    <input id="knowledge-doc-search" />
    <select id="knowledge-doc-status"></select>
    <select id="knowledge-doc-sort"></select>
    <div id="knowledge-doc-panel"></div>
    <div id="knowledge-doc-list"></div>
    <div id="knowledge-empty-state"></div>

    <input id="knowledge-faq-search" />
    <div id="knowledge-faq-panel"></div>
    <div id="knowledge-faq-list"></div>
    <div id="knowledge-faq-empty-state"></div>

    <select id="knowledge-add-category"></select>
    <input id="knowledge-add-files" type="file" />
    <button id="knowledge-add-submit"></button>
    <button id="knowledge-add-cancel"></button>
    <button id="knowledge-add-close"></button>
    <input id="knowledge-add-title" />
    <div id="knowledge-add-dropzone"></div>
    <input id="knowledge-faq-mining-toggle" type="checkbox" />
    <div id="knowledge-faq-mining-settings" class="hidden"></div>
    <input id="knowledge-faq-mining-count" value="5" />
    <div id="knowledge-add-error" class="hidden"></div>
    <div id="knowledge-add-file-list"></div>

    <div id="knowledge-detail-modal" class="hidden"></div>
    <button id="knowledge-detail-close"></button>
    <button id="knowledge-detail-dismiss"></button>
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
    <div id="knowledge-detail-faq-empty"></div>
    <div id="knowledge-detail-faq-count"></div>

    <div id="knowledge-delete-modal" class="hidden"></div>
    <div id="knowledge-delete-message"></div>
    <button id="knowledge-delete-cancel"></button>
    <button id="knowledge-delete-confirm"></button>

    <div id="knowledge-faq-modal" class="hidden"></div>
    <div id="knowledge-faq-modal-title"></div>
    <select id="knowledge-faq-status"></select>
    <div id="knowledge-faq-status-wrap"></div>
    <input id="knowledge-faq-question" />
    <textarea id="knowledge-faq-answer"></textarea>
    <div id="knowledge-faq-error" class="hidden"></div>
    <div id="knowledge-faq-detect-results" class="hidden"></div>
    <div id="knowledge-faq-source-list"></div>
    <input id="knowledge-faq-similar-input" />
    <div id="knowledge-faq-similar-list"></div>
    <button id="knowledge-faq-close"></button>
    <button id="knowledge-faq-cancel"></button>
    <button id="knowledge-faq-save"></button>
    <button id="knowledge-faq-detect"></button>
    <button id="knowledge-faq-similar-add"></button>
    <button id="knowledge-faq-similar-generate"></button>

    <div id="knowledge-faq-delete-modal" class="hidden"></div>
    <div id="knowledge-faq-delete-message"></div>
    <button id="knowledge-faq-delete-cancel"></button>
    <button id="knowledge-faq-delete-confirm"></button>

    <div id="knowledge-card-container">
      <div class="knowledge-row">
        <button data-click="knowledge-detail" data-label="条目1" data-url="https://example.com" data-preview="预览文本" data-full="完整文本" data-type="文档" data-updated="2024-01-01" data-tags="a,b" data-source="内部" data-category="分类A">查看</button>
        <h4>条目1</h4>
        <p>预览</p>
      </div>
    </div>
    <input id="knowledge-search-input" />
    <button id="knowledge-search-btn"></button>
    <button class="knowledge-quick-tag" data-keyword="条目1"></button>
    <select id="knowledge-filter-type"></select>
    <select id="knowledge-filter-source"></select>
    <select id="knowledge-filter-category"></select>
    <select id="knowledge-filter-time"></select>
    <button id="knowledge-preview-collapse"></button>
    <button id="knowledge-preview-open"></button>
    <button id="knowledge-preview-newtab"></button>

    <div id="knowledge-preview" class="hidden" data-expanded="false">
      <div id="knowledge-preview-title"></div>
      <div id="knowledge-preview-type"></div>
      <div id="knowledge-preview-updated"></div>
      <div id="knowledge-preview-source"></div>
      <div id="knowledge-preview-body"></div>
      <div id="knowledge-preview-tags"></div>
      <div class="knowledge-preview-fade"></div>
    </div>
  `;
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('knowledge index', () => {
  beforeEach(() => {
    setupDom();
    showNotification.mockReset();
    fetchKnowledge.mockReset();
    fetchKnowledgeProgress.mockReset();
    fetchCurrentUser.mockReset();
    createKnowledgeItem.mockReset();
    deleteKnowledgeItem.mockReset();
    retryKnowledgeUpload.mockReset();
    syncKnowledgeItem.mockReset();
    updateKnowledgeItem.mockReset();
    uploadKnowledgeDocument.mockReset();
    isApiEnabled.mockReset();
    isApiEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with fallback taxonomy when api disabled', () => {
    initKnowledgeBase();

    expect(showNotification).toHaveBeenCalledWith('知识库 API 未配置', 'warning');
    expect(document.querySelector('#knowledge-tree').textContent).toContain('新增一级分类');
    expect(document.querySelector('#knowledge-add-category').innerHTML).toContain('默认分类');
  });

  it('opens knowledge preview and toggles expand', () => {
    openKnowledgePreview({
      title: '知识条目',
      url: 'https://example.com',
      preview: '预览内容',
      full: '完整内容',
      tags: ['A', 'B'],
      type: '文档',
      updated: '2024-01-01',
      source: '内部',
    });

    const wrapper = document.querySelector('#knowledge-preview');
    expect(wrapper.classList.contains('hidden')).toBe(false);
    expect(document.querySelector('#knowledge-preview-body').textContent).toBe('预览内容');

    toggleKnowledgePreviewExpand(true);
    expect(wrapper.dataset.expanded).toBe('true');
    expect(document.querySelector('#knowledge-preview-body').textContent).toBe('完整内容');

    toggleKnowledgePreviewExpand(false);
    expect(wrapper.dataset.expanded).toBe('false');
  });

  it('closes knowledge preview and restores empty text', () => {
    const emptyState = document.querySelector('#knowledge-empty-state');
    emptyState.textContent = '请选择知识条目查看详情';

    openKnowledgePreview({ title: '知识条目', preview: '预览内容' });
    closeKnowledgePreview();

    expect(document.querySelector('#knowledge-preview').classList.contains('hidden')).toBe(true);
    expect(emptyState.textContent).toContain('请选择知识条目查看详情');
  });

  it('opens knowledge source in new tab', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    openKnowledgeSource('https://example.com');
    expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank');
    openSpy.mockRestore();
  });

  it('opens preview from simple knowledge list click', () => {
    initKnowledgeBase();
    const button = document.querySelector('[data-click="knowledge-detail"]');
    button.click();

    const wrapper = document.querySelector('#knowledge-preview');
    expect(wrapper.classList.contains('hidden')).toBe(false);
    expect(document.querySelector('#knowledge-preview-title').textContent).toContain('条目1');
  });

  it('loads knowledge data when api enabled and renders lists', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchCurrentUser.mockResolvedValue({ data: { name: 'Admin' } });
    fetchKnowledge.mockResolvedValue({
      items: [
        {
          id: 'cfg',
          title: 'cfg',
          metadata: {
            type: 'category-config',
            taxonomy: [{ name: '产品', children: [{ name: '账户', children: [] }] }],
          },
        },
        {
          id: 'doc-1',
          title: '登录指南',
          content: '文档上传处理中，系统会自动解析。',
          category: 'guide',
          tags: ['登录'],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
          metadata: { status: 'active', taxonomyPath: '产品 / 账户', summary: '摘要' },
        },
        {
          id: 'faq-1',
          title: '如何登录',
          content: '答案',
          category: 'faq',
          tags: ['FAQ'],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
          metadata: { status: 'active', sourceDocIds: ['doc-1'] },
        },
      ],
    });

    initKnowledgeBase();
    await flushPromises();

    expect(document.querySelector('#knowledge-doc-list').textContent).toContain('登录指南');
    expect(document.querySelector('#knowledge-faq-list').textContent).toContain('如何登录');
    expect(document.querySelector('#knowledge-tree').textContent).toContain('产品');
  });

  it('deletes document and related faqs when confirmed', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchKnowledge.mockResolvedValue({
      items: [
        {
          id: 'doc-1',
          title: '删除文档',
          content: '正文',
          category: 'guide',
          tags: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
          metadata: { status: 'active', taxonomyPath: '默认分类' },
        },
        {
          id: 'faq-1',
          title: '删除FAQ',
          content: '答案',
          category: 'faq',
          tags: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
          metadata: { status: 'active', sourceDocIds: ['doc-1'] },
        },
      ],
    });
    deleteKnowledgeItem.mockResolvedValue({});

    initKnowledgeBase();
    await flushPromises();

    const deleteBtn = document.querySelector('[data-doc-action="delete"]');
    deleteBtn.click();

    const checkbox = document.querySelector('#knowledge-delete-related-faq');
    checkbox.checked = true;
    document.querySelector('#knowledge-delete-confirm').click();
    await flushPromises();

    expect(deleteKnowledgeItem).toHaveBeenCalledWith('doc-1', { deleteRelatedFaq: true });
    expect(document.querySelector('#knowledge-doc-list').textContent).not.toContain('删除文档');
    expect(document.querySelector('#knowledge-faq-list').textContent).not.toContain('删除FAQ');
    expect(showNotification).toHaveBeenCalledWith('文档已删除', 'success');
  });

  it('retries upload and syncs parsed content', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchKnowledge
      .mockResolvedValueOnce({
        items: [
          {
            id: 'doc-2',
            title: '待重试',
            content: '正文',
            category: 'guide',
            tags: [],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-02',
            metadata: { status: 'retry', taxonomyPath: '默认分类' },
          },
        ],
      })
      .mockResolvedValueOnce({ items: [] });

    retryKnowledgeUpload.mockResolvedValue({
      data: {
        id: 'doc-2',
        title: '待重试',
        content: '正文',
        category: 'guide',
        tags: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        metadata: { status: 'active', faqMining: { enabled: true } },
      },
    });
    syncKnowledgeItem.mockResolvedValue({
      data: {
        id: 'doc-2',
        title: '待重试',
        content: '正文',
        category: 'guide',
        tags: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        metadata: { status: 'active', faqMining: { enabled: true } },
      },
    });

    initKnowledgeBase();
    await flushPromises();

    const retryBtn = document.querySelector('[data-doc-action="retry"]');
    retryBtn.click();
    await flushPromises();

    expect(retryKnowledgeUpload).toHaveBeenCalledWith('doc-2');
    expect(syncKnowledgeItem).toHaveBeenCalledWith('doc-2');
  });

  it('deletes faq when confirmed', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchKnowledge.mockResolvedValue({
      items: [
        {
          id: 'faq-2',
          title: '删除FAQ',
          content: '答案',
          category: 'faq',
          tags: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
          metadata: { status: 'active', sourceDocIds: [] },
        },
      ],
    });
    deleteKnowledgeItem.mockResolvedValue({});

    initKnowledgeBase();
    await flushPromises();

    const deleteBtn = document.querySelector('[data-faq-action="delete"]');
    deleteBtn.click();
    document.querySelector('#knowledge-faq-delete-confirm').click();
    await flushPromises();

    expect(deleteKnowledgeItem).toHaveBeenCalledWith('faq-2');
    expect(document.querySelector('#knowledge-faq-list').textContent).not.toContain('删除FAQ');
    expect(showNotification).toHaveBeenCalledWith('FAQ 已删除', 'success');
  });
});
