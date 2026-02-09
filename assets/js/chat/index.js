import { qs, qsa, on } from '../core/dom.js';
import { scrollToBottom } from '../core/scroll.js';
import { showNotification } from '../core/notifications.js';
import { UnifiedChatController } from '../presentation/chat/UnifiedChatController.js';
import { openAiAssistantPanel } from '../ui/layout.js';
import {
  analyzeRequirementText,
  loadRequirementsData,
} from '../requirements/index.js';
import { updateCustomerContext } from '../customer/index.js';
import {
  fetchConversations,
  fetchConversationAiAnalysis,
  fetchSentimentAnalysis,
  fetchConversationStats,
  createWorkorder,
  createTask,
  fetchWorkorders,
  fetchTasks,
  fetchQualityProfile,
  isApiEnabled,
} from '../api.js';

let currentConversationId = null;
let chatController = null;
let serverStatusCounts = null;

/**
 * 根据情绪类型返回对应的emoji图标
 * @param {Object|string|null} sentiment - 情绪对象或情绪字符串
 * @returns {string} emoji图标
 */
function getSentimentIcon(sentiment) {
  if (!sentiment) {
    return '';
  }

  const sentimentType = typeof sentiment === 'string' ? sentiment : sentiment.type || sentiment.sentiment;

  const iconMap = {
    // 积极情绪
    'positive': '😊',
    'happy': '😊',
    'satisfied': '😊',
    'excited': '🤩',
    'grateful': '🙏',

    // 中性情绪
    'neutral': '😐',
    'calm': '😌',

    // 消极情绪
    'negative': '😟',
    'unhappy': '😔',
    'frustrated': '😤',
    'angry': '😡',
    'anxious': '😰',
    'worried': '😟',
    'confused': '😕',

    // 紧急
    'urgent': '⚠️',
    'emergency': '🚨',
  };

  return iconMap[sentimentType?.toLowerCase()] || '';
}

export function initChat() {
  chatController = new UnifiedChatController();
  chatController.init();
  initConversationList();
  initInputEvents();
  initConversationEndDetection();
  initConversationFilters();
  initAiAssistantPanelActions();
  bindAiQuickActions();
  scrollToBottom();
}

function initAiAssistantPanelActions() {
  const panel = qs('#ai-assistant-panel');
  if (!panel) {
    return;
  }

  panel.addEventListener('click', (event) => {
    const adoptBtn = event.target.closest('.ai-reply-adopt');
    const clarifyBtn = event.target.closest('[data-action="clarify"]');
    if (!adoptBtn) {
      if (clarifyBtn) {
        openClarifyPanel();
      }
      return;
    }
    const suggestion = adoptBtn.dataset.suggestion || '';
    const input = qs('#message-input');
    if (input && suggestion) {
      input.value = suggestion;
      input.focus();
      showNotification('已采纳回复建议', 'success');
    }
  });
}

function bindAiQuickActions() {
  const bindings = [
    { selector: '[data-permission="actions.clarify"]', handler: openClarifyPanel },
    { selector: '[data-permission="actions.assist.check"]', handler: openAssistCheck },
    { selector: '[data-permission="actions.fault.report"]', handler: openFaultReport },
  ];

  bindings.forEach(({ selector, handler }) => {
    qsa(selector).forEach((btn) => {
      btn.removeAttribute('onclick');
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        handler();
      });
    });
  });
}

function setAiPanelMode(mode) {
  const panel = qs('#ai-assistant-panel');
  const replyPanel = qs('#ai-panel-reply');
  const solutionPanel = qs('#ai-panel-solution');
  const actionPanel = qs('#ai-panel-action');
  const clarifyPanel = qs('#ai-panel-clarify');
  const requirementsPanel = qs('#ai-panel-requirements');
  const stepsEl = qs('#ai-solution-steps');
  const refsEl = qs('#ai-solution-references');
  const title = qs('#ai-assistant-title');
  const badge = qs('#ai-assistant-badge');
  const desc = qs('#ai-assistant-desc');

  if (panel) {
    panel.classList.remove('hidden');
  }
  if (!replyPanel || !solutionPanel || !actionPanel || !clarifyPanel || !requirementsPanel) {
    return;
  }

  replyPanel.classList.toggle('hidden', mode !== 'reply');
  solutionPanel.classList.toggle('hidden', mode !== 'solution');
  actionPanel.classList.toggle('hidden', mode !== 'action');
  clarifyPanel.classList.toggle('hidden', mode !== 'clarify');
  requirementsPanel.classList.toggle('hidden', mode !== 'requirements');

  if (mode === 'solution') {
    if (stepsEl) {
      stepsEl.innerHTML = `<li class="list-none">${getAiEmptyStateHtml()}</li>`;
    }
    if (refsEl) {
      refsEl.innerHTML = getAiEmptyStateHtml();
    }
  }

  if (title) {
    if (mode === 'reply') {
      title.textContent = '回复建议';
    } else if (mode === 'solution') {
      title.textContent = 'AI解决方案';
    } else if (mode === 'clarify') {
      title.textContent = '问题澄清';
    } else if (mode === 'requirements') {
      title.textContent = '需求检测';
    } else {
      title.textContent = '协作面板';
    }
  }
  if (badge) {
    if (mode === 'reply') {
      badge.textContent = '话术';
    } else if (mode === 'solution') {
      badge.textContent = '排查';
    } else if (mode === 'clarify') {
      badge.textContent = '评估';
    } else if (mode === 'requirements') {
      badge.textContent = '需求';
    } else {
      badge.textContent = '表单';
    }
  }
  if (desc) {
    if (mode === 'reply') {
      desc.textContent = '提供可编辑回复建议，点击采纳标记推荐。';
    } else if (mode === 'solution') {
      desc.textContent = '提供排查建议步骤与参考资料，便于快速定位问题。';
    } else if (mode === 'clarify') {
      desc.textContent = '基于当前会话评估问题描述完整度。';
    } else if (mode === 'requirements') {
      desc.textContent = '扫描对话中的需求信息，生成需求卡片。';
    } else {
      desc.textContent = '支持工单与排查协作，可与对话并行操作。';
    }
  }
}

export function openAiReplyPanel() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  loadAiPanelData('reply');
  setAiPanelMode('reply');
}

export function openAiSolutionPanel() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  loadAiPanelData('solution');
  setAiPanelMode('solution');
}

export function openRequirementPanel() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  loadRequirementsData();
  setAiPanelMode('requirements');
}

