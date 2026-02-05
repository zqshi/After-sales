import { qs, on } from '../core/dom.js';
import { toggleRightSidebar } from '../ui/layout.js';
import { fetchProfile, fetchProfileInteractions, isApiEnabled } from '../api.js';
const interactionFilter = {
  range: '7d',
  type: '全部',
};
let interactionFilterBound = false;
let activeProfile = buildEmptyProfile();

function buildEmptyProfile() {
  return {
    name: '客户',
    title: '',
    tags: [],
    updatedAt: '-',
    focus: '',
    contacts: {
      phone: '-',
      email: '-',
      wechat: '-',
    },
    sla: '-',
    slaStatus: '-',
    expire: '-',
    products: [],
    metrics: {
      contractAmount: '-',
      satisfaction: '-',
      duration: '-',
    },
    insights: [],
    interactions: [],
    conversationHistory: [],
    serviceRecords: [],
    commitments: [],
    contractRange: '',
  };
}

function mapProfileResponse(payload) {
  const contactInfo = payload.contactInfo || {};
  const slaInfo = payload.slaInfo || {};
  const metrics = payload.metrics || {};
  const satisfactionScore = metrics.satisfactionScore ?? '-';
  const satisfactionText =
    typeof satisfactionScore === 'number'
      ? satisfactionScore > 1
        ? `${satisfactionScore}/5`
        : `${Math.round(satisfactionScore * 5)}/5`
      : '-';

  return {
    name: payload.name || '客户',
    title: payload.company || '',
    tags: payload.tags || [],
    updatedAt: payload.updatedAt || '-',
    focus: payload.insights?.[0]?.detail || '',
    contacts: {
      phone: contactInfo.phone || '-',
      email: contactInfo.email || '-',
      wechat: contactInfo.preferredChannel || '-',
    },
    sla: slaInfo.serviceLevel || (payload.isVIP ? 'VIP' : '普通'),
    slaStatus: payload.riskLevel || '-',
    expire: '-',
    products: payload.products || [],
    metrics: {
      contractAmount: metrics.totalRevenue ? `¥${metrics.totalRevenue}` : '-',
      satisfaction: satisfactionText,
      duration: metrics.averageResolutionMinutes ? `${metrics.averageResolutionMinutes}分钟` : '-',
    },
    insights: (payload.insights || []).map((item) => ({
      title: item.title || '洞察',
      desc: item.detail || '',
      action: item.source || '',
    })),
    interactions: mapInteractions(payload.interactions || []),
    conversationHistory: payload.conversationHistory || [],
    serviceRecords: (payload.serviceRecords || []).map((record) => ({
      id: record.id || record.recordedAt || `${record.title}-${record.recordedAt}`,
      title: record.title,
      date: record.recordedAt || '-',
      status: record.outcome || '进行中',
      promise: record.description || '',
      promiseStatus: record.outcome || '',
      duration: record.actualHours ? `${record.actualHours}h` : '-',
      owner: record.ownerId || '-',
      result: record.description || '',
      evidence: '',
      commitmentId: '',
      relatedConversations: [],
      actions: [],
      detail: record.description || '',
      due: '',
    })),
    commitments: (payload.commitments || []).map((commitment) => ({
      id: commitment.id,
      title: commitment.title,
      metric: '',
      used: commitment.progress || 0,
      total: 100,
      progress: commitment.progress || 0,
      status: '进行中',
      remark: '',
      nextDue: '',
      risk: null,
    })),
    contractRange: payload.contractRange || '',
  };
}

function mapInteractions(interactions) {
  return (interactions || []).map((item) => ({
    title: item.title || '客户互动',
    desc: item.notes || item.description || '',
    date: item.occurredAt || item.timestamp || '-',
    icon: 'fa-comment',
    type: item.type || item.interactionType || '互动',
    window: item.window || '7d',
    channel: item.channel || '-',
    result: item.status || '已记录',
  }));
}

function showEmptyCustomerProfile() {
  activeProfile = buildEmptyProfile();
  renderProfile(activeProfile);
  renderConversationTimeline(activeProfile);
  renderCommitmentSummary(activeProfile);
  renderServiceRecords(activeProfile);
  renderContractRange(activeProfile.contractRange);
  renderInteractions(activeProfile);
  renderInsights(activeProfile);
}

