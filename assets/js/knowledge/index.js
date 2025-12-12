import { qs, qsa, on } from '../core/dom.js';
import { addToSuggestion } from '../chat/index.js';

let activeKnowledgeCard = null;

export function initKnowledgeBase() {
  bindKnowledgeClicks();
  bindPreviewButtons();
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
