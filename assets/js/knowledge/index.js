import { qs, qsa, on } from '../core/dom.js';
import { addToSuggestion } from '../chat/index.js';
import { fetchKnowledge, isApiEnabled } from '../api.js';

let activeKnowledgeCard = null;

export function initKnowledgeBase() {
  bindKnowledgeClicks();
  bindPreviewButtons();
  loadKnowledgeCards();
}

function bindKnowledgeClicks() {
  const knowledgeTab = qs('#knowledge-tab');
  if (!knowledgeTab) return;

  on(knowledgeTab, 'click', (event) => {
    const target = event.target.closest('[data-click]');
    if (!target) return;

    const action = target.getAttribute('data-click');
    if (action === 'knowledge-detail' || action === 'knowledge-video') {
      event.preventDefault();
      openKnowledgePreview(
        {
          title: target.getAttribute('data-label') || '知识原文',
          url: target.getAttribute('data-url') || '#',
          preview: target.getAttribute('data-preview') || '',
          full: target.getAttribute('data-full') || target.getAttribute('data-preview') || '',
          type: target.getAttribute('data-type') || '文档',
          updated: target.getAttribute('data-updated') || '',
          tags: parseKnowledgeTags(target.getAttribute('data-tags')),
        },
        target
      );
    } else if (action === 'knowledge-add') {
      const label = target.getAttribute('data-label') || '';
      if (label) addToSuggestion(`知识引用：${label}`);
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
  if (!container || !isApiEnabled()) return;

  try {
    const response = await fetchKnowledge({ page: 1, pageSize: 4 });
    const payload = response?.data ?? response;
    const items = payload?.items ?? payload?.knowledge ?? [];
    if (!items.length) return;
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

export function openKnowledgePreview(options = {}, triggerBtn = null) {
  const wrapper = qs('#knowledge-preview');
  const titleEl = qs('#knowledge-preview-title');
  const typeEl = qs('#knowledge-preview-type');
  const updatedEl = qs('#knowledge-preview-updated');
  const sourceEl = qs('#knowledge-preview-source');
  const bodyEl = qs('#knowledge-preview-body');
  const tagWrap = qs('#knowledge-preview-tags');
  const expandBtn = qs('#knowledge-preview-open');

  if (!wrapper || !titleEl || !typeEl || !updatedEl || !sourceEl || !bodyEl || !tagWrap) return;

  activeKnowledgeCard = {
    title: options.title,
    url: options.url,
    full: options.full,
    preview: options.preview,
  };

  titleEl.textContent = options.title || '知识原文预览';
  typeEl.textContent = options.type || '文档';
  updatedEl.textContent = options.updated ? `更新于：${options.updated}` : '更新于：-';
  sourceEl.textContent = `来源：${options.url ? options.url : '内部知识库'}`;

  bodyEl.textContent = options.preview || '暂无预览内容';
  tagWrap.innerHTML = '';
  options.tags?.forEach((tag) => {
    const badge = document.createElement('span');
    badge.className = 'px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full';
    badge.textContent = tag;
    tagWrap.appendChild(badge);
  });

  wrapper.classList.remove('hidden');
  wrapper.dataset.expanded = 'false';
  if (expandBtn) expandBtn.innerHTML = '<i class="fa fa-angle-down mr-1"></i>展开全文';

  if (triggerBtn) triggerBtn.blur();
}

export function toggleKnowledgePreviewExpand(forceExpand) {
  const wrapper = qs('#knowledge-preview');
  const bodyEl = qs('#knowledge-preview-body');
  const btn = qs('#knowledge-preview-open');
  const fade = wrapper?.querySelector('.knowledge-preview-fade');

  if (!wrapper || !bodyEl || !btn) return;

  const shouldExpand =
    typeof forceExpand === 'boolean'
      ? forceExpand
      : wrapper.dataset.expanded !== 'true';

  wrapper.dataset.expanded = shouldExpand ? 'true' : 'false';
  bodyEl.textContent = shouldExpand
    ? activeKnowledgeCard?.full || bodyEl.textContent
    : activeKnowledgeCard?.preview || bodyEl.textContent;

  if (fade) fade.style.display = shouldExpand ? 'none' : 'block';
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