export function initCustomerProfile() {
  bindInteractionFilters();
  showEmptyCustomerProfile();
  bindHistoryDetails();
}

export function updateCustomerContext(conversationId, customerId = null) {
  const targetCustomerId = customerId || null;
  if (!targetCustomerId) {
    showEmptyCustomerProfile();
    return;
  }
  loadCustomerProfile(targetCustomerId);
}

async function loadCustomerProfile(customerId) {
  let profile = buildEmptyProfile();

  if (isApiEnabled()) {
    try {
      const response = await fetchProfile(customerId);
      const payload = response?.data ?? response;
      if (payload) {
        profile = mapProfileResponse(payload);
      }
    } catch (err) {
      console.warn('[customer] fetch profile failed', err);
    }
    try {
      const interactionResponse = await fetchProfileInteractions(customerId, {
        range: interactionFilter.range,
      });
      const data = interactionResponse?.data ?? interactionResponse;
      // API返回 {success, data: {interactions: [...], total, customerId, range}}
      const interactions = data?.interactions ?? data?.list ?? data?.items ?? data;
      if (Array.isArray(interactions) && interactions.length) {
        profile.interactions = mapInteractions(interactions);
      }
    } catch (err) {
      console.warn('[customer] fetch interactions failed', err);
    }
  } else {
    showEmptyCustomerProfile();
  }

  activeProfile = profile;
  renderProfile(profile);
  renderConversationTimeline(profile);
  renderCommitmentSummary(profile);
  renderServiceRecords(profile);
  renderContractRange(profile.contractRange);
  renderInteractions(profile);
  renderInsights(profile);
  bindHistoryDetails();
}

function renderProfile(profile) {
  setText('#customer-name', profile.name);
  setText('#customer-title', profile.title);
  setText('#customer-phone', profile.contacts.phone);
  setText('#customer-email', profile.contacts.email);
  setText('#customer-wechat', profile.contacts.wechat);
  setText('#customer-sla', profile.sla);
  setText('#customer-sla-status', profile.slaStatus);
  setText('#customer-expire', profile.expire);
  setText('#customer-sla-duplicate', profile.sla);
  setText('#customer-sla-status-duplicate', profile.slaStatus);
  setText('#customer-expire-duplicate', profile.expire);
  setText('#customer-contract-amount', profile.metrics.contractAmount);
  setText('#customer-satisfaction', profile.metrics.satisfaction);
  setText('#customer-duration', profile.metrics.duration);
  setText('#customer-focus', profile.focus || '-');
  setText('#customer-updated-at-secondary', profile.updatedAt || '-');
  setText('#customer-expire-secondary', profile.expire || '-');

  const updatedAt = qs('#customer-updated-at');
  if (updatedAt) {
    updatedAt.textContent = `数据刷新：${profile.updatedAt || '-'}`;
  }

  const tagWrap = qs('#customer-tags');
  if (tagWrap) {
    tagWrap.innerHTML = '';
    (profile.tags || []).forEach((tag) => {
      const chip = document.createElement('div');
      chip.className = 'analysis-chip chip-soft w-full justify-center';
      chip.textContent = tag;
      tagWrap.appendChild(chip);
    });
  }

  const productList = qs('#customer-products');
  if (productList) {
    productList.innerHTML = '';
    (profile.products || []).forEach((p) => {
      const li = document.createElement('li');
      li.textContent = p;
      productList.appendChild(li);
    });
  }

  renderInsights(profile);
  renderInteractions(profile);
}

function renderInsights(profile) {
  const wrap = qs('#customer-insights');
  if (!wrap) {
    return;
  }
  const insights = profile.insights || [];
  wrap.innerHTML = '';

  if (!insights.length) {
    wrap.innerHTML =
      '<div class="placeholder-card text-xs text-gray-600">暂无洞察，待画像平台对接后展示。</div>';
    return;
  }

  insights.forEach((item) => {
    wrap.insertAdjacentHTML(
      'beforeend',
      `
        <div class="insight-card">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-sm font-semibold text-gray-800">${item.title}</div>
              <p class="text-xs text-gray-600 mt-1">${item.desc}</p>
            </div>
            <span class="chip-ghost">当前</span>
          </div>
          <div class="mt-2 inline-flex items-center gap-1 insight-action">
            <i class="fa fa-bolt text-xs"></i>
            <span>${item.action || '待确认下一步'}</span>
          </div>
        </div>
      `,
    );
  });
}

