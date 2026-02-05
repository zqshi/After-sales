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
  createTask,
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
      <div class="flex justify-end">
        <button class="ai-panel-chip" data-action="open-ticket-management">工单管理</button>
      </div>
      <div class="ai-panel-form text-sm text-gray-700">
        <div class="ai-form-block">
          <div class="ai-form-row">
            <label class="w-16" for="ticket-title">标题</label>
            <input id="ticket-title" class="flex-1 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="请输入标题">
          </div>
          <div class="ai-form-error hidden" data-error-for="ticket-title"></div>
        </div>
        <div class="ai-form-block">
          <div class="ai-form-row ai-form-split">
            <label class="w-16" for="ticket-detail">详情</label>
            <textarea id="ticket-detail" rows="3" class="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="请输入问题详情与排查结果"></textarea>
          </div>
          <div class="ai-form-error hidden" data-error-for="ticket-detail"></div>
        </div>
        <div class="ai-form-block">
          <div class="ai-form-row">
            <label for="ticket-tags">添加标签</label>
            <select id="ticket-tags" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">暂未添加</option>
              <option value="network">网络异常</option>
              <option value="auth">认证问题</option>
              <option value="timeout">超时故障</option>
            </select>
          </div>
          <div class="ai-form-error hidden" data-error-for="ticket-tags"></div>
        </div>
        <div class="ai-form-block">
          <div class="ai-form-row">
            <label>问题反馈时间</label>
            <div class="ai-form-inline">
              <input id="ticket-date" type="date" class="px-3 py-1 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
              <input id="ticket-time" type="time" class="px-3 py-1 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
            </div>
          </div>
          <div class="ai-form-error hidden" data-error-for="ticket-datetime"></div>
        </div>
        <div class="ai-form-block">
          <div class="ai-form-row">
            <label for="ticket-type">问题类型</label>
            <select id="ticket-type" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">请选择</option>
              <option value="investigation">问题排查</option>
              <option value="bug">故障修复</option>
              <option value="consult">咨询</option>
            </select>
          </div>
          <div class="ai-form-error hidden" data-error-for="ticket-type"></div>
        </div>
        <div class="ai-form-block">
          <div class="ai-form-row">
            <label for="ticket-product">产品线</label>
            <select id="ticket-product" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">请选择</option>
              <option value="cloud">云主机</option>
              <option value="storage">存储</option>
              <option value="network">网络</option>
              <option value="security">安全</option>
            </select>
          </div>
          <div class="ai-form-error hidden" data-error-for="ticket-product"></div>
        </div>
        <div class="ai-form-block">
          <div class="ai-form-row">
            <label for="ticket-impact">受影响程度</label>
            <select id="ticket-impact" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">请选择</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
          <div class="ai-form-error hidden" data-error-for="ticket-impact"></div>
        </div>
        <div class="ai-form-block">
          <div class="ai-form-row">
            <label for="ticket-incident">是否故障</label>
            <select id="ticket-incident" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="yes" selected>是</option>
              <option value="no">否</option>
            </select>
          </div>
          <div class="ai-form-error hidden" data-error-for="ticket-incident"></div>
        </div>
        <div class="ai-form-block">
          <div class="ai-form-row">
            <label for="ticket-company">客户公司名称</label>
            <input id="ticket-company" class="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="请选择或输入">
          </div>
          <div class="ai-form-error hidden" data-error-for="ticket-company"></div>
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
    const productSelect = qs('#ticket-product');
    const impactSelect = qs('#ticket-impact');
    const incidentSelect = qs('#ticket-incident');
    const companyInput = qs('#ticket-company');
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
    if (productSelect) {
      productSelect.value = '';
    }
    if (impactSelect) {
      impactSelect.value = '';
    }
    if (incidentSelect) {
      incidentSelect.value = '';
    }
    if (companyInput) {
      companyInput.value = '';
    }
    if (managementBtn) {
      managementBtn.addEventListener('click', () => {
        openTicketManagementPanel();
      });
    }

    bindTicketFormValidation();
    bindTicketClarifyAction();
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
    { el: qs('#ticket-tags'), name: '标签', errorKey: 'ticket-tags' },
    { el: qs('#ticket-date'), name: '问题反馈时间（日期）', errorKey: 'ticket-datetime' },
    { el: qs('#ticket-time'), name: '问题反馈时间（时间）', errorKey: 'ticket-datetime' },
    { el: qs('#ticket-type'), name: '问题类型', errorKey: 'ticket-type' },
    { el: qs('#ticket-product'), name: '产品线', errorKey: 'ticket-product' },
    { el: qs('#ticket-impact'), name: '受影响程度', errorKey: 'ticket-impact' },
    { el: qs('#ticket-incident'), name: '是否故障', errorKey: 'ticket-incident' },
    { el: qs('#ticket-company'), name: '客户公司名称', errorKey: 'ticket-company' },
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
    fields.forEach(({ el, name, errorKey }) => {
      const value = el?.value?.trim?.() ?? '';
      if (!value) {
        markError(el, errorKey, `${name}不能为空`);
        hasError = true;
      } else {
        clearError(el, errorKey);
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
      await createTask(buildTicketPayload());
      showNotification('工单已创建', 'success');
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
    const response = await fetchTasks({ limit: 20, conversationId });
    const payload = response?.data ?? response;
    const items = payload?.items ?? payload?.tasks ?? payload ?? [];
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map((task) => ({
      id: task.id || task.taskId,
      title: task.title || task.name || '',
      summary: task.description || task.summary || '',
      customer: task.customerId || '',
      createdAt: task.createdAt || '',
      status: task.status || '',
      owner: task.assigneeName || task.assigneeId || '',
      priority: task.priority || '',
    }));
  } catch (err) {
    console.warn('[ticket] list failed', err);
    return [];
  }
}

function buildTicketPayload() {
  const title = qs('#ticket-title')?.value?.trim() || '客户问题';
  const detail = qs('#ticket-detail')?.value?.trim() || '';
  const impact = qs('#ticket-impact')?.value || 'medium';
  const type = qs('#ticket-type')?.value || 'investigation';
  const activeConversation = document.querySelector('.conversation-item.is-active');
  const customerId = activeConversation?.getAttribute('data-customer-id') || '';
  const conversationId = activeConversation?.getAttribute('data-id') || '';

  return {
    title,
    description: detail,
    priority: impact,
    type,
    customerId,
    conversationId,
  };
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
                <div class="text-xs text-gray-600 mt-2">${ticket.summary || '暂无数据'}</div>
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
          <div><strong>负责人：</strong>${ticket.owner || '暂无数据'}</div>
          <div><strong>创建时间：</strong>${ticket.createdAt || '暂无数据'}</div>
          <div><strong>摘要：</strong>${ticket.summary || '暂无数据'}</div>
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
