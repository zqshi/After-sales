import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';
import { openHistoryDetail } from '../customer/index.js';
import {
  isApiEnabled,
  fetchRequirementData,
  fetchRequirementStatistics,
  createRequirement as createRequirementApi,
  ignoreRequirement as ignoreRequirementApi,
} from '../api.js';

const requirementStore = {
  processed: [],
  unprocessed: [],
  stats: null,
};

export async function initRequirementsTab() {
  await refreshRequirementsState();
  bindRequirementControls();
}

export function loadRequirementsData() {
  return refreshRequirementsState();
}

let requirementControlsBound = false;
function bindRequirementControls() {
  if (requirementControlsBound) {
    return;
  }
  const refreshBtn = qs('#requirements-refresh');
  const rescanBtn = qs('#requirements-rescan');
  const statusFilter = qs('#requirement-status-filter');

  on(refreshBtn, 'click', () => refreshRequirementsState());
  on(rescanBtn, 'click', () => scanConversationForRequirements());
  on(statusFilter, 'change', (e) => renderProcessedRequirements(e.target.value));
  requirementControlsBound = true;
}

async function refreshRequirementsState() {
  await trySyncRequirements();
  renderUnprocessedRequirements();
  renderProcessedRequirements();
  updateStatisticsCards();
  initRequirementsChart();
}

async function trySyncRequirements() {
  if (!isApiEnabled()) {
    requirementStore.processed = [];
    requirementStore.unprocessed = [];
    return;
  }

  try {
    const raw = await fetchRequirementData({ status: 'all' });
    const payload = raw?.data ?? raw;
    let processed = payload?.processed ?? payload?.processedRequirements ?? [];
    let unprocessed = payload?.unprocessed ?? payload?.unprocessedRequirements ?? [];

    if (Array.isArray(payload?.items) || Array.isArray(payload)) {
      const items = Array.isArray(payload?.items) ? payload.items : payload;
      const statusMap = {
        pending: '待处理',
        approved: '处理中',
        resolved: '已完成',
        ignored: '已拒绝',
        cancelled: '已拒绝',
      };
      processed = items.map((item) => ({
        id: item.id,
        content: item.description || item.title || '',
        status: statusMap[item.status] || '待处理',
        timestamp: item.updatedAt || item.createdAt || new Date().toISOString(),
        customer: item.customerId || '客户',
        customerId: item.customerId || '',
        createdBy: item.createdBy || '',
      }));
      unprocessed = [];
    }

    requirementStore.processed = processed;
    requirementStore.unprocessed = unprocessed;

    const statsRaw = await fetchRequirementStatistics();
    const statsPayload = statsRaw?.data ?? statsRaw;
    if (statsPayload) {
      requirementStore.stats = statsPayload;
    }
  } catch (err) {
    console.warn('[requirements] API sync failed', err);
    requirementStore.processed = [];
    requirementStore.unprocessed = [];
    requirementStore.stats = null;
  }
}

