import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';
import {
  fetchAuditSummary,
  fetchMonitoringAlerts,
  createTask,
  resolveMonitoringAlert,
  isApiEnabled,
} from '../api.js';

export function initTools() {
  bindToolsEvents();
}

function bindToolsEvents() {
  // 支持分析面板和左侧Dock导航中的工具标签页
  const toolsTabs = qsa('#tools-tab, #workspace-tools-tab');
  
  toolsTabs.forEach(tab => {
    if (tab) {
      // 使用事件委托处理所有工具按钮
      on(tab, 'click', (event) => {
        const target = event.target.closest('[data-click]');
        if (!target) {
          return;
        }

        const action = target.getAttribute('data-click');
        const label = target.getAttribute('data-label') || '';

        if (action === 'tool') {
          handleToolAction(label, target);
        } else if (action === 'quick') {
          handleQuickAction(label, target);
        }
      });
    }
  });
}

function handleToolAction(label, button) {
  switch (label) {
    case '服务状态监控':
      openServiceMonitor(button);
      break;
    case '数据库管理':
      openDatabaseManager(button);
      break;
    case '用户权限管理':
      openUserPermissions(button);
      break;
    case '数据备份':
      performDataBackup(button);
      break;
    case '运行登录诊断':
      runLoginDiagnostics(button);
      break;
    case '查询日志':
      querySystemLogs(button);
      break;
    case '查看会话':
      viewUserSessions(button);
      break;
    default:
      showNotification(`工具"${label}"功能开发中`, 'info');
  }
}

function handleQuickAction(label, button) {
  switch (label) {
    case '发送系统通知':
      sendSystemNotification(button);
      break;
    case '创建事件工单':
      createTicket(button);
      break;
    case '升级问题':
      escalateIssue(button);
      break;
    case '生成报告':
      generateReport(button);
      break;
    default:
      showNotification(`快捷操作"${label}"功能开发中`, 'info');
  }
}

// 服务状态监控
async function openServiceMonitor(button) {
  if (!isApiEnabled()) {
    showModal('服务状态监控', `
      <div class="p-3 text-sm text-gray-600">
        API 未启用，暂无监控数据。
      </div>
    `);
    return;
  }

  const originalHTML = button.innerHTML;
  button.innerHTML = '<i class="fa fa-spinner fa-spin text-xl mb-2"></i><span class="text-xs">检查中...</span>';
  button.disabled = true;

  let alerts = [];
  try {
    const response = await fetchMonitoringAlerts('open');
    alerts = response?.data ?? response ?? [];
  } catch (error) {
    console.warn('[tools] fetch monitoring alerts failed', error);
  }

  button.innerHTML = originalHTML;
  button.disabled = false;

  const criticalCount = alerts.filter((alert) => {
    const level = alert.level || alert.severity || '';
    return level.toLowerCase() === 'critical' || level.toLowerCase() === 'high';
  }).length;
  const warningCount = alerts.length - criticalCount;

  const alertHTML = alerts.length
    ? alerts.slice(0, 5).map((alert) => `
      <div class="flex items-start justify-between gap-3 p-2 border border-gray-100 rounded-lg">
        <div>
          <div class="text-sm font-medium">${alert.title}</div>
          <div class="text-xs text-gray-500">${alert.source || '系统'} · ${alert.level}</div>
        </div>
        <button class="text-xs text-blue-600 hover:text-blue-700" data-alert-id="${alert.id}" data-action="resolve">已处理</button>
      </div>
    `).join('')
    : '<div class="text-xs text-gray-500">暂无未处理告警</div>';

  showModal('服务状态监控', `
    <div class="space-y-4">
      <div class="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-1">
        <div>未处理告警：${alerts.length}</div>
        <div>严重告警：${criticalCount}</div>
        <div>警告告警：${warningCount}</div>
      </div>
      <div class="pt-2 border-t border-gray-100">
        <div class="text-xs font-semibold text-gray-600 mb-2">监控告警</div>
        <div class="space-y-2">${alertHTML}</div>
      </div>
    </div>
  `);

  const modal = qs('.modal-overlay');
  if (modal && alerts.length && isApiEnabled()) {
    modal.addEventListener('click', async (event) => {
      const target = event.target.closest('[data-action="resolve"]');
      if (!target) {
        return;
      }
      const alertId = target.getAttribute('data-alert-id');
      if (!alertId) {
        return;
      }
      try {
        await resolveMonitoringAlert(alertId);
        target.closest('div')?.remove();
        showNotification('已处理告警', 'success');
      } catch (error) {
        console.warn('[tools] resolve alert failed', error);
        showNotification('处理告警失败', 'error');
      }
    }, { once: true });
  }
}

