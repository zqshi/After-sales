import { qs, qsa, on } from '../core/dom.js';

const MAX_CATEGORY_DEPTH = 3;

const DOC_ALLOWED_STATUSES = ['active', 'archived', 'deprecated'];

const knowledgeTaxonomy = [
  {
    id: 'root-ks-cloud',
    name: '金山云',
    children: [
      { id: 'ks-cloud-salary-tax', name: '薪酬个税', children: [] },
      { id: 'ks-cloud-insurance', name: '五险一金', children: [] },
      { id: 'ks-cloud-benefit', name: '福利管理', children: [] },
      { id: 'ks-cloud-attendance', name: '考勤休假', children: [] },
      { id: 'ks-cloud-transfer', name: '入转调离', children: [] },
      { id: 'ks-cloud-resident', name: '工作居住证', children: [] },
      { id: 'ks-cloud-archive', name: '档案管理', children: [] },
      { id: 'ks-cloud-policy', name: '员工政策', children: [] },
      { id: 'ks-cloud-general', name: '通用', children: [] },
    ],
  },
];

const docs = [
  {
    id: 'doc-001',
    title: '个税专项扣除材料提交流程',
    status: 'active',
    summary: '说明专项附加扣除材料提交清单与时间节点。',
    content: '适用范围：金山云-薪酬个税。\n1. 提交材料清单。\n2. 线上提交入口与截止时间。\n3. 常见问题与反馈渠道。',
    category: '金山云 / 薪酬个税',
    tags: ['专项扣除', '流程'],
    owner: '李文',
    source: 'HR政策库',
    createdAt: '2024-02-10 10:20',
    updatedAt: '2024-02-18 09:30',
    fileHash: 'hash-ks-001',
  },
  {
    id: 'doc-002',
    title: '考勤异常处理指引',
    status: 'archived',
    summary: '覆盖补卡、迟到、旷工判定及审批路径。',
    content: '流程说明：\n- 员工发起异常说明\n- 主管审批\n- HR复核与结论通知',
    category: '金山云 / 考勤休假',
    tags: ['考勤', '审批'],
    owner: '赵琪',
    source: '服务台知识沉淀',
    createdAt: '2024-02-01 09:10',
    updatedAt: '2024-02-16 14:05',
    fileHash: 'hash-ks-002',
  },
  {
    id: 'doc-003',
    title: '员工档案迁转说明',
    status: 'deprecated',
    summary: '归档、迁转与存放政策概览。',
    content: '档案迁转需提前 3 个工作日预约，并由 HR 统一对接。',
    category: '金山云 / 档案管理',
    tags: ['档案', '流程'],
    owner: '王珊',
    source: '历史归档',
    createdAt: '2023-12-28 15:30',
    updatedAt: '2024-02-10 18:20',
    fileHash: 'hash-ks-003',
  },
  {
    id: 'doc-004',
    title: '通用福利发放说明',
    status: 'active',
    summary: '节日福利发放周期、领取方式与差异化策略。',
    content: '发放周期：季度末。\n领取方式：线上兑换码或实物邮寄。\n如有疑问请联系 HR 伙伴。',
    category: '金山云 / 通用',
    tags: ['福利', '发放'],
    owner: '陈琳',
    source: '运营配置',
    createdAt: '2024-01-20 11:05',
    updatedAt: '2024-02-12 10:10',
    fileHash: 'hash-ks-004',
  },
];

const faqs = [
  {
    id: 'faq-001',
    question: '如何提交个税专项扣除材料？',
    answer: '进入薪酬个税模块，下载材料清单并在规定时间内提交。',
    status: 'active',
    similarQuestions: ['专项扣除材料提交入口在哪？', '个税专项扣除如何补交？'],
    createdAt: '2024-02-08 10:10',
    updatedAt: '2024-02-18 10:10',
  },
  {
    id: 'faq-002',
    question: '补卡流程需要哪些审批？',
    answer: '员工提交申请后由主管审批，HR 复核后生效。',
    status: 'archived',
    similarQuestions: ['考勤补卡怎么走流程？'],
    createdAt: '2024-01-15 09:00',
    updatedAt: '2024-02-11 09:20',
  },
];

const treeState = new Map();
let selectedCategory = '';
let treeQuery = '';
let docQuery = '';
let faqQuery = '';
let selectedFiles = [];
let pendingDeleteId = null;
let pendingFaqDeleteId = null;
let activeLibrary = 'doc';
let editingFaqId = null;
let faqModalMode = 'add';
let faqSimilarList = [];
let simpleKnowledgeRows = [];
let activeKnowledgeCard = null;
let simpleEmptyText = '';