function formatDate(iso) {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function createStatusClass(status) {
  switch (status) {
    case '待处理':
      return 'bg-yellow-100 text-yellow-800';
    case '处理中':
      return 'bg-blue-100 text-blue-800';
    case '已完成':
      return 'bg-green-100 text-green-800';
    case '已拒绝':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function renderUnprocessedRequirements() {
  const container = qs('#unprocessed-requirements-list');
  if (!container) {
    return;
  }

  const unprocessed = requirementStore.unprocessed || [];
  container.innerHTML = '';

  if (!unprocessed.length) {
    container.innerHTML =
      '<div class="bg-gray-50 p-3 rounded-lg text-center text-sm text-gray-600">暂无未创建卡片的需求</div>';
    return;
  }

  unprocessed.forEach((req) => {
    const formattedDate = formatDate(req.timestamp);
    const html = `
      <div class="bg-red-50 border border-red-200 p-3 rounded-lg">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center">
              <span class="text-xs font-medium text-red-800">客户：${req.customer}</span>
              <span class="text-xs text-gray-500 ml-2">${formattedDate}</span>
            </div>
            <p class="text-sm text-gray-700 mt-1">"${req.content}"</p>
          </div>
          <div class="flex space-x-2">
            <button class="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-permission="requirements.ignore" onclick="ignoreUnprocessedRequirement('${req.id}')">忽略</button>
            <button class="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-dark" data-permission="requirements.create" onclick="createRequirementFromList('${req.content.replace(/'/g, "\\'")}', '${req.id}')">创建卡片</button>
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
  });
}

function renderProcessedRequirements(status = '全部状态') {
  const container = qs('#processed-requirements-list');
  if (!container) {
    return;
  }

  const processed = requirementStore.processed || [];
  container.innerHTML = '';

  const filtered =
    status === '全部状态' ? processed : processed.filter((req) => req.status === status);

  if (!filtered.length) {
    container.innerHTML = `<div class="bg-gray-50 p-3 rounded-lg text-center text-sm text-gray-600">暂无${status === '全部状态' ? '' : `状态为"${status}"的`}需求</div>`;
    return;
  }

  filtered
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .forEach((req) => {
      const html = `
      <div class="bg-white border border-gray-200 p-3 rounded-lg hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center">
              <span class="text-xs font-medium text-primary">${req.id}</span>
              <span class="text-xs px-2 py-0.5 ${createStatusClass(req.status)} rounded-full ml-2">${req.status}</span>
              <span class="text-xs text-gray-500 ml-2">${formatDate(req.timestamp)}</span>
            </div>
            <p class="text-sm text-gray-700 mt-1">"${req.content}"</p>
            <div class="flex items-center mt-2">
              <span class="text-xs text-gray-600">创建人：${req.createdBy}</span>
              <span class="text-xs text-gray-600 ml-4">客户：${req.customer}</span>
            </div>
          </div>
          <button class="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-dark" data-permission="requirements.view" onclick="viewRequirementCard('${req.id}')">查看详情</button>
        </div>
      </div>`;
      container.insertAdjacentHTML('beforeend', html);
    });
}

function initRequirementsChart() {
  const ctx = qs('#requirementsChart');
  if (!ctx || !window.Chart) {
    return;
  }

  const processed = requirementStore.processed || [];

  const statusCounts = { 待处理: 0, 处理中: 0, 已完成: 0, 已拒绝: 0 };
  processed.forEach((req) => {
    if (statusCounts[req.status] !== undefined) {
      statusCounts[req.status] += 1;
    }
  });

  const existing = window.requirementsChart;
  if (existing) {
    existing.destroy();
  }

  window.requirementsChart = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          data: Object.values(statusCounts),
          backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#EF4444'],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 10 } },
        },
      },
    },
  });
}

function updateStatisticsCards() {
  const unprocessed = requirementStore.unprocessed || [];
  const processed = requirementStore.processed || [];
  const statusCounts = { 待处理: 0, 处理中: 0, 已完成: 0, 已拒绝: 0 };
  processed.forEach((req) => {
    if (statusCounts[req.status] !== undefined) {
      statusCounts[req.status] += 1;
    }
  });

  const totalCount = qs('#req-total-count');
  const pendingCount = qs('#req-pending-count');
  const completedCount = qs('#req-done-count');
  const unprocessedCount = qs('#req-uncreated-count');

  if (totalCount) {
    totalCount.textContent = (processed.length + unprocessed.length).toString();
  }
  if (pendingCount) {
    pendingCount.textContent = statusCounts['待处理'].toString();
  }
  if (completedCount) {
    completedCount.textContent = statusCounts['已完成'].toString();
  }
  if (unprocessedCount) {
    unprocessedCount.textContent = unprocessed.length.toString();
  }
}

export async function createRequirementFromList(content) {
  const activeConversation = document.querySelector('.conversation-item.is-active');
  const customerId = activeConversation?.getAttribute('data-customer-id') || '';
  const conversationId = activeConversation?.getAttribute('data-id') || '';

  const payload = {
    title: content.length > 40 ? `${content.slice(0, 40)}...` : content,
    description: content,
    conversationId: conversationId || undefined,
    customerId,
    priority: 'medium',
    category: 'feature',
  };

  if (!isApiEnabled()) {
    showNotification('API 未启用，无法创建需求', 'warning');
    return;
  }
  if (!customerId) {
    showNotification('未识别客户信息，无法创建需求', 'warning');
    return;
  }

  try {
    await createRequirementApi(payload);
  } catch (err) {
    console.warn('[requirements] API create failed', err);
    showNotification('需求创建失败，请重试', 'error');
    return;
  }

  await loadRequirementsData();
  showNotification('需求卡片创建成功', 'success');
}

export async function ignoreUnprocessedRequirement(id) {
  if (!isApiEnabled()) {
    showNotification('API 未启用，无法忽略需求', 'warning');
    return;
  }

  try {
    await ignoreRequirementApi(id);
  } catch (err) {
    console.warn('[requirements] API ignore failed', err);
    showNotification('需求忽略失败，请重试', 'error');
    return;
  }

  await loadRequirementsData();
  showNotification('需求已忽略', 'info');
}

export function analyzeRequirementText(_content) {
  if (!isApiEnabled()) {
    return;
  }
}

export function viewRequirementCard(requirementId) {
  alert(`查看需求卡片详情: ${requirementId}`);
}

export function initRightPanelActions() {
  const buttons = qsa('#right-sidebar [data-click]');
  buttons.forEach((btn) => {
    on(btn, 'click', (e) => {
      const type = btn.getAttribute('data-click');
      if (type && type.startsWith('knowledge')) {
        return;
      }
      e.preventDefault();
      const label = btn.getAttribute('data-label') || btn.textContent.trim();
      handleRightPanelAction(type, label, btn);
    });
  });
}

function handleRightPanelAction(type, label, btn) {
  switch (type) {
    case 'history-detail':
      openHistoryDetail(label);
      break;
    case 'tool':
      showActionModal(label, `已打开「${label}」工具，后续可嵌入真实工具页面。`, '新开窗口', () =>
        open(label, '_blank'),
      );
      break;
    case 'knowledge-graph':
      showActionModal('知识图谱', '当前显示的是登录问题的知识图谱节点，后续可替换为实时数据。');
      break;
    default:
      showActionModal('操作提示', `已触发操作：${label}`);
  }

  if (btn) {
    btn.blur();
  }
}

function showActionModal(title, bodyHTML, primaryText, primaryCb) {
  const overlay = qs('#action-modal-overlay');
  const modalTitle = qs('#action-modal-title');
  const modalBody = qs('#action-modal-body');
  const primaryBtn = qs('#action-modal-primary');

  if (!overlay || !modalTitle || !modalBody || !primaryBtn) {
    return;
  }

  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;

  if (primaryText) {
    primaryBtn.textContent = primaryText;
    primaryBtn.classList.remove('hidden');
    primaryBtn.onclick = () => {
      primaryCb?.();
      primaryBtn.onclick = null;
      closeActionModal();
    };
  } else {
    primaryBtn.classList.add('hidden');
    primaryBtn.onclick = null;
  }

  overlay.classList.remove('hidden');
}

export function closeActionModal() {
  const overlay = qs('#action-modal-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

export function scanConversationForRequirements() {
  const messages = qsa('#chat-messages .message-bubble');
  messages.forEach((msg) => analyzeRequirementText(msg.textContent || ''));
  loadRequirementsData();
}