function renderInteractions(profile) {
  const container = qs('#customer-interactions');
  if (!container) {
    return;
  }
  container.innerHTML = '';

  const list = profile.interactions || [];
  const filtered = list.filter((item) => {
    const type = item.type || '全部';
    const windowTag = item.window || 'all';
    const typeMatch = interactionFilter.type === '全部' || interactionFilter.type === type;
    const rangeMatch = interactionFilter.range === 'all' || interactionFilter.range === windowTag;
    return typeMatch && rangeMatch;
  });

  if (!filtered.length) {
    container.innerHTML =
      '<div class="interaction-card col-span-3 text-xs text-gray-600 bg-gray-50 border border-dashed border-gray-200">当前筛选时间窗暂无互动，可切换为“全部”查看。</div>';
    return;
  }

  filtered.forEach((item) => {
    container.insertAdjacentHTML(
      'beforeend',
      `
        <div class="interaction-card">
          <div class="flex items-start gap-2">
            <div class="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-primary">
              <i class="fa ${item.icon}"></i>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start text-xs text-gray-500">
                <span>${item.title}</span>
                <span>${item.date}</span>
              </div>
              <p class="text-sm text-gray-800 mt-1">${item.desc}</p>
              <div class="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-600">
                <span class="chip-soft">类型：${item.type || '未标注'}</span>
                <span class="chip-soft">渠道：${item.channel || '-'}</span>
                <span class="chip-soft ${interactionStatusClass(item.result)}">${item.result || '未标注'}</span>
              </div>
            </div>
          </div>
        </div>
      `,
    );
  });
}

function renderConversationTimeline(profile) {
  const container = qs('#conversation-timeline');
  if (!container) {
    return;
  }
  container.innerHTML = '';

  const timeline = profile.conversationHistory || [];
  const serviceMap = (profile.serviceRecords || []).reduce((acc, cur) => {
    acc[cur.id] = cur;
    return acc;
  }, {});

  if (!timeline.length) {
    container.innerHTML =
      '<div class="history-empty bg-gray-50 border border-dashed border-gray-200 p-3 rounded-lg text-xs text-gray-600">暂无沟通记录</div>';
    return;
  }

  timeline.forEach((item, idx) => {
    const relatedService = item.relatedServiceId ? serviceMap[item.relatedServiceId] : null;
    const serviceAction = relatedService
      ? `<button class="text-[11px] text-primary hover:underline" data-service-id="${relatedService.id}">关联服务：${relatedService.title}</button>`
      : '<span class="text-[11px] text-gray-400">未关联服务</span>';

    const jumpLabel = item.anchorLabel || item.summary;
    const isLast = idx === timeline.length - 1;
    container.insertAdjacentHTML(
      'beforeend',
      `
      <div class="timeline-row">
        <div class="timeline-line ${isLast ? 'timeline-line-end' : ''}"></div>
        <div class="timeline-dot timeline-dot-comm"></div>
        <div class="timeline-card">
          <div class="flex justify-between items-start gap-2">
            <div class="flex items-center gap-2">
              <span class="badge-soft">沟通</span>
              <span class="text-sm font-medium">${item.summary}</span>
            </div>
            <span class="text-[11px] text-gray-500">${item.time}</span>
          </div>
          <p class="text-xs text-gray-600 mt-1">${item.detail || '暂无描述'}</p>
          <div class="flex flex-wrap gap-2 mt-2 text-[11px] text-gray-500">
            <span class="chip-soft">渠道：${item.channel || '-'}</span>
            <span class="chip-soft">意图：${item.intent || '-'}</span>
            <span class="chip-soft">情绪：${item.emotion || '-'}</span>
            <span class="chip-soft">产品：${item.product || '未标注'}</span>
            ${serviceAction}
            <button class="text-[11px] text-primary hover:underline" data-jump-label="${jumpLabel}">定位对话</button>
          </div>
        </div>
      </div>
    `,
    );
  });
}