async function loadAiPanelData(mode) {
  const stepsEl = qs('#ai-solution-steps');
  const refsEl = qs('#ai-solution-references');
  const listEl = qs('#ai-reply-list');

  if (mode === 'reply' && listEl) {
    listEl.innerHTML = getAiEmptyStateHtml(LOADING_MESSAGE);
  }
  if (mode === 'solution') {
    if (stepsEl) {
      stepsEl.innerHTML = `<li class="list-none">${getAiEmptyStateHtml(LOADING_MESSAGE)}</li>`;
    }
    if (refsEl) {
      refsEl.innerHTML = getAiEmptyStateHtml(LOADING_MESSAGE);
    }
  }

  if (!currentConversationId) {
    showNotification(NO_CONVERSATION_MESSAGE, 'warning');
    if (mode === 'reply') {
      if (listEl) {
        listEl.innerHTML = getAiEmptyStateHtml(NO_CONVERSATION_MESSAGE);
      }
    }
    if (mode === 'solution') {
      if (stepsEl) {
        stepsEl.innerHTML = `<li class="list-none">${getAiEmptyStateHtml(NO_CONVERSATION_MESSAGE)}</li>`;
      }
      if (refsEl) {
        refsEl.innerHTML = getAiEmptyStateHtml(NO_CONVERSATION_MESSAGE);
      }
    }
    return;
  }

  try {
    const response = await fetchConversationAiAnalysis(currentConversationId);
    const payload = response?.data ?? response;

    if (mode === 'reply') {
      if (!listEl) {
        return;
      }
      const suggestion = payload?.replySuggestion;
      if (!suggestion?.suggestedReply) {
        listEl.innerHTML = getAiEmptyStateHtml(EMPTY_DATA_MESSAGE);
        return;
      }

      listEl.innerHTML = `
        <div class="ai-panel-card">
          <div>
            <div class="text-xs text-gray-400 mb-1">AI建议 · 置信度 ${Math.round((suggestion.confidence || 0) * 100)}%</div>
            <p class="text-sm text-gray-700">${suggestion.suggestedReply}</p>
            <div class="mt-3 flex justify-end">
              <button class="ai-reply-adopt text-xs px-3 py-1 bg-primary text-white rounded-full hover:bg-primary-dark" data-permission="ai.reply.adopt" data-suggestion="${suggestion.suggestedReply}">采纳</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (mode === 'solution') {
      if (!stepsEl || !refsEl) {
        return;
      }
      const issues = payload?.detectedIssues || [];
      const knowledge = payload?.knowledgeRecommendations || [];
      const firstIssue = issues[0];

      if (!firstIssue) {
        stepsEl.innerHTML = `<li class="list-none">${getAiEmptyStateHtml(EMPTY_DATA_MESSAGE)}</li>`;
        refsEl.innerHTML = getAiEmptyStateHtml(EMPTY_DATA_MESSAGE);
        return;
      }
      const steps = [];
      if (firstIssue.description) {
        steps.push(`问题描述：${firstIssue.description}`);
      }
      if (firstIssue.severity) {
        steps.push(`优先级：${firstIssue.severity}`);
      }
      if (firstIssue.suggestedAction) {
        steps.push(`建议动作：${firstIssue.suggestedAction}`);
      }

      stepsEl.innerHTML = steps.length
        ? steps.map((step) => `<li>${step}</li>`).join('')
        : `<li class="list-none">${getAiEmptyStateHtml(EMPTY_DATA_MESSAGE)}</li>`;
      refsEl.innerHTML = knowledge
        .map(
          (item) => `
        <div class="ai-panel-card ai-panel-card--compact flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs">KB</div>
          <div class="flex-1">
            <div class="text-sm text-gray-700">${item.title}</div>
            <div class="text-[11px] text-gray-500 mt-1">${item.category || ''}</div>
          </div>
          <button class="text-xs text-primary hover:underline" data-action="view-reference" data-title="${item.title}" data-meta="${item.category || ''}">查看</button>
        </div>
      `,
        )
        .join('');
      if (!knowledge.length) {
        refsEl.innerHTML = getAiEmptyStateHtml(EMPTY_DATA_MESSAGE);
      }
      return;
    }
  } catch (err) {
    console.warn('[chat] load AI panel failed', err);
    if (listEl) {
      listEl.innerHTML = getAiEmptyStateHtml(EMPTY_DATA_MESSAGE);
    }
    if (stepsEl) {
      stepsEl.innerHTML = `<li class="list-none">${getAiEmptyStateHtml(EMPTY_DATA_MESSAGE)}</li>`;
    }
    if (refsEl) {
      refsEl.innerHTML = getAiEmptyStateHtml(EMPTY_DATA_MESSAGE);
    }
  }
}

function getConversationContext() {
  const messagesRoot = qs('#chat-messages');
  if (!messagesRoot) {
    return [];
  }

  const customerRows = Array.from(messagesRoot.querySelectorAll('.message-row[data-sender-role="customer"]'));
  if (customerRows.length) {
    return customerRows
      .map((row) => row.querySelector('.message-bubble p')?.innerText?.trim())
      .filter(Boolean)
      .slice(-4);
  }

  const legacyRows = Array.from(messagesRoot.querySelectorAll('.message.customer-message .message-bubble p'));
  return legacyRows.map((node) => node.innerText?.trim()).filter(Boolean).slice(-4);
}

function getLatestCustomerMessageText() {
  const context = getConversationContext();
  return context[context.length - 1] || '';
}

function hideRightSidebarOverlay() {
  const overlay = qs('#right-sidebar-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

const NO_CONVERSATION_MESSAGE = '请先选择会话';
const LOADING_MESSAGE = '正在获取会话数据...';
const EMPTY_DATA_MESSAGE = '暂无可用数据';

function renderClarifyPlaceholder(message = LOADING_MESSAGE) {
  setAiClarifyPanelContent(`
    <div class="ai-panel-stack">
      ${getAiEmptyStateHtml(message)}
    </div>
  `);
}

function renderActionPlaceholder({ titleText, badgeText, descText }, message = LOADING_MESSAGE) {
  setAiActionPanelContent({
    titleText,
    badgeText,
    descText,
    contentHtml: getAiEmptyStateHtml(message),
  });
}

function setAiActionPanelContent({ titleText, badgeText, descText, contentHtml }) {
  const content = qs('#ai-action-content');
  if (content) {
    content.innerHTML = contentHtml;
  }
  setAiPanelMode('action');
  const title = qs('#ai-assistant-title');
  const badge = qs('#ai-assistant-badge');
  const desc = qs('#ai-assistant-desc');
  if (title && titleText) {
    title.textContent = titleText;
  }
  if (badge && badgeText) {
    badge.textContent = badgeText;
  }
  if (desc && descText) {
    desc.textContent = descText;
  }
}

function setAiClarifyPanelContent(contentHtml) {
  const content = qs('#ai-clarify-content');
  if (content) {
    content.innerHTML = contentHtml;
  }
  setAiPanelMode('clarify');
}

function showActionModal({ title, bodyHtml, primaryText }) {
  const overlay = qs('#action-modal-overlay');
  const modalTitle = qs('#action-modal-title');
  const modalBody = qs('#action-modal-body');
  const primaryBtn = qs('#action-modal-primary');
  if (!overlay || !modalTitle || !modalBody || !primaryBtn) {
    return;
  }

  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalBody.onclick = null;
  if (primaryText) {
    primaryBtn.textContent = primaryText;
    primaryBtn.classList.remove('hidden');
    primaryBtn.onclick = () => {
      overlay.classList.add('hidden');
      primaryBtn.classList.add('hidden');
    };
  } else {
    primaryBtn.classList.add('hidden');
    primaryBtn.onclick = null;
  }
  overlay.classList.remove('hidden');
}

function getAiEmptyStateHtml(message = '暂无数据') {
  return `
    <div class="ai-panel-card text-xs text-gray-600 flex flex-col items-center justify-center gap-2 py-6">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 4h12a1 1 0 0 1 1 1v12a4 4 0 0 1-4 4H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="#cbd5e1" stroke-width="1.5"/>
        <path d="M8 9h8M8 12h5M8 15h6" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <div>${message}</div>
    </div>
  `;
}

export async function openAssistCheck() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  renderActionPlaceholder({
    titleText: '辅助排查',
    badgeText: '排查',
    descText: '基于当前对话生成排查清单与协同指引。',
  });
  if (!currentConversationId) {
    showNotification(NO_CONVERSATION_MESSAGE, 'warning');
    renderActionPlaceholder(
      { titleText: '辅助排查', badgeText: '排查', descText: '请先选择会话后查看。' },
      NO_CONVERSATION_MESSAGE,
    );
    return;
  }

  try {
    const response = await fetchConversationAiAnalysis(currentConversationId);
    const payload = response?.data ?? response ?? {};
    const issues = payload.detectedIssues || [];
    const knowledge = payload.knowledgeRecommendations || [];
    const issueProduct = payload.issueProduct || '未标注';
    const faultLevel = payload.faultLevel || '未标注';

    const issuesHtml = issues.length
      ? issues.map((item) => `<li>${item.description || '问题描述待补充'}</li>`).join('')
      : '<li>暂无明确问题，建议补充现场信息。</li>';

    const knowledgeHtml = knowledge.length
      ? knowledge
        .slice(0, 3)
        .map(
          (item) => `
            <div class="ai-panel-card ai-panel-card--compact flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs">KB</div>
              <div class="flex-1">
                <div class="text-sm text-gray-700">${item.title}</div>
                <div class="text-[11px] text-gray-500 mt-1">${item.category || ''}</div>
              </div>
              <button class="text-xs text-primary hover:underline" data-action="view-reference" data-title="${item.title}" data-meta="${item.category || ''}">查看</button>
            </div>
          `,
        )
        .join('')
      : getAiEmptyStateHtml('暂无关联资料');

    setAiActionPanelContent({
      titleText: '辅助排查',
      badgeText: '排查',
      descText: '基于当前对话生成排查清单与协同指引。',
      contentHtml: `
        <div class="ai-panel-stack">
          <div class="ai-panel-card">
            <div class="text-xs text-gray-400 mb-2">问题概览</div>
            <div class="text-sm text-gray-700">产品定位：${issueProduct}</div>
            <div class="text-sm text-gray-700 mt-1">故障等级：${faultLevel}</div>
          </div>
          <div class="ai-panel-card">
            <div class="text-xs text-gray-400 mb-2">排查重点</div>
            <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">${issuesHtml}</ul>
            <div class="mt-3 flex gap-2">
              <button class="ai-panel-chip" data-action="manual-check" data-tool="日志查询">触发日志查询</button>
              <button class="ai-panel-chip" data-action="manual-check" data-tool="链路追踪">触发链路追踪</button>
            </div>
          </div>
          <div class="ai-panel-card">
            <div class="text-xs text-gray-400 mb-2">协同资料</div>
            ${knowledgeHtml}
          </div>
        </div>
      `,
    });
    bindAssistCheckActions();
  } catch (err) {
    console.warn('[chat] openAssistCheck failed', err);
    renderActionPlaceholder(
      { titleText: '辅助排查', badgeText: '排查', descText: '暂无可用数据。' },
      EMPTY_DATA_MESSAGE,
    );
  }
}


export async function openFaultReport() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  renderActionPlaceholder({
    titleText: '生成故障报告',
    badgeText: '报告',
    descText: '基于对话与质检数据自动生成。',
  });
  if (!currentConversationId) {
    showNotification(NO_CONVERSATION_MESSAGE, 'warning');
    renderActionPlaceholder(
      { titleText: '生成故障报告', badgeText: '报告', descText: '请先选择会话后查看。' },
      NO_CONVERSATION_MESSAGE,
    );
    return;
  }

  try {
    const [qualityResponse, aiResponse] = await Promise.all([
      fetchQualityProfile(currentConversationId),
      fetchConversationAiAnalysis(currentConversationId),
    ]);
    const quality = qualityResponse?.data ?? qualityResponse ?? {};
    const aiPayload = aiResponse?.data ?? aiResponse ?? {};
    const actions = quality.actions || aiPayload.detectedIssues || [];
    const tags = quality.tags || [];
    const thread = quality.thread || [];
    const summary = quality.summary || '暂无摘要';

    const threadHtml = thread.length
      ? thread.map((item) => `<li>${item.role || '客户'}：${item.text || ''}</li>`).join('')
      : '<li>暂无对话片段</li>';

    const actionsHtml = actions.length
      ? actions
        .slice(0, 4)
        .map((item) => `<li>${item.description || item.suggestedAction || item}</li>`)
        .join('')
      : '<li>暂无明确行动建议</li>';

    setAiActionPanelContent({
      titleText: '生成故障报告',
      badgeText: '报告',
      descText: '基于对话与质检数据自动生成。',
      contentHtml: `
        <div class="ai-panel-stack">
          <div class="ai-panel-card">
            <div class="text-xs text-gray-400 mb-2">故障摘要</div>
            <div class="text-sm text-gray-700">${summary}</div>
            <div class="mt-3 flex flex-wrap gap-2">
              ${(tags || []).slice(0, 4).map((tag) => `<span class="ai-panel-chip">${tag}</span>`).join('')}
            </div>
          </div>
          <div class="ai-panel-card">
            <div class="text-xs text-gray-400 mb-2">关键行动</div>
            <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">${actionsHtml}</ul>
          </div>
          <div class="ai-panel-card">
            <div class="text-xs text-gray-400 mb-2">对话节选</div>
            <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">${threadHtml}</ul>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.warn('[chat] openFaultReport failed', err);
    renderActionPlaceholder(
      { titleText: '生成故障报告', badgeText: '报告', descText: '暂无可用数据。' },
      EMPTY_DATA_MESSAGE,
    );
  }
}


export function openTicket() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  setAiActionPanelContent({
    titleText: '创建工单',
    badgeText: '表单',
    descText: '自动填充工单信息，支持快速提交。',
    contentHtml: `
    <div class="ai-panel-stack ai-panel-stack-tight">
      <div class="flex items-center justify-between">
        <div class="ai-panel-meta">* 为必填字段</div>
        <button class="ai-panel-chip" data-action="open-ticket-management">工单管理</button>
      </div>
      <div class="ai-panel-form text-sm text-gray-700">
        <div class="ai-form-group">
          <div class="ai-form-group-title">基础信息</div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label class="w-16" for="ticket-title">标题 *</label>
              <input id="ticket-title" class="flex-1 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="请输入标题">
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-title"></div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row ai-form-split">
              <label class="w-16" for="ticket-detail">详情 *</label>
              <textarea id="ticket-detail" rows="3" class="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="请输入问题详情与排查结果"></textarea>
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-detail"></div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label>问题反馈时间 *</label>
              <div class="ai-form-inline">
                <input id="ticket-date" type="date" class="px-3 py-1 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
                <input id="ticket-time" type="time" class="px-3 py-1 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
              </div>
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-datetime"></div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-type">问题类型 *</label>
              <select id="ticket-type" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">请选择</option>
                <option value="1">问题排查</option>
                <option value="2">需求反馈</option>
                <option value="3">咨询</option>
              </select>
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-type"></div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-priority">优先级 *</label>
              <select id="ticket-priority" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">请选择</option>
                <option value="1">紧急</option>
                <option value="2">高级</option>
                <option value="3">普通</option>
              </select>
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-priority"></div>
          </div>
        </div>

        <div class="ai-form-group">
          <div class="ai-form-group-title">客户与创建人</div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-customer-id">客户ID *</label>
              <input id="ticket-customer-id" type="number" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="客户组织ID">
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-customer-id"></div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-customer-name">客户名称 *</label>
              <input id="ticket-customer-name" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="客户公司名称">
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-customer-name"></div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row ai-form-split">
              <label for="ticket-customer-info">客户信息</label>
              <textarea id="ticket-customer-info" rows="2" class="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="JSON数组，可选"></textarea>
            </div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-creator-id">创建人ID *</label>
              <input id="ticket-creator-id" type="number" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="创建人长工号">
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-creator-id"></div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-creator-name">创建人姓名 *</label>
              <input id="ticket-creator-name" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="创建人姓名">
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-creator-name"></div>
          </div>
        </div>

        <div class="ai-form-group">
          <div class="ai-form-group-title">产品与分类</div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-product-id">产品线ID *</label>
              <input id="ticket-product-id" type="number" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="产品线ID">
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-product-id"></div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-product-group">自有产品线</label>
              <select id="ticket-product-group" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">请选择</option>
                <option value="false">否</option>
                <option value="true">是</option>
              </select>
            </div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-sub-type">子类型ID</label>
              <input id="ticket-sub-type" type="number" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="可选">
            </div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-second-subtype">二级子类型ID</label>
              <input id="ticket-second-subtype" type="number" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="可选">
            </div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-tags">标签ID</label>
              <input id="ticket-tags" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="多个ID用逗号分隔">
            </div>
            <div class="ai-form-error hidden" data-error-for="ticket-tags"></div>
          </div>
        </div>

        <div class="ai-form-group">
          <div class="ai-form-group-title">流程与关联</div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-need-process">是否流转</label>
              <select id="ticket-need-process" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">请选择</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            </div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-relate-id">关联工单ID</label>
              <input id="ticket-relate-id" type="number" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="可选">
            </div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-use-relate">共用关联状态</label>
              <select id="ticket-use-relate" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">请选择</option>
                <option value="false">否</option>
                <option value="true">是</option>
              </select>
            </div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-attachment">附件</label>
              <input id="ticket-attachment" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="上传接口返回值，多个用逗号分隔">
            </div>
          </div>
        </div>

        <div class="ai-form-group">
          <div class="ai-form-group-title">自定义表单（暂不支持）</div>
          <div class="ai-form-block">
            <div class="ai-form-row">
              <label for="ticket-form-id">自定义表单ID</label>
              <input id="ticket-form-id" type="number" disabled class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-400 bg-gray-50 focus:outline-none" placeholder="暂不支持">
            </div>
          </div>
          <div class="ai-form-block">
            <div class="ai-form-row ai-form-split">
              <label for="ticket-form-values">自定义表单值</label>
              <textarea id="ticket-form-values" rows="2" disabled class="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-400 bg-gray-50 focus:outline-none" placeholder="暂不支持"></textarea>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-3">
        <button class="w-full py-2.5 text-sm font-semibold text-white rounded-md bg-primary hover:bg-primary-dark" data-action="create-ticket">创建</button>
      </div>
    </div>
  `,
  });
  setTimeout(() => {
    const titleInput = qs('#ticket-title');
    const detailInput = qs('#ticket-detail');
    const tagSelect = qs('#ticket-tags');
    const dateInput = qs('#ticket-date');
    const timeInput = qs('#ticket-time');
    const typeSelect = qs('#ticket-type');
    const subTypeInput = qs('#ticket-sub-type');
    const secondSubtypeInput = qs('#ticket-second-subtype');
    const prioritySelect = qs('#ticket-priority');
    const customerIdInput = qs('#ticket-customer-id');
    const customerNameInput = qs('#ticket-customer-name');
    const customerInfoInput = qs('#ticket-customer-info');
    const productIdInput = qs('#ticket-product-id');
    const productGroupSelect = qs('#ticket-product-group');
    const attachmentInput = qs('#ticket-attachment');
    const needProcessSelect = qs('#ticket-need-process');
    const relateIdInput = qs('#ticket-relate-id');
    const useRelateSelect = qs('#ticket-use-relate');
    const creatorIdInput = qs('#ticket-creator-id');
    const creatorNameInput = qs('#ticket-creator-name');
    const managementBtn = qs('[data-action="open-ticket-management"]');

    if (titleInput) {
      titleInput.value = '';
    }
    if (detailInput) {
      detailInput.value = '';
    }
    if (tagSelect) {
      tagSelect.value = '';
    }
    if (dateInput) {
      dateInput.value = '';
    }
    if (timeInput) {
      timeInput.value = '';
    }
    if (typeSelect) {
      typeSelect.value = '';
    }
    if (subTypeInput) {
      subTypeInput.value = '';
    }
    if (secondSubtypeInput) {
      secondSubtypeInput.value = '';
    }
    if (prioritySelect) {
      prioritySelect.value = '';
    }
    if (customerIdInput) {
      customerIdInput.value = '';
    }
    if (customerNameInput) {
      customerNameInput.value = '';
    }
    if (customerInfoInput) {
      customerInfoInput.value = '';
    }
    if (productIdInput) {
      productIdInput.value = '';
    }
    if (productGroupSelect) {
      productGroupSelect.value = '';
    }
    if (attachmentInput) {
      attachmentInput.value = '';
    }
    if (needProcessSelect) {
      needProcessSelect.value = '';
    }
    if (relateIdInput) {
      relateIdInput.value = '';
    }
    if (useRelateSelect) {
      useRelateSelect.value = '';
    }
    if (creatorIdInput) {
      creatorIdInput.value = '';
    }
    if (creatorNameInput) {
      creatorNameInput.value = '';
    }
    if (managementBtn) {
      managementBtn.addEventListener('click', () => {
        openTicketManagementPanel();
      });
    }

    bindTicketFormValidation();
    bindTicketClarifyAction();
    autofillTicketForm();
  }, 0);
}