export function initKnowledgeBase() {
  const treeSearchInput = qs('#knowledge-tree-search');
  const docSearchInput = qs('#knowledge-doc-search');
  const addBtn = qs('#knowledge-add-btn');
  const emptyAddBtn = qs('#knowledge-empty-add');
  const tabDocBtn = qs('#knowledge-tab-doc');
  const tabFaqBtn = qs('#knowledge-tab-faq');
  const faqSearchInput = qs('#knowledge-faq-search');
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
  const faqMiningCount = qs('#knowledge-faq-mining-count');
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

  renderTree();
  renderCategoryOptions();
  renderDocList();
  renderFaqList();
  renderBreadcrumb();

  on(treeSearchInput, 'input', (event) => {
    treeQuery = event.target.value.trim();
    renderTree();
  });

  on(docSearchInput, 'input', (event) => {
    docQuery = event.target.value.trim();
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

  on(deleteConfirmBtn, 'click', () => {
    if (!pendingDeleteId) {
      return;
    }
    const targetIndex = docs.findIndex((doc) => doc.id === pendingDeleteId);
    if (targetIndex > -1 && DOC_ALLOWED_STATUSES.includes(docs[targetIndex].status)) {
      docs.splice(targetIndex, 1);
      renderDocList();
    }
    closeDeleteModal();
  });

  on(faqDeleteConfirmBtn, 'click', () => {
    if (!pendingFaqDeleteId) {
      return;
    }
    const targetIndex = faqs.findIndex((faq) => faq.id === pendingFaqDeleteId);
    if (targetIndex > -1 && DOC_ALLOWED_STATUSES.includes(faqs[targetIndex].status)) {
      faqs.splice(targetIndex, 1);
      renderFaqList();
    }
    closeFaqDeleteModal();
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
      handleTreeAction(action, nodeId);
      return;
    }

    const leaf = event.target.closest('[data-tree-leaf]');
    if (leaf) {
      selectedCategory = leaf.dataset.treeLeaf || '';
      renderBreadcrumb();
      renderDocList();
      renderFaqList();
      renderTree();
    }
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

  initSimpleKnowledgePage();
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

  const isLeaf = !hasChildren;
  const isActive = selectedCategory === path;

  const toggleIcon = hasChildren
    ? `<i class="fa ${expanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-xs text-gray-400"></i>`
    : '<i class="fa fa-file-o text-xs text-gray-300"></i>';

  const label = isLeaf
    ? `<button class="flex-1 text-left whitespace-normal break-words ${isActive ? 'text-primary' : 'text-gray-600'}" title="${path}" data-tree-leaf="${path}">${node.name}</button>`
    : `<span class="text-sm font-medium text-gray-700 whitespace-normal break-words" title="${path}">${node.name}</span>`;

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
      if (selectedCategory && doc.category !== selectedCategory) {
        return false;
      }
      if (keyword && !doc.title.toLowerCase().includes(keyword)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => parseDateValue(b.updatedAt) - parseDateValue(a.updatedAt));
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
    breadcrumb.textContent = '全部分类';
    return;
  }
  const parts = selectedCategory.split(' / ');
  const html = parts
    .map((segment, index) => {
      const separator = index === 0 ? '' : '<i class="fa fa-angle-right text-[10px] text-gray-300"></i>';
      return `${separator}<span class="text-gray-700">${segment}</span>`;
    })
    .join(' ');
  breadcrumb.innerHTML = `<span class="text-gray-400 mr-1">分类路径：</span>${html}`;
}

function formatStatusBadge(status) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    archived: 'bg-amber-50 text-amber-700 border-amber-200',
    deprecated: 'bg-red-50 text-red-600 border-red-200',
  };
  const style = styles[status] || 'bg-gray-50 text-gray-500 border-gray-200';
  return `<span class="text-[11px] px-2 py-0.5 rounded-full border ${style}">${status}</span>`;
}

