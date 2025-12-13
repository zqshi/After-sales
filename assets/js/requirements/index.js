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

const STORAGE_KEYS = {
  processed: 'processedRequirements',
  unprocessed: 'unprocessedRequirements',
};

export async function initRequirementsTab() {
  ensureMockData();
  await refreshRequirementsState();
  bindRequirementControls();
}

export function loadRequirementsData() {
  return refreshRequirementsState();
}

let requirementControlsBound = false;
function bindRequirementControls() {
  if (requirementControlsBound) return;
  const refreshBtn = qs('#requirements-refresh');
  const rescanBtn = qs('#requirements-rescan');
  const statusFilter = qs('#requirement-status-filter');

  on(refreshBtn, 'click', () => refreshRequirementsState());
  on(rescanBtn, 'click', () => scanConversationForRequirements());
  on(statusFilter, 'change', (e) => renderProcessedRequirements(e.target.value));
  requirementControlsBound = true;
}

async function refreshRequirementsState() {
  ensureMockData();
  await trySyncRequirements();
  renderUnprocessedRequirements();
  renderProcessedRequirements();
  updateStatisticsCards();
  initRequirementsChart();
}

async function trySyncRequirements() {
  if (!isApiEnabled()) return;

  try {
    const raw = await fetchRequirementData({ status: 'all' });
    const payload = raw?.data ?? raw;
    const processed = payload?.processed ?? payload?.processedRequirements ?? [];
    const unprocessed = payload?.unprocessed ?? payload?.unprocessedRequirements ?? [];
    if (processed.length || unprocessed.length) {
      localStorage.setItem(STORAGE_KEYS.processed, JSON.stringify(processed));
      localStorage.setItem(STORAGE_KEYS.unprocessed, JSON.stringify(unprocessed));
    }

    const statsRaw = await fetchRequirementStatistics();
    const statsPayload = statsRaw?.data ?? statsRaw;
    if (statsPayload) {
      localStorage.setItem('requirementStats', JSON.stringify(statsPayload));
    }
  } catch (err) {
    console.warn('[requirements] API sync failed, using local mock data', err);
  }
}

function ensureMockData() {
  const processed = JSON.parse(localStorage.getItem(STORAGE_KEYS.processed) || '[]');
  const unprocessed = JSON.parse(localStorage.getItem(STORAGE_KEYS.unprocessed) || '[]');
  if (processed.length || unprocessed.length) return;

  const now = Date.now();
  const sampleProcessed = [
    {
      id: 'REQ-102301',
      content: 'ERP登录失败时增加「一键重试」入口，并自动收集诊断日志',
      status: '处理中',
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      customer: '张三',
      customerId: 'CUST-001',
      createdBy: '王工程师',
    },
    {
      id: 'REQ-102187',
      content: '新增账单导出按部门过滤，并支持定时发送',
      status: '待处理',
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      customer: '张三',
      customerId: 'CUST-001',
      createdBy: '王工程师',
    },
    {
      id: 'REQ-101998',
      content: '认证服务异常时自动切换备用节点并推送告警',
      status: '已完成',
      timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      customer: '张三',
      customerId: 'CUST-001',
      createdBy: '王工程师',
    },
  ];

  const sampleUnprocessed = [
    {
      id: `UNPROCESSED-${now - 30 * 60 * 1000}`,
      content: '希望在移动端看到实时告警，并支持快捷确认',
      timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
      customer: '张三',
      customerId: 'CUST-001',
    },
    {
      id: `UNPROCESSED-${now - 90 * 60 * 1000}`,
      content: 'API限流阈值能否按租户单独配置？',
      timestamp: new Date(now - 90 * 60 * 1000).toISOString(),
      customer: '张三',
      customerId: 'CUST-001',
    },
  ];

  localStorage.setItem(STORAGE_KEYS.processed, JSON.stringify(sampleProcessed));
  localStorage.setItem(STORAGE_KEYS.unprocessed, JSON.stringify(sampleUnprocessed));
}

function bindRequirementFilters() {
  const refreshBtn = qs('#requirements-tab button');
  const statusFilter = qs('#requirements-tab select');

  on(refreshBtn, 'click', () => loadRequirementsData());
  on(statusFilter, 'change', (e) => renderProcessedRequirements(e.target.value));
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
  if (!container) return;

  const unprocessed = JSON.parse(localStorage.getItem(STORAGE_KEYS.unprocessed) || '[]');
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
            <button class="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" onclick="ignoreUnprocessedRequirement('${req.id}')">忽略</button>
            <button class="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-dark" onclick="createRequirementFromList('${req.content.replace(/'/g, "\\'")}', '${req.id}')">创建卡片</button>
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
  });
}