// 数据库管理
function openDatabaseManager(button) {
  const tip = isApiEnabled() ? '数据库管理功能暂未接入。' : 'API 未启用，无法获取数据库状态。';
  showModal('数据库管理', `
    <div class="p-3 text-sm text-gray-600">
      ${tip}
    </div>
  `);
}

// 用户权限管理
function openUserPermissions(button) {
  const tip = isApiEnabled() ? '权限数据尚未接入。' : 'API 未启用，无法获取权限数据。';
  showModal('用户权限管理', `
    <div class="p-3 text-sm text-gray-600">
      ${tip}
    </div>
  `);
}

// 数据备份
function performDataBackup(button) {
  if (!isApiEnabled()) {
    showNotification('API 未启用，无法执行备份', 'warning');
    return;
  }
  showNotification('数据备份功能尚未接入', 'info');
}

// 登录诊断
function runLoginDiagnostics(button) {
  const originalHTML = button.textContent;
  button.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i>诊断中...';
  button.disabled = true;

  setTimeout(() => {
    button.textContent = originalHTML;
    button.disabled = false;

    showModal('登录诊断结果', `
      <div class="p-3 text-sm text-gray-600">
        暂无诊断数据，请先接入监控/审计服务。
      </div>
    `);
  }, 1500);
}

// 查询系统日志
function querySystemLogs(button) {
  const input = button.parentElement?.querySelector('input');
  const timeRange = input?.value || '最近1小时';

  button.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  button.disabled = true;

  setTimeout(() => {
    button.innerHTML = '查询';
    button.disabled = false;

    showModal('系统日志 - ' + timeRange, `
      <div class="p-3 text-sm text-gray-600">
        暂无日志数据，请先接入日志服务。
      </div>
    `);
  }, 800);
}

// 查看用户会话
function viewUserSessions(button) {
  button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> 加载中...';
  button.disabled = true;

  setTimeout(() => {
    button.textContent = '查看会话';
    button.disabled = false;

    showModal('用户会话管理', `
      <div class="p-3 text-sm text-gray-600">
        暂无会话数据，请先接入权限/审计服务。
      </div>
    `);
  }, 600);
}

// 发送系统通知
function sendSystemNotification(button) {
  showModal('发送系统通知', `
    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1">通知标题</label>
        <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="输入通知标题">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">通知内容</label>
        <textarea class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows="3" placeholder="输入通知内容"></textarea>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">接收对象</label>
        <select class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option>所有用户</option>
          <option>当前客户</option>
          <option>指定用户</option>
        </select>
      </div>
      <button class="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark" data-action="send-notification">
        发送通知
      </button>
    </div>
  `);

  const modal = qs('.modal-overlay');
  if (!modal) {
    return;
  }
  modal.addEventListener('click', (event) => {
    const submitBtn = event.target.closest('[data-action="send-notification"]');
    if (!submitBtn) {
      return;
    }
    if (!isApiEnabled()) {
      showNotification('API 未启用，无法发送通知', 'warning');
      return;
    }
    showNotification('通知发送功能尚未接入', 'info');
  }, { once: true });
}

// 创建工单
function createTicket(button) {
  showModal('创建事件工单', `
    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1">工单标题</label>
        <input id="tool-ticket-title" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="简要描述问题">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">优先级</label>
        <select id="tool-ticket-priority" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
          <option value="urgent">紧急</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">问题描述</label>
        <textarea id="tool-ticket-detail" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows="4" placeholder="详细描述问题"></textarea>
      </div>
      <button class="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark" data-action="submit-ticket">
        创建工单
      </button>
    </div>
  `);

  const modal = qs('.modal-overlay');
  if (!modal) {
    return;
  }
  modal.addEventListener('click', async (event) => {
    const submitBtn = event.target.closest('[data-action="submit-ticket"]');
    if (!submitBtn) {
      return;
    }
    const title = qs('#tool-ticket-title')?.value?.trim() || '';
    const description = qs('#tool-ticket-detail')?.value?.trim() || '';
    const priority = qs('#tool-ticket-priority')?.value || 'medium';

    if (!title) {
      showNotification('请填写工单标题', 'warning');
      return;
    }
    if (!isApiEnabled()) {
      showNotification('API 未启用，无法创建工单', 'warning');
      return;
    }
    try {
      await createTask({ title, description, priority });
      showNotification('工单已创建', 'success');
      modal.remove();
    } catch (error) {
      console.warn('[tools] create ticket failed', error);
      showNotification('工单创建失败，请重试', 'error');
    }
  }, { once: true });
}