export async function openTicketManagementPanel() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  const tickets = await fetchTicketList();
  renderTicketManagementPanel(tickets, { showCreateButton: true });
}

function bindTicketFormValidation() {
  const actionBody = qs('#ai-action-content');
  if (!actionBody) {
    return;
  }

  const fields = [
    { el: qs('#ticket-title'), name: '标题', errorKey: 'ticket-title' },
    { el: qs('#ticket-detail'), name: '详情', errorKey: 'ticket-detail' },
    { el: qs('#ticket-date'), name: '问题反馈时间（日期）', errorKey: 'ticket-datetime' },
    { el: qs('#ticket-time'), name: '问题反馈时间（时间）', errorKey: 'ticket-datetime' },
    { el: qs('#ticket-type'), name: '问题类型', errorKey: 'ticket-type' },
    { el: qs('#ticket-priority'), name: '优先级', errorKey: 'ticket-priority' },
    {
      el: qs('#ticket-customer-id'),
      name: '客户ID',
      errorKey: 'ticket-customer-id',
      validator: (value) => (parseNumberValue(value) === undefined ? '请输入有效数字' : ''),
    },
    { el: qs('#ticket-customer-name'), name: '客户名称', errorKey: 'ticket-customer-name' },
    {
      el: qs('#ticket-product-id'),
      name: '产品线ID',
      errorKey: 'ticket-product-id',
      validator: (value) => (parseNumberValue(value) === undefined ? '请输入有效数字' : ''),
    },
    {
      el: qs('#ticket-creator-id'),
      name: '创建人ID',
      errorKey: 'ticket-creator-id',
      validator: (value) => (parseNumberValue(value) === undefined ? '请输入有效数字' : ''),
    },
    { el: qs('#ticket-creator-name'), name: '创建人姓名', errorKey: 'ticket-creator-name' },
  ];

  const clearError = (el, errorKey) => {
    if (!el) {
      return;
    }
    el.classList.remove('border-red-400', 'ring-1', 'ring-red-200');
    const errorEl = actionBody.querySelector(`[data-error-for="${errorKey}"]`);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  };

  const markError = (el, errorKey, message) => {
    if (!el) {
      return;
    }
    el.classList.add('border-red-400', 'ring-1', 'ring-red-200');
    const errorEl = actionBody.querySelector(`[data-error-for="${errorKey}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  };

  fields.forEach(({ el, errorKey }) => {
    if (!el) {
      return;
    }
    el.addEventListener('input', () => clearError(el, errorKey));
    el.addEventListener('change', () => clearError(el, errorKey));
  });

  const createBtn = actionBody.querySelector('[data-action="create-ticket"]');
  if (!createBtn) {
    return;
  }

  createBtn.addEventListener('click', async () => {
    let hasError = false;
    fields.forEach(({ el, name, errorKey, validator }) => {
      const value = el?.value?.trim?.() ?? '';
      if (!value) {
        markError(el, errorKey, `${name}不能为空`);
        hasError = true;
        return;
      } else {
        clearError(el, errorKey);
      }
      if (validator) {
        const message = validator(value);
        if (message) {
          markError(el, errorKey, message);
          hasError = true;
        } else {
          clearError(el, errorKey);
        }
      }
    });

    if (hasError) {
      return;
    }

    if (!isApiEnabled()) {
      showNotification('API 未启用，无法创建工单', 'warning');
      return;
    }

    try {
      const payload = buildTicketPayload();
      const workorderPayload = buildWorkorderPayload(payload);
      const response = await createWorkorder(workorderPayload);
      showNotification('工单已创建', 'success');
      const ticketResult = normalizeWorkorderCreateResponse(response);
      if (ticketResult?.id) {
        await createTask({
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          type: 'workorder',
          conversationId: payload.conversationId,
          metadata: {
            ...payload.metadata,
            workorder_ticket_id: ticketResult.id,
            workorder_ticket_no: ticketResult.ticketNo,
          },
        });
      }
      const tickets = await fetchTicketList();
      renderTicketManagementPanel(tickets, { showCreateButton: true });
    } catch (err) {
      console.warn('[ticket] create failed', err);
      showNotification('工单创建失败，请重试', 'error');
    }
  });
}

async function fetchTicketList() {
  if (!isApiEnabled()) {
    return [];
  }
  const activeConversation = document.querySelector('.conversation-item.is-active');
  const conversationId = activeConversation?.getAttribute('data-id') || '';
  if (!conversationId) {
    return [];
  }
  try {
    const response = await fetchTasks({ limit: 20, conversationId, type: 'workorder' });
    const payload = response?.data ?? response;
    const items = payload?.items ?? payload?.tasks ?? payload ?? [];
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map((task) => normalizeTicketFromTask(task));
  } catch (err) {
    console.warn('[ticket] list failed', err);
    return [];
  }
}

function buildTicketPayload() {
  const title = qs('#ticket-title')?.value?.trim() || '客户问题';
  const detail = qs('#ticket-detail')?.value?.trim() || '';
  const tagsRaw = qs('#ticket-tags')?.value?.trim() || '';
  const dateValue = qs('#ticket-date')?.value || '';
  const timeValue = qs('#ticket-time')?.value || '';
  const typeValue = qs('#ticket-type')?.value || '';
  const subTypeValue = qs('#ticket-sub-type')?.value || '';
  const secondSubtypeValue = qs('#ticket-second-subtype')?.value || '';
  const priorityValue = qs('#ticket-priority')?.value || '';
  const customerIdValue = qs('#ticket-customer-id')?.value || '';
  const customerNameValue = qs('#ticket-customer-name')?.value?.trim() || '';
  const customerInfoValue = qs('#ticket-customer-info')?.value?.trim() || '';
  const productIdValue = qs('#ticket-product-id')?.value || '';
  const productGroupValue = qs('#ticket-product-group')?.value || '';
  const attachmentValue = qs('#ticket-attachment')?.value?.trim() || '';
  const needProcessValue = qs('#ticket-need-process')?.value || '';
  const relateIdValue = qs('#ticket-relate-id')?.value || '';
  const useRelateValue = qs('#ticket-use-relate')?.value || '';
  const creatorIdValue = qs('#ticket-creator-id')?.value || '';
  const creatorNameValue = qs('#ticket-creator-name')?.value?.trim() || '';
  const activeConversation = document.querySelector('.conversation-item.is-active');
  const customerId = customerIdValue || activeConversation?.getAttribute('data-customer-id') || '';
  const conversationId = activeConversation?.getAttribute('data-id') || '';

  const reportedTime = buildReportedTimestamp(dateValue, timeValue);
  const tags = parseCommaList(tagsRaw).map((value) => parseNumberValue(value) ?? value).filter((value) => value !== undefined && value !== '');
  const attachments = parseCommaList(attachmentValue).filter((value) => value);
  const customerInfo = parseJsonValue(customerInfoValue);

  const priorityLabel = priorityValue || '';
  const taskPriority = mapPriorityToTask(priorityLabel);

  const metadata = {
    title,
    detail,
    tags,
    reported_time: reportedTime,
    type: parseNumberValue(typeValue),
    sub_type: parseNumberValue(subTypeValue),
    second_subtype: parseNumberValue(secondSubtypeValue),
    priority: parseNumberValue(priorityValue),
    customer_organization_id: parseNumberValue(customerIdValue),
    customer_organization_name: customerNameValue,
    customer_info: customerInfo,
    repository_product_id: parseNumberValue(productIdValue),
    whether_product_group_id: parseBooleanValue(productGroupValue),
    attachment: attachments,
    need_process: parseBooleanValue(needProcessValue),
    relate_to_ticket_id: parseNumberValue(relateIdValue),
    use_relate_status: parseBooleanValue(useRelateValue),
    creator_id: parseNumberValue(creatorIdValue),
    creator_name: creatorNameValue,
  };

  return {
    title,
    description: detail,
    priority: taskPriority,
    type: 'workorder',
    customerId,
    conversationId,
    metadata,
  };
}

const TICKET_STATUS_LABELS = {
  1: '待处理',
  2: '处理中',
  3: '已关闭',
  4: '已取消',
  pending: '待处理',
  in_progress: '处理中',
  completed: '已关闭',
  cancelled: '已取消',
};

const TICKET_PRIORITY_LABELS = {
  1: '紧急',
  2: '高级',
  3: '普通',
  urgent: '紧急',
  high: '紧急',
  medium: '高级',
  low: '普通',
};

const TICKET_TYPE_LABELS = {
  1: '问题排查',
  2: '需求反馈',
  3: '咨询',
  investigation: '问题排查',
  bug: '问题排查',
  consult: '咨询',
};

function parseCommaList(value) {
  if (!value) {
    return [];
  }
  return value.split(',').map((item) => item.trim()).filter((item) => item);
}

function parseNumberValue(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseBooleanValue(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (value === true || value === false) {
    return value;
  }
  const normalized = String(value).toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return undefined;
}

function parseJsonValue(value) {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch (err) {
    return value;
  }
}

function formatTimestamp(value) {
  if (!value) {
    return '';
  }
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    const ms = value > 1e12 ? value : value > 1e10 ? value : value * 1000;
    date = new Date(ms);
  } else if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      const ms = numeric > 1e12 ? numeric : numeric > 1e10 ? numeric : numeric * 1000;
      date = new Date(ms);
    } else {
      date = new Date(value);
    }
  }
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (val) => String(val).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function buildReportedTimestamp(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return undefined;
  }
  const timestamp = new Date(`${dateValue}T${timeValue}:00`).getTime();
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }
  return Math.floor(timestamp / 1000);
}

function mapPriorityToTask(priorityValue) {
  const normalized = String(priorityValue || '').trim();
  if (normalized === '1') {
    return 'high';
  }
  if (normalized === '2') {
    return 'medium';
  }
  if (normalized === '3') {
    return 'low';
  }
  return 'medium';
}

function mapTicketLabel(map, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const key = typeof value === 'number' ? value : String(value).trim();
  return map[key] || String(value);
}

function normalizeTicketFromTask(task) {
  const metadata = task?.metadata ?? {};
  const id = task.id || task.taskId || metadata.id || '';
  const title = metadata.title || task.title || task.name || '';
  const detail = metadata.detail || task.description || task.summary || '';
  const status = mapTicketLabel(TICKET_STATUS_LABELS, metadata.status ?? task.status);
  const priority = mapTicketLabel(TICKET_PRIORITY_LABELS, metadata.priority ?? task.priority);
  const type = mapTicketLabel(TICKET_TYPE_LABELS, metadata.type ?? task.type);
  const createdAt = formatTimestamp(metadata.created_time ?? task.createdAt);
  const reportedTime = formatTimestamp(metadata.reported_time);
  const customer = metadata.customer_organization_name || task.customerId || '';
  const productGroup = metadata.product_group || metadata.product_group_name || '';
  const handler = metadata.handler || '';
  const manager = metadata.manager || '';
  const tags = Array.isArray(metadata.tags) ? metadata.tags.join(', ') : (metadata.tags || '');
  const subType = metadata.sub_type;
  const secondSubtype = metadata.second_subtype;
  const needProcess = metadata.need_process;

  return {
    id,
    title,
    detail,
    status,
    priority,
    type,
    createdAt,
    reportedTime,
    customer,
    productGroup,
    handler,
    manager,
    tags,
    subType,
    secondSubtype,
    needProcess,
    metadata,
  };
}

function buildWorkorderPayload(payload) {
  if (!payload) {
    return {};
  }
  const metadata = payload.metadata || {};
  return {
    title: metadata.title || payload.title,
    detail: metadata.detail || payload.description || '',
    tags: metadata.tags || [],
    reported_time: metadata.reported_time,
    type: metadata.type,
    sub_type: metadata.sub_type,
    second_subtype: metadata.second_subtype,
    priority: metadata.priority,
    customer_organization_id: metadata.customer_organization_id,
    customer_organization_name: metadata.customer_organization_name,
    customer_info: metadata.customer_info,
    repository_product_id: metadata.repository_product_id,
    whether_product_group_id: metadata.whether_product_group_id,
    attachment: metadata.attachment,
    need_process: metadata.need_process,
    relate_to_ticket_id: metadata.relate_to_ticket_id,
    use_relate_status: metadata.use_relate_status,
    form_id: metadata.form_id,
    form_values: metadata.form_values,
    creator_id: metadata.creator_id,
    creator_name: metadata.creator_name,
  };
}

function normalizeWorkorderCreateResponse(response) {
  const payload = response?.data ?? response ?? {};
  const data = payload?.data ?? payload ?? {};
  return {
    id: data.ticket_id || data.id || data.ticketId || '',
    ticketNo: data.ticket_no || data.ticketNo || '',
  };
}

function padTwo(value) {
  return String(value).padStart(2, '0');
}

function getNowDateTime() {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`,
    time: `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}`,
  };
}

function getTicketPrefillContext() {
  const activeConversation = document.querySelector('.conversation-item.is-active');
  if (!activeConversation) {
    return {};
  }
  const titleNode = activeConversation.querySelector('.text-sm.font-medium');
  const previewNode = activeConversation.querySelector('.line-clamp-2');
  const summary = previewNode?.textContent?.trim() || '';
  return {
    customerId: activeConversation.getAttribute('data-customer-id') || '',
    customerName: titleNode?.textContent?.trim() || '',
    summary,
  };
}

function fillTicketFormDefaults() {
  const { date, time } = getNowDateTime();
  const dateInput = qs('#ticket-date');
  const timeInput = qs('#ticket-time');
  if (dateInput && !dateInput.value) {
    dateInput.value = date;
  }
  if (timeInput && !timeInput.value) {
    timeInput.value = time;
  }
  const creatorIdInput = qs('#ticket-creator-id');
  if (creatorIdInput && !creatorIdInput.value && window.config?.userId) {
    creatorIdInput.value = window.config.userId;
  }
  const creatorNameInput = qs('#ticket-creator-name');
  if (creatorNameInput && !creatorNameInput.value) {
    const cachedUser = localStorage.getItem('authUser');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        creatorNameInput.value = parsed?.name || parsed?.displayName || parsed?.email || '';
      } catch (_err) {
        creatorNameInput.value = '';
      }
    }
  }
}

