import { qs, qsa, on } from '../core/dom.js';
import { addToSuggestion } from '../chat/index.js';
import { isApiEnabled } from '../api.js';
import { knowledgeController } from '../presentation/knowledge/KnowledgeController.js';

let activeKnowledgeCard = null;

export function initKnowledgeBase() {
  bindKnowledgeClicks();
  bindPreviewButtons();
  initKnowledgeSearch();
  loadKnowledgeCards();
  document.addEventListener('knowledge-item-created', () => {
    loadKnowledgeCards();
  });
}

function bindKnowledgeClicks() {
  const knowledgeTab = qs('#knowledge-tab');
  if (!knowledgeTab) {
    return;
  }

  on(knowledgeTab, 'click', async (event) => {
    const target = event.target.closest('[data-click]');
    if (!target) {
      return;
    }

    const action = target.getAttribute('data-click');
    if (action === 'knowledge-detail' || action === 'knowledge-video') {
      event.preventDefault();
      await openKnowledgePreview(
        {
          title: target.getAttribute('data-label') || '知识原文',
          url: target.getAttribute('data-url') || '#',
          preview: target.getAttribute('data-preview') || '',
          full: target.getAttribute('data-full') || target.getAttribute('data-preview') || '',
          type: target.getAttribute('data-type') || '文档',
          updated: target.getAttribute('data-updated') || '',
          tags: parseKnowledgeTags(target.getAttribute('data-tags')),
          id: target.getAttribute('data-id'),
        },
        target,
      );
    } else if (action === 'knowledge-add') {
      const label = target.getAttribute('data-label') || '';
      if (label) {
        addToSuggestion(`知识引用：${label}`);
      }
    }
  });

  qsa('.knowledge-card').forEach((card) => {
    on(card, 'click', () => {
      const title = card.querySelector('h4')?.textContent || '知识点';
      addToSuggestion(`知识图谱：${title}`);
    });
  });
}

function bindPreviewButtons() {
  const collapseBtn = qs('#knowledge-preview-collapse');
  const expandBtn = qs('#knowledge-preview-open');
  const closeBtn = qs('#knowledge-preview .fa-times')?.parentElement;
  const newTabBtn = qs('#knowledge-preview-newtab');

  on(collapseBtn, 'click', () => toggleKnowledgePreviewExpand(false));
  on(expandBtn, 'click', () => toggleKnowledgePreviewExpand(true));
  on(closeBtn, 'click', () => closeKnowledgePreview());
  on(newTabBtn, 'click', () => {
    if (activeKnowledgeCard?.url) {
      openKnowledgeSource(activeKnowledgeCard.url, activeKnowledgeCard.title);
    }
  });
}

async function loadKnowledgeCards() {
  const container = qs('#knowledge-card-container');
  if (!container || !isApiEnabled()) {
    return;
  }

  try {
    const payload = await knowledgeController.list({ page: 1, pageSize: 4 });
    const items = payload?.items ?? [];
    if (!items.length) {
      return;
    }
    container.innerHTML = items.map((item, index) => renderKnowledgeCard(item, index)).join('');
    bindKnowledgeClicks();
  } catch (err) {
    console.warn('[knowledge] load failed', err);
  }
}