function renderProcessedRequirements(status = '全部状态') {
  const container = qs('#processed-requirements-list');
  if (!container) return;

  const processed = JSON.parse(localStorage.getItem(STORAGE_KEYS.processed) || '[]');
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
          <button class="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-dark" onclick="viewRequirementCard('${req.id}')">查看详情</button>
        </div>
      </div>`;
      container.insertAdjacentHTML('beforeend', html);
    });
}

function initRequirementsChart() {
  const ctx = qs('#requirementsChart');
  if (!ctx || !window.Chart) return;

  const processed = JSON.parse(localStorage.getItem(STORAGE_KEYS.processed) || '[]');
  const unprocessed = JSON.parse(localStorage.getItem(STORAGE_KEYS.unprocessed) || '[]');

  const statusCounts = { 待处理: 0, 处理中: 0, 已完成: 0, 已拒绝: 0 };
  processed.forEach((req) => {
    if (statusCounts[req.status] !== undefined) statusCounts[req.status] += 1;
  });

  const existing = window.requirementsChart;
  if (existing) existing.destroy();

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
  const unprocessed = JSON.parse(localStorage.getItem(STORAGE_KEYS.unprocessed) || '[]');
  const processed = JSON.parse(localStorage.getItem(STORAGE_KEYS.processed) || '[]');
  const statusCounts = { 待处理: 0, 处理中: 0, 已完成: 0, 已拒绝: 0 };
  processed.forEach((req) => {
    if (statusCounts[req.status] !== undefined) statusCounts[req.status] += 1;
  });

  const totalCount = qs('#req-total-count');
  const pendingCount = qs('#req-pending-count');
  const completedCount = qs('#req-done-count');
  const unprocessedCount = qs('#req-uncreated-count');

  if (totalCount) totalCount.textContent = (processed.length + unprocessed.length).toString();
  if (pendingCount) pendingCount.textContent = statusCounts['待处理'].toString();
  if (completedCount) completedCount.textContent = statusCounts['已完成'].toString();
  if (unprocessedCount) unprocessedCount.textContent = unprocessed.length.toString();
}

export async function createRequirementFromList(content, unprocessedId) {
  const requirementId = `REQ-${Date.now().toString().slice(-6)}`;
  const payload = {
    content,
    sourceConversationId: 'conv-001',
    customerId: 'CUST-001',
    priority: 'medium',
    category: 'feature',
  };

  if (isApiEnabled()) {
    try {
      await createRequirementApi(payload);
    } catch (err) {
      console.warn('[requirements] API create failed, falling back to local data', err);
      saveProcessedRequirement(requirementId, content, '待处理');
    }
  } else {
    saveProcessedRequirement(requirementId, content, '待处理');
  }

  if (unprocessedId) removeUnprocessedRequirement(unprocessedId);
  await loadRequirementsData();
  showNotification('需求卡片创建成功', 'success');
}

export async function ignoreUnprocessedRequirement(id) {
  if (isApiEnabled()) {
    try {
      await ignoreRequirementApi(id);
    } catch (err) {
      console.warn('[requirements] API ignore failed', err);
    }
  }
  removeUnprocessedRequirement(id);
  await loadRequirementsData();
  showNotification('需求已忽略', 'info');
}

function removeUnprocessedRequirement(id) {
  let unprocessed = JSON.parse(localStorage.getItem(STORAGE_KEYS.unprocessed) || '[]');
  unprocessed = unprocessed.filter((req) => req.id !== id);
  localStorage.setItem(STORAGE_KEYS.unprocessed, JSON.stringify(unprocessed));
}

export function analyzeRequirementText(content) {
  const keywords = ['需要', '希望', '建议', '改进', '新增', '添加', '接口', '功能', '模块', '集成'];
  const hasKeyword = keywords.some((word) => content.includes(word));
  if (hasKeyword && !requirementExists(content)) {
    saveUnprocessedRequirement(content);
    loadRequirementsData();
  }
}

function requirementExists(content) {
  const processed = JSON.parse(localStorage.getItem(STORAGE_KEYS.processed) || '[]');
  const unprocessed = JSON.parse(localStorage.getItem(STORAGE_KEYS.unprocessed) || '[]');
  return [...processed, ...unprocessed].some((req) => req.content === content);
}

export function viewRequirementCard(requirementId) {
  alert(`查看需求卡片详情: ${requirementId}`);
}

export function saveUnprocessedRequirement(content) {
  const store = JSON.parse(localStorage.getItem(STORAGE_KEYS.unprocessed) || '[]');
  store.push({
    id: `UNPROCESSED-${Date.now()}`,
    content,
    timestamp: new Date().toISOString(),
    customer: '张三',
    customerId: 'CUST-001',
  });
  localStorage.setItem(STORAGE_KEYS.unprocessed, JSON.stringify(store));
}

export function saveProcessedRequirement(id, content, status) {
  const store = JSON.parse(localStorage.getItem(STORAGE_KEYS.processed) || '[]');
  store.push({
    id,
    content,
    status,
    timestamp: new Date().toISOString(),
    customer: '张三',
    customerId: 'CUST-001',
    createdBy: '王工程师',
  });
  localStorage.setItem(STORAGE_KEYS.processed, JSON.stringify(store));
}

export function initRightPanelActions() {
  const buttons = qsa('#right-sidebar [data-click]');
  buttons.forEach((btn) => {
    on(btn, 'click', (e) => {
      const type = btn.getAttribute('data-click');
      if (type && type.startsWith('knowledge')) return;
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
        open(label, '_blank')
      );
      break;
    case 'quick':
      showActionModal('快捷操作', `已记录操作「${label}」，可在集成后触发后端接口。`);
      break;
    case 'knowledge-graph':
      showActionModal('知识图谱', '当前显示的是登录问题的知识图谱节点，后续可替换为实时数据。');
      break;
    default:
      showActionModal('操作提示', `已触发操作：${label}`);
  }

  if (btn) btn.blur();
}

function showActionModal(title, bodyHTML, primaryText, primaryCb) {
  const overlay = qs('#action-modal-overlay');
  const modalTitle = qs('#action-modal-title');
  const modalBody = qs('#action-modal-body');
  const primaryBtn = qs('#action-modal-primary');

  if (!overlay || !modalTitle || !modalBody || !primaryBtn) return;

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
  if (overlay) overlay.classList.add('hidden');
}

export function scanConversationForRequirements() {
  const messages = qsa('#chat-messages .message-bubble');
  messages.forEach((msg) => analyzeRequirementText(msg.textContent || ''));
  loadRequirementsData();
}