async function autofillTicketForm() {
  fillTicketFormDefaults();
  const context = getTicketPrefillContext();
  const customerIdInput = qs('#ticket-customer-id');
  if (customerIdInput && !customerIdInput.value && context.customerId) {
    customerIdInput.value = context.customerId;
  }
  const customerNameInput = qs('#ticket-customer-name');
  if (customerNameInput && !customerNameInput.value && context.customerName) {
    customerNameInput.value = context.customerName;
  }
  const titleInput = qs('#ticket-title');
  if (titleInput && !titleInput.value && context.summary) {
    titleInput.value = context.summary.slice(0, 80);
  }
  const detailInput = qs('#ticket-detail');
  if (detailInput && !detailInput.value) {
    const latest = getLatestCustomerMessageText();
    if (latest) {
      detailInput.value = latest;
    }
  }

  if (!currentConversationId) {
    return;
  }

  try {
    const aiResponse = await fetchConversationAiAnalysis(currentConversationId);
    const aiPayload = aiResponse?.data ?? aiResponse ?? {};
    const issueProduct = aiPayload.issueProduct || aiPayload.issue_product || '';
    const faultLevel = aiPayload.faultLevel || aiPayload.fault_level || '';
    const detectedIssues = aiPayload.detectedIssues || aiPayload.issues || [];

    const detailCurrent = detailInput?.value?.trim() || '';
    const issueLines = [];
    if (issueProduct) {
      issueLines.push(`问题定位：${issueProduct}`);
    }
    if (faultLevel) {
      issueLines.push(`故障等级：${faultLevel}`);
    }
    if (detectedIssues.length) {
      const first = detectedIssues[0];
      if (typeof first === 'string') {
        issueLines.push(`问题描述：${first}`);
      } else {
        if (first.description) {
          issueLines.push(`问题描述：${first.description}`);
        }
        if (first.suggestedAction) {
          issueLines.push(`建议动作：${first.suggestedAction}`);
        }
      }
    }
    if (detailInput && issueLines.length && !detailCurrent.includes(issueLines[0])) {
      detailInput.value = detailCurrent ? `${detailCurrent}\n${issueLines.join('\n')}` : issueLines.join('\n');
    }

    const prioritySelect = qs('#ticket-priority');
    if (prioritySelect && !prioritySelect.value) {
      const normalized = String(faultLevel || '').toUpperCase();
      if (normalized.includes('P0') || normalized.includes('P1')) {
        prioritySelect.value = '1';
      } else if (normalized.includes('P2')) {
        prioritySelect.value = '2';
      } else if (normalized.includes('P3') || normalized.includes('P4')) {
        prioritySelect.value = '3';
      }
    }
  } catch (err) {
    console.warn('[ticket] autofill ai failed', err);
  }
}