// 升级问题
function escalateIssue(button) {
  showModal('升级问题', `
    <div class="space-y-3">
      <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
        <i class="fa fa-exclamation-triangle text-yellow-600 mr-2"></i>
        升级后问题将转给高级支持团队处理
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">升级原因</label>
        <select class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option>超出处理能力</option>
          <option>需要技术团队介入</option>
          <option>客户要求</option>
          <option>紧急情况</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">补充说明</label>
        <textarea class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows="3" placeholder="说明升级原因和已采取的措施"></textarea>
      </div>
      <button class="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700" data-action="submit-escalate">
        确认升级
      </button>
    </div>
  `);

  const modal = qs('.modal-overlay');
  if (!modal) {
    return;
  }
  modal.addEventListener('click', (event) => {
    const submitBtn = event.target.closest('[data-action="submit-escalate"]');
    if (!submitBtn) {
      return;
    }
    if (!isApiEnabled()) {
      showNotification('API 未启用，无法升级问题', 'warning');
      return;
    }
    showNotification('升级流程尚未接入', 'info');
  }, { once: true });
}

// 生成报告
async function generateReport(button) {
  const originalContent = button.innerHTML;
  button.innerHTML = '<i class="fa fa-spinner fa-spin"></i><span class="text-sm">生成中...</span>';
  button.disabled = true;

  let summary = null;
  if (isApiEnabled()) {
    try {
      const response = await fetchAuditSummary(7);
      summary = response?.data ?? response;
    } catch (error) {
      console.warn('[tools] fetch audit summary failed', error);
    }
  }

  button.innerHTML = originalContent;
  button.disabled = false;

  const report = summary?.report || null;
  const hasSummary = Boolean(report);
  const formatCount = (value, suffix) => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return '--';
    }
    return suffix ? `${num} ${suffix}` : `${num}`;
  };
  const formatMinutes = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return '--';
    }
    return `${num.toFixed(1)} 分钟`;
  };
  const formatPercent = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return '--';
    }
    const normalized = num > 1 ? num : num * 100;
    return `${normalized.toFixed(1)}%`;
  };

  showModal('生成报告', `
    <div class="space-y-3">
      <div class="p-3 bg-green-50 rounded-lg">
        <i class="fa fa-check-circle text-green-600 mr-2"></i>
        <span class="text-sm">报告生成成功</span>
      </div>
      <div class="text-sm text-gray-700 space-y-3">
        <div>
          <div class="mb-2 font-medium">核心指标（近7天）：</div>
          <ul class="space-y-1 text-xs text-gray-600">
            <li>• 会话总量: ${hasSummary ? formatCount(report?.totalConversations, '个') : '--'}</li>
            <li>• 活跃会话: ${hasSummary ? formatCount(report?.activeConversations, '个') : '--'}</li>
            <li>• 工单创建量: ${hasSummary ? formatCount(report?.ticketsCreated, '个') : '--'}</li>
            <li>• 平均首响: ${hasSummary ? formatMinutes(report?.avgFirstResponseMinutes) : '--'}</li>
            <li>• 5分钟达标率: ${hasSummary ? formatPercent(report?.firstResponseSlaRate) : '--'}</li>
            <li>• 30分钟同步率: ${hasSummary ? formatPercent(report?.updateSyncRate) : '--'}</li>
          </ul>
        </div>
        <div>
          <div class="mb-2 font-medium">质量与工单：</div>
          <ul class="space-y-1 text-xs text-gray-600">
            <li>• 解决率: ${hasSummary ? formatPercent(report?.resolutionRate) : '--'}</li>
            <li>• 满意度: ${hasSummary ? formatCount(report?.satisfactionScore, '分') : '--'}</li>
            <li>• 违规事件数: ${hasSummary ? formatCount(report?.violationCount, '次') : '--'}</li>
            <li>• 工单完成量: ${hasSummary ? formatCount(report?.ticketsResolved, '单') : '--'}</li>
            <li>• 平均处理时长: ${hasSummary ? formatMinutes(report?.avgTicketHandleMinutes) : '--'}</li>
            <li>• 15分钟升级率: ${hasSummary ? formatPercent(report?.escalationComplianceRate) : '--'}</li>
          </ul>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="flex-1 py-2 bg-primary text-white rounded-lg text-sm opacity-60 cursor-not-allowed" disabled>
          <i class="fa fa-download mr-1"></i>下载PDF
        </button>
        <button class="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm opacity-60 cursor-not-allowed" disabled>
          <i class="fa fa-table mr-1"></i>下载Excel
        </button>
      </div>
    </div>
  `);
}

// 通用模态框显示
function showModal(title, content) {
  // 移除现有模态框
  const existingModal = qs('.modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[140]';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-lg font-semibold">${title}</h3>
        <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('.modal-overlay').remove()">
          <i class="fa fa-times"></i>
        </button>
      </div>
      <div class="p-4">
        ${content}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 点击背景关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}
