import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';

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
function openServiceMonitor(button) {
  const originalHTML = button.innerHTML;
  button.innerHTML = '<i class="fa fa-spinner fa-spin text-xl mb-2"></i><span class="text-xs">检查中...</span>';
  button.disabled = true;

  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.disabled = false;

    // 显示服务状态
    const services = [
      { name: 'Web服务', status: 'running', uptime: '99.9%' },
      { name: 'API服务', status: 'running', uptime: '99.8%' },
      { name: '数据库', status: 'running', uptime: '100%' },
      { name: 'Redis缓存', status: 'running', uptime: '99.5%' },
      { name: 'WebSocket', status: 'warning', uptime: '98.2%' }
    ];

    const statusHTML = services.map(s => {
      const statusColor = s.status === 'running' ? 'green' : s.status === 'warning' ? 'yellow' : 'red';
      return `
        <div class="flex items-center justify-between p-2 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-${statusColor}-500"></div>
            <span class="text-sm">${s.name}</span>
          </div>
          <span class="text-xs text-gray-500">运行时间: ${s.uptime}</span>
        </div>
      `;
    }).join('');

    showModal('服务状态监控', `
      <div class="space-y-2">
        ${statusHTML}
      </div>
    `);
  }, 800);
}

// 数据库管理
function openDatabaseManager(button) {
  showModal('数据库管理', `
    <div class="space-y-3">
      <div class="p-3 bg-blue-50 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">数据库连接</span>
          <span class="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">正常</span>
        </div>
        <div class="text-xs text-gray-600 space-y-1">
          <div>主机: localhost:5432</div>
          <div>数据库: aftersales_db</div>
          <div>连接池: 8/20 活跃</div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm" onclick="alert('备份功能执行中...')">
          <i class="fa fa-download mr-1"></i>备份数据库
        </button>
        <button class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm" onclick="alert('优化功能执行中...')">
          <i class="fa fa-wrench mr-1"></i>优化表
        </button>
      </div>
    </div>
  `);
}

// 用户权限管理
function openUserPermissions(button) {
  showModal('用户权限管理', `
    <div class="space-y-3">
      <div class="text-sm text-gray-600">当前登录用户权限</div>
      <div class="space-y-2">
        <label class="flex items-center gap-2">
          <input type="checkbox" checked disabled class="rounded">
          <span class="text-sm">查看对话</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" checked disabled class="rounded">
          <span class="text-sm">发送消息</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" checked class="rounded">
          <span class="text-sm">访问知识库</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" class="rounded">
          <span class="text-sm">管理用户（需要管理员权限）</span>
        </label>
      </div>
      <div class="text-xs text-gray-500 pt-2 border-t">
        提示：修改权限需要管理员审核
      </div>
    </div>
  `);
}

// 数据备份
function performDataBackup(button) {
  const originalHTML = button.innerHTML;
  button.innerHTML = '<i class="fa fa-spinner fa-spin text-xl mb-2"></i><span class="text-xs">备份中...</span>';
  button.disabled = true;

  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.disabled = false;
    showNotification('数据备份已创建，保存在: /backups/backup_' + new Date().toISOString().slice(0,10) + '.sql', 'success');
  }, 2000);
}