function renderTicketManagementPanel(tickets, options = {}) {
  const { showCreateButton = false } = options;
  const list = Array.isArray(tickets) ? tickets : [];
  const emptyState = getAiEmptyStateHtml();
  const contentHtml = `
    <div class="ai-panel-stack ai-panel-stack-tight">
      ${showCreateButton
    ? `<div class="flex justify-end">
            <button class="ai-panel-chip" data-action="open-ticket-form">创建工单</button>
          </div>`
    : ''}
      <div class="ai-panel-stack ai-panel-stack-tight">
        ${list.length ? list.map((ticket) => `
          <button class="ticket-item ai-panel-card ai-panel-card--compact" data-ticket-id="${ticket.id}">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="ai-panel-title">${ticket.title || '暂无数据'}</div>
                <div class="text-xs text-gray-500 mt-1">客户：${ticket.customer || '暂无数据'} · 创建时间：${ticket.createdAt || '暂无数据'}</div>
                <div class="text-xs text-gray-600 mt-2">类型：${ticket.type || '暂无数据'} · 优先级：${ticket.priority || '暂无数据'} · 产品线：${ticket.productGroup || '暂无数据'}</div>
              </div>
              <span class="ticket-status-chip ${getTicketStatusClass(ticket.status || '')}">${ticket.status || '暂无数据'}</span>
            </div>
          </button>
        `).join('') : emptyState}
      </div>
    </div>
  `;

  setAiActionPanelContent({
    titleText: '工单管理',
    badgeText: '工单',
    descText: '查看工单状态与进展，点击查看详情。',
    contentHtml,
  });

  bindTicketListActions(list);
}

function getTicketStatusClass(status) {
  if (status.includes('处理中')) {
    return 'status-progress';
  }
  if (status.includes('待确认')) {
    return 'status-warn';
  }
  if (status.includes('待处理')) {
    return 'status-warn';
  }
  return 'status-open';
}