function renderCommitmentSummary(profile) {
  const wrap = qs('#commitment-summary');
  const alertWrap = qs('#commitment-alerts');
  if (!wrap || !alertWrap) {
    return;
  }
  wrap.innerHTML = '';
  alertWrap.innerHTML = '';

  const commitments = profile.commitments || [];
  if (!commitments.length) {
    wrap.innerHTML =
      '<div class="history-empty bg-gray-50 border border-dashed border-gray-200 p-3 rounded-lg text-xs text-gray-600 col-span-3">暂无承诺数据</div>';
    alertWrap.innerHTML =
      '<div class="history-empty bg-gray-50 border border-dashed border-gray-200 p-3 rounded-lg text-xs text-gray-600">暂无异常或预警</div>';
    return;
  }

  commitments.forEach((c) => {
    const progress =
      typeof c.progress === 'number'
        ? c.progress
        : Math.min(100, Math.round(((c.used || 0) / (c.total || 1)) * 100));
    wrap.insertAdjacentHTML(
      'beforeend',
      `
      <div class="commit-card">
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="text-sm font-semibold text-gray-800">${c.title}</div>
            <p class="text-xs text-gray-600 mt-1">${c.metric}</p>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-full ${commitmentStatusClass(c.status, c.risk)}">${c.status || '进行中'}</span>
        </div>
        <div class="mt-2 text-[11px] text-gray-500 flex justify-between">
          <span>已用：${c.used ?? 0}/${c.total ?? '-'}</span>
          <span>下一节点：${c.nextDue || '-'}</span>
        </div>
        <div class="progress mt-2">
          <div class="progress-bar" style="width:${progress}%"></div>
        </div>
        <div class="text-[11px] text-gray-600 mt-2">${c.remark || '暂无备注'}</div>
      </div>
    `,
    );
  });

  const risky = commitments.filter((c) => c.status === '预警' || c.status === '延期' || c.risk);
  if (!risky.length) {
    alertWrap.innerHTML =
      '<div class="history-empty bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs p-3 rounded-lg">暂无异常或预警</div>';
  } else {
    risky.forEach((c) => {
      alertWrap.insertAdjacentHTML(
        'beforeend',
        `<div class="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex justify-between items-center">
          <div>
            <div class="font-medium">${c.title}</div>
            <div class="text-[11px] text-amber-700 mt-1">${c.remark || '存在风险，请跟进'}</div>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">需跟进</span>
        </div>`,
      );
    });
  }
}

