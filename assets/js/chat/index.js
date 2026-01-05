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
  fetchSentimentAnalysis,
  isApiEnabled,
} from '../api.js';

const outboundEnabled = false;
let currentConversationId = 'conv-001';
let chatController = null;

/**
 * 根据情绪类型返回对应的emoji图标
 * @param {Object|string|null} sentiment - 情绪对象或情绪字符串
 * @returns {string} emoji图标
 */
function getSentimentIcon(sentiment) {
  if (!sentiment) return '';

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

function setAiPanelMode(mode) {
  const panel = qs('#ai-assistant-panel');
  const replyPanel = qs('#ai-panel-reply');
  const solutionPanel = qs('#ai-panel-solution');
  const actionPanel = qs('#ai-panel-action');
  const clarifyPanel = qs('#ai-panel-clarify');
  const title = qs('#ai-assistant-title');
  const badge = qs('#ai-assistant-badge');
  const desc = qs('#ai-assistant-desc');

  if (panel) {
    panel.classList.remove('hidden');
  }
  if (!replyPanel || !solutionPanel || !actionPanel || !clarifyPanel) {
    return;
  }

  replyPanel.classList.toggle('hidden', mode !== 'reply');
  solutionPanel.classList.toggle('hidden', mode !== 'solution');
  actionPanel.classList.toggle('hidden', mode !== 'action');
  clarifyPanel.classList.toggle('hidden', mode !== 'clarify');

  if (title) {
    if (mode === 'reply') {
      title.textContent = '回复建议';
    } else if (mode === 'solution') {
      title.textContent = 'AI解决方案';
    } else if (mode === 'clarify') {
      title.textContent = '问题澄清';
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
    } else {
      desc.textContent = '支持工单与排查协作，可与对话并行操作。';
    }
  }
}

export function openAiReplyPanel() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  setAiReplyMockData();
  setAiPanelMode('reply');
}

export function openAiSolutionPanel() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  setAiSolutionMockData();
  setAiPanelMode('solution');
}

function setAiSolutionMockData() {
  const stepsEl = qs('#ai-solution-steps');
  const refsEl = qs('#ai-solution-references');
  if (!stepsEl || !refsEl) {
    return;
  }

  const contextText = getConversationContext().join(' ');
  const steps = buildSolutionStepsFromContext(contextText);
  const references = buildSolutionReferencesFromContext(contextText);

  stepsEl.innerHTML = steps.map((step) => `<li>${step}</li>`).join('');
  refsEl.innerHTML = references.map((item) => `
    <div class="ai-panel-card ai-panel-card--compact flex items-start gap-3">
      <div class="w-8 h-8 rounded-full ${item.tagClass} flex items-center justify-center text-xs">${item.tag}</div>
      <div class="flex-1">
        <div class="text-sm text-gray-700">${item.title}</div>
        <div class="text-[11px] text-gray-500 mt-1">${item.meta}</div>
      </div>
      <button class="text-xs text-primary hover:underline" data-action="view-reference" data-title="${item.title}" data-meta="${item.meta}">查看</button>
    </div>
  `).join('');

  refsEl.onclick = (event) => {
    const viewBtn = event.target.closest('[data-action="view-reference"]');
    if (!viewBtn) {
      return;
    }
    const title = viewBtn.dataset.title || '参考资料';
    const meta = viewBtn.dataset.meta || '';
    showActionModal({
      title,
      bodyHtml: `
        <div class="ai-panel-stack">
          <div class="ai-panel-card">
            <div class="ai-panel-title">摘要</div>
            <div class="ai-panel-text">当前为参考资料预览，实际内容可在知识库中查看。</div>
            ${meta ? `<div class="ai-panel-meta mt-2">${meta}</div>` : ''}
          </div>
        </div>
      `
    });
  };
}