function bindTicketListActions(tickets) {
  const actionBody = qs('#ai-action-content');
  if (!actionBody) {
    return;
  }

  actionBody.onclick = (event) => {
    const createBtn = event.target.closest('[data-action="open-ticket-form"]');
    if (createBtn) {
      openTicket();
      return;
    }
    const item = event.target.closest('.ticket-item');
    if (!item) {
      return;
    }
    const ticketId = item.dataset.ticketId;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      return;
    }
    showActionModal({
      title: `工单详情 · ${ticket.id || '暂无数据'}`,
      bodyHtml: `
        <div class="space-y-2">
          <div><strong>标题：</strong>${ticket.title || '暂无数据'}</div>
          <div><strong>客户：</strong>${ticket.customer || '暂无数据'}</div>
          <div><strong>状态：</strong>${ticket.status || '暂无数据'}</div>
          <div><strong>优先级：</strong>${ticket.priority || '暂无数据'}</div>
          <div><strong>类型：</strong>${ticket.type || '暂无数据'}</div>
          <div><strong>子类型ID：</strong>${ticket.subType || '暂无数据'}</div>
          <div><strong>二级子类型ID：</strong>${ticket.secondSubtype || '暂无数据'}</div>
          <div><strong>产品线：</strong>${ticket.productGroup || '暂无数据'}</div>
          <div><strong>创建人：</strong>${ticket.metadata?.creator_name || '暂无数据'}</div>
          <div><strong>处理人：</strong>${ticket.handler || '暂无数据'}</div>
          <div><strong>负责人：</strong>${ticket.manager || '暂无数据'}</div>
          <div><strong>创建时间：</strong>${ticket.createdAt || '暂无数据'}</div>
          <div><strong>反馈时间：</strong>${ticket.reportedTime || '暂无数据'}</div>
          <div><strong>标签：</strong>${ticket.tags || '暂无数据'}</div>
          <div><strong>是否流转：</strong>${ticket.needProcess === undefined ? '暂无数据' : ticket.needProcess ? '是' : '否'}</div>
          <div><strong>详情：</strong>${ticket.detail || '暂无数据'}</div>
        </div>
      `,
    });
  };
}

function bindAssistCheckActions() {
  const actionBody = qs('#ai-action-content');
  if (!actionBody) {
    return;
  }

  actionBody.onclick = (event) => {
    const btn = event.target.closest('[data-action="manual-check"]');
    if (btn) {
      const toolName = btn.dataset.tool || '排查工具';
      const statusEl = actionBody.querySelector(`[data-tool-status="${toolName}"]`);
      if (statusEl) {
        statusEl.textContent = '已手动触发';
        statusEl.classList.add('is-manual');
      }
      showNotification(`已发起手动排查：${toolName}`, 'info');
      return;
    }

    const copyBtn = event.target.closest('[data-action="copy-collab"]');
    if (copyBtn) {
      const source = actionBody.querySelector('[data-copy-source]');
      const text = source?.innerText?.trim() || '';
      if (!text) {
        showNotification('暂无可复制内容', 'warning');
        return;
      }
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => showNotification('已复制协同信息', 'success'))
          .catch(() => showNotification('复制失败，请手动复制', 'warning'));
      } else {
        showNotification('浏览器不支持自动复制，请手动复制', 'warning');
      }
      return;
    }
  };
}

function bindTicketClarifyAction() {
  const actionBody = qs('#ai-action-content');
  if (!actionBody) {
    return;
  }
  const clarifyBtn = actionBody.querySelector('[data-action="clarify"]');
  if (!clarifyBtn) {
    return;
  }
  clarifyBtn.addEventListener('click', () => {
    openClarifyPanel();
  });
}

export function openClarifyPanel() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  renderClarifyPlaceholder();
  if (!currentConversationId) {
    showNotification(NO_CONVERSATION_MESSAGE, 'warning');
    renderClarifyPlaceholder(NO_CONVERSATION_MESSAGE);
    return;
  }

  fetchConversationAiAnalysis(currentConversationId)
    .then((response) => {
      const payload = response?.data ?? response ?? {};
      const issueProduct = payload.issueProduct || '产品/模块';
      const faultLevel = payload.faultLevel || '';
      const latest = getLatestCustomerMessageText();
      const questions = [
        `请确认受影响的${issueProduct}具体模块与环境信息。`,
        '问题开始出现的具体时间与频次？',
        '是否有报错码、截图或日志可提供？',
        '最近是否做过配置/版本/权限变更？',
      ];
      if (faultLevel) {
        questions.unshift(`当前已按${faultLevel}级别跟进，是否需要紧急处理时间目标？`);
      }
      if (latest) {
        questions.push(`针对“${latest.slice(0, 30)}”，还有哪些细节需要补充？`);
      }

      setAiClarifyPanelContent(`
        <div class="ai-panel-stack">
          <div class="ai-panel-card">
            <div class="text-xs text-gray-400 mb-2">澄清问题清单</div>
            <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">
              ${questions.map((q) => `<li>${q}</li>`).join('')}
            </ul>
          </div>
        </div>
      `);
    })
    .catch((err) => {
      console.warn('[chat] openClarifyPanel failed', err);
      renderClarifyPlaceholder(EMPTY_DATA_MESSAGE);
    });
}


function initConversationList() {
  loadConversationList();
}

const CONVERSATION_NAME_OVERRIDES = {};

const CUSTOMER_NAME_OVERRIDES = {};

function getConversationDisplayName(conv) {
  if (!conv) {
    return '客户';
  }
  const byName = CUSTOMER_NAME_OVERRIDES[conv.customerName];
  return (
    CONVERSATION_NAME_OVERRIDES[conv.conversationId] ||
    byName ||
    conv.groupName ||
    conv.conversationName ||
    conv.title ||
    conv.customerName ||
    '客户'
  );
}

async function loadConversationList() {
  const container = qs('.conversation-list');
  if (!container) {
    return;
  }

  if (isApiEnabled()) {
    try {
      const params = {
        status: 'active',
        pageSize: 8,
        includeProblem: true,
      };
      if (window.config?.userRole === 'agent' && window.config?.userId) {
        params.agentId = window.config.userId;
      }
      const response = await fetchConversations(params);
      const payload = response?.data ?? response;
      const items = payload?.items ?? payload?.conversations ?? [];
      if (items.length) {
        renderConversationItems(container, items);
        chatController?.primeConversationCache(items);
        loadConversationStats();
      } else {
        container.innerHTML =
          '<div class="text-xs text-gray-500 p-3">暂无可用会话。</div>';
        resetConversationSelection();
        serverStatusCounts = { all: 0, pending: 0, active: 0 };
        updateStatusCounts(serverStatusCounts);
      }
    } catch (e) {
      console.warn('[chat] fetch conversations failed', e);
      container.innerHTML =
        '<div class="text-xs text-gray-500 p-3">会话列表加载失败，请稍后重试。</div>';
      showNotification('会话列表加载失败，请稍后重试', 'warning');
      serverStatusCounts = null;
      updateStatusCounts({ all: '--', pending: '--' });
    }
  } else {
    renderFallbackConversations(container);
    resetConversationSelection();
    serverStatusCounts = null;
    updateStatusCounts({ all: '--', pending: '--' });
  }

  bindConversationEvents();
}

function renderFallbackConversations(container) {
  container.innerHTML = '<div class="text-xs text-gray-500 p-3">暂无可用会话。</div>';
}

function bindConversationEvents() {
  const conversationItems = qsa('.conversation-item');
  if (!conversationItems.length) {
    return;
  }

  conversationItems.forEach((item) => {
    on(item, 'click', () => {
      conversationItems.forEach((node) => node.classList.remove('is-active'));
      item.classList.add('is-active');
      const conversationId = item.getAttribute('data-id');
      if (!conversationId) {
        return;
      }
      currentConversationId = conversationId;
      updateChatContent(conversationId);
      updateCustomerContext(conversationId, item.getAttribute('data-customer-id'));
    });
  });

  const active = conversationItems.find((node) => node.classList.contains('is-active'));
  if (active) {
    const activeId = active.getAttribute('data-id');
    if (!activeId) {
      return;
    }
    currentConversationId = activeId;
    updateChatContent(activeId);
    updateCustomerContext(activeId, active.getAttribute('data-customer-id'));
  } else {
    resetConversationSelection();
  }
}

function renderConversationItems(container, conversations) {
  const html = conversations
    .map((conv, index) => createConversationMarkup(conv, index === 0))
    .join('');
  container.innerHTML = html;

  // 自动获取情绪分析（异步，不阻塞渲染）
  if (isApiEnabled()) {
    conversations.forEach(conv => {
      loadSentimentForConversation(conv.conversationId);
    });
  }
}

/**
 * 加载对话的情绪分析并更新UI
 * @param {string} conversationId - 对话ID
 */
async function loadSentimentForConversation(conversationId) {
  try {
    const result = await fetchSentimentAnalysis(conversationId);
    const sentiment = result?.sentiment || result?.data?.sentiment;

    if (sentiment) {
      updateConversationSentiment(conversationId, sentiment);
    }
  } catch (err) {
    console.warn(`[chat] Failed to load sentiment for ${conversationId}:`, err);
  }
}

/**
 * 更新对话列表中的情绪icon
 * @param {string} conversationId - 对话ID
 * @param {Object} sentiment - 情绪数据
 */
