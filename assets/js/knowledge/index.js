import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';
import {
  createKnowledgeItem,
  deleteKnowledgeItem,
  fetchKnowledge,
  fetchKnowledgeProgress,
  isApiEnabled,
  fetchCurrentUser,
  retryKnowledgeUpload,
  syncKnowledgeItem,
  updateKnowledgeItem,
  uploadKnowledgeDocument,
} from '../api.js';

const MAX_CATEGORY_DEPTH = 3;

const DOC_ALLOWED_STATUSES = ['active', 'archived', 'deprecated', 'processing', 'disabled', 'retry'];

const CATEGORY_CONFIG_TITLE = 'Knowledge Taxonomy Config';
const CATEGORY_CONFIG_TYPE = 'category-config';

let knowledgeTaxonomy = [];
let docs = [];
let faqs = [];
let knowledgeConfigItem = null;
let currentUserName = '';

const treeState = new Map();
let selectedCategory = '';
let treeQuery = '';
let docQuery = '';
let docStatusFilter = '';
let docSort = 'updated_desc';
let faqQuery = '';
let selectedFiles = [];
let pendingDeleteId = null;
let pendingFaqDeleteId = null;
let editingFaqId = null;
let faqModalMode = 'add';
let faqSimilarList = [];
let simpleKnowledgeRows = [];
let activeKnowledgeCard = null;
let simpleEmptyText = '';
const uploadProgressTimers = new Map();
const uploadRetryCache = new Map();

export function initKnowledgeBase() {
  const treeSearchInput = qs('#knowledge-tree-search');
  const docSearchInput = qs('#knowledge-doc-search');
  const addBtn = qs('#knowledge-add-btn');
  const emptyAddBtn = qs('#knowledge-empty-add');
  const tabDocBtn = qs('#knowledge-tab-doc');
  const tabFaqBtn = qs('#knowledge-tab-faq');
  const faqSearchInput = qs('#knowledge-faq-search');
  const docStatusSelect = qs('#knowledge-doc-status');
  const docSortSelect = qs('#knowledge-doc-sort');
  const faqAddBtn = qs('#knowledge-faq-add-btn');
  const faqEmptyAddBtn = qs('#knowledge-faq-empty-add');
  const fileInput = qs('#knowledge-add-files');
  const addSubmitBtn = qs('#knowledge-add-submit');
  const addCancelBtn = qs('#knowledge-add-cancel');
  const addCloseBtn = qs('#knowledge-add-close');
  const addCategorySelect = qs('#knowledge-add-category');
  const addTitleInput = qs('#knowledge-add-title');
  const addDropzone = qs('#knowledge-add-dropzone');
  const faqMiningToggle = qs('#knowledge-faq-mining-toggle');
  const faqMiningSettings = qs('#knowledge-faq-mining-settings');
  const detailCloseBtn = qs('#knowledge-detail-close');
  const detailDismissBtn = qs('#knowledge-detail-dismiss');
  const deleteCancelBtn = qs('#knowledge-delete-cancel');
  const deleteConfirmBtn = qs('#knowledge-delete-confirm');
  const faqModalCloseBtn = qs('#knowledge-faq-close');
  const faqModalCancelBtn = qs('#knowledge-faq-cancel');
  const faqModalSaveBtn = qs('#knowledge-faq-save');
  const faqDetectBtn = qs('#knowledge-faq-detect');
  const faqSimilarAddBtn = qs('#knowledge-faq-similar-add');
  const faqSimilarGenerateBtn = qs('#knowledge-faq-similar-generate');
  const faqDeleteCancelBtn = qs('#knowledge-faq-delete-cancel');
  const faqDeleteConfirmBtn = qs('#knowledge-faq-delete-confirm');

  void loadKnowledgeData();
  void loadCurrentUser();

  on(treeSearchInput, 'input', (event) => {
    treeQuery = event.target.value.trim();
    renderTree();
  });

  on(docSearchInput, 'input', (event) => {
    docQuery = event.target.value.trim();
    renderDocList();
  });

  on(docStatusSelect, 'change', (event) => {
    docStatusFilter = event.target.value;
    renderDocList();
  });

  on(docSortSelect, 'change', (event) => {
    docSort = event.target.value || 'updated_desc';
    renderDocList();
  });

  on(faqSearchInput, 'input', (event) => {
    faqQuery = event.target.value.trim();
    renderFaqList();
  });

  on(addBtn, 'click', () => openAddModal());
  on(emptyAddBtn, 'click', () => openAddModal());
  on(faqAddBtn, 'click', () => openFaqModal('add'));
  on(faqEmptyAddBtn, 'click', () => openFaqModal('add'));
  on(addCancelBtn, 'click', () => closeAddModal());
  on(addCloseBtn, 'click', () => closeAddModal());
  on(detailCloseBtn, 'click', () => closeDetailModal());
  on(detailDismissBtn, 'click', () => closeDetailModal());
  on(deleteCancelBtn, 'click', () => closeDeleteModal());
  on(faqModalCloseBtn, 'click', () => closeFaqModal());
  on(faqModalCancelBtn, 'click', () => closeFaqModal());
  on(faqDeleteCancelBtn, 'click', () => closeFaqDeleteModal());

  on(tabDocBtn, 'click', () => switchLibrary('doc'));
  on(tabFaqBtn, 'click', () => switchLibrary('faq'));

  on(deleteConfirmBtn, 'click', async () => {
    if (!pendingDeleteId) {
      return;
    }
    if (!isApiEnabled()) {
      showNotification('知识库 API 未配置', 'warning');
      return;
    }
    try {
      const deleteRelated = qs('#knowledge-delete-related-faq')?.checked;
      await deleteKnowledgeItem(pendingDeleteId, { deleteRelatedFaq: Boolean(deleteRelated) });
      docs = docs.filter((doc) => doc.id !== pendingDeleteId);
      if (deleteRelated) {
        faqs = faqs.filter((faq) => !faq.sourceDocIds?.includes(pendingDeleteId));
      }
      renderDocList();
      renderFaqList();
      showNotification('文档已删除', 'success');
    } catch (error) {
      showNotification('文档删除失败', 'error');
    } finally {
      closeDeleteModal();
    }
  });

  on(faqDeleteConfirmBtn, 'click', async () => {
    if (!pendingFaqDeleteId) {
      return;
    }
    if (!isApiEnabled()) {
      showNotification('知识库 API 未配置', 'warning');
      return;
    }
    try {
      await deleteKnowledgeItem(pendingFaqDeleteId);
      faqs = faqs.filter((faq) => faq.id !== pendingFaqDeleteId);
      renderFaqList();
      showNotification('FAQ 已删除', 'success');
    } catch (error) {
      showNotification('FAQ 删除失败', 'error');
    } finally {
      closeFaqDeleteModal();
    }
  });

  on(fileInput, 'change', (event) => {
    selectedFiles = Array.from(event.target.files || []);
    hideAddError();
    updateTitleFromFiles();
    renderSelectedFiles(true);
  });

  on(addCategorySelect, 'change', () => {
    hideAddError();
  });

  on(addDropzone, 'click', () => {
    fileInput?.click();
  });

  on(addDropzone, 'dragover', (event) => {
    event.preventDefault();
    addDropzone.classList.add('border-primary', 'bg-blue-50');
  });

  on(addDropzone, 'dragleave', () => {
    addDropzone.classList.remove('border-primary', 'bg-blue-50');
  });

  on(addDropzone, 'drop', (event) => {
    event.preventDefault();
    addDropzone.classList.remove('border-primary', 'bg-blue-50');
    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length) {
      return;
    }
    selectedFiles = files;
    hideAddError();
    updateTitleFromFiles();
    renderSelectedFiles(true);
  });

  on(addTitleInput, 'input', () => {
    hideAddError();
  });

  on(faqMiningToggle, 'change', (event) => {
    if (!faqMiningSettings) {
      return;
    }
    faqMiningSettings.classList.toggle('hidden', !event.target.checked);
  });

  on(addSubmitBtn, 'click', async () => {
    await handleSubmit();
  });

  on(faqModalSaveBtn, 'click', () => {
    handleFaqSave();
  });

  on(faqDetectBtn, 'click', () => {
    handleFaqDetect();
  });

  on(faqSimilarAddBtn, 'click', () => {
    handleFaqManualAdd();
  });

  on(faqSimilarGenerateBtn, 'click', () => {
    handleFaqBulkGenerate();
  });

  const treeContainer = qs('#knowledge-tree');
  on(treeContainer, 'click', (event) => {
    const toggle = event.target.closest('[data-tree-toggle]');
    if (toggle) {
      const nodeId = toggle.dataset.treeToggle;
      treeState.set(nodeId, !isNodeExpanded(nodeId));
      renderTree();
      return;
    }

    const actionBtn = event.target.closest('[data-tree-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.treeAction;
      const nodeId = actionBtn.dataset.treeId || '';
      void handleTreeAction(action, nodeId);
      return;
    }

    const selectable = event.target.closest('[data-tree-select]');
    if (selectable) {
      selectedCategory = selectable.dataset.treeSelect || '';
      renderBreadcrumb();
      renderDocList();
      renderFaqList();
      renderTree();
    }
  });

  const breadcrumb = qs('#knowledge-breadcrumb');
  on(breadcrumb, 'click', (event) => {
    const target = event.target.closest('[data-breadcrumb-all]');
    if (!target) {
      return;
    }
    selectedCategory = '';
    renderBreadcrumb();
    renderDocList();
    renderFaqList();
    renderTree();
  });

  const listContainer = qs('#knowledge-doc-list');
  on(listContainer, 'click', (event) => {
    const actionBtn = event.target.closest('[data-doc-action]');
    const row = event.target.closest('[data-doc-id]');
    if (!row) {
      return;
    }

    const docId = row.dataset.docId;
    const doc = docs.find((item) => item.id === docId);
    if (!doc) {
      return;
    }

    if (actionBtn) {
      const action = actionBtn.dataset.docAction;
      if (action === 'view') {
        openDetailModal(doc);
      }
      if (action === 'retry') {
        void handleRetryUpload(doc);
      }
      if (action === 'delete' && DOC_ALLOWED_STATUSES.includes(doc.status)) {
        openDeleteModal(doc);
      }
      return;
    }

    openDetailModal(doc);
  });

  const faqListContainer = qs('#knowledge-faq-list');
  on(faqListContainer, 'click', (event) => {
    const actionBtn = event.target.closest('[data-faq-action]');
    const row = event.target.closest('[data-faq-id]');
    if (!row) {
      return;
    }
    const faqId = row.dataset.faqId;
    const faq = faqs.find((item) => item.id === faqId);
    if (!faq) {
      return;
    }
    if (actionBtn) {
      const action = actionBtn.dataset.faqAction;
      if (action === 'view') {
        openFaqModal('view', faq);
      }
      if (action === 'edit') {
        openFaqModal('edit', faq);
      }
      if (action === 'delete' && DOC_ALLOWED_STATUSES.includes(faq.status)) {
        openFaqDeleteModal(faq);
      }
      return;
    }
    openFaqModal('edit', faq);
  });

  qsa('#knowledge-detail-modal, #knowledge-add-modal, #knowledge-delete-modal, #knowledge-faq-modal, #knowledge-faq-delete-modal').forEach((modal) => {
    on(modal, 'click', (event) => {
      if (event.target === modal) {
        closeDetailModal();
        closeAddModal();
        closeDeleteModal();
        closeFaqModal();
        closeFaqDeleteModal();
      }
    });
  });

  const detailModal = qs('#knowledge-detail-modal');
  on(detailModal, 'click', (event) => {
    const faqItem = event.target.closest('[data-related-faq-id]');
    if (!faqItem) {
      return;
    }
    const faqId = faqItem.dataset.relatedFaqId;
    const target = faqs.find((faq) => faq.id === faqId);
    if (target) {
      openFaqModal('view', target);
    }
  });

  initSimpleKnowledgePage();
}