function renderKnowledgeCard(item, index) {
  const icon = getKnowledgeIcon(item.type);
  const updated = item.updatedAt || item.updated || '更新于：-';
  const preview = escapeAttr(item.preview || item.summary || '');
  const full = escapeAttr(item.full || item.detail || '');
  const tags = (item.tags || []).join(',');
  const label = escapeAttr(item.title || `知识卡片 ${index + 1}`);
  const url = item.url || '#';
  const type = item.type || '文档';

  return `
    <div class="bg-white border border-gray-200 p-3 rounded-lg hover:shadow-md transition-shadow knowledge-card">
      <div class="flex items-start">
        <div class="flex-shrink-0 w-8 h-8 rounded-full ${icon.bg} flex items-center justify-center text-${icon.color}">
          <i class="fa ${icon.icon}"></i>
        </div>
        <div class="ml-2 flex-1">
          <h4 class="text-sm font-medium text-gray-800">${item.title}</h4>
          <p class="text-xs text-gray-600 mt-1 line-clamp-2">${item.preview || '暂无摘要'}</p>
          <div class="flex justify-between items-center mt-2 text-[11px] text-gray-500">
            <span>${updated}</span>
            <button class="text-xs text-primary hover:underline" data-click="knowledge-detail"
              data-label="${label}"
              data-id="${item.id}"
              data-url="${url}"
              data-preview="${preview}"
              data-full="${full}"
              data-type="${type}"
              data-updated="${item.updatedAt || ''}"
              data-tags="${tags}">
              查看详情
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getKnowledgeIcon(type) {
  switch ((type || '').toLowerCase()) {
    case 'video':
      return { icon: 'fa-play-circle-o', bg: 'bg-green-100', color: 'green-600' };
    case 'document':
    default:
      return { icon: 'fa-file-text-o', bg: 'bg-blue-100', color: 'blue-600' };
  }
}

function escapeAttr(value) {
  return String(value || '').replace(/"/g, '&quot;').replace(/\n/g, ' ').replace(/'/g, '&#39;');
}

export function parseKnowledgeTags(tagStr = '') {
  return tagStr
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function openKnowledgePreview(options = {}, triggerBtn = null) {
  const wrapper = qs('#knowledge-preview');
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

  let detail = null;
  if (options.id) {
    try {
      detail = await knowledgeController.detail(options.id);
    } catch (error) {
      console.warn('[knowledge] failed to load detail', error);
    }
  }

  const previewText = detail?.summary || options.preview || '';
  const fullText = detail?.content || options.full || previewText;

  activeKnowledgeCard = {
    title: options.title,
    url: options.url,
    full: fullText,
    preview: previewText,
  };

  titleEl.textContent = options.title || '知识原文预览';
  typeEl.textContent = options.type || '文档';
  updatedEl.textContent = options.updated ? `更新于：${options.updated}` : '更新于：-';
  sourceEl.textContent = `来源：${options.url ? options.url : '内部知识库'}`;

  bodyEl.textContent = previewText || '暂无预览内容';
  tagWrap.innerHTML = '';
  (detail?.tags || options.tags || []).forEach((tag) => {
    const badge = document.createElement('span');
    badge.className = 'px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full';
    badge.textContent = tag;
    tagWrap.appendChild(badge);
  });

  wrapper.classList.remove('hidden');
  wrapper.dataset.expanded = 'false';
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
  if (wrapper) {
    wrapper.classList.add('hidden');
    wrapper.dataset.expanded = 'false';
  }
}

export function openKnowledgeSource(url, label) {
  if (url && url !== '#') {
    window.open(url, '_blank');
  }
  if (label) {
    addToSuggestion(`引用知识：${label}`);
  }
}

// 知识库搜索功能
function initKnowledgeSearch() {
  const searchInput = qs('#knowledge-search-input');
  const searchBtn = qs('#knowledge-search-btn');
  const quickTags = qsa('.knowledge-quick-tag');

  // 搜索按钮点击
  if (searchBtn) {
    on(searchBtn, 'click', () => {
      performKnowledgeSearch();
    });
  }

  // 搜索框回车
  if (searchInput) {
    on(searchInput, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performKnowledgeSearch();
      }
    });
  }

  // 快捷标签点击
  quickTags.forEach(tag => {
    on(tag, 'click', () => {
      const keyword = tag.getAttribute('data-keyword') || tag.textContent.trim();
      if (searchInput) {
        searchInput.value = keyword;
      }
      performKnowledgeSearch();
    });
  });
}

async function performKnowledgeSearch() {
  const searchInput = qs('#knowledge-search-input');
  const searchBtn = qs('#knowledge-search-btn');
  const keyword = searchInput?.value?.trim();

  if (!keyword) {
    // 如果搜索词为空，重新加载所有知识卡片
    await loadKnowledgeCards();
    return;
  }

  // 显示加载状态
  if (searchBtn) {
    const originalHTML = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
    searchBtn.disabled = true;

    try {
      // 调用搜索API
      const results = await searchKnowledge(keyword);
      displaySearchResults(results, keyword);
    } catch (error) {
      console.error('[knowledge] search failed', error);
      showNoResults(keyword);
    } finally {
      searchBtn.innerHTML = originalHTML;
      searchBtn.disabled = false;
    }
  }
}

async function searchKnowledge(keyword) {
  if (!isApiEnabled()) {
    // API未启用时，从当前DOM中进行本地搜索
    return performLocalSearch(keyword);
  }

  try {
    // 调用后端搜索API
    const results = await knowledgeController.search({ keyword, pageSize: 10 });
    return results?.items || results || [];
  } catch (error) {
    console.warn('[knowledge] API search failed, falling back to local search', error);
    return performLocalSearch(keyword);
  }
}

function performLocalSearch(keyword) {
  const cards = qsa('.knowledge-card');
  const results = [];
  const lowerKeyword = keyword.toLowerCase();

  cards.forEach((card, index) => {
    const title = card.querySelector('h4')?.textContent || '';
    const preview = card.querySelector('.line-clamp-2')?.textContent || '';
    const detailBtn = card.querySelector('[data-click="knowledge-detail"]');

    if (title.toLowerCase().includes(lowerKeyword) ||
        preview.toLowerCase().includes(lowerKeyword)) {
      results.push({
        id: detailBtn?.getAttribute('data-id') || `local-${index}`,
        title: title,
        preview: preview,
        type: detailBtn?.getAttribute('data-type') || '文档',
        url: detailBtn?.getAttribute('data-url') || '#',
        updatedAt: detailBtn?.getAttribute('data-updated') || '',
        tags: parseKnowledgeTags(detailBtn?.getAttribute('data-tags') || ''),
        full: detailBtn?.getAttribute('data-full') || preview
      });
    }
  });

  return results;
}

function displaySearchResults(results, keyword) {
  const container = qs('#knowledge-card-container');
  if (!container) return;

  if (!results || results.length === 0) {
    showNoResults(keyword);
    return;
  }

  // 渲染搜索结果
  container.innerHTML = results.map((item, index) => renderKnowledgeCard(item, index)).join('');

  // 重新绑定事件
  bindKnowledgeClicks();

  // 显示搜索结果提示
  const searchInfo = document.createElement('div');
  searchInfo.className = 'text-xs text-gray-600 mb-2 p-2 bg-blue-50 rounded';
  searchInfo.innerHTML = `找到 ${results.length} 条关于 "<strong>${escapeHtml(keyword)}</strong>" 的结果`;
  container.parentElement?.insertBefore(searchInfo, container);

  // 3秒后自动移除提示
  setTimeout(() => searchInfo.remove(), 3000);
}

function showNoResults(keyword) {
  const container = qs('#knowledge-card-container');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-2 text-center py-8 text-gray-500">
      <i class="fa fa-search text-4xl mb-3 text-gray-300"></i>
      <p>未找到关于 "<strong>${escapeHtml(keyword)}</strong>" 的知识</p>
      <p class="text-sm mt-2">尝试使用其他关键词或<button class="text-primary hover:underline" onclick="document.getElementById('knowledge-search-input').value='';window.knowledgeModule.resetSearch()">清除搜索</button></p>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function resetSearch() {
  const searchInput = qs('#knowledge-search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  loadKnowledgeCards();
}

// 导出到全局以便HTML调用
if (typeof window !== 'undefined') {
  window.knowledgeModule = {
    resetSearch
  };
}
