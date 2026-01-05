import { qs, qsa, on } from '../core/dom.js';

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

const knowledgeInventory = [
  {
    id: 'kb-001',
    title: '系统登录失败排查手册',
    category: '系统运维',
    summary: '覆盖认证失败、网关超时与 502 报错的排查路径。',
    content: '适用场景：登录失败、认证异常、网关超时。\n1. 检查认证服务与网关健康状态。\n2. 确认近 24 小时是否有发布或配置变更。\n3. 校验账号状态与登录策略是否命中拦截。\n4. 复现失败请求并查看链路日志。',
    tags: ['登录', '认证', '排查'],
    keywords: ['登录', '认证', 'auth', 'login', '失败', '502', '网关', '超时'],
    updatedAt: '2024-03-12',
  },
  {
    id: 'kb-002',
    title: '账号被锁定的登录恢复方案',
    category: '账号安全',
    summary: '说明账号锁定原因、解锁方式与风险提醒。',
    content: '常见原因：密码错误多次、异常登录触发风控。\n处理方式：\n1. 通过管理端解锁账号。\n2. 引导用户重置密码。\n3. 检查异地登录告警。',
    tags: ['登录', '账号', '风控'],
    keywords: ['登录', '账号', '锁定', '解锁', '密码', '风控'],
    updatedAt: '2024-03-10',
  },
  {
    id: 'kb-003',
    title: '双因子登录失败处理指南',
    category: '安全策略',
    summary: '解决短信/动态令牌无法通过验证的场景。',
    content: '排查路径：\n1. 检查短信服务或令牌服务是否可用。\n2. 核对用户绑定手机号与令牌时间同步。\n3. 提供备用验证方式。',
    tags: ['登录', '双因子', '安全'],
    keywords: ['登录', '双因子', '短信', '令牌', '验证', '失败'],
    updatedAt: '2024-03-09',
  },
  {
    id: 'kb-004',
    title: '企业微信登录异常解决方案',
    category: '渠道登录',
    summary: '涵盖授权失败、回调错误与组织架构同步问题。',
    content: '处理步骤：\n1. 校验企业微信应用授权状态。\n2. 检查回调地址与密钥是否正确。\n3. 重新同步组织架构并重试登录。',
    tags: ['登录', '企业微信', '授权'],
    keywords: ['登录', '企业微信', '授权', '回调', '异常', '组织架构'],
    updatedAt: '2024-03-06',
  },
  {
    id: 'kb-005',
    title: 'VPN 登录故障排查与替代方案',
    category: '网络接入',
    summary: '处理 VPN 连接失败导致的登录异常。',
    content: '排查步骤：\n1. 确认 VPN 节点可用性。\n2. 校验客户端版本与证书有效期。\n3. 提供备用网络或临时白名单策略。',
    tags: ['登录', 'VPN', '网络'],
    keywords: ['登录', 'VPN', '网络', '连接失败', '证书'],
    updatedAt: '2024-03-04',
  },
];

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
  let currentResults = [];
  let selectedDetailItem = null;
  let copyResetTimer = null;

  if (!container || !input || !searchBtn || !resultsWrap || !list || !count || !emptyState) {
    return;
  }

  const renderResults = (items) => {
    list.innerHTML = items.map((item) => {
      const score = Math.round(item.score * 100);
      const tags = item.tags.map((tag) => `
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

  const scoreItem = (item, query, tokens) => {
    const indexText = [
      item.title,
      item.summary,
      item.category,
      item.tags.join(' '),
      item.keywords.join(' '),
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

    const score = Math.min(matches / Math.max(tokens.length, 1), 1);
    return score;
  };

  const updateResults = () => {
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

    setSearchMode(true);
    const tokens = tokenize(query);
    const results = knowledgeInventory
      .map((item) => ({
        ...item,
        score: scoreItem(item, query, tokens),
      }))
      .filter((item) => item.score >= 0.25)
      .sort((a, b) => b.score - a.score);

    currentResults = results;

    if (results.length === 0) {
      resultsWrap.classList.add('hidden');
      emptyState.classList.remove('hidden');
      hideDetailPanel();
      list.innerHTML = '';
      count.textContent = '找到 0 条相关内容';
      return;
    }

    container.classList.add('has-results');
    resultsWrap.classList.remove('hidden');
    emptyState.classList.add('hidden');
    count.textContent = `找到 ${results.length} 条相关内容`;
    renderResults(results);
    hideDetailPanel();
  };

  const selectResult = (id) => {
    const item = currentResults.find((entry) => entry.id === id);
    if (!item || !detailPanel || !detailTitle || !detailCategory || !detailSummary || !detailContent || !detailTags || !detailUpdated) {
      return;
    }
    selectedDetailItem = item;
    qsa('.knowledge-app-card', list).forEach((card) => {
      card.classList.toggle('is-active', card.getAttribute('data-knowledge-id') === id);
    });
    detailTitle.textContent = item.title;
    detailCategory.textContent = item.category;
    detailUpdated.textContent = `更新于 ${item.updatedAt}`;
    detailSummary.textContent = item.summary;
    detailContent.textContent = item.content || '暂无详情内容。';
    detailTags.innerHTML = item.tags.map((tag) => `
      <span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px]">${tag}</span>
    `).join('');
    detailPanel.classList.remove('hidden');
    if (resultsLayout) resultsLayout.classList.remove('is-compact');
  };

  on(searchBtn, 'click', updateResults);
  on(input, 'keydown', (event) => {
    if (event.key === 'Enter') {
      updateResults();
    }
  });
  on(input, 'input', updateClearButton);

  if (clearBtn) {
    on(clearBtn, 'click', () => {
      input.value = '';
      updateClearButton();
      updateResults();
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
      updateResults();
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
      selectResult(id);
    }
  });

  if (detailCopy) {
    on(detailCopy, 'click', handleDetailCopy);
  }

  updateClearButton();
}