async function loadCurrentUser() {
  if (!isApiEnabled()) {
    return;
  }
  try {
    const response = await fetchCurrentUser();
    const payload = response?.data ?? response;
    currentUserName = payload?.name || payload?.email || payload?.id || '';
  } catch (error) {
    currentUserName = '';
  }
}

async function loadKnowledgeData() {
  if (!isApiEnabled()) {
    showNotification('知识库 API 未配置', 'warning');
    knowledgeTaxonomy = [createNode('默认分类')];
    renderTree();
    renderCategoryOptions();
    renderDocList();
    renderFaqList();
    renderBreadcrumb();
    return;
  }

  try {
    const response = await fetchKnowledge({ limit: 200, page: 1 });
    const items = extractKnowledgeItems(response);

    knowledgeConfigItem = items.find(isCategoryConfig) || null;
    const dataItems = items.filter((item) => !isCategoryConfig(item));

    docs = dataItems
      .filter((item) => item.category !== 'faq')
      .map((item) => mapKnowledgeDoc(item));

    faqs = dataItems
      .filter((item) => item.category === 'faq')
      .map((item) => mapKnowledgeFaq(item));

    knowledgeTaxonomy = getTaxonomyFromConfig() || buildTaxonomyFromDocs(docs);
    ensureTaxonomyDefaults();
  } catch (error) {
    showNotification('加载知识库失败，请稍后重试', 'error');
  }

  renderTree();
  renderCategoryOptions();
  renderDocList();
  renderFaqList();
  renderBreadcrumb();
  startUploadProgressPolling(docs);
}

function extractKnowledgeItems(response) {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
}

function normalizeMetadata(raw) {
  return typeof raw === 'object' && raw ? raw : {};
}

function isCategoryConfig(item) {
  const metadata = normalizeMetadata(item?.metadata);
  return metadata.type === CATEGORY_CONFIG_TYPE;
}

function normalizeSummary(summary, content) {
  const value = summary || buildSummary(content);
  if (!value) {
    return '';
  }
  if (value.includes('文档上传处理中') && value.includes('解析完成后可查看摘要')) {
    return '文档上传处理中，处理完成后可查看摘要。';
  }
  return value;
}

function mapKnowledgeDoc(item) {
  const metadata = normalizeMetadata(item.metadata);
  const status = metadata.status || (item.isArchived ? 'archived' : 'active');
  return {
    id: item.id,
    title: item.title,
    status,
    summary: normalizeSummary(metadata.summary, item.content),
    content: item.content,
    category: metadata.taxonomyPath || '未分类',
    tags: Array.isArray(item.tags) ? item.tags : [],
    owner: metadata.owner || '--',
    source: item.source || metadata.source || '-',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    fileHash: metadata.fileHash || '',
    metadata,
  };
}

function startUploadProgressPolling(docList) {
  if (!Array.isArray(docList)) {
    return;
  }
  docList.forEach((doc) => trackUploadProgress(doc));
}

function trackUploadProgress(doc) {
  const uploadDocId = doc?.metadata?.uploadDocId;
  if (!uploadDocId || doc.status !== 'processing') {
    return;
  }
  if (uploadProgressTimers.has(uploadDocId)) {
    return;
  }

  const scheduleNext = () => {
    const timer = setTimeout(() => {
      void pollUploadProgress();
    }, 5000);
    uploadProgressTimers.set(uploadDocId, timer);
  };

  const pollUploadProgress = async () => {
    try {
      const response = await fetchKnowledgeProgress(uploadDocId);
      const progress = response?.data ?? response;
      if (!progress) {
        scheduleNext();
        return;
      }

      const nextStatus = resolveProgressStatus(progress);
      const progressChanged = progress?.overall_progress !== doc?.metadata?.processing?.overall_progress;
      const statusChanged = nextStatus !== doc.status;

      if (progressChanged || statusChanged) {
        doc.metadata = {
          ...doc.metadata,
          status: nextStatus,
          processing: progress,
        };
        doc.status = nextStatus;
        renderDocList();
      }

      if (isTerminalProgress(nextStatus)) {
        uploadProgressTimers.delete(uploadDocId);
        if (statusChanged) {
          await updateKnowledgeItem(doc.id, { metadata: doc.metadata });
        }
        if (nextStatus === 'active') {
          await syncParsedContent(doc);
        }
        return;
      }
    } catch (error) {
      scheduleNext();
      return;
    }

    scheduleNext();
  };

  scheduleNext();
}

function resolveProgressStatus(progress) {
  const raw = String(progress?.overall_status || '').toLowerCase();
  if (raw.includes('disable')) {
    return 'disabled';
  }
  if (raw.includes('fail') || raw.includes('error')) {
    return 'deprecated';
  }
  if (raw.includes('complete') || raw.includes('success')) {
    return 'active';
  }
  if (typeof progress?.overall_progress === 'number' && progress.overall_progress >= 100) {
    return 'active';
  }
  return 'processing';
}

function isTerminalProgress(status) {
  return ['active', 'deprecated', 'disabled', 'archived'].includes(status);
}

function queueUploadForDoc(doc, file, category) {
  if (!doc?.id || !file) {
    return;
  }
  uploadRetryCache.set(doc.id, { file, category });
  void uploadFileForDoc(doc, file, category);
}

async function uploadFileForDoc(doc, file, category) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  let uploadDocId = null;
  let uploadMessage = '';
  let uploadStatus = '';
  try {
    const uploadResponse = await uploadKnowledgeDocument(formData);
    const payload = uploadResponse?.data ?? uploadResponse;
    uploadDocId = payload?.docId || null;
    uploadMessage = uploadResponse?.message || '';
    uploadStatus = payload?.status || '';
  } catch (error) {
    await markUploadRetry(doc, error);
    return;
  }

  let parseStatus = 'processing';
  if (uploadMessage.includes('未启用')) {
    parseStatus = 'disabled';
  } else if (typeof uploadStatus === 'string' && uploadStatus) {
    const normalizedStatus = uploadStatus.toLowerCase();
    if (['active', 'archived', 'deprecated'].includes(normalizedStatus)) {
      parseStatus = normalizedStatus;
    }
  }

  const nextMetadata = {
    ...(doc.metadata || {}),
    status: parseStatus,
    uploadDocId,
    uploadPending: false,
    uploadError: undefined,
  };

  await persistDocUpdate(doc, nextMetadata, parseStatus);
  uploadRetryCache.delete(doc.id);

  if (parseStatus === 'processing') {
    trackUploadProgress(doc);
  }
}

async function markUploadRetry(doc, error) {
  const message = error instanceof Error ? error.message : '上传失败';
  const nextMetadata = {
    ...(doc.metadata || {}),
    status: 'retry',
    uploadPending: false,
    uploadError: message,
  };
  await persistDocUpdate(doc, nextMetadata, 'retry');
}

