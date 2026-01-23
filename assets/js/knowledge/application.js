import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';
import { fetchKnowledge, fetchKnowledgeFull, isApiEnabled, searchKnowledge } from '../api.js';

const semanticMap = {
  登录: ['认证', 'auth', 'login', '登录失败'],
  登录失败: ['登录', '认证', '故障', '排查'],
  认证: ['登录', 'auth', 'login'],
  账号: ['账户', '用户'],
  故障: ['异常', '排查', '告警'],
  工单: ['任务', '处理单'],
  税务: ['个税', '专项扣除'],
  考勤: ['补卡', '迟到', '旷工'],
};

let currentResults = [];
let searchSequence = 0;

function scoreItem(item, query, tokens) {
  const indexText = [
    item?.title,
    item?.summary,
    item?.category,
    Array.isArray(item?.tags) ? item.tags.join(' ') : '',
    item?.content || '',
  ].join(' ').toLowerCase();

  let matches = 0;
  tokens.forEach((token) => {
    if (indexText.includes(token)) {
      matches += 1;
    }
  });

  if (query && indexText.includes(query.toLowerCase())) {
    matches += 0.6;
  }

  return Math.min(matches / Math.max(tokens.length, 1), 1);
}

export function initKnowledgeApplication() {
  const container = qs('#knowledge-application');
  const input = qs('#knowledge-app-search-input');
  const searchBtn = qs('#knowledge-app-search-btn');
  const clearBtn = qs('#knowledge-app-clear-input');
  const resultsWrap = qs('#knowledge-app-results');
  const resultsLayout = qs('#knowledge-app-results .knowledge-app-layout');
  const list = qs('#knowledge-app-list');
  const count = qs('#knowledge-app-count');
  const emptyState = qs('#knowledge-app-empty');
  const shortcuts = qs('#knowledge-app-shortcuts');
  const tips = qs('#knowledge-app-tips');
  const header = qs('.knowledge-app-header');
  const detailPanel = qs('#knowledge-app-detail');
  const detailTitle = qs('#knowledge-app-detail-title');
  const detailCategory = qs('#knowledge-app-detail-category');
  const detailUpdated = qs('#knowledge-app-detail-updated');
  const detailSummary = qs('#knowledge-app-detail-summary');
  const detailContent = qs('#knowledge-app-detail-content');
  const detailTags = qs('#knowledge-app-detail-tags');
  const detailCopy = qs('#knowledge-app-detail-copy');
  const copyBtnDefaultText = detailCopy?.textContent?.trim() || '复制内容';
  let selectedDetailItem = null;
  let copyResetTimer = null;

  if (!container || !input || !searchBtn || !resultsWrap || !list || !count || !emptyState) {
    return;
  }

  const renderResults = (items) => {
    list.innerHTML = items.map((item) => {
      const score = Math.round(item.score * 100);
      const tags = (item.tags || []).map((tag) => `
        <span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px]">${tag}</span>
      `).join('');
      return `
        <div class="knowledge-app-card bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow" data-knowledge-id="${item.id}">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-sm font-semibold text-gray-900">${item.title}</div>
              <div class="text-xs text-gray-500 mt-1">${item.category}</div>
            </div>
            <span class="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">匹配度 ${score}%</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${item.summary}</p>
          <div class="mt-3 flex flex-wrap gap-2">${tags}</div>
          <div class="mt-3 flex items-center justify-between text-xs text-gray-400">
            <span>更新于 ${item.updatedAt}</span>
            <button class="text-primary hover:underline" type="button" data-knowledge-detail="${item.id}">查看详情</button>
          </div>
        </div>
      `;
    }).join('');
  };

  const resetCopyButtonLabel = () => {
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    if (detailCopy) {
      detailCopy.textContent = copyBtnDefaultText;
    }
  };

  const flashCopyButton = (message) => {
    if (!detailCopy) {
      return;
    }
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    detailCopy.textContent = message;
    copyResetTimer = window.setTimeout(() => {
      if (detailCopy) {
        detailCopy.textContent = copyBtnDefaultText;
      }
      copyResetTimer = null;
    }, 2000);
  };

  const hideDetailPanel = () => {
    if (detailPanel) {
      detailPanel.classList.add('hidden');
    }
    selectedDetailItem = null;
    qsa('.knowledge-app-card', list).forEach((card) => card.classList.remove('is-active'));
    if (resultsLayout) {
      resultsLayout.classList.add('is-compact');
    }
    resetCopyButtonLabel();
  };

  const copyToClipboard = async (text) => {
    if (!text) {
      return false;
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        // fall through to legacy copy
      }
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (error) {
      success = false;
    }
    document.body.removeChild(textarea);
    return success;
  };

  const handleDetailCopy = async () => {
    if (!selectedDetailItem) {
      flashCopyButton('先选中条目');
      return;
    }
    const copyParts = [
      selectedDetailItem.title,
      selectedDetailItem.category ? `分类：${selectedDetailItem.category}` : '',
      selectedDetailItem.summary,
      selectedDetailItem.content,
    ].filter(Boolean);
    const copyText = copyParts.join('\n\n');
    const success = await copyToClipboard(copyText);
    flashCopyButton(success ? '复制成功' : '复制失败');
  };

  const updateClearButton = () => {
    if (!clearBtn) {
      return;
    }
    clearBtn.classList.toggle('hidden', !input.value.trim());
  };

  const setSearchMode = (enabled) => {
    if (enabled) {
      container.classList.add('has-results');
      if (shortcuts) shortcuts.classList.add('hidden');
      if (tips) tips.classList.add('hidden');
      if (header) header.style.display = 'none';
    } else {
      container.classList.remove('has-results');
      if (shortcuts) shortcuts.classList.remove('hidden');
      if (tips) tips.classList.remove('hidden');
      if (header) header.style.display = '';
    }
  };

  const tokenize = (text) => {
    if (!text) return [];
    const tokens = text
      .toLowerCase()
      .split(/[\s,，;；/]+/)
      .filter(Boolean);

    const expanded = new Set(tokens);
    tokens.forEach((token) => {
      const aliases = semanticMap[token] || semanticMap[text];
      if (aliases) {
        aliases.forEach((alias) => expanded.add(alias.toLowerCase()));
      }
    });

    return Array.from(expanded);
  };

  const updateResults = async () => {
    const query = input.value.trim();
    updateClearButton();

    if (!query) {
      setSearchMode(false);
      resultsWrap.classList.add('hidden');
      emptyState.classList.add('hidden');
      hideDetailPanel();
      list.innerHTML = '';
      count.textContent = '找到 0 条相关内容';
      return;
    }

    if (!isApiEnabled()) {
      showNotification('知识检索需要先配置 API', 'warning');
      return;
    }

    setSearchMode(true);
    resultsWrap.classList.add('hidden');
    emptyState.classList.add('hidden');
    hideDetailPanel();
    list.innerHTML = '';
    count.textContent = '正在检索...';

    const currentSequence = ++searchSequence;
    const tokens = tokenize(query);
    try {
      const [keywordResults, listResults] = await Promise.all([
        performKnowledgeSearch(query, 'keyword'),
        fetchKnowledgeList(query),
      ]);

      const scopedDocIds = collectDocIds([keywordResults, listResults]);
      const semanticResults = await performKnowledgeSearch(query, 'semantic', scopedDocIds);

      if (currentSequence !== searchSequence) {
        return;
      }

      let merged = [];
      try {
        merged = mergeKnowledgeResults(query, tokens, [
          { items: keywordResults, boost: 0.45 },
          { items: semanticResults, boost: 0.65 },
          { items: listResults, boost: 0.35 },
        ]);
      } catch (error) {
        console.error('[knowledge-app] merge results failed', error);
        merged = [];
      }

      currentResults = merged;

      if (merged.length === 0) {
        resultsWrap.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = `
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <i class="fa fa-folder-open-o text-gray-400 text-2xl"></i>
          </div>
          <p class="text-sm text-gray-500">暂无可用知识内容</p>
          <p class="text-xs text-gray-400 mt-1">尝试更换关键词，或联系管理员补充知识库</p>
        `;
        hideDetailPanel();
        list.innerHTML = '';
        count.textContent = '找到 0 条相关内容';
        return;
      }

      container.classList.add('has-results');
      resultsWrap.classList.remove('hidden');
      emptyState.classList.add('hidden');
      count.textContent = `找到 ${merged.length} 条相关内容`;
      renderResults(merged);
      hideDetailPanel();
    } catch (error) {
      console.error('[knowledge-app] search failed', error);
      resultsWrap.classList.add('hidden');
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = `
        <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <i class="fa fa-exclamation-circle text-gray-400 text-2xl"></i>
        </div>
        <p class="text-sm text-gray-500">知识检索失败</p>
        <p class="text-xs text-gray-400 mt-1">请稍后再试或联系管理员</p>
      `;
      hideDetailPanel();
      list.innerHTML = '';
      count.textContent = '找到 0 条相关内容';
      showNotification('知识检索失败，请稍后再试', 'error');
    }
  };

  const selectResult = async (id) => {
    const item = currentResults.find((entry) => entry.id === id);
    if (!item || !detailPanel || !detailTitle || !detailCategory || !detailSummary || !detailContent || !detailTags || !detailUpdated) {
      return;
    }
    const enrichedItem = await ensureKnowledgeDetail(item);
    if (!enrichedItem) {
      return;
    }
    const displayItem = enrichedItem || item;
    selectedDetailItem = displayItem;
    qsa('.knowledge-app-card', list).forEach((card) => {
      card.classList.toggle('is-active', card.getAttribute('data-knowledge-id') === id);
    });
    detailTitle.textContent = displayItem.title;
    detailCategory.textContent = displayItem.category || '-';
    detailUpdated.textContent = displayItem.updatedAt ? `更新于 ${displayItem.updatedAt}` : '更新于 -';
    detailSummary.textContent = displayItem.summary || '暂无摘要';
    detailContent.textContent = displayItem.content || '暂无详情内容。';
    detailTags.innerHTML = (displayItem.tags || []).map((tag) => `
      <span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px]">${tag}</span>
    `).join('');
    detailPanel.classList.remove('hidden');
    if (resultsLayout) resultsLayout.classList.remove('is-compact');
  };

  on(searchBtn, 'click', () => {
    void updateResults();
  });
  on(input, 'keydown', (event) => {
    if (event.key === 'Enter') {
      void updateResults();
    }
  });
  on(input, 'input', updateClearButton);

  if (clearBtn) {
    on(clearBtn, 'click', () => {
      input.value = '';
      updateClearButton();
      void updateResults();
      input.focus();
    });
  }

  qsa('.knowledge-shortcut-btn', container).forEach((btn) => {
    on(btn, 'click', () => {
      const keyword = btn.getAttribute('data-keyword') || btn.textContent.trim();
      if (!keyword) {
        return;
      }
      input.value = keyword;
      void updateResults();
      input.focus();
    });
  });

  on(list, 'click', (event) => {
    const target = event.target.closest('[data-knowledge-detail]');
    if (!target) {
      return;
    }
    const id = target.getAttribute('data-knowledge-detail');
    if (id) {
      void selectResult(id);
    }
  });

  if (detailCopy) {
    on(detailCopy, 'click', handleDetailCopy);
  }

  updateClearButton();
}