function renderServiceRecords(profile) {
  const container = qs('#service-records');
  const commitmentFilter = qs('#service-commitment-filter');
  const statusFilter = qs('#service-status-filter');
  if (!container) {
    return;
  }

  const conversationMap = (profile.conversationHistory || []).reduce((acc, cur) => {
    acc[cur.id] = cur;
    acc[cur.summary] = cur;
    return acc;
  }, {});

  const records = [...(profile.serviceRecords || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  if (commitmentFilter) {
    const prevValue = commitmentFilter.value;
    commitmentFilter.innerHTML = '<option value="全部">全部承诺</option>';
    (profile.commitments || []).forEach((c) => {
      commitmentFilter.insertAdjacentHTML(
        'beforeend',
        `<option value="${c.id}">${c.title}</option>`,
      );
    });
    if (prevValue && Array.from(commitmentFilter.options).some((o) => o.value === prevValue)) {
      commitmentFilter.value = prevValue;
    }
  }

  const statusVal = statusFilter?.value || '全部';
  const commitmentVal = commitmentFilter?.value || '全部';
  const filtered = records.filter((rec) => {
    const statusMatch =
      statusVal === '全部' || rec.status === statusVal || (statusVal === '已完成' && rec.status === '已解决');
    const commitmentMatch = commitmentVal === '全部' || rec.commitmentId === commitmentVal;
    return statusMatch && commitmentMatch;
  });

  container.innerHTML = '';
  if (!filtered.length) {
    container.innerHTML =
      '<div class="history-empty bg-gray-50 border border-dashed border-gray-200 p-3 rounded-lg text-xs text-gray-600">暂无符合条件的服务记录</div>';
    return;
  }

  filtered.forEach((rec) => {
    const relatedLabels = (rec.relatedConversations || []).map(
      (c) => conversationMap[c]?.anchorLabel || conversationMap[c]?.summary || c,
    );
    container.insertAdjacentHTML(
      'beforeend',
      `
      <div class="service-card">
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded-full ${serviceStatusClass(rec.status)}">${rec.status || '进行中'}</span>
              <span class="text-sm font-semibold">${rec.title}</span>
            </div>
            <p class="text-xs text-gray-600 mt-1">${rec.result || rec.detail || '暂无描述'}</p>
            <div class="text-[11px] text-gray-500 mt-1">承诺：${rec.promise || '未映射'} · 状态：${rec.promiseStatus || '未判定'}</div>
          </div>
          <div class="text-right text-[11px] text-gray-500 space-y-1">
            <div>${rec.date || '-'}</div>
            <div>耗时：${rec.duration || '-'}</div>
            <div>负责人：${rec.owner || '-'}</div>
            <button class="text-primary hover:underline" data-service-id="${rec.id}">查看详情</button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 mt-2 text-[11px] text-gray-600">
          <span class="chip-soft">承诺ID：${rec.commitmentId || '未关联'}</span>
          <span class="chip-soft">截至：${rec.due || '-'}</span>
          ${relatedLabels
    .map(
      (c) =>
        `<span class="chip-soft" data-jump-label="${c}" title="定位到关联沟通">关联沟通 · ${c}</span>`,
    )
    .join('')}
        </div>
      </div>
    `,
    );
  });
}

function renderContractRange(range) {
  setText('#contract-range', range || '-');
}

function interactionStatusClass(status) {
  if (!status) {
    return '';
  }
  if (status.includes('解决') || status.includes('完成')) {
    return 'chip-success';
  }
  if (status.includes('进行') || status.includes('处理中')) {
    return 'chip-info';
  }
  return 'chip-neutral';
}

function serviceStatusClass(status) {
  if (status === '已完成' || status === '已解决') {
    return 'bg-green-100 text-green-800';
  }
  if (status === '进行中') {
    return 'bg-blue-100 text-blue-800';
  }
  if (status === '未开始') {
    return 'bg-gray-100 text-gray-800';
  }
  return 'bg-gray-100 text-gray-800';
}

function commitmentStatusClass(status, risk) {
  if (status === '达成') {
    return 'bg-green-100 text-green-800';
  }
  if (status === '按计划' || status === '进行中') {
    return 'bg-blue-100 text-blue-800';
  }
  if (status === '预警' || risk) {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-gray-100 text-gray-800';
}

export function getCurrentProfile() {
  return activeProfile;
}

let historyBound = false;
function bindInteractionFilters() {
  if (interactionFilterBound) {
    return;
  }
  const range = qs('#interaction-range-filter');
  const type = qs('#interaction-type-filter');
  if (range) {
    interactionFilter.range = range.value || interactionFilter.range;
    on(range, 'change', () => {
      interactionFilter.range = range.value;
      renderInteractions(getCurrentProfile());
    });
  }
  if (type) {
    interactionFilter.type = type.value || interactionFilter.type;
    on(type, 'change', () => {
      interactionFilter.type = type.value;
      renderInteractions(getCurrentProfile());
    });
  }
  interactionFilterBound = true;
}

function bindHistoryDetails() {
  if (historyBound) {
    return;
  }
  const timeline = qs('#conversation-timeline');
  const services = qs('#service-records');
  const statusFilter = qs('#service-status-filter');
  const commitmentFilter = qs('#service-commitment-filter');

  if (timeline) {
    on(timeline, 'click', (e) => {
      const jumpBtn = e.target.closest('[data-jump-label]');
      const svcBtn = e.target.closest('[data-service-id]');
      if (svcBtn) {
        openHistoryDetail(svcBtn.getAttribute('data-service-id'));
        return;
      }
      if (jumpBtn) {
        toggleRightSidebar(false);
        scrollToChatByLabel(jumpBtn.getAttribute('data-jump-label'));
      }
    });
  }

  if (services) {
    on(services, 'click', (e) => {
      const svcBtn = e.target.closest('[data-service-id]');
      const jumpBtn = e.target.closest('[data-jump-label]');
      if (svcBtn) {
        openHistoryDetail(svcBtn.getAttribute('data-service-id'));
      } else if (jumpBtn) {
        toggleRightSidebar(false);
        scrollToChatByLabel(jumpBtn.getAttribute('data-jump-label'));
      }
    });
  }

  if (statusFilter) {
    on(statusFilter, 'change', () => renderServiceRecords(getCurrentProfile()));
  }
  if (commitmentFilter) {
    on(commitmentFilter, 'change', () => renderServiceRecords(getCurrentProfile()));
  }

  historyBound = true;
}

export function openHistoryDetail(label) {
  const profile = getCurrentProfile();
  const service =
    (profile.serviceRecords || []).find((s) => s.id === label || s.title === label) || null;
  const conversation =
    (profile.conversationHistory || []).find(
      (c) => c.id === label || c.summary === label || c.anchorLabel === label,
    ) || null;
  const legacy =
    (profile.history || []).find((h) => h.id === label || h.title === label) || null;

  const item = service || conversation || legacy;
  if (item) {
    openHistoryModal(item);
  }
}

function openHistoryModal(item) {
  const overlay = qs('#action-modal-overlay');
  const modalTitle = qs('#action-modal-title');
  const modalBody = qs('#action-modal-body');
  const primaryBtn = qs('#action-modal-primary');
  if (!overlay || !modalTitle || !modalBody || !primaryBtn) {
    return;
  }

  const isService = Boolean(item.promise || item.commitmentId);
  const isConversation = Boolean(item.intent);
  const statusText = item.status || (isConversation ? '沟通' : '记录');

  modalTitle.textContent = `${isService ? '服务记录' : '沟通记录'}：${item.title || item.summary}`;
  modalBody.innerHTML = `
    <div class="history-summary group relative flex items-start gap-2 mb-1">
      <p class="text-sm text-gray-700 flex-1">${item.result || item.summary || item.detail || '暂无描述'}</p>
      <button class="jump-to-chat opacity-0 group-hover:opacity-100 text-primary text-xs flex items-center gap-1 transition-opacity" data-jump-label="${item.anchorLabel || item.summary || item.title || ''}" title="定位到对话">
        <i class="fa fa-share-square-o"></i> 定位
      </button>
    </div>
    <p class="text-xs text-gray-500">
      日期：${item.date || '-'}
      · 状态：${statusText}
      ${item.promise ? `· 承诺：${item.promise}（${item.promiseStatus || '未判定'}）` : ''}
    </p>
    <div class="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed">
      ${item.detail || item.result || '暂无详情'}
    </div>
    ${
  isService
    ? `<div class="mt-3">
            <h4 class="text-xs font-medium text-gray-600 mb-2">处理动作</h4>
            <ul class="list-disc pl-5 space-y-1 text-xs text-gray-700">
              ${(item.actions || []).map((act) => `<li>${act}</li>`).join('') || '<li>暂无记录</li>'}
            </ul>
            <div class="text-[11px] text-gray-500 mt-2">负责人：${item.owner || '-'} · 耗时：${
  item.duration || '-'
} · 截止/目标：${item.due || '-'}</div>
            <div class="text-[11px] text-gray-500 mt-1">证据/附件：${
  item.evidence || '未上传'
}</div>
          </div>`
    : ''
}
    ${
  item.transcript
    ? `<div class="mt-3">
            <h4 class="text-xs font-medium text-gray-600 mb-2">对话摘录</h4>
            <div class="space-y-2">
              ${(item.transcript || [])
    .map(
      (msg) =>
        `<div class="flex items-start text-xs text-gray-700 bg-white border border-gray-100 rounded p-2">
                      <span class="text-[11px] text-gray-500 w-12">${msg.time}</span>
                      <span class="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full mr-2">${msg.role}</span>
                      <span class="flex-1">${msg.content}</span>
                    </div>`,
    )
    .join('') || '<div class="text-xs text-gray-500">暂无记录</div>'}
            </div>
          </div>`
    : ''
}
  `;
  primaryBtn.classList.add('hidden');
  primaryBtn.onclick = null;
  overlay.classList.remove('hidden');

  const jumpBtn = modalBody.querySelector('.jump-to-chat');
  if (jumpBtn) {
    on(jumpBtn, 'click', () => {
      overlay.classList.add('hidden');
      toggleRightSidebar(false);
      scrollToChatByLabel(jumpBtn.getAttribute('data-jump-label'));
    });
  }
}

function scrollToChatByLabel(label) {
  const chat = qs('#chat-messages');
  if (!chat) {
    return;
  }
  const target = chat.querySelector(`[data-history-label="${label}"]`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('history-highlight');
    setTimeout(() => target.classList.remove('history-highlight'), 1000);
  } else {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  }
}

function setText(selector, value) {
  const el = qs(selector);
  if (el) {
    el.textContent = value || '-';
  }
}