// 登录诊断
function runLoginDiagnostics(button) {
  const originalHTML = button.textContent;
  button.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i>诊断中...';
  button.disabled = true;

  setTimeout(() => {
    button.textContent = originalHTML;
    button.disabled = false;

    const diagnostics = [
      { item: '数据库连接', status: 'pass', message: '连接正常' },
      { item: '认证服务', status: 'pass', message: 'OAuth服务运行中' },
      { item: '会话管理', status: 'pass', message: 'Redis连接正常' },
      { item: 'Token验证', status: 'warning', message: '3个过期token待清理' },
      { item: 'CORS配置', status: 'pass', message: '跨域配置正确' }
    ];

    const diagnosticsHTML = diagnostics.map(d => {
      const icon = d.status === 'pass' ? 'check-circle' : d.status === 'warning' ? 'exclamation-triangle' : 'times-circle';
      const color = d.status === 'pass' ? 'green' : d.status === 'warning' ? 'yellow' : 'red';
      return `
        <div class="flex items-start gap-2 p-2">
          <i class="fa fa-${icon} text-${color}-500 mt-1"></i>
          <div class="flex-1">
            <div class="text-sm font-medium">${d.item}</div>
            <div class="text-xs text-gray-600">${d.message}</div>
          </div>
        </div>
      `;
    }).join('');

    showModal('登录诊断结果', `
      <div class="space-y-1">
        ${diagnosticsHTML}
      </div>
      <div class="mt-4 p-3 bg-green-50 rounded text-sm">
        <i class="fa fa-check-circle text-green-600 mr-2"></i>
        系统整体运行正常，建议定期清理过期token
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

    const logs = [
      { time: '14:32:15', level: 'INFO', message: '用户登录成功 - 张三' },
      { time: '14:31:42', level: 'INFO', message: 'API调用: GET /conversations' },
      { time: '14:30:18', level: 'WARN', message: '响应时间较慢: 2.3s' },
      { time: '14:29:05', level: 'ERROR', message: 'WebSocket连接超时重试' },
      { time: '14:28:30', level: 'INFO', message: '消息发送成功' }
    ];

    const logsHTML = logs.map(log => {
      const levelColor = log.level === 'ERROR' ? 'red' : log.level === 'WARN' ? 'yellow' : 'blue';
      return `
        <div class="font-mono text-xs p-2 border-b border-gray-100 hover:bg-gray-50">
          <span class="text-gray-500">[${log.time}]</span>
          <span class="text-${levelColor}-600 font-medium">[${log.level}]</span>
          <span class="text-gray-700">${log.message}</span>
        </div>
      `;
    }).join('');

    showModal('系统日志 - ' + timeRange, `
      <div class="max-h-96 overflow-y-auto">
        ${logsHTML}
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

    const sessions = [
      { user: '张三', ip: '192.168.1.100', device: 'Chrome / Windows', loginTime: '14:20', active: true },
      { user: '李四', ip: '192.168.1.101', device: 'Safari / macOS', loginTime: '13:45', active: true },
      { user: '王五', ip: '192.168.1.102', device: 'Firefox / Linux', loginTime: '12:30', active: false }
    ];

    const sessionsHTML = sessions.map(s => {
      const statusColor = s.active ? 'green' : 'gray';
      return `
        <div class="p-3 border border-gray-200 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-sm">${s.user}</span>
            <span class="px-2 py-0.5 bg-${statusColor}-100 text-${statusColor}-700 text-xs rounded-full">
              ${s.active ? '在线' : '离线'}
            </span>
          </div>
          <div class="text-xs text-gray-600 space-y-1">
            <div><i class="fa fa-desktop mr-1"></i>${s.device}</div>
            <div><i class="fa fa-map-marker mr-1"></i>${s.ip}</div>
            <div><i class="fa fa-clock-o mr-1"></i>登录时间: ${s.loginTime}</div>
          </div>
        </div>
      `;
    }).join('');

    showModal('用户会话管理', `
      <div class="space-y-2">
        ${sessionsHTML}
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
      <button class="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark" onclick="this.closest('.modal-overlay')?.remove();window.showNotification?.('通知已发送', 'success')">
        发送通知
      </button>
    </div>
  `);
}

// 创建工单
function createTicket(button) {
  showModal('创建事件工单', `
    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1">工单标题</label>
        <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="简要描述问题">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">优先级</label>
        <select class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option>低</option>
          <option>中</option>
          <option>高</option>
          <option>紧急</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">问题描述</label>
        <textarea class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows="4" placeholder="详细描述问题"></textarea>
      </div>
      <button class="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark" onclick="this.closest('.modal-overlay')?.remove();window.showNotification?.('工单已创建，编号: TK' + Date.now(), 'success')">
        创建工单
      </button>
    </div>
  `);
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
      <button class="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700" onclick="this.closest('.modal-overlay')?.remove();window.showNotification?.('问题已升级到高级支持团队', 'warning')">
        确认升级
      </button>
    </div>
  `);
}

// 生成报告
function generateReport(button) {
  const originalContent = button.innerHTML;
  button.innerHTML = '<i class="fa fa-spinner fa-spin"></i><span class="text-sm">生成中...</span>';
  button.disabled = true;

  setTimeout(() => {
    button.innerHTML = originalContent;
    button.disabled = false;

    showModal('生成报告', `
      <div class="space-y-3">
        <div class="p-3 bg-green-50 rounded-lg">
          <i class="fa fa-check-circle text-green-600 mr-2"></i>
          <span class="text-sm">报告生成成功</span>
        </div>
        <div class="text-sm text-gray-700">
          <div class="mb-2 font-medium">报告摘要：</div>
          <ul class="space-y-1 text-xs text-gray-600">
            <li>• 处理对话数: 8</li>
            <li>• 平均响应时间: 2.5分钟</li>
            <li>• 问题解决率: 87.5%</li>
            <li>• 客户满意度: 4.2/5.0</li>
          </ul>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm" onclick="alert('下载PDF...')">
            <i class="fa fa-download mr-1"></i>下载PDF
          </button>
          <button class="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm" onclick="alert('下载Excel...')">
            <i class="fa fa-table mr-1"></i>下载Excel
          </button>
        </div>
      </div>
    `);
  }, 1500);
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