function updateConversationSentiment(conversationId, sentiment) {
  const conversationItem = qs(`.conversation-item[data-id="${conversationId}"]`);
  if (!conversationItem) {
    return;
  }

  const sentimentIcon = getSentimentIcon(sentiment);
  if (!sentimentIcon) {
    return;
  }

  // 查找或创建情绪icon容器
  const existingIcon = conversationItem.querySelector('.sentiment-icon');
  if (existingIcon) {
    existingIcon.textContent = sentimentIcon;
    existingIcon.setAttribute('title', sentiment.label || sentiment.type || '情绪');
  } else {
    // 在客户等级 badge后面插入情绪icon
    const badgeContainer = conversationItem.querySelector('.mt-2 .flex');
    if (badgeContainer) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'sentiment-icon';
      iconSpan.textContent = sentimentIcon;
      iconSpan.setAttribute('title', sentiment.label || sentiment.type || '情绪');

      // 插入到第一个子元素（客户等级 badge容器）之后
      const firstChild = badgeContainer.firstElementChild;
      if (firstChild?.nextSibling) {
        badgeContainer.insertBefore(iconSpan, firstChild.nextSibling);
      } else {
        badgeContainer.appendChild(iconSpan);
      }
    }
  }
}

function createConversationMarkup(conv, isActive) {
  const name = getConversationDisplayName(conv);
  const initials = name.charAt(0) || '客';
  const summaryText =
    conv.aiSummary ||
    conv.summary ||
    conv.lastMessage ||
    '正在加载最新消息...';
  const senderLabel = conv.lastMessageSenderType
    ? conv.lastMessageSenderType === 'agent'
      ? (conv.lastMessageSenderName || '客服')
      : (conv.lastMessageSenderName || '客户')
    : '';
  const summaryWithSender = senderLabel ? `${senderLabel}：${summaryText}` : summaryText;
  const updatedAtValue = conv.updatedAt || conv.lastMessageTime || conv.lastMessageAt || conv.createdAt;
  const updatedAt = updatedAtValue
    ? new Date(updatedAtValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';
  const channelLabel = (conv.channel || 'IM').toUpperCase();
  const severity = conv.severity || 'normal';
  const badgeClass =
    severity === 'high'
      ? 'bg-red-100 text-red-700'
      : severity === 'low'
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-700';

  // 获取情绪信息
  const sentiment = conv.sentiment || null;
  const sentimentIcon = getSentimentIcon(sentiment);

  // 未读消息数
  const unreadCount = conv.unreadCount || 0;

  return `
    <div class="conversation-item ${isActive ? 'is-active' : ''}" data-id="${conv.conversationId}" data-channel="${conv.channel}" data-customer-id="${conv.customerId || ''}" data-status="${conv.problemStatus || ''}">
      <div class="flex items-start">
        <div
          class="avatar w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
          ${initials}
        </div>
        <div class="ml-3 flex-1">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-700">${name}</span>
              <span class="text-xs text-gray-500">${channelLabel}</span>
            </div>
            <span class="text-xs text-gray-400">${updatedAt}</span>
          </div>
          <p class="text-[13px] text-gray-600 mt-1 line-clamp-2">${summaryWithSender}</p>
          <div class="mt-2 flex items-center justify-between text-[11px] text-gray-500">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full ${badgeClass}">${conv.slaLevel || '客户等级'}</span>
              ${sentimentIcon ? `<span class="sentiment-icon" title="${sentiment?.label || '情绪识别中'}">${sentimentIcon}</span>` : ''}
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs ${conv.urgency === 'high' ? 'text-red-600' : 'text-gray-500'}">${
  conv.urgency || '正常'
}</span>
              ${unreadCount > 0 ? `<span class="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">${unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadConversationStats() {
  if (!isApiEnabled()) {
    serverStatusCounts = null;
    updateStatusCounts({ all: '--', pending: '--' });
    return;
  }

  try {
    const params = {
      channel: filterState.channel || undefined,
      urgency: filterState.urgency || undefined,
      sla: filterState.sla || undefined,
    };
    const response = await fetchConversationStats(params);
    const payload = response?.data ?? response;
    serverStatusCounts = payload?.statusCounts || null;
    updateStatusCounts(serverStatusCounts || { all: '--', pending: '--' });
  } catch (err) {
    console.warn('[chat] load conversation stats failed', err);
    serverStatusCounts = null;
    updateStatusCounts({ all: '--', pending: '--' });
  }
}

function updateChatContent(conversationId) {
  if (!conversationId) {
    resetConversationSelection();
    return;
  }
  currentConversationId = conversationId;
  const card = qs(`.conversation-item[data-id="${conversationId}"]`);

  // 修复：使用正确的选择器获取客户名称和摘要
  const customerName =
    card?.querySelector('.text-sm.font-medium')?.textContent?.trim() ||
    CONVERSATION_NAME_OVERRIDES[conversationId] ||
    '客户';
  const summary = card?.querySelector('.line-clamp-2')?.textContent?.trim() || '正在加载...';
  const slaNode = card?.querySelector('.px-2');
  const sla = slaNode?.textContent?.trim() || '客户等级未知';

  chatController?.setConversation(conversationId, {
    customerName,
    summary,
    sla,
    customerId: card?.getAttribute('data-customer-id') || conversationId,
    company: card?.getAttribute('data-company') || '',
  });
  updateCustomerContext(conversationId, card?.getAttribute('data-customer-id'));
}

function resetConversationSelection() {
  currentConversationId = null;
  chatController?.setConversation(null);
  updateCustomerContext(null, null);
}

function initInputEvents() {
  const messageInput = qs('#message-input');
  const emojiButton = qs('#emoji-button');
  const emojiPanel = qs('#emoji-panel');
  const warning = qs('#low-confidence-warning');

  if (!messageInput) {
    return;
  }

  on(messageInput, 'input', () => {
    const content = messageInput.value;
    if (warning) {
      if (content.includes('赠送') || content.includes('优惠') || content.includes('折扣')) {
        warning.classList.remove('hidden');
      } else {
        warning.classList.add('hidden');
      }
    }
  });

  on(messageInput, 'keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  if (emojiButton && emojiPanel) {
    on(emojiButton, 'click', () => emojiPanel.classList.toggle('hidden'));
    on(document, 'click', (e) => {
      if (!emojiButton.contains(e.target) && !emojiPanel.contains(e.target)) {
        emojiPanel.classList.add('hidden');
      }
    });
  }
}

export function sendMessage() {
  if (!chatController) {
    showNotification('AgentScope正在启动中，请稍候', 'warning');
    return;
  }
  chatController.sendInput();
}

export function toggleAiPlan() {
  const panel = qs('#ai-plan-panel');
  if (!panel) {
    return;
  }
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

export function addMessage(type, content) {
  const chatMessages = qs('#chat-messages');
  if (!chatMessages) {
    return;
  }

  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  let messageHTML = '';

  if (type === 'customer') {
    messageHTML = `
      <div class="message customer-message flex fade-in">
        <div class="avatar w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">张</div>
        <div class="ml-2 max-w-[70%]">
          <div class="message-bubble bg-blue-100 p-3 message-bubble-customer"><p>${content}</p></div>
          <div class="message-meta flex justify-between items-center mt-1">
            <span class="text-xs text-gray-500">${time}</span>
            <span class="emotion-neutral text-xs px-2 py-0.5 rounded-full">😐 中性</span>
          </div>
        </div>
      </div>`;
  } else {
    messageHTML = `
      <div class="message engineer-message flex justify-end fade-in">
        <div class="mr-2 max-w-[70%]">
          <div class="message-bubble ${type === 'engineer' ? 'bg-primary' : 'bg-gray-900'} text-white p-3 message-bubble-engineer">
            ${type === 'internal' ? '<div class="flex items-center text-xs text-amber-200 mb-1"><i class="fa fa-lock mr-1"></i><span>内部备注 · 不会发送至外部IM</span></div>' : ''}
            <p>${content}</p>
          </div>
          <div class="message-meta flex justify-end mt-1"><span class="text-xs text-gray-500">${time}</span></div>
        </div>
        <div class="avatar w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">王</div>
      </div>`;
  }

  chatMessages.insertAdjacentHTML('beforeend', messageHTML);

  if (type === 'customer') {
    analyzeRequirementText(content);
    loadRequirementsData();
  }
}

export function adoptSuggestion(id) {
  const suggestionCard = qs(`.suggestion-card[data-id="${id}"]`);
  if (!suggestionCard) {
    return;
  }
  const suggestionText = suggestionCard.querySelector('p:last-of-type')?.textContent || '';
  const input = qs('#message-input');
  if (input) {
    input.value = suggestionText;
  }
}

export function optimizeMessage() {
  const messageInput = qs('#message-input');
  if (!messageInput) {
    return;
  }

  const message = messageInput.value.trim();
  if (!message) {
    showNotification('请先输入消息内容', 'error');
    return;
  }

  const optimizeButton = qs('#optimize-button');
  if (optimizeButton) {
    optimizeButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  }

  setTimeout(() => {
    if (optimizeButton) {
      optimizeButton.innerHTML = '<i class="fa fa-magic"></i>';
    }
    messageInput.value = `${message} 感谢您的理解与支持，如有其他问题，请随时联系我们。`;
    showNotification('话术已优化', 'success');
  }, 800);
}

export function insertText(text) {
  const messageInput = qs('#message-input');
  if (!messageInput) {
    return;
  }

  const { selectionStart = 0, selectionEnd = 0, value } = messageInput;
  const newValue = `${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`;
  messageInput.value = newValue;

  const cursor = selectionStart + text.length;
  messageInput.setSelectionRange(cursor, cursor);
  messageInput.focus();
}

export function insertEmoji(emoji) {
  insertText(emoji);
  qs('#emoji-panel')?.classList.add('hidden');
}

export function addToSuggestion(content) {
  const replySuggestions = qs('.reply-suggestions');
  if (!replySuggestions) {
    return;
  }

  const suggestionId = `sug-${Date.now()}`;
  const suggestionHTML = `
    <div class="suggestion-card" data-id="${suggestionId}">
      <div class="flex items-start">
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
          <i class="fa fa-lightbulb-o"></i>
        </div>
        <div class="ml-2 flex-1">
          <p class="text-xs text-gray-500">知识引用</p>
          <p class="text-sm mt-1">${content}</p>
        </div>
      </div>
      <div class="flex justify-end mt-2">
        <button class="adopt-btn text-xs px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark" onclick="adoptSuggestion('${suggestionId}')">填入草稿（内部）</button>
      </div>
    </div>`;

  replySuggestions.insertAdjacentHTML('beforeend', suggestionHTML);
}

function initConversationEndDetection() {
  const sendButton = qs('#send-button');
  on(sendButton, 'click', () => {
    const message = qs('#message-input')?.value.trim();
    if (message) {
      analyzeConversationEnd(message);
    }
  });
}

function analyzeConversationEnd(message) {
  const endKeywords = ['解决', '完成', '感谢', '不客气', '有问题随时', '祝您', '再见'];
  const hasEndKeyword = endKeywords.some((keyword) => message.includes(keyword));
  if (hasEndKeyword) {
    setTimeout(showSatisfactionSurvey, 1000);
  }
}

function showSatisfactionSurvey() {
  const card = qs('#satisfaction-card');
  if (card) {
    card.classList.remove('hidden');
    card.classList.add('fade-in');
  }
}

export function submitSatisfaction(score) {
  showNotification(`感谢反馈，评分：${score}`, 'success');
  const card = qs('#satisfaction-card');
  if (card) {
    card.classList.add('hidden');
  }
}

// 对话筛选功能
let filterState = {
  searchText: '',
  status: 'all',
  channel: '',
  urgency: '',
  sla: '',
};

function initConversationFilters() {
  // 搜索框
  const searchInput = qs('#conversation-search-input');
  if (searchInput) {
    on(searchInput, 'input', (e) => {
      filterState.searchText = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }

  // 状态筛选按钮
  const statusButtons = qsa('[data-status]');
  statusButtons.forEach(button => {
    on(button, 'click', () => {
      filterState.status = button.getAttribute('data-status');
      updateStatusButtonStyles(button);
      applyFilters();
    });
  });

  // 渠道筛选
  const channelSelect = qs('#filter-channel');
  if (channelSelect) {
    on(channelSelect, 'change', (e) => {
      filterState.channel = e.target.value.toLowerCase();
      applyFilters();
      loadConversationStats();
    });
  }

  // 紧急度筛选
  const urgencySelect = qs('#filter-urgency');
  if (urgencySelect) {
    on(urgencySelect, 'change', (e) => {
      filterState.urgency = e.target.value.toLowerCase();
      applyFilters();
      loadConversationStats();
    });
  }

  // 客户等级筛选
  const slaSelect = qs('#filter-sla');
  if (slaSelect) {
    on(slaSelect, 'change', (e) => {
      filterState.sla = e.target.value.toLowerCase();
      applyFilters();
      loadConversationStats();
    });
  }
}

function updateStatusButtonStyles(activeButton) {
  const buttons = qsa('[data-status]');
  buttons.forEach(btn => {
    if (btn === activeButton) {
      btn.classList.remove('bg-white', 'border', 'border-gray-300');
      btn.classList.add('bg-primary', 'text-white');
      const badge = btn.querySelector('[data-count]');
      if (badge) {
        badge.classList.remove('bg-red-500', 'bg-gray-200', 'text-gray-700');
        badge.classList.add('bg-white', 'text-primary');
      }
    } else {
      btn.classList.remove('bg-primary', 'text-white');
      btn.classList.add('bg-white', 'border', 'border-gray-300');
      const badge = btn.querySelector('[data-count]');
      if (badge) {
        badge.classList.remove('bg-white', 'text-primary');
        if (btn.getAttribute('data-status') === 'pending') {
          badge.classList.add('bg-red-500', 'text-white');
        } else {
          badge.classList.add('bg-gray-200', 'text-gray-700');
        }
      }
    }
  });
}

function applyFilters() {
  const conversationItems = qsa('.conversation-item');
  let visibleCount = 0;
  const statusCounts = { all: 0, pending: 0, active: 0, completed: 0 };

  conversationItems.forEach(item => {
    let shouldShow = true;

    // 搜索文本筛选
    if (filterState.searchText) {
      const customerName = item.querySelector('.customer-name, .text-sm.font-medium')?.textContent?.toLowerCase() || '';
      const preview = item.querySelector('.conv-preview, .line-clamp-2')?.textContent?.toLowerCase() || '';
      if (!customerName.includes(filterState.searchText) && !preview.includes(filterState.searchText)) {
        shouldShow = false;
      }
    }

    // 状态筛选
    const itemStatus = item.getAttribute('data-status') || getConversationStatus(item);
    if (filterState.status !== 'all' && itemStatus !== filterState.status) {
      shouldShow = false;
    }

    // 渠道筛选
    if (filterState.channel) {
      const itemChannel = (item.getAttribute('data-channel') || '').toLowerCase();
      if (itemChannel !== filterState.channel) {
        shouldShow = false;
      }
    }

    // 紧急度筛选
    if (filterState.urgency) {
      const urgencyElement = item.querySelector('.text-xs.text-red-600, .text-xs.text-gray-500');
      const urgencyText = urgencyElement?.textContent?.toLowerCase() || '';
      let itemUrgency = 'normal';
      if (urgencyText.includes('紧急') || urgencyText.includes('high')) {
        itemUrgency = 'high';
      } else if (urgencyText.includes('已解决') || urgencyText.includes('low')) {
        itemUrgency = 'low';
      }
      if (itemUrgency !== filterState.urgency) {
        shouldShow = false;
      }
    }

    // 客户等级筛选
    if (filterState.sla) {
      const slaElement = item.querySelector('.px-2.py-0\\.5.rounded-full');
      const slaText = slaElement?.textContent?.toLowerCase() || '';
      let itemSla = '';
      if (slaText.includes('vip')) {
        itemSla = 'vip';
      } else if (slaText.includes('ka0')) {
        itemSla = 'ka0';
      } else if (slaText.includes('ka1')) {
        itemSla = 'ka1';
      }
      if (itemSla !== filterState.sla) {
        shouldShow = false;
      }
    }

    // 应用显示/隐藏
    if (shouldShow) {
      item.style.display = '';
      visibleCount++;
      statusCounts.all++;
      statusCounts[itemStatus] = (statusCounts[itemStatus] || 0) + 1;
    } else {
      item.style.display = 'none';
    }
  });

  // 更新状态计数
  updateStatusCounts(statusCounts);

  // 显示无结果提示
  showNoResultsMessage(visibleCount === 0);
}

function getConversationStatus(item) {
  // 根据对话项的内容判断状态
  const urgencyElement = item.querySelector('.text-xs.text-red-600, .text-xs.text-gray-500');

  const urgencyText = urgencyElement?.textContent?.toLowerCase() || '';
  const hasUrgentFlag = urgencyText.includes('紧急') || item.querySelector('.text-red-600');

  if (urgencyText.includes('已解决')) {
    return 'completed';
  } else if (hasUrgentFlag) {
    return 'pending';
  } else {
    return 'active';
  }
}

function updateStatusCounts(counts) {
  const allBadge = qs('[data-count="all"]');
  const pendingBadge = qs('[data-count="pending"]');
  const source = serverStatusCounts || counts;

  if (allBadge) {
    allBadge.textContent = source?.all ?? '--';
  }
  if (pendingBadge) {
    pendingBadge.textContent = source?.pending ?? '--';
  }
}

function showNoResultsMessage(show) {
  const container = qs('.conversation-list');
  if (!container) {
    return;
  }

  let noResultsDiv = container.querySelector('.no-results-message');

  if (show) {
    if (!noResultsDiv) {
      noResultsDiv = document.createElement('div');
      noResultsDiv.className = 'no-results-message p-8 text-center text-gray-500';
      noResultsDiv.innerHTML = `
        <i class="fa fa-search text-4xl mb-3 text-gray-300"></i>
        <p>未找到匹配的对话</p>
        <p class="text-sm mt-1">尝试调整筛选条件</p>
      `;
      container.appendChild(noResultsDiv);
    }
    noResultsDiv.style.display = 'block';
  } else {
    if (noResultsDiv) {
      noResultsDiv.style.display = 'none';
    }
  }
}

export function resetFilters() {
  filterState = {
    searchText: '',
    status: 'all',
    channel: '',
    urgency: '',
    sla: '',
  };

  const searchInput = qs('#conversation-search-input');
  if (searchInput) {
    searchInput.value = '';
  }

  const channelSelect = qs('#filter-channel');
  if (channelSelect) {
    channelSelect.value = '';
  }

  const urgencySelect = qs('#filter-urgency');
  if (urgencySelect) {
    urgencySelect.value = '';
  }

  const slaSelect = qs('#filter-sla');
  if (slaSelect) {
    slaSelect.value = '';
  }

  const allButton = qs('#filter-status-all');
  if (allButton) {
    updateStatusButtonStyles(allButton);
  }

  applyFilters();
  loadConversationStats();
}