async function persistDocUpdate(doc, metadata, status) {
  try {
    await updateKnowledgeItem(doc.id, { metadata });
  } catch (error) {
    // ignore persistence errors; UI still reflects local state
  }
  doc.metadata = metadata;
  doc.status = status;
  docs = docs.map((entry) => (entry.id === doc.id ? doc : entry));
  renderDocList();
}

async function handleRetryUpload(doc) {
  try {
    const response = await retryKnowledgeUpload(doc.id);
    const payload = response?.data ?? response;
    if (!payload) {
      showNotification('重试失败，请稍后再试', 'error');
      return;
    }
    const mapped = mapKnowledgeDoc(payload);
    docs = docs.map((entry) => (entry.id === doc.id ? mapped : entry));
    renderDocList();
    if (mapped.status === 'processing') {
      trackUploadProgress(mapped);
    } else if (mapped.status === 'active') {
      await syncParsedContent(mapped);
    }
  } catch (error) {
    showNotification('重试失败，请稍后再试', 'error');
  }
}

async function syncParsedContent(doc) {
  if (!doc?.id) {
    return;
  }
  if (doc.metadata?.taxkbSyncedAt) {
    return;
  }
  try {
    const response = await syncKnowledgeItem(doc.id);
    const payload = response?.data ?? response;
    if (!payload) {
      return;
    }
    const mapped = mapKnowledgeDoc(payload);
    docs = docs.map((entry) => (entry.id === doc.id ? mapped : entry));
    renderDocList();
    if (mapped.metadata?.faqMining?.enabled) {
      await loadKnowledgeData();
    }
  } catch (error) {
    // Sync errors should not block the UI.
  }
}

function mapKnowledgeFaq(item) {
  const metadata = normalizeMetadata(item.metadata);
  const status = metadata.status || (item.isArchived ? 'archived' : 'active');
  return {
    id: item.id,
    question: item.title,
    answer: item.content,
    status,
    similarQuestions: Array.isArray(metadata.similarQuestions) ? metadata.similarQuestions : [],
    sourceDocIds: Array.isArray(metadata.sourceDocIds) ? metadata.sourceDocIds : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    metadata,
  };
}

function getTaxonomyFromConfig() {
  const metadata = normalizeMetadata(knowledgeConfigItem?.metadata);
  const taxonomy = metadata.taxonomy;
  if (!Array.isArray(taxonomy)) {
    return null;
  }
  return sanitizeTaxonomyTree(taxonomy);
}

function sanitizeTaxonomyTree(nodes = []) {
  return nodes
    .map((node) => {
      const name = String(node?.name || '').trim();
      if (!name) {
        return null;
      }
      const children = sanitizeTaxonomyTree(node.children || []);
      return {
        id: node.id || createNode(name).id,
        name,
        children,
      };
    })
    .filter(Boolean);
}

function buildTaxonomyFromDocs(docList) {
  const roots = [];
  docList.forEach((doc) => {
    const path = String(doc.category || '未分类').trim();
    if (!path) {
      return;
    }
    const parts = path.split(' / ').map((part) => part.trim()).filter(Boolean);
    let nodes = roots;
    parts.forEach((part) => {
      let node = nodes.find((entry) => entry.name === part);
      if (!node) {
        node = createNode(part);
        nodes.push(node);
      }
      nodes = node.children;
    });
  });
  return roots;
}

function ensureTaxonomyDefaults() {
  if (!knowledgeTaxonomy.length) {
    knowledgeTaxonomy = [createNode('默认分类')];
  }
}

