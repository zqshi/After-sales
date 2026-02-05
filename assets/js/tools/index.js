import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';
import {
  fetchMonitoringAlerts,
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
function openDatabaseManager(_button) {
  const tip = isApiEnabled() ? '数据库管理功能暂未接入。' : 'API 未启用，无法获取数据库状态。';
  showModal('数据库管理', `
    <div class="p-3 text-sm text-gray-600">
      ${tip}
    </div>
  `);
}

// 用户权限管理
function openUserPermissions(_button) {
  const tip = isApiEnabled() ? '权限数据尚未接入。' : 'API 未启用，无法获取权限数据。';
  showModal('用户权限管理', `
    <div class="p-3 text-sm text-gray-600">
      ${tip}
    </div>
  `);
}

// 数据备份
function performDataBackup(_button) {
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