function extractKnowledgeList(response) {
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

function buildSummary(content = '') {
  const trimmed = String(content || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}

function formatUpdatedAt(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('zh-CN');
}

function normalizeKnowledgeItem(item) {
  const metadata = typeof item?.metadata === 'object' && item.metadata ? item.metadata : {};
  return {
    id: item.id,
    title: item.title,
    category: metadata.taxonomyPath || item.category || '未分类',
    summary: metadata.summary || buildSummary(item.content),
    content: item.content,
    tags: Array.isArray(item.tags) ? item.tags : [],
    updatedAt: formatUpdatedAt(item.updatedAt),
  };
}

async function performKnowledgeSearch(query, mode, docIds) {
  try {
    const response = await searchKnowledge({
      query,
      mode,
      filters: {
        limit: 12,
        topK: 12,
        docIds: Array.isArray(docIds) && docIds.length ? docIds : undefined,
      },
    });
    return extractKnowledgeList(response);
  } catch (error) {
    return [];
  }
}

function collectDocIds(groups) {
  const idSet = new Set();
  groups.forEach((items) => {
    (items || []).forEach((item) => {
      if (item?.id) {
        idSet.add(item.id);
      }
    });
  });
  return Array.from(idSet).slice(0, 50);
}

async function fetchKnowledgeList(query) {
  try {
    const response = await fetchKnowledge({ query, limit: 50, page: 1 });
    return extractKnowledgeList(response);
  } catch (error) {
    return [];
  }
}

function mergeKnowledgeResults(query, tokens, sources) {
  const merged = new Map();
  sources.forEach((source) => {
    const items = Array.isArray(source.items) ? source.items : [];
    items.forEach((item) => {
      if (!item?.id) {
        return;
      }
      const normalized = normalizeKnowledgeItem(item);
      const baseScore = scoreItem(normalized, query, tokens);
      const boostedScore = Math.min(1, source.boost + baseScore * (1 - source.boost));
      const existing = merged.get(normalized.id);
      if (!existing || boostedScore > existing.score) {
        merged.set(normalized.id, {
          ...normalized,
          score: boostedScore,
        });
      }
    });
  });
  return Array.from(merged.values())
    .filter((item) => item.score >= 0.2)
    .sort((a, b) => b.score - a.score);
}

async function ensureKnowledgeDetail(item) {
  if (item.content) {
    return item;
  }
  try {
    const response = await fetchKnowledgeFull(item.id);
    const payload = response?.data ?? response;
    if (!payload) {
      return item;
    }
    const normalized = normalizeKnowledgeItem(payload);
    return {
      ...item,
      ...normalized,
    };
  } catch (error) {
    showNotification('无法加载知识详情', 'error');
    return item;
  }
}