function buildSummary(content = '') {
  const trimmed = String(content || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}

async function persistTaxonomyConfig() {
  const metadata = {
    ...(normalizeMetadata(knowledgeConfigItem?.metadata)),
    type: CATEGORY_CONFIG_TYPE,
    taxonomy: knowledgeTaxonomy,
  };

  if (knowledgeConfigItem?.id) {
    const response = await updateKnowledgeItem(knowledgeConfigItem.id, { metadata });
    const payload = response?.data ?? response;
    if (payload) {
      knowledgeConfigItem = payload;
    }
    return;
  }

  const response = await createKnowledgeItem({
    title: CATEGORY_CONFIG_TITLE,
    content: 'Knowledge taxonomy configuration',
    category: 'other',
    tags: ['system'],
    source: 'system',
    metadata,
  });
  const payload = response?.data ?? response;
  if (payload) {
    knowledgeConfigItem = payload;
  }
}

async function safePersistTaxonomy() {
  try {
    await persistTaxonomyConfig();
  } catch (error) {
    const message = error?.message || '分类保存失败，请稍后重试';
    console.error('[knowledge] failed to persist taxonomy', error);
    showNotification(message, 'error');
  }
}

async function updateDocTaxonomyPath(doc, newPath) {
  const metadata = {
    ...(doc.metadata || {}),
    taxonomyPath: newPath,
  };
  await updateKnowledgeItem(doc.id, { metadata });
  doc.category = newPath;
  doc.metadata = metadata;
}

function renderTree() {
  const container = qs('#knowledge-tree');
  if (!container) {
    return;
  }

  const keyword = treeQuery.toLowerCase();
  const html = knowledgeTaxonomy
    .map((node) => renderNode(node, 1, '', keyword))
    .filter(Boolean)
    .join('');

  container.innerHTML = html;
  const addRootBtn = document.createElement('button');
  addRootBtn.className = 'w-full px-3 py-2 text-xs text-primary border border-dashed border-primary/40 rounded-lg hover:bg-blue-50';
  addRootBtn.textContent = '新增一级分类';
  addRootBtn.setAttribute('data-tree-action', 'add-root');
  container.appendChild(addRootBtn);
}

function renderNode(node, depth, parentPath, keyword) {
  const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
  const hasChildren = node.children && node.children.length > 0;
  const matches = collectMatchingLeaves(node, path, keyword);
  const canAddChild = depth < MAX_CATEGORY_DEPTH;

  if (keyword && matches.length === 0) {
    return '';
  }

  const expanded = keyword ? true : isNodeExpanded(node.id);
  const leafMarkup = (node.children || [])
    .map((child) => renderNode(child, depth + 1, path, keyword))
    .filter(Boolean)
    .join('');

  const isActive = selectedCategory === path;

  const toggleIcon = hasChildren
    ? `<i class="fa ${expanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-xs text-gray-400"></i>`
    : '<i class="fa fa-file-o text-xs text-gray-300"></i>';

  const label = `
    <button class="flex-1 text-left whitespace-normal break-words ${isActive ? 'text-primary' : 'text-gray-600'}"
      title="${path}" data-tree-select="${path}">
      ${node.name}
    </button>
  `;

  const actions = `
    <div class="flex items-center gap-1 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
      ${canAddChild ? `
      <button class="px-1 hover:text-primary" title="新增子分类" data-tree-action="add-child" data-tree-id="${node.id}">
        <i class="fa fa-plus"></i>
      </button>
      ` : ''}
      <button class="px-1 hover:text-primary" title="编辑分类" data-tree-action="edit" data-tree-id="${node.id}">
        <i class="fa fa-pencil"></i>
      </button>
      <button class="px-1 hover:text-red-500" title="删除分类" data-tree-action="delete" data-tree-id="${node.id}">
        <i class="fa fa-trash"></i>
      </button>
    </div>
  `;

  return `
    <div class="bg-white" style="margin-left:${(depth - 1) * 6}px">
      <div class="group flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-gray-50 border-b border-gray-100">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          ${hasChildren ? `<button class="text-gray-500" data-tree-toggle="${node.id}">${toggleIcon}</button>` : toggleIcon}
          ${label}
        </div>
        ${actions}
      </div>
      <div class="${expanded ? 'block' : 'hidden'} pl-3 pr-2 pb-2 space-y-1 border-l border-gray-100 ml-2">
        ${leafMarkup}
      </div>
    </div>
  `;
}

function collectMatchingLeaves(node, path, keyword) {
  if (!keyword) {
    return [path];
  }
  if (!node.children || node.children.length === 0) {
    return path.toLowerCase().includes(keyword) ? [path] : [];
  }
  return node.children.flatMap((child) => {
    const childPath = `${path} / ${child.name}`;
    return collectMatchingLeaves(child, childPath, keyword);
  });
}

function renderCategoryOptions() {
  const select = qs('#knowledge-add-category');
  if (!select) {
    return;
  }
  const leaves = getLeafPaths();
  const options = leaves.map((value) => `<option value="${value}">${value}</option>`).join('');
  select.innerHTML = `<option value="">请选择分类</option>${options}`;
}

function getLeafPaths() {
  const leaves = [];
  const walk = (node, parentPath) => {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    if (!node.children || node.children.length === 0) {
      leaves.push(path);
      return;
    }
    node.children.forEach((child) => walk(child, path));
  };
  knowledgeTaxonomy.forEach((node) => walk(node, ''));
  return leaves;
}

function renderDocList() {
  const list = qs('#knowledge-doc-list');
  const panel = qs('#knowledge-doc-panel');
  const emptyState = qs('#knowledge-empty-state');
  if (!list || !panel || !emptyState) {
    return;
  }

  const filtered = getFilteredDocs();
  if (!filtered.length) {
    panel.classList.add('hidden');
    emptyState.classList.remove('hidden');
    list.innerHTML = '';
    return;
  }

  panel.classList.remove('hidden');
  emptyState.classList.add('hidden');
  list.innerHTML = filtered
    .map((doc) => {
      return `
        <div class="knowledge-row hover:bg-gray-50 cursor-pointer" data-doc-id="${doc.id}">
          <div class="knowledge-cell">
            <div class="font-medium text-gray-900">${doc.title}</div>
            <div class="text-xs text-gray-500 mt-1 line-clamp-1">${doc.summary || '暂无摘要'}</div>
          </div>
          <div class="knowledge-cell text-xs text-gray-600 px-0">${doc.category}</div>
          <div class="knowledge-cell px-0">
            ${formatStatusBadge(doc.status)}
          </div>
          <div class="knowledge-cell text-xs text-gray-500 px-0">${doc.updatedAt}</div>
          <div class="knowledge-cell flex items-center justify-end gap-2 px-0">
            <button class="text-xs text-primary hover:underline" data-doc-action="view">查看</button>
            ${doc.status === 'retry'
    ? '<button class="text-xs text-amber-600 hover:underline" data-doc-action="retry">重试</button>'
    : ''}
            ${DOC_ALLOWED_STATUSES.includes(doc.status)
    ? '<button class="text-xs text-red-600 hover:underline" data-doc-action="delete">删除</button>'
    : '<span class="text-xs text-gray-300">删除</span>'}
          </div>
        </div>
      `;
    })
    .join('');
}

function getFilteredDocs() {
  const keyword = docQuery.toLowerCase();
  return docs
    .filter((doc) => DOC_ALLOWED_STATUSES.includes(doc.status))
    .filter((doc) => {
      if (selectedCategory && !doc.category?.startsWith(selectedCategory)) {
        return false;
      }
      if (docStatusFilter && doc.status !== docStatusFilter) {
        return false;
      }
      if (keyword) {
        const title = doc.title?.toLowerCase() || '';
        const summary = doc.summary?.toLowerCase() || '';
        const tags = (doc.tags || []).join(' ').toLowerCase();
        if (![title, summary, tags].some((field) => field.includes(keyword))) {
          return false;
        }
      }
      return true;
    })
    .sort(getDocSortComparator());
}

function getDocSortComparator() {
  switch (docSort) {
    case 'updated_asc':
      return (a, b) => parseDateValue(a.updatedAt) - parseDateValue(b.updatedAt);
    case 'title_asc':
      return (a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN');
    case 'title_desc':
      return (a, b) => b.title.localeCompare(a.title, 'zh-Hans-CN');
    case 'updated_desc':
    default:
      return (a, b) => parseDateValue(b.updatedAt) - parseDateValue(a.updatedAt);
  }
}

function normalizeCategoryName(value) {
  return String(value || '').trim().toLowerCase();
}

function getDocsUnderCategory(path) {
  return docs.filter((doc) => doc.category?.startsWith(path));
}

function getFaqsLinkedToDoc(docId) {
  return faqs.filter((faq) => faq.sourceDocIds?.includes(docId));
}

function renderFaqList() {
  const list = qs('#knowledge-faq-list');
  const panel = qs('#knowledge-faq-panel');
  const emptyState = qs('#knowledge-faq-empty-state');
  if (!list || !panel || !emptyState) {
    return;
  }

  const filtered = getFilteredFaqs();
  if (!filtered.length) {
    panel.classList.add('hidden');
    emptyState.classList.remove('hidden');
    list.innerHTML = '';
    return;
  }

  panel.classList.remove('hidden');
  emptyState.classList.add('hidden');
  list.innerHTML = filtered
    .map((faq) => {
      return `
        <div class="grid grid-cols-5 items-center px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer" data-faq-id="${faq.id}">
          <div class="col-span-2">
            <div class="font-medium text-gray-900">${faq.question}</div>
            <div class="text-xs text-gray-500 mt-1 line-clamp-1">${faq.answer || '暂无答案'}</div>
          </div>
          <div>
            ${formatStatusBadge(faq.status)}
          </div>
          <div class="text-xs text-gray-500">${faq.updatedAt}</div>
          <div class="flex items-center justify-end gap-2">
            <button class="text-xs text-primary hover:underline" data-faq-action="view">查看</button>
            <button class="text-xs text-indigo-600 hover:underline" data-faq-action="edit">编辑</button>
            ${DOC_ALLOWED_STATUSES.includes(faq.status)
    ? '<button class="text-xs text-red-600 hover:underline" data-faq-action="delete">删除</button>'
    : '<span class="text-xs text-gray-300">删除</span>'}
          </div>
        </div>
      `;
    })
    .join('');
}

function getFilteredFaqs() {
  const keyword = faqQuery.toLowerCase();
  return faqs
    .filter((faq) => DOC_ALLOWED_STATUSES.includes(faq.status))
    .filter((faq) => {
      if (selectedCategory) {
        const linkedDocs = (faq.sourceDocIds || [])
          .map((docId) => docs.find((doc) => doc.id === docId))
          .filter(Boolean);
        if (!linkedDocs.length) {
          return false;
        }
        if (!linkedDocs.some((doc) => doc.category?.startsWith(selectedCategory))) {
          return false;
        }
      }
      if (keyword && !faq.question.toLowerCase().includes(keyword)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => parseDateValue(b.updatedAt) - parseDateValue(a.updatedAt));
}

function renderBreadcrumb() {
  const breadcrumb = qs('#knowledge-breadcrumb');
  if (!breadcrumb) {
    return;
  }
  if (!selectedCategory) {
    breadcrumb.innerHTML = '<span class="text-gray-500">全部分类</span>';
    return;
  }
  const parts = selectedCategory.split(' / ');
  const html = parts
    .map((segment, index) => {
      const separator = index === 0 ? '' : '<i class="fa fa-angle-right text-[10px] text-gray-300"></i>';
      return `${separator}<span class="text-gray-700">${segment}</span>`;
    })
    .join(' ');
  breadcrumb.innerHTML = `
    <button class="text-gray-400 mr-2 hover:text-primary" data-breadcrumb-all>全部分类</button>
    <span class="text-gray-400 mr-1">/</span>
    ${html}
  `;
}

function formatStatusBadge(status) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    archived: 'bg-amber-50 text-amber-700 border-amber-200',
    deprecated: 'bg-red-50 text-red-600 border-red-200',
    processing: 'bg-blue-50 text-blue-600 border-blue-200',
    disabled: 'bg-gray-100 text-gray-500 border-gray-200',
    retry: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const labels = getStatusLabels();
  const style = styles[status] || 'bg-gray-50 text-gray-500 border-gray-200';
  const label = labels[status] || status || '-';
  return `<span class="text-[11px] px-2 py-0.5 rounded-full border ${style}">${label}</span>`;
}

function getStatusLabels() {
  return {
    active: '已生效',
    archived: '已归档',
    deprecated: '已废弃',
    processing: '解析中',
    disabled: '未启用',
    retry: '需重试',
  };
}

function switchLibrary(type) {
  const docTab = qs('#knowledge-tab-doc');
  const faqTab = qs('#knowledge-tab-faq');
  const docSection = qs('#knowledge-doc-section');
  const faqSection = qs('#knowledge-faq-section');
  const docSearchWrap = qs('#knowledge-doc-search-wrap');
  const faqSearchWrap = qs('#knowledge-faq-search-wrap');
  const docStatusWrap = qs('#knowledge-doc-status-wrap');
  const docSortWrap = qs('#knowledge-doc-sort-wrap');
  const docAddBtn = qs('#knowledge-add-btn');
  const faqAddBtn = qs('#knowledge-faq-add-btn');
  const taxonomyPanel = qs('#knowledge-panel .knowledge-page aside');

  if (docTab && faqTab) {
    const isDoc = type === 'doc';
    docTab.classList.toggle('text-primary', isDoc);
    docTab.classList.toggle('border-primary', isDoc);
    docTab.classList.toggle('text-gray-500', !isDoc);
    docTab.classList.toggle('border-transparent', !isDoc);
    faqTab.classList.toggle('text-primary', !isDoc);
    faqTab.classList.toggle('border-primary', !isDoc);
    faqTab.classList.toggle('text-gray-500', isDoc);
    faqTab.classList.toggle('border-transparent', isDoc);
  }

  if (docSection && faqSection) {
    docSection.classList.toggle('hidden', type !== 'doc');
    faqSection.classList.toggle('hidden', type !== 'faq');
  }

  if (docSearchWrap && faqSearchWrap) {
    docSearchWrap.classList.toggle('hidden', type !== 'doc');
    faqSearchWrap.classList.toggle('hidden', type !== 'faq');
  }

  if (docStatusWrap) {
    docStatusWrap.classList.toggle('hidden', type !== 'doc');
  }

  if (docSortWrap) {
    docSortWrap.classList.toggle('hidden', type !== 'doc');
  }

  if (docAddBtn && faqAddBtn) {
    docAddBtn.classList.toggle('hidden', type !== 'doc');
    faqAddBtn.classList.toggle('hidden', type !== 'faq');
  }

  if (taxonomyPanel) {
    taxonomyPanel.classList.toggle('hidden', type === 'faq');
  }

  if (type === 'doc') {
    renderDocList();
  } else {
    renderFaqList();
  }
}

function openDetailModal(doc) {
  const modal = qs('#knowledge-detail-modal');
  const title = qs('#knowledge-detail-title');
  const status = qs('#knowledge-detail-status');
  const detailId = qs('#knowledge-detail-id');
  const detailUploadId = qs('#knowledge-detail-upload-id');
  const detailProgress = qs('#knowledge-detail-progress');
  const category = qs('#knowledge-detail-category');
  const tags = qs('#knowledge-detail-tags');
  const owner = qs('#knowledge-detail-owner');
  const source = qs('#knowledge-detail-source');
  const created = qs('#knowledge-detail-created');
  const updated = qs('#knowledge-detail-updated');
  const summary = qs('#knowledge-detail-summary');
  const content = qs('#knowledge-detail-content');
  const relatedFaqList = qs('#knowledge-detail-faq-list');
  const relatedFaqEmpty = qs('#knowledge-detail-faq-empty');
  const relatedFaqCount = qs('#knowledge-detail-faq-count');

  if (
    !modal || !title || !status || !summary || !content || !category || !tags ||
    !owner || !source || !created || !updated || !detailId || !detailUploadId || !detailProgress
  ) {
    return;
  }

  const uploadDocId = doc?.metadata?.uploadDocId || doc?.metadata?.taxkbDocId || '-';
  const taxkbSyncedAt = doc?.metadata?.taxkbSyncedAt;
  const aiSummaryAt = doc?.metadata?.aiSummaryAt;
  const aiTagsAt = doc?.metadata?.aiTagsAt;
  const placeholderContent = String(doc?.content || '').includes('文档上传处理中');
  title.textContent = doc.title;
  const statusLabels = getStatusLabels();
  status.textContent = statusLabels[doc.status] || doc.status || '-';
  detailId.textContent = doc.id || '-';
  detailUploadId.textContent = uploadDocId || '-';
  detailProgress.textContent = doc.status === 'processing'
    ? '解析中...'
    : formatProgressStatus(doc.status);
  category.textContent = doc.category || '-';
  const tagList = Array.isArray(doc.tags) ? doc.tags.slice(0, 10) : [];
  if (!aiTagsAt) {
    tags.textContent = '处理中...';
  } else {
    tags.textContent = tagList.length ? tagList.join('、') : '--';
  }
  owner.textContent = doc.owner || '--';
  source.textContent = doc.source || '-';
  created.textContent = doc.createdAt || '-';
  updated.textContent = doc.updatedAt || '-';
  if (!aiSummaryAt) {
    summary.textContent = '处理中...';
  } else {
    summary.textContent = doc.summary || '--';
  }

  if (!taxkbSyncedAt) {
    content.textContent = '处理中...';
  } else {
    const contentText = placeholderContent ? '--' : (doc.content || '--');
    content.textContent = contentText;
  }
  renderRelatedFaqs(doc, relatedFaqList, relatedFaqEmpty, relatedFaqCount);
  modal.classList.remove('hidden');

  if (uploadDocId && uploadDocId !== '-' && doc.status === 'processing') {
    void refreshDetailProgress(uploadDocId, detailProgress);
  }
}

function renderRelatedFaqs(doc, list, empty, count) {
  if (!list || !empty || !count) {
    return;
  }
  const relatedItems = getFaqsLinkedToDoc(doc.id);
  count.textContent = relatedItems.length ? `${relatedItems.length}条` : '0条';
  if (!relatedItems.length) {
    empty.classList.remove('hidden');
    list.innerHTML = '';
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = relatedItems
    .map((faq) => {
      return `
        <button type="button" class="w-full text-left px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50" data-related-faq-id="${faq.id}">
          <div class="font-medium text-gray-900">${faq.question}</div>
          <div class="text-[11px] text-gray-500 mt-1 line-clamp-1">${faq.answer || '暂无答案'}</div>
        </button>
      `;
    })
    .join('');
}

function closeDetailModal() {
  const modal = qs('#knowledge-detail-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function formatProgressStatus(rawStatus) {
  const normalized = String(rawStatus || '').toLowerCase();
  const map = {
    active: '已完成',
    archived: '已归档',
    deprecated: '已废弃',
    processing: '解析中',
    running: '解析中',
    pending: '等待中',
    queued: '排队中',
    success: '已完成',
    completed: '已完成',
    complete: '已完成',
    failed: '失败',
    error: '失败',
    disabled: '未启用',
    retry: '需重试',
  };
  return map[normalized] || rawStatus || '解析中';
}

async function refreshDetailProgress(uploadDocId, target) {
  try {
    const response = await fetchKnowledgeProgress(uploadDocId);
    const progress = response?.data ?? response;
    if (!progress) {
      target.textContent = '未获取到进度';
      return;
    }
    const percent = typeof progress.overall_progress === 'number' ? `${progress.overall_progress}%` : '-';
    const label = formatProgressStatus(progress.overall_status);
    target.textContent = `${label} (${percent})`;
  } catch (error) {
    target.textContent = '进度查询失败';
  }
}

function openAddModal() {
  const modal = qs('#knowledge-add-modal');
  if (!modal) {
    return;
  }
  clearAddForm();
  modal.classList.remove('hidden');
}

function closeAddModal() {
  const modal = qs('#knowledge-add-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function clearAddForm() {
  const select = qs('#knowledge-add-category');
  const fileInput = qs('#knowledge-add-files');
  const titleInput = qs('#knowledge-add-title');
  const faqMiningToggle = qs('#knowledge-faq-mining-toggle');
  const faqMiningSettings = qs('#knowledge-faq-mining-settings');
  const faqMiningCount = qs('#knowledge-faq-mining-count');
  const error = qs('#knowledge-add-error');
  if (select) {
    select.value = '';
  }
  if (titleInput) {
    titleInput.value = '';
  }
  if (fileInput) {
    fileInput.value = '';
  }
  if (faqMiningToggle) {
    faqMiningToggle.checked = false;
  }
  if (faqMiningSettings) {
    faqMiningSettings.classList.add('hidden');
  }
  if (faqMiningCount) {
    faqMiningCount.value = '5';
  }
  selectedFiles = [];
  updateTitleFromFiles();
  renderSelectedFiles(false);
  hideAddError();
  if (error) {
    error.textContent = '';
  }
}

function renderSelectedFiles(forceError) {
  const list = qs('#knowledge-add-file-list');
  if (!list) {
    return;
  }
  if (!selectedFiles.length) {
    list.innerHTML = '<div class="text-xs text-gray-400">未选择文件</div>';
    if (forceError) {
      showAddError('必须至少选择 1 个文件');
    }
    return;
  }
  list.innerHTML = selectedFiles
    .map((file, index) => {
      return `
        <div class="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-xs">
          <div class="text-gray-700 truncate">${file.name}</div>
          <button class="text-red-600 hover:text-red-700" data-file-index="${index}">移除</button>
        </div>
      `;
    })
    .join('');

  qsa('#knowledge-add-file-list [data-file-index]').forEach((btn) => {
    on(btn, 'click', (event) => {
      const index = Number(event.currentTarget.dataset.fileIndex);
      selectedFiles.splice(index, 1);
      updateTitleFromFiles();
      renderSelectedFiles(true);
    });
  });
}

async function handleSubmit() {
  hideAddError();
  const category = qs('#knowledge-add-category')?.value || '';
  const miningEnabled = qs('#knowledge-faq-mining-toggle')?.checked;
  const miningCount = Number(qs('#knowledge-faq-mining-count')?.value || 0);
  if (!isApiEnabled()) {
    showNotification('知识库 API 未配置', 'warning');
    return;
  }
  if (!category) {
    showAddError('必须选择分类');
    return;
  }
  if (!selectedFiles.length) {
    showAddError('必须至少选择 1 个文件');
    return;
  }
  if (miningEnabled && (Number.isNaN(miningCount) || miningCount < 1 || miningCount > 20)) {
    showAddError('相似问生成数量需在 1-20 之间');
    return;
  }

  const allowedExtensions = ['pdf', 'docx', 'xlsx'];
  const maxFileSize = 20 * 1024 * 1024;
  const invalidFile = selectedFiles.find((file) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(extension)) {
      return true;
    }
    if (file.size > maxFileSize) {
      return true;
    }
    return false;
  });
  if (invalidFile) {
    showAddError('仅支持 pdf/docx/xlsx，且单个文件不超过20MB');
    return;
  }

  const hashes = await Promise.all(selectedFiles.map((file) => hashFile(file)));
  const existingHashes = new Set(docs.map((doc) => doc.fileHash).filter(Boolean));
  const nextTitle = selectedFiles[0].name;
  const hasTitleConflict = docs.some((doc) => doc.category === category && normalizeText(doc.title) === normalizeText(nextTitle));
  const hasContentConflict = hashes.some((hash) => existingHashes.has(hash));
  if (hasTitleConflict && hasContentConflict) {
    showAddError('已存在相同文档');
    return;
  }
  if (hasTitleConflict) {
    const proceed = confirm('已存在同名文档，继续上传将生成新版本，是否继续？');
    if (!proceed) {
      return;
    }
  }
  if (hasContentConflict) {
    const proceed = confirm('检测到内容重复，可选择关联已有文档或继续上传为新版本。');
    if (!proceed) {
      return;
    }
  }

  try {
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      const fileHash = hashes[index];

      const title = file.name;
      const response = await createKnowledgeItem({
        title,
        content: '文档上传处理中，系统会自动解析。',
        category: 'guide',
        tags: ['上传文档'],
        source: 'upload',
        metadata: {
          taxonomyPath: category,
          status: 'processing',
          summary: '文档上传处理中，处理完成后可查看摘要。',
          owner: currentUserName || undefined,
          fileName: file.name,
          fileSize: file.size,
          fileHash,
          uploadDocId: null,
          uploadPending: true,
          faqMining: {
            enabled: Boolean(miningEnabled),
            count: miningCount,
          },
        },
      });
      const payload = response?.data ?? response;
      if (payload) {
        const mapped = mapKnowledgeDoc(payload);
        docs.push(mapped);
        renderDocList();
        queueUploadForDoc(mapped, file, category);
      }
    }

    closeAddModal();
    showNotification('文档上传已提交', 'success');
  } catch (error) {
    showAddError('文档上传失败，请稍后重试');
  }
}

function updateTitleFromFiles() {
  const titleInput = qs('#knowledge-add-title');
  if (!titleInput) {
    return;
  }
  titleInput.value = selectedFiles[0]?.name || '';
}

function showAddError(message) {
  const error = qs('#knowledge-add-error');
  if (!error) {
    return;
  }
  error.textContent = message;
  error.classList.remove('hidden');
}

function hideAddError() {
  const error = qs('#knowledge-add-error');
  if (!error) {
    return;
  }
  error.textContent = '';
  error.classList.add('hidden');
}

function openDeleteModal(doc) {
  const modal = qs('#knowledge-delete-modal');
  const message = qs('#knowledge-delete-message');
  if (!modal || !message) {
    return;
  }
  pendingDeleteId = doc.id;
  const relatedFaqs = getFaqsLinkedToDoc(doc.id);
  const faqCount = relatedFaqs.length;
  const faqHint = faqCount
    ? `
      <div class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        关联FAQ：${faqCount}条。删除文档不会删除FAQ，建议确认是否需要同时删除。
        <label class="mt-2 flex items-center gap-2 text-amber-700">
          <input id="knowledge-delete-related-faq" type="checkbox" class="rounded border-amber-300" />
          同时删除关联FAQ
        </label>
      </div>
    `
    : '';
  message.innerHTML = `
    <div>确认删除“${doc.title}”？删除后将从列表移除。</div>
    ${faqHint}
  `;
  modal.classList.remove('hidden');
}

function closeDeleteModal() {
  const modal = qs('#knowledge-delete-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  pendingDeleteId = null;
}

function openFaqModal(mode, faq) {
  const modal = qs('#knowledge-faq-modal');
  const title = qs('#knowledge-faq-modal-title');
  const status = qs('#knowledge-faq-status');
  const statusWrap = qs('#knowledge-faq-status-wrap');
  const question = qs('#knowledge-faq-question');
  const answer = qs('#knowledge-faq-answer');
  const error = qs('#knowledge-faq-error');
  const detectResults = qs('#knowledge-faq-detect-results');
  const sourceList = qs('#knowledge-faq-source-list');
  if (!modal || !title || !status || !question || !answer || !error || !detectResults || !statusWrap) {
    return;
  }

  faqModalMode = mode;
  editingFaqId = faq?.id || null;
  faqSimilarList = faq?.similarQuestions ? [...faq.similarQuestions] : [];

  title.textContent = mode === 'edit' ? '编辑 FAQ' : mode === 'view' ? '查看 FAQ' : '新增 FAQ';
  status.value = faq?.status || 'active';
  question.value = faq?.question || '';
  answer.value = faq?.answer || '';
  error.textContent = '';
  error.classList.add('hidden');
  detectResults.classList.add('hidden');
  detectResults.innerHTML = '';
  renderFaqSimilarList();
  renderFaqSourceList(faq?.sourceDocIds || [], sourceList, { mode });

  statusWrap.classList.toggle('hidden', mode === 'add');
  if (mode === 'add') {
    status.value = 'active';
  }

  setFaqModalEditable(mode !== 'view');
  modal.classList.remove('hidden');
}

function setFaqModalEditable(isEditable) {
  const status = qs('#knowledge-faq-status');
  const question = qs('#knowledge-faq-question');
  const answer = qs('#knowledge-faq-answer');
  const detectBtn = qs('#knowledge-faq-detect');
  const similarInput = qs('#knowledge-faq-similar-input');
  const similarAddBtn = qs('#knowledge-faq-similar-add');
  const similarGenerateBtn = qs('#knowledge-faq-similar-generate');
  const saveBtn = qs('#knowledge-faq-save');
  const cancelBtn = qs('#knowledge-faq-cancel');
  const sourceInputs = qsa('#knowledge-faq-source-list input[type="checkbox"]');

  [status, question, answer, similarInput].forEach((el) => {
    if (el) {
      el.disabled = !isEditable;
      el.classList.toggle('bg-gray-50', !isEditable);
    }
  });

  [detectBtn, similarAddBtn, similarGenerateBtn].forEach((el) => {
    if (el) {
      el.classList.toggle('hidden', !isEditable);
    }
  });
  sourceInputs.forEach((input) => {
    input.disabled = !isEditable;
  });

  if (saveBtn) {
    saveBtn.classList.toggle('hidden', !isEditable);
  }
  if (cancelBtn && !isEditable) {
    cancelBtn.textContent = '关闭';
  } else if (cancelBtn) {
    cancelBtn.textContent = '取消';
  }
}

function closeFaqModal() {
  const modal = qs('#knowledge-faq-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  editingFaqId = null;
  faqModalMode = 'add';
  faqSimilarList = [];
}

function renderFaqSourceList(selectedIds, container, options = {}) {
  if (!container) {
    return;
  }
  const mode = options.mode || 'edit';
  const sourceDocs = mode === 'view'
    ? docs.filter((doc) => selectedIds.includes(doc.id))
    : docs;
  if (!sourceDocs.length) {
    container.innerHTML = '<div class="text-xs text-gray-400">暂无可关联文档</div>';
    return;
  }
  if (mode === 'view') {
    container.innerHTML = sourceDocs
      .map((doc) => `<div class="text-xs text-gray-600 truncate">${doc.title}</div>`)
      .join('');
    return;
  }
  container.innerHTML = sourceDocs
    .map((doc) => {
      const checked = selectedIds.includes(doc.id) ? 'checked' : '';
      return `
        <label class="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" value="${doc.id}" ${checked} />
          <span class="truncate">${doc.title}</span>
        </label>
      `;
    })
    .join('');
}

function getSelectedFaqSourceIds() {
  return qsa('#knowledge-faq-source-list input[type="checkbox"]:checked').map((input) => input.value);
}

function openFaqDeleteModal(faq) {
  const modal = qs('#knowledge-faq-delete-modal');
  const message = qs('#knowledge-faq-delete-message');
  if (!modal || !message) {
    return;
  }
  pendingFaqDeleteId = faq.id;
  message.textContent = `确认删除“${faq.question}”？删除后将从列表移除。`;
  modal.classList.remove('hidden');
}

function closeFaqDeleteModal() {
  const modal = qs('#knowledge-faq-delete-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  pendingFaqDeleteId = null;
}

function handleFaqSave() {
  const status = qs('#knowledge-faq-status')?.value || 'active';
  const question = qs('#knowledge-faq-question')?.value.trim() || '';
  const answer = qs('#knowledge-faq-answer')?.value.trim() || '';
  const error = qs('#knowledge-faq-error');
  const sourceDocIds = getSelectedFaqSourceIds();
  if (!error) {
    return;
  }

  error.classList.add('hidden');
  error.textContent = '';

  if (!isApiEnabled()) {
    showNotification('知识库 API 未配置', 'warning');
    return;
  }

  if (!question) {
    showFaqError('问题为必填');
    return;
  }
  if (!answer) {
    showFaqError('答案为必填');
    return;
  }

  const normalizedQuestion = normalizeText(question);
  const normalizedSimilar = faqSimilarList.map((item) => normalizeText(item));
  if (normalizedSimilar.includes(normalizedQuestion)) {
    showFaqError('相似问与主问题不能重复');
    return;
  }
  if (new Set(normalizedSimilar).size !== normalizedSimilar.length) {
    showFaqError('相似问存在重复');
    return;
  }

  const payload = {
    title: question,
    content: answer,
    category: 'faq',
    tags: ['FAQ'],
    metadata: {
      status,
      similarQuestions: [...faqSimilarList],
      sourceDocIds: [...sourceDocIds],
    },
  };

  const savePromise = faqModalMode === 'edit' && editingFaqId
    ? updateKnowledgeItem(editingFaqId, payload)
    : createKnowledgeItem({ ...payload, source: 'knowledge' });

  savePromise
    .then((response) => {
      const data = response?.data ?? response;
      if (!data) {
        throw new Error('Invalid response');
      }
      const mapped = mapKnowledgeFaq(data);
      if (faqModalMode === 'edit' && editingFaqId) {
        faqs = faqs.map((faq) => (faq.id === editingFaqId ? mapped : faq));
      } else {
        faqs.push(mapped);
      }
      renderFaqList();
      closeFaqModal();
      showNotification('FAQ 已保存', 'success');
    })
    .catch(() => {
      showFaqError('FAQ 保存失败，请稍后重试');
    });
}

function handleFaqDetect() {
  clearFaqError();
  const question = qs('#knowledge-faq-question')?.value.trim() || '';
  if (!question) {
    showFaqError('请先填写主问题再检测');
    return;
  }
  const results = [
    `${question} 如何处理？`,
    `${question} 有哪些注意事项？`,
    `${question} 的常见问题是什么？`,
  ];
  const container = qs('#knowledge-faq-detect-results');
  if (!container) {
    return;
  }
  container.classList.remove('hidden');
  container.innerHTML = results
    .map((item) => {
      return `
        <div class="flex items-center justify-between py-1">
          <span>${item}</span>
          <button class="text-xs text-primary hover:underline" data-similar-add="${item}">添加</button>
        </div>
      `;
    })
    .join('');

  qsa('#knowledge-faq-detect-results [data-similar-add]').forEach((btn) => {
    on(btn, 'click', (event) => {
      const value = event.currentTarget.dataset.similarAdd || '';
      addFaqSimilar(value);
    });
  });
}

function handleFaqManualAdd() {
  clearFaqError();
  const input = qs('#knowledge-faq-similar-input');
  if (!input) {
    return;
  }
  const value = input.value.trim();
  if (!value) {
    return;
  }
  const added = addFaqSimilar(value);
  if (added) {
    input.value = '';
  }
}

function handleFaqBulkGenerate() {
  clearFaqError();
  const base = qs('#knowledge-faq-question')?.value.trim() || '常见问题';
  const generated = [
    `${base} 的处理时长是多少？`,
    `${base} 可以线上解决吗？`,
    `${base} 如何联系负责人？`,
  ];
  generated.forEach((item) => addFaqSimilar(item));
}

function addFaqSimilar(value) {
  const question = qs('#knowledge-faq-question')?.value.trim() || '';
  if (!value) {
    return false;
  }
  if (normalizeText(value) === normalizeText(question)) {
    showFaqError('相似问与主问题不能重复');
    return false;
  }
  if (faqSimilarList.some((item) => normalizeText(item) === normalizeText(value))) {
    showFaqError('相似问已存在');
    return false;
  }
  faqSimilarList.push(value);
  renderFaqSimilarList();
  return true;
}

function renderFaqSimilarList() {
  const list = qs('#knowledge-faq-similar-list');
  if (!list) {
    return;
  }
  const isEditable = faqModalMode !== 'view';
  if (!faqSimilarList.length) {
    list.innerHTML = '<div class="text-[11px] text-gray-400">暂无相似问</div>';
    return;
  }
  list.innerHTML = faqSimilarList
    .map((item, index) => {
      return `
        <span class="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
          ${item}
          ${isEditable ? `
          <button class="text-blue-500 hover:text-blue-700" data-similar-remove="${index}">
            <i class="fa fa-times"></i>
          </button>
          ` : ''}
        </span>
      `;
    })
    .join('');

  if (isEditable) {
    qsa('#knowledge-faq-similar-list [data-similar-remove]').forEach((btn) => {
      on(btn, 'click', (event) => {
        const index = Number(event.currentTarget.dataset.similarRemove);
        faqSimilarList.splice(index, 1);
        renderFaqSimilarList();
      });
    });
  }
}

function showFaqError(message) {
  const error = qs('#knowledge-faq-error');
  if (!error) {
    return;
  }
  error.textContent = message;
  error.classList.remove('hidden');
}

function clearFaqError() {
  const error = qs('#knowledge-faq-error');
  if (!error) {
    return;
  }
  error.textContent = '';
  error.classList.add('hidden');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function isNodeExpanded(nodeId) {
  if (!treeState.has(nodeId)) {
    treeState.set(nodeId, true);
  }
  return treeState.get(nodeId);
}

async function handleTreeAction(action, nodeId) {
  if (!isApiEnabled()) {
    showNotification('知识库 API 未配置', 'warning');
    return;
  }
  if (action === 'add-root') {
    const name = prompt('请输入一级分类名称');
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      return;
    }
    if (knowledgeTaxonomy.some((node) => normalizeCategoryName(node.name) === normalizeCategoryName(trimmed))) {
      alert('分类已存在');
      return;
    }
    if (knowledgeTaxonomy.length >= 50) {
      alert('单个层级最多支持 50 个分类');
      return;
    }
    const newNode = createNode(trimmed);
    knowledgeTaxonomy.push(newNode);
    treeState.set(newNode.id, true);
    await safePersistTaxonomy();
    renderTree();
    renderCategoryOptions();
    return;
  }

  const nodeInfo = findNodeById(nodeId);
  if (!nodeInfo) {
    return;
  }

  if (action === 'add-child') {
    if (nodeInfo.depth >= MAX_CATEGORY_DEPTH) {
      alert(`最多支持 ${MAX_CATEGORY_DEPTH} 级分类`);
      return;
    }
    const name = prompt('请输入子分类名称');
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      return;
    }
    if (nodeInfo.node.children.some((child) => normalizeCategoryName(child.name) === normalizeCategoryName(trimmed))) {
      alert('分类已存在');
      return;
    }
    if (nodeInfo.node.children.length >= 50) {
      alert('单个层级最多支持 50 个分类');
      return;
    }
    nodeInfo.node.children.push(createNode(trimmed));
    treeState.set(nodeInfo.node.id, true);
    if (selectedCategory === nodeInfo.path) {
      selectedCategory = '';
    }
    await safePersistTaxonomy();
    renderTree();
    renderCategoryOptions();
    return;
  }

  if (action === 'edit') {
    const name = prompt('请输入新的分类名称', nodeInfo.node.name);
    const trimmed = String(name || '').trim();
    if (!trimmed || trimmed === nodeInfo.node.name) {
      return;
    }
    const siblings = nodeInfo.parent ? nodeInfo.parent.children : knowledgeTaxonomy;
    if (siblings.some((node) => normalizeCategoryName(node.name) === normalizeCategoryName(trimmed))) {
      alert('分类已存在');
      return;
    }
    const oldPath = nodeInfo.path;
    nodeInfo.node.name = trimmed;
    const newPath = nodeInfo.parentPath ? `${nodeInfo.parentPath} / ${trimmed}` : trimmed;
    if (selectedCategory && selectedCategory.startsWith(oldPath)) {
      selectedCategory = selectedCategory.replace(oldPath, newPath);
    }
    const docsToUpdate = docs.filter((doc) => doc.category?.startsWith(oldPath));
    for (const doc of docsToUpdate) {
      const nextPath = doc.category.replace(oldPath, newPath);
      await updateDocTaxonomyPath(doc, nextPath);
    }
    await safePersistTaxonomy();
    renderTree();
    renderCategoryOptions();
    renderDocList();
    return;
  }

  if (action === 'delete') {
    if (nodeInfo.node.children?.length) {
      alert('该分类下存在子级分类，请先删除子级分类。');
      return;
    }
    const docsInCategory = getDocsUnderCategory(nodeInfo.path);
    if (docsInCategory.length) {
      alert('该分类下存在文档或FAQ，请先迁移或删除相关内容。');
      return;
    }
    if (!confirm(`确认删除分类“${nodeInfo.node.name}”？`)) {
      return;
    }
    const removed = removeNodeById(nodeId);
    if (!removed) {
      return;
    }
    if (selectedCategory && selectedCategory.startsWith(removed.path)) {
      selectedCategory = '';
    }
    await persistTaxonomyConfig();
    renderTree();
    renderCategoryOptions();
    renderDocList();
  }
}

function createNode(name) {
  return {
    id: `node-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    children: [],
  };
}

function findNodeById(nodeId) {
  let result = null;
  const walk = (nodes, parent, parentPath, depth) => {
    nodes.forEach((node) => {
      const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
      if (node.id === nodeId) {
        result = {
          node,
          parent,
          parentPath,
          path,
          depth,
        };
        return;
      }
      if (node.children?.length) {
        walk(node.children, node, path, depth + 1);
      }
    });
  };
  walk(knowledgeTaxonomy, null, '', 1);
  return result;
}

function removeNodeById(nodeId) {
  let removed = null;
  const walk = (nodes, parentPath) => {
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      const node = nodes[i];
      const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
      if (node.id === nodeId) {
        nodes.splice(i, 1);
        removed = { node, path };
        return;
      }
      if (node.children?.length) {
        walk(node.children, path);
      }
    }
  };
  walk(knowledgeTaxonomy, '');
  return removed;
}


function parseDateValue(value) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return 0;
  }
  return timestamp;
}

function initSimpleKnowledgePage() {
  const container = qs('#knowledge-card-container');
  const searchInput = qs('#knowledge-search-input');
  if (!container || !searchInput) {
    return;
  }

  const searchBtn = qs('#knowledge-search-btn');
  const quickTags = qsa('.knowledge-quick-tag');
  const filterType = qs('#knowledge-filter-type');
  const filterSource = qs('#knowledge-filter-source');
  const filterCategory = qs('#knowledge-filter-category');
  const filterTime = qs('#knowledge-filter-time');
  const collapseBtn = qs('#knowledge-preview-collapse');
  const expandBtn = qs('#knowledge-preview-open');
  const newTabBtn = qs('#knowledge-preview-newtab');

  if (!simpleEmptyText) {
    const emptyState = qs('#knowledge-empty-state');
    simpleEmptyText = emptyState?.textContent?.trim() || '请选择知识条目查看详情';
  }

  const runFilter = () => {
    collectSimpleKnowledgeRows();
    const keyword = normalizeText(searchInput.value);
    const filters = {
      type: filterType?.value || '',
      source: filterSource?.value || '',
      category: filterCategory?.value || '',
      time: filterTime?.value || '',
    };

    let visibleCount = 0;
    simpleKnowledgeRows.forEach((row) => {
      const matched = matchesSimpleKnowledgeRow(row, keyword, filters);
      row.element.style.display = matched ? '' : 'none';
      if (matched) {
        visibleCount += 1;
      }
    });

    updateSimpleEmptyState(visibleCount === 0);
  };

  on(searchBtn, 'click', () => runFilter());
  on(searchInput, 'keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runFilter();
    }
  });

  quickTags.forEach((tag) => {
    on(tag, 'click', () => {
      const keyword = tag.getAttribute('data-keyword') || tag.textContent.trim();
      searchInput.value = keyword;
      runFilter();
    });
  });

  [filterType, filterSource, filterCategory, filterTime].forEach((input) => {
    on(input, 'change', () => runFilter());
  });

  on(collapseBtn, 'click', () => toggleKnowledgePreviewExpand(false));
  on(expandBtn, 'click', () => toggleKnowledgePreviewExpand(true));
  on(newTabBtn, 'click', () => {
    if (activeKnowledgeCard?.url) {
      openKnowledgeSource(activeKnowledgeCard.url);
    }
  });

  on(container, 'click', (event) => {
    const target = event.target.closest('[data-click]');
    if (!target) {
      return;
    }

    const action = target.getAttribute('data-click');
    if (action !== 'knowledge-detail' && action !== 'knowledge-video') {
      return;
    }

    event.preventDefault();
    const row = target.closest('.knowledge-row');
    const title = target.getAttribute('data-label')
      || row?.querySelector('h4')?.textContent
      || '知识条目';

    openKnowledgePreview(
      {
        title,
        url: target.getAttribute('data-url') || '#',
        preview: target.getAttribute('data-preview') || '',
        full: target.getAttribute('data-full') || '',
        type: target.getAttribute('data-type') || '文档',
        updated: target.getAttribute('data-updated') || '',
        tags: parseKnowledgeTags(target.getAttribute('data-tags')),
        source: target.getAttribute('data-source') || '',
        category: target.getAttribute('data-category') || '',
      },
      target,
    );
  });

  runFilter();
}

function collectSimpleKnowledgeRows() {
  const container = qs('#knowledge-card-container');
  if (!container) {
    simpleKnowledgeRows = [];
    return;
  }

  simpleKnowledgeRows = qsa('.knowledge-row', container).map((row) => {
    const actionBtn = row.querySelector('[data-click]');
    const title = actionBtn?.getAttribute('data-label') || row.querySelector('h4')?.textContent || '';
    const preview = actionBtn?.getAttribute('data-preview') || row.querySelector('p')?.textContent || '';
    const type = actionBtn?.getAttribute('data-type') || '';
    const source = actionBtn?.getAttribute('data-source') || '';
    const category = actionBtn?.getAttribute('data-category') || '';
    const tags = actionBtn?.getAttribute('data-tags') || '';
    const updated = actionBtn?.getAttribute('data-updated') || '';

    return {
      element: row,
      title,
      preview,
      type,
      source,
      category,
      tags,
      updated,
    };
  });
}

function matchesSimpleKnowledgeRow(row, keyword, filters) {
  const title = normalizeText(row.title);
  const preview = normalizeText(row.preview);
  const source = normalizeText(row.source);
  const category = normalizeText(row.category);
  const tags = normalizeText(row.tags);

  if (keyword) {
    const haystack = `${title} ${preview} ${source} ${category} ${tags}`;
    if (!haystack.includes(keyword)) {
      return false;
    }
  }

  const typeFilter = normalizeKnowledgeType(filters.type);
  if (typeFilter) {
    const rowType = normalizeKnowledgeType(row.type);
    if (!rowType || rowType !== typeFilter) {
      return false;
    }
  }

  if (filters.source) {
    const sourceFilter = normalizeText(filters.source);
    if (source && !source.includes(sourceFilter)) {
      return false;
    }
  }

  if (filters.category) {
    const categoryFilter = normalizeText(filters.category);
    if (category && !category.includes(categoryFilter)) {
      return false;
    }
  }

  if (filters.time) {
    const rangeDays = Number(filters.time);
    const updatedAt = parseDateValue(row.updated);
    if (!updatedAt || Number.isNaN(rangeDays)) {
      return false;
    }
    const deltaDays = (Date.now() - updatedAt) / (24 * 60 * 60 * 1000);
    if (deltaDays > rangeDays) {
      return false;
    }
  }

  return true;
}

function updateSimpleEmptyState(isEmpty) {
  const emptyState = qs('#knowledge-empty-state');
  if (!emptyState) {
    return;
  }

  if (isEmpty) {
    closeKnowledgePreview();
    emptyState.textContent = '暂无匹配的知识条目';
    emptyState.classList.remove('hidden');
    return;
  }

  const preview = qs('#knowledge-preview');
  if (preview && !preview.classList.contains('hidden')) {
    emptyState.classList.add('hidden');
    return;
  }

  emptyState.textContent = simpleEmptyText || '请选择知识条目查看详情';
  emptyState.classList.remove('hidden');
}

function normalizeKnowledgeType(type) {
  const value = normalizeText(type);
  if (value === 'video' || value === '视频') {
    return '视频';
  }
  if (value === 'document' || value === '文档') {
    return '文档';
  }
  if (value === 'flow' || value === '流程') {
    return '流程';
  }
  return type ? type.trim() : '';
}

function parseKnowledgeTags(tagStr = '') {
  if (Array.isArray(tagStr)) {
    return tagStr;
  }
  return String(tagStr || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function openKnowledgePreview(options = {}, triggerBtn = null) {
  const wrapper = qs('#knowledge-preview');
  const emptyState = qs('#knowledge-empty-state');
  const titleEl = qs('#knowledge-preview-title');
  const typeEl = qs('#knowledge-preview-type');
  const updatedEl = qs('#knowledge-preview-updated');
  const sourceEl = qs('#knowledge-preview-source');
  const bodyEl = qs('#knowledge-preview-body');
  const tagWrap = qs('#knowledge-preview-tags');
  const expandBtn = qs('#knowledge-preview-open');

  if (!wrapper || !titleEl || !typeEl || !updatedEl || !sourceEl || !bodyEl || !tagWrap) {
    return;
  }

  const previewText = options.preview || options.full || '';
  const fullText = options.full || options.preview || previewText;

  activeKnowledgeCard = {
    title: options.title,
    url: options.url,
    full: fullText,
    preview: previewText,
  };

  titleEl.textContent = options.title || '知识原文预览';
  typeEl.textContent = options.type || '文档';
  updatedEl.textContent = options.updated ? `更新于：${options.updated}` : '更新于：-';
  sourceEl.textContent = `来源：${options.source || options.url || '内部知识库'}`;

  bodyEl.textContent = previewText || '暂无预览内容';
  tagWrap.innerHTML = '';
  (options.tags || []).forEach((tag) => {
    const badge = document.createElement('span');
    badge.className = 'px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full';
    badge.textContent = tag;
    tagWrap.appendChild(badge);
  });

  wrapper.classList.remove('hidden');
  wrapper.dataset.expanded = 'false';
  if (emptyState) {
    emptyState.classList.add('hidden');
  }
  if (expandBtn) {
    expandBtn.innerHTML = '<i class="fa fa-angle-down mr-1"></i>展开全文';
  }

  if (triggerBtn) {
    triggerBtn.blur();
  }
}

export function toggleKnowledgePreviewExpand(forceExpand) {
  const wrapper = qs('#knowledge-preview');
  const bodyEl = qs('#knowledge-preview-body');
  const btn = qs('#knowledge-preview-open');
  const fade = wrapper?.querySelector('.knowledge-preview-fade');

  if (!wrapper || !bodyEl || !btn) {
    return;
  }

  const shouldExpand =
    typeof forceExpand === 'boolean'
      ? forceExpand
      : wrapper.dataset.expanded !== 'true';

  wrapper.dataset.expanded = shouldExpand ? 'true' : 'false';
  bodyEl.textContent = shouldExpand
    ? activeKnowledgeCard?.full || bodyEl.textContent
    : activeKnowledgeCard?.preview || bodyEl.textContent;

  if (fade) {
    fade.style.display = shouldExpand ? 'none' : 'block';
  }
  btn.innerHTML = shouldExpand
    ? '<i class="fa fa-angle-up mr-1"></i>收起全文'
    : '<i class="fa fa-angle-down mr-1"></i>展开全文';
}

export function closeKnowledgePreview() {
  const wrapper = qs('#knowledge-preview');
  const emptyState = qs('#knowledge-empty-state');
  if (wrapper) {
    wrapper.classList.add('hidden');
    wrapper.dataset.expanded = 'false';
  }
  if (emptyState) {
    emptyState.textContent = simpleEmptyText || '请选择知识条目查看详情';
    emptyState.classList.remove('hidden');
  }
  activeKnowledgeCard = null;
}

export function openKnowledgeSource(url) {
  if (url) {
    window.open(url, '_blank');
  }
}