function switchLibrary(type) {
  activeLibrary = type;
  const docTab = qs('#knowledge-tab-doc');
  const faqTab = qs('#knowledge-tab-faq');
  const docSection = qs('#knowledge-doc-section');
  const faqSection = qs('#knowledge-faq-section');
  const docSearchWrap = qs('#knowledge-doc-search-wrap');
  const faqSearchWrap = qs('#knowledge-faq-search-wrap');
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
  const category = qs('#knowledge-detail-category');
  const tags = qs('#knowledge-detail-tags');
  const owner = qs('#knowledge-detail-owner');
  const source = qs('#knowledge-detail-source');
  const created = qs('#knowledge-detail-created');
  const updated = qs('#knowledge-detail-updated');
  const summary = qs('#knowledge-detail-summary');
  const content = qs('#knowledge-detail-content');

  if (!modal || !title || !status || !summary || !content || !category || !tags || !owner || !source || !created || !updated) {
    return;
  }

  title.textContent = doc.title;
  status.textContent = doc.status;
  category.textContent = doc.category || '-';
  tags.textContent = doc.tags?.length ? doc.tags.join('、') : '-';
  owner.textContent = doc.owner || '-';
  source.textContent = doc.source || '-';
  created.textContent = doc.createdAt || '-';
  updated.textContent = doc.updatedAt || '-';
  summary.textContent = doc.summary || '-';
  content.textContent = doc.content || '-';
  modal.classList.remove('hidden');
}

function closeDetailModal() {
  const modal = qs('#knowledge-detail-modal');
  if (modal) {
    modal.classList.add('hidden');
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

  const hashes = await Promise.all(selectedFiles.map((file) => hashFile(file)));
  const existingHashes = new Set(docs.map((doc) => doc.fileHash).filter(Boolean));
  if (hashes.some((hash) => existingHashes.has(hash))) {
    showAddError('已存在');
    return;
  }

  const now = new Date();
  const newDoc = {
    id: `doc-${now.getTime()}`,
    title: selectedFiles[0].name,
    status: 'active',
    summary: '新增文档默认摘要，待补充。',
    content: '新增文档默认内容，待补充。',
    category: category,
    tags: ['待补充'],
    owner: '待分配',
    source: '人工上传',
    createdAt: formatDate(now),
    updatedAt: formatDate(now),
    fileHash: hashes[0],
  };

  docs.push(newDoc);
  renderDocList();
  closeAddModal();
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
  message.textContent = `确认删除“${doc.title}”？删除后将从列表移除。`;
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
  if (!error) {
    return;
  }

  error.classList.add('hidden');
  error.textContent = '';

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

  const now = new Date();
  if (faqModalMode === 'edit' && editingFaqId) {
    const target = faqs.find((faq) => faq.id === editingFaqId);
    if (target) {
      target.category = category;
      target.status = status;
      target.question = question;
      target.answer = answer;
      target.similarQuestions = [...faqSimilarList];
      target.updatedAt = formatDate(now);
    }
  } else {
    faqs.push({
      id: `faq-${now.getTime()}`,
      question: question,
      answer: answer,
      status: status,
      similarQuestions: [...faqSimilarList],
      createdAt: formatDate(now),
      updatedAt: formatDate(now),
    });
  }

  renderFaqList();
  closeFaqModal();
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

function handleTreeAction(action, nodeId) {
  if (action === 'add-root') {
    const name = prompt('请输入一级分类名称');
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      return;
    }
    if (knowledgeTaxonomy.some((node) => node.name === trimmed)) {
      alert('分类已存在');
      return;
    }
    const newNode = createNode(trimmed);
    knowledgeTaxonomy.push(newNode);
    treeState.set(newNode.id, true);
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
    if (nodeInfo.node.children.some((child) => child.name === trimmed)) {
      alert('分类已存在');
      return;
    }
    nodeInfo.node.children.push(createNode(trimmed));
    treeState.set(nodeInfo.node.id, true);
    if (selectedCategory === nodeInfo.path) {
      selectedCategory = '';
    }
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
    if (siblings.some((node) => node.name === trimmed)) {
      alert('分类已存在');
      return;
    }
    const oldPath = nodeInfo.path;
    nodeInfo.node.name = trimmed;
    const newPath = nodeInfo.parentPath ? `${nodeInfo.parentPath} / ${trimmed}` : trimmed;
    if (selectedCategory && selectedCategory.startsWith(oldPath)) {
      selectedCategory = selectedCategory.replace(oldPath, newPath);
    }
    docs.forEach((doc) => {
      if (doc.category?.startsWith(oldPath)) {
        doc.category = doc.category.replace(oldPath, newPath);
      }
    });
    renderTree();
    renderCategoryOptions();
    renderDocList();
    return;
  }

  if (action === 'delete') {
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

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
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