function setAiReplyMockData() {
  const listEl = qs('#ai-reply-list');
  if (!listEl) {
    return;
  }

  const context = getConversationContext();
  const suggestions = buildReplySuggestions(context);

  listEl.innerHTML = suggestions.map((item) => `
    <div class="ai-panel-card">
      <div>
        <div class="text-xs text-gray-400 mb-1">${item.tag}</div>
        <p class="text-sm text-gray-700">${item.text}</p>
        <div class="mt-3 flex justify-end">
          <button class="ai-reply-adopt text-xs px-3 py-1 bg-primary text-white rounded-full hover:bg-primary-dark" data-suggestion="${item.text}">采纳</button>
        </div>
      </div>
    </div>
  `).join('');
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

function buildSolutionStepsFromContext(contextText) {
  const steps = [
    '确认客户问题的发生时间与影响范围，优先定位受影响模块。',
    '查看监控与告警，确认是否有异常指标或服务不可用。',
    '收集关键日志与错误码，定位根因并安排修复。',
    '验证恢复结果，确认客户侧功能恢复正常。',
    '同步客户处理进展并记录复盘要点。'
  ];

  if (/登录|认证|账号|密码/.test(contextText)) {
    return [
      '检查认证服务与登录网关健康状态。',
      '排查登录失败的错误码与异常日志。',
      '确认是否有权限变更或密码重置记录。',
      '必要时重启认证服务或切换备用节点。',
      '验证多账号登录恢复情况并同步客户。'
    ];
  }
  if (/无法访问|连接失败|超时|502|503/.test(contextText)) {
    return [
      '确认服务是否可用，检查网关/负载均衡状态。',
      '定位异常接口与错误码，排查上游依赖。',
      '查看近期发布/配置变更记录。',
      '执行回滚或故障修复操作，验证访问恢复。',
      '同步公告口径与恢复时间点。'
    ];
  }
  return steps;
}

function buildSolutionReferencesFromContext(contextText) {
  if (/登录|认证|账号|密码/.test(contextText)) {
    return [
      {
        tag: 'KB',
        tagClass: 'bg-blue-100 text-blue-600',
        title: '认证服务异常排查手册',
        meta: '适用场景：登录失败 · 平均恢复：15分钟'
      },
      {
        tag: 'DOC',
        tagClass: 'bg-emerald-100 text-emerald-600',
        title: '用户权限变更与回滚流程',
        meta: '适用场景：权限异常 · 版本：v3.2'
      },
      {
        tag: 'REF',
        tagClass: 'bg-amber-100 text-amber-600',
        title: '登录链路监控与追踪指引',
        meta: '建议工具：APM · 推荐时长：10分钟'
      }
    ];
  }
  return [
    {
      tag: 'KB',
      tagClass: 'bg-blue-100 text-blue-600',
      title: '服务不可用应急处理流程',
      meta: '适用场景：不可用 · 解决时间：12分钟'
    },
    {
      tag: 'DOC',
      tagClass: 'bg-emerald-100 text-emerald-600',
      title: '接口超时排查清单',
      meta: '适用场景：超时/502 · 更新：本月'
    },
    {
      tag: 'REF',
      tagClass: 'bg-amber-100 text-amber-600',
      title: '稳定性发布回滚策略',
      meta: '建议版本：v2.4 · 建议时长：10分钟'
    }
  ];
}

function buildReplySuggestions(contextLines = []) {
  const contextText = contextLines.join(' ').trim();
  const hasLoginIssue = /登录|无法登录|认证|账号|密码/.test(contextText);
  const hasSystemDown = /报错|无法访问|宕机|502|503|超时|连接失败/.test(contextText);
  const hasMultipleUsers = /多用户|多个用户|大面积|批量/.test(contextText);

  const suggestions = [];
  const header = contextText ? `根据您反馈的情况（${contextLines.slice(-1)[0] || '客户问题'}）` : '根据当前会话情况';

  suggestions.push({
    tag: '建议 1 · 稳定情绪',
    text: `${header}，我们已经同步技术团队处理。当前正在定位原因并加急恢复，预计 15 分钟内给到进展。给您带来不便非常抱歉。`
  });

  if (hasLoginIssue || hasSystemDown) {
    suggestions.push({
      tag: '建议 2 · 询问关键信息',
      text: '为尽快定位问题，请补充：报错截图、出现时间、是否所有账号均受影响，以及是否近期有密码重置/权限调整。'
    });
  }

  if (hasMultipleUsers) {
    suggestions.push({
      tag: '建议 3 · 影响范围确认',
      text: '我们将优先确认影响范围并同步公告口径。请告知受影响用户数量及业务影响程度，方便我们评估优先级。'
    });
  }

  suggestions.push({
    tag: '建议 4 · 临时建议',
    text: '建议先尝试清理缓存/重新登录，若仍异常请保持现状，我们会在修复后第一时间通知您。'
  });

  suggestions.push({
    tag: '建议 5 · 跟进承诺',
    text: '我会持续跟进处理进度，并在关键节点（定位/修复/恢复）及时向您同步。'
  });

  return suggestions;
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

export function openAssistCheckMock() {
  const latest = getLatestCustomerMessageText();
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  setAiActionPanelContent({
    titleText: '辅助排查',
    badgeText: '排查',
    descText: '根据当前反馈生成辅助排查建议。',
    contentHtml: `
    <div class="ai-panel-stack ai-panel-stack-tight">
      <div class="ai-panel-card">
        <div class="ai-panel-title">辅助排查</div>
        <div class="ai-panel-text">问题概述：${latest || '客户反馈出现异常，需要辅助排查。'}</div>
        <div class="ai-panel-label">系统排查优先级：</div>
        <ol class="ai-panel-list mt-2">
          <li class="ai-panel-card ai-panel-card--compact">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-start gap-2">
                  <span class="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">1</span>
                  <span class="text-sm text-gray-700">认证服务状态与告警是否异常</span>
                </div>
                <div class="ai-tool-meta">
                  <div class="ai-tool-meta-line">
                    <span>工具：监控告警中心</span>
                  </div>
                  <div class="ai-tool-meta-line">
                    <span class="ai-tool-status" data-tool-status="监控告警中心">自动调用中</span>
                    <button class="ai-panel-chip" data-action="manual-check" data-tool="监控告警中心">手动排查</button>
                  </div>
                </div>
              </div>
            </div>
          </li>
          <li class="ai-panel-card ai-panel-card--compact">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-start gap-2">
                  <span class="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">2</span>
                  <span class="text-sm text-gray-700">网关/登录接口日志中是否有 401/502 峰值</span>
                </div>
                <div class="ai-tool-meta">
                  <div class="ai-tool-meta-line">
                    <span>工具：网关日志检索</span>
                  </div>
                  <div class="ai-tool-meta-line">
                    <span class="ai-tool-status" data-tool-status="网关日志检索">自动调用中</span>
                    <button class="ai-panel-chip" data-action="manual-check" data-tool="网关日志检索">手动排查</button>
                  </div>
                </div>
              </div>
            </div>
          </li>
          <li class="ai-panel-card ai-panel-card--compact">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-start gap-2">
                  <span class="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">3</span>
                  <span class="text-sm text-gray-700">最近 30 分钟是否发生配置变更或发布</span>
                </div>
                <div class="ai-tool-meta">
                  <div class="ai-tool-meta-line">
                    <span>工具：变更审计台</span>
                  </div>
                  <div class="ai-tool-meta-line">
                    <span class="ai-tool-status" data-tool-status="变更审计台">自动调用中</span>
                    <button class="ai-panel-chip" data-action="manual-check" data-tool="变更审计台">手动排查</button>
                  </div>
                </div>
              </div>
            </div>
          </li>
          <li class="ai-panel-card ai-panel-card--compact">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-start gap-2">
                  <span class="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">4</span>
                  <span class="text-sm text-gray-700">缓存服务健康度与命中率</span>
                </div>
                <div class="ai-tool-meta">
                  <div class="ai-tool-meta-line">
                    <span>工具：缓存监控</span>
                  </div>
                  <div class="ai-tool-meta-line">
                    <span class="ai-tool-status" data-tool-status="缓存监控">自动调用中</span>
                    <button class="ai-panel-chip" data-action="manual-check" data-tool="缓存监控">手动排查</button>
                  </div>
                </div>
              </div>
            </div>
          </li>
          <li class="ai-panel-card ai-panel-card--compact">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-start gap-2">
                  <span class="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">5</span>
                  <span class="text-sm text-gray-700">受影响客户列表与影响范围统计</span>
                </div>
                <div class="ai-tool-meta">
                  <div class="ai-tool-meta-line">
                    <span>工具：客户影响面板</span>
                  </div>
                  <div class="ai-tool-meta-line">
                    <span class="ai-tool-status" data-tool-status="客户影响面板">自动调用中</span>
                    <button class="ai-panel-chip" data-action="manual-check" data-tool="客户影响面板">手动排查</button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ol>
      </div>
      <div class="ai-panel-card">
        <div class="ai-panel-title">需要同步给协作方的信息</div>
        <div class="ai-panel-label">建议按以下顺序补齐：</div>
        <ol class="ai-panel-list mt-2">
          <li class="flex items-start gap-2">
            <span class="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">1</span>
            <span>故障发生时间与首次上报时间</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">2</span>
            <span>客户侧报错截图/错误码</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">3</span>
            <span>影响范围（用户数/业务线/区域）</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">4</span>
            <span>已执行动作与当前状态</span>
          </li>
        </ol>
        <div class="ai-panel-label mt-3">协同方可直接发送的内容：</div>
        <div class="ai-panel-card ai-panel-card--compact bg-slate-50 border border-slate-200" data-copy-source>
          <div class="text-xs text-slate-600">【故障同步】</div>
          <div class="text-sm text-slate-800 mt-1">1) 首次上报时间：2024-08-15 09:18；故障发生时间：2024-08-15 09:12。</div>
          <div class="text-sm text-slate-800 mt-1">2) 报错信息：登录返回 502，疑似网关链路异常（客户截图待补充）。</div>
          <div class="text-sm text-slate-800 mt-1">3) 影响范围：VIP 客户 3 个群组，多用户无法登录。</div>
          <div class="text-sm text-slate-800 mt-1">4) 已执行动作：已通知值班工程师，切换备用节点进行观察。</div>
        </div>
        <div class="flex justify-end mt-2">
          <button class="ai-panel-chip" data-action="copy-collab">复制</button>
        </div>
      </div>
      <div class="ai-panel-banner info">建议优先完成 1-3 项，并同步公告口径。</div>
    </div>
  `
  });
  bindAssistCheckActions();
}

export function openFaultReportMock() {
  const latest = getLatestCustomerMessageText();
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  setAiActionPanelContent({
    titleText: '生成故障报告',
    badgeText: '报告',
    descText: '基于当前对话生成故障报告摘要。',
    contentHtml: `
    <div class="ai-panel-stack">
      <div class="ai-panel-card">
        <div class="ai-panel-title">故障报告摘要</div>
        <div class="ai-panel-grid">
          <div>客户ID：CUST-102984</div>
          <div>客户名称：ABC 科技有限公司</div>
        </div>
        <div class="ai-panel-label">故障时间线（正序）</div>
        <div class="ai-panel-list mt-2">
          <div>2024.08.15 09:12:03 认证服务出现异常告警</div>
          <div>2024.08.15 09:18:24 客户反馈多用户无法登录</div>
          <div>2024.08.15 09:26:40 技术团队确认影响范围并介入</div>
          <div>2024.08.15 09:38:15 切换备用节点并持续观察</div>
        </div>
        <div class="ai-panel-grid">
          <div>影响范围：VIP客户 · 3 个群组</div>
          <div>影响时长：28 分钟</div>
          <div>故障级别：P1</div>
          <div>修复状态：处理中</div>
        </div>
        <div class="ai-panel-banner info">处置动作：重启认证服务、切换备用节点、补发公告。</div>
        <div class="ai-panel-meta">报告编号：INC-2024-0815-001 · 负责人：王工程师</div>
      </div>
    </div>
  `
  });
}

export function openTicketMock() {
  const latest = getLatestCustomerMessageText();
  const now = new Date();
  const dateValue = now.toLocaleDateString('sv-SE');
  const timeValue = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const titleSuffix = latest ? latest.replace(/\s+/g, '').slice(0, 12) : '客户问题';
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
  `
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

    const contextText = latest || '';
    const aiTitle = `工单-${titleSuffix}-${dateValue.replace(/-/g, '')}`;
    const aiDetail = `问题详情：${latest || '客户反馈出现异常，需要排查。'}\n本地排查：（AI 排查结果），辛苦协助排查。`;
    const aiDate = dateValue;
    const aiTime = timeValue;
    const aiCompany = 'ABC 科技有限公司';
    const tagValue = /登录|认证|账号|密码/.test(contextText)
      ? 'auth'
      : /连接|网络|超时|502|503/.test(contextText)
        ? 'network'
        : 'timeout';
    const productValue = /网络|连接|网关/.test(contextText)
      ? 'network'
      : /存储|磁盘/.test(contextText)
        ? 'storage'
        : /安全|认证|权限/.test(contextText)
          ? 'security'
          : 'cloud';

    if (titleInput) titleInput.value = aiTitle;
    if (detailInput) detailInput.value = aiDetail;
    if (tagSelect) tagSelect.value = tagValue;
    if (dateInput) dateInput.value = aiDate;
    if (timeInput) timeInput.value = aiTime;
    if (typeSelect) typeSelect.value = 'investigation';
    if (productSelect) productSelect.value = productValue;
    if (impactSelect) impactSelect.value = 'low';
    if (incidentSelect) incidentSelect.value = 'yes';
    if (companyInput) companyInput.value = aiCompany;
    if (managementBtn) {
      managementBtn.addEventListener('click', () => {
        openTicketManagementPanel();
      });
    }

    bindTicketFormValidation();
    bindTicketClarifyAction();
  }, 0);
}

export function openTicketManagementPanel() {
  openAiAssistantPanel();
  hideRightSidebarOverlay();
  renderTicketManagementPanel(getTicketManagementBaseList(), { showCreateButton: true });
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
    { el: qs('#ticket-company'), name: '客户公司名称', errorKey: 'ticket-company' }
  ];

  const clearError = (el, errorKey) => {
    if (!el) return;
    el.classList.remove('border-red-400', 'ring-1', 'ring-red-200');
    const errorEl = actionBody.querySelector(`[data-error-for="${errorKey}"]`);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  };

  const markError = (el, errorKey, message) => {
    if (!el) return;
    el.classList.add('border-red-400', 'ring-1', 'ring-red-200');
    const errorEl = actionBody.querySelector(`[data-error-for="${errorKey}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  };

  fields.forEach(({ el, errorKey }) => {
    if (!el) return;
    el.addEventListener('input', () => clearError(el, errorKey));
    el.addEventListener('change', () => clearError(el, errorKey));
  });

  const createBtn = actionBody.querySelector('[data-action="create-ticket"]');
  if (!createBtn) {
    return;
  }

  createBtn.addEventListener('click', () => {
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
    const ticketData = buildTicketSummary();
    showNotification('已创建工单及群聊，请前往WPS协作查看', 'success');
    renderTicketManagementPanel(ticketData.list, { showCreateButton: true });
  });
}

function getTicketManagementBaseList() {
  return [
    {
      id: 'TK20240815002',
      title: '多用户登录失败排查',
      summary: '排查认证服务与网关日志，已定位异常。',
      customer: 'ABC 科技有限公司',
      createdAt: '2024-08-15 09:10',
      status: '处理中',
      owner: '李工程师',
      priority: 'P1'
    },
    {
      id: 'TK20240814011',
      title: '接口超时告警复盘',
      summary: '复盘完成，等待确认补偿方案。',
      customer: 'XYZ 智造科技',
      createdAt: '2024-08-14 17:45',
      status: '待确认',
      owner: '陈工程师',
      priority: 'P2'
    }
  ];
}

function buildTicketSummary() {
  const title = qs('#ticket-title')?.value?.trim() || '客户问题';
  const detail = qs('#ticket-detail')?.value?.trim() || '';
  const date = qs('#ticket-date')?.value || '';
  const time = qs('#ticket-time')?.value || '';
  const company = qs('#ticket-company')?.value?.trim() || '客户';
  const createdAt = date && time ? `${date} ${time}` : '刚刚';
  const id = `TK${Date.now()}`;

  const createdTicket = {
    id,
    title,
    summary: detail ? detail.slice(0, 60) : '已创建工单，等待处理。',
    customer: company,
    createdAt,
    status: '处理中',
    owner: '王工程师',
    priority: 'P1'
  };

  return {
    list: [
      createdTicket,
      ...getTicketManagementBaseList()
    ]
  };
}

function renderTicketManagementPanel(tickets, options = {}) {
  const { showCreateButton = false } = options;
  const contentHtml = `
    <div class="ai-panel-stack ai-panel-stack-tight">
      ${showCreateButton
        ? `<div class="flex justify-end">
            <button class="ai-panel-chip" data-action="open-ticket-form">创建工单</button>
          </div>`
        : ''}
      <div class="ai-panel-stack ai-panel-stack-tight">
        ${tickets.map((ticket) => `
          <button class="ticket-item ai-panel-card ai-panel-card--compact" data-ticket-id="${ticket.id}">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="ai-panel-title">${ticket.title}</div>
                <div class="text-xs text-gray-500 mt-1">客户：${ticket.customer} · 创建时间：${ticket.createdAt}</div>
                <div class="text-xs text-gray-600 mt-2">${ticket.summary}</div>
              </div>
              <span class="ticket-status-chip ${getTicketStatusClass(ticket.status)}">${ticket.status}</span>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  setAiActionPanelContent({
    titleText: '工单管理',
    badgeText: '工单',
    descText: '查看工单状态与进展，点击查看详情。',
    contentHtml
  });

  bindTicketListActions(tickets);
}

function getTicketStatusClass(status) {
  if (status.includes('处理中')) return 'status-progress';
  if (status.includes('待确认')) return 'status-warn';
  return 'status-open';
}

function bindTicketListActions(tickets) {
  const actionBody = qs('#ai-action-content');
  if (!actionBody) return;

  actionBody.onclick = (event) => {
    const createBtn = event.target.closest('[data-action="open-ticket-form"]');
    if (createBtn) {
      openTicketMock();
      return;
    }
    const item = event.target.closest('.ticket-item');
    if (!item) return;
    const ticketId = item.dataset.ticketId;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    showActionModal({
      title: `工单详情 · ${ticket.id}`,
      bodyHtml: `
        <div class="space-y-2">
          <div><strong>标题：</strong>${ticket.title}</div>
          <div><strong>客户：</strong>${ticket.customer}</div>
          <div><strong>状态：</strong>${ticket.status}</div>
          <div><strong>优先级：</strong>${ticket.priority}</div>
          <div><strong>负责人：</strong>${ticket.owner}</div>
          <div><strong>创建时间：</strong>${ticket.createdAt}</div>
          <div><strong>摘要：</strong>${ticket.summary}</div>
        </div>
      `
    });
  };
}

function bindAssistCheckActions() {
  const actionBody = qs('#ai-action-content');
  if (!actionBody) return;

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
  const latest = getLatestCustomerMessageText();
  const analysis = analyzeClarifyNeeds(latest);
  if (analysis.needsClarify) {
    const clarifyQuestions = [
      '您好，请提供具体的服务器实例ID或IP，我们高优排查该问题。',
      ...analysis.questions,
    ];
    setAiClarifyPanelContent(`
      <div class="ai-panel-stack">
        <div class="ai-panel-card">
          <div class="ai-panel-title">问题澄清</div>
          <div class="ai-panel-text">问题描述仍需澄清，建议补充以下信息：</div>
          <ul class="ai-panel-list mt-2">
          ${clarifyQuestions.map((item, index) => `
            <li class="flex items-start gap-2">
              <span class="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">${index + 1}</span>
              <span>${item}</span>
            </li>
          `).join('')}
          </ul>
        </div>
        <div class="ai-panel-banner warn">建议先补齐关键信息，再进行内部问题定位。</div>
      </div>
    `);
  } else {
    setAiClarifyPanelContent(`
      <div class="ai-panel-stack">
        <div class="ai-panel-card">
          <div class="ai-panel-title">问题澄清</div>
          <div class="ai-panel-text">问题描述清晰，可执行内部问题定位。</div>
        </div>
        <div class="ai-panel-banner success">当前信息已覆盖时间、影响范围与关键报错，可进入排查流程。</div>
      </div>
    `);
  }
}

function analyzeClarifyNeeds(latestMessage) {
  const questions = [];
  const text = latestMessage || '';

  if (!/报错|错误|错误码|提示|截图/.test(text)) {
    questions.push('请提供具体报错信息或截图。');
  }
  if (!/时间|今天|刚才|上午|下午|\d{1,2}:\d{2}/.test(text)) {
    questions.push('问题出现的具体时间是什么时候？');
  }
  if (!/影响|多少|多用户|全部|部分|范围/.test(text)) {
    questions.push('受影响范围如何？是否为全部用户或部分用户？');
  }
  if (!/环境|版本|ip|服务器|实例|节点/.test(text)) {
    questions.push('涉及的环境/实例信息（如 IP、版本、实例名）是什么？');
  }

  return {
    needsClarify: questions.length > 0,
    questions
  };
}

function initConversationList() {
  loadConversationList();
}

const CONVERSATION_NAME_OVERRIDES = {
  'conv-001': '小米保障群',
  'conv-002': '快手保障群',
  'conv-003': '金山云服务告警',
};

const CUSTOMER_NAME_OVERRIDES = {
  张三: '小米保障群',
  李四: '快手保障群',
  王五: '金山云服务告警',
};

function getConversationDisplayName(conv) {
  if (!conv) return '客户';
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
      const response = await fetchConversations({
        agentId: window.config?.userId,
        status: 'active',
        pageSize: 8,
      });
      const payload = response?.data ?? response;
      const items = payload?.items ?? payload?.conversations ?? [];
      if (items.length) {
        renderConversationItems(container, items);
      }
    } catch (e) {
      console.warn('[chat] fetch conversations failed', e);

      // 降级：使用mock对话列表数据
      const mockConversations = [
        {
          conversationId: 'conv-001',
          customerName: '小米保障群',
          lastMessage: '我的服务器无法连接，目前有影响业务，赶快看下',
          aiSummary: '云服务器连接故障，影响业务；需补充实例ID/IP并按 P2 优先级处理。',
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          channel: 'feishu',
          slaLevel: 'VIP',
          urgency: 'high',
          severity: 'high',
          unreadCount: 3,
          sentiment: { type: 'urgent', label: '⚠️ 急切' }
        },
        {
          conversationId: 'conv-002',
          customerName: '快手保障群',
          lastMessage: '关于上个月的账单有一些疑问，想咨询一下',
          aiSummary: '账单核验咨询，等待进一步核对信息。',
          updatedAt: new Date(Date.now() - 7200000).toISOString(),
          channel: 'qq',
          slaLevel: 'KA0',
          urgency: 'normal',
          severity: 'normal',
          unreadCount: 0,
          sentiment: { type: 'neutral', label: '😐 中性' }
        },
        {
          conversationId: 'conv-003',
          customerName: '金山云服务告警',
          lastMessage: '新功能使用很流畅，感谢你们的支持！',
          aiSummary: '功能体验正向反馈，建议记录为改进建议。',
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
          channel: 'wechat',
          slaLevel: 'KA1',
          urgency: 'low',
          severity: 'low',
          unreadCount: 0,
          sentiment: { type: 'positive', label: '😊 满意' }
        },
        {
          conversationId: 'conv-004',
          customerName: '美团保障群',
          lastMessage: '需要申请新的API密钥，请问如何操作？',
          aiSummary: '咨询类问题，询问API密钥申请流程。',
          updatedAt: new Date(Date.now() - 90000000).toISOString(),
          channel: 'feishu',
          slaLevel: 'KA0',
          urgency: 'normal',
          severity: 'normal',
          unreadCount: 1,
          sentiment: { type: 'neutral', label: '😐 中性' }
        }
      ];

      renderConversationItems(container, mockConversations);
      showNotification('后端API暂不可用，已加载示例对话列表以便功能演示', 'warning');
    }
  }

  bindConversationEvents();
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
      const conversationId = item.getAttribute('data-id') || 'conv-001';
      currentConversationId = conversationId;
      updateChatContent(conversationId);
      updateCustomerContext(conversationId);
    });
  });

  const active = conversationItems.find((node) => node.classList.contains('is-active'));
  if (active) {
    const activeId = active.getAttribute('data-id') || 'conv-001';
    currentConversationId = activeId;
    updateChatContent(activeId);
    updateCustomerContext(activeId);
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
  if (!conversationItem) return;

  const sentimentIcon = getSentimentIcon(sentiment);
  if (!sentimentIcon) return;

  // 查找或创建情绪icon容器
  const existingIcon = conversationItem.querySelector('.sentiment-icon');
  if (existingIcon) {
    existingIcon.textContent = sentimentIcon;
    existingIcon.setAttribute('title', sentiment.label || sentiment.type || '情绪');
  } else {
    // 在SLA badge后面插入情绪icon
    const badgeContainer = conversationItem.querySelector('.mt-2 .flex');
    if (badgeContainer) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'sentiment-icon';
      iconSpan.textContent = sentimentIcon;
      iconSpan.setAttribute('title', sentiment.label || sentiment.type || '情绪');

      // 插入到第一个子元素（SLA badge容器）之后
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
    <div class="conversation-item ${isActive ? 'is-active' : ''}" data-id="${conv.conversationId}" data-channel="${conv.channel}">
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
          <p class="text-[13px] text-gray-600 mt-1 line-clamp-2">${summaryText}</p>
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

function updateChatContent(conversationId) {
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
  updateCustomerContext(conversationId);
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
  sla: ''
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
    });
  }

  // 紧急度筛选
  const urgencySelect = qs('#filter-urgency');
  if (urgencySelect) {
    on(urgencySelect, 'change', (e) => {
      filterState.urgency = e.target.value.toLowerCase();
      applyFilters();
    });
  }

  // 客户等级筛选
  const slaSelect = qs('#filter-sla');
  if (slaSelect) {
    on(slaSelect, 'change', (e) => {
      filterState.sla = e.target.value.toLowerCase();
      applyFilters();
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
  const slaElement = item.querySelector('.px-2.py-0\\.5.rounded-full');
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

  if (allBadge) {
    allBadge.textContent = counts.all || 0;
  }
  if (pendingBadge) {
    pendingBadge.textContent = counts.pending || 0;
  }
}

function showNoResultsMessage(show) {
  const container = qs('.conversation-list');
  if (!container) return;

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
    sla: ''
  };

  const searchInput = qs('#conversation-search-input');
  if (searchInput) searchInput.value = '';

  const channelSelect = qs('#filter-channel');
  if (channelSelect) channelSelect.value = '';

  const urgencySelect = qs('#filter-urgency');
  if (urgencySelect) urgencySelect.value = '';

  const slaSelect = qs('#filter-sla');
  if (slaSelect) slaSelect.value = '';

  const allButton = qs('#filter-status-all');
  if (allButton) updateStatusButtonStyles(allButton);

  applyFilters();
}
