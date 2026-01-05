import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';
import { toggleRightSidebar } from '../ui/layout.js';
import {
  isApiEnabled,
  fetchTasks,
  actionTask,
  fetchQualityProfile,
} from '../api.js';
import { taskController } from '../presentation/task/TaskController.js';

const qualityProfiles = {
  'conv-001': {
    title: 'ERP登录中断 - 小米保障群',
    score: 92,
    summary: '响应及时且补偿到位，建议补充复盘与复测日志，关注二次反馈。',
    dimensions: [
      { label: '合规', score: 96, hint: '未触发敏感词与越权操作' },
      { label: '完整度', score: 91, hint: '结论明确，但复测截图缺失' },
      { label: '情绪', score: 88, hint: '安抚到位，仍需跟进情绪回落' },
    ],
    actions: ['导出质检报告', '生成复盘大纲', '触发满意度回访'],
  },
  'conv-002': {
    title: '账单咨询 - 李四',
    score: 86,
    summary: '信息核对充分，但等待时间略长；可推送自助账单核验指南。',
    dimensions: [
      { label: '合规', score: 93, hint: '对账过程遵循规范' },
      { label: '完整度', score: 82, hint: '未告知账期调整变更' },
      { label: '情绪', score: 84, hint: '保持友好但缺少致歉语' },
    ],
    actions: ['推送自助指南', '提醒补充致歉话术', '记录账期调整风险'],
  },
  'conv-003': {
    title: '功能体验反馈 - 王五',
    score: 90,
    summary: '体验反馈清晰，建议沉淀为知识库并跟踪改版需求。',
    dimensions: [
      { label: '合规', score: 95, hint: '沟通过程合规' },
      { label: '完整度', score: 88, hint: '暂未给出改进时间表' },
      { label: '情绪', score: 92, hint: '态度积极，维持良好关系' },
    ],
    actions: ['生成知识库草稿', '添加迭代需求卡片', '安排回访时间'],
  },
};

const conversationQcProfiles = {
  'conv-001': {
    title: '小米保障群 · ERP登录中断',
    urgency: '高紧急',
    urgencyClass: 'chip-urgent',
    tone: 'urgent',
    sla: 'VIP',
    impact: '业务受阻',
    channel: '飞书',
    time: '10:30',
    summary: '认证失败影响多用户，承诺 15 分钟恢复；需同步公告与补偿方案。',
    tags: ['认证失败', '多用户受影响', '需公告', '补偿说明'],
    metrics: { urgency: '85%', emotion: 65, eta: '15min' },
    dimensions: {
      emotion: { score: 65, label: '不满回落', bar: 65 },
      quality: { score: 92, label: '合规 · 待补证据', bar: 92 },
      satisfaction: { score: 3.8, label: '需回访确认', bar: 76 },
    },
    tip: '建议优先重启认证服务并准备备用节点切换。',
    threadTitle: '对话节选 · conv-001',
    thread: [
      { role: '客户', text: '系统报错无法登录，多人受影响，影响业务。', sentiment: '😡 不满', tag: '高紧急' },
      { role: '工程师', text: '已收到告警，正在重启认证服务并核对备节点。', sentiment: '🛠️ 处理中', tag: '已响应' },
      { role: '客户', text: '收到，麻烦 10 分钟内给进展，先发公告说明。', sentiment: '🙂 回落', tag: '待公告' },
    ],
    insights: ['情绪已回落，但需 10 分钟内同步最新进展', '补充复测截图与告警恢复证据', '回访并记录满意度，补偿方案需明确生效时间'],
  },
  'conv-002': {
    title: '恒星数据 · 账单核验',
    urgency: '处理中',
    urgencyClass: 'chip-soft',
    tone: 'soft',
    sla: 'KA0',
    impact: '等待确认',
    channel: '企业QQ',
    time: '09:45',
    summary: '账单核验问题待确认，已推送账单指引，客户等待反馈。',
    tags: ['账单核验', '需回执', '等待客户'],
    metrics: { urgency: '62%', emotion: 48, eta: '—' },
    dimensions: {
      emotion: { score: 48, label: '关注 · 需致歉', bar: 48 },
      quality: { score: 86, label: '完整度需补充账期变更', bar: 86 },
      satisfaction: { score: 3.5, label: '需跟进确认', bar: 70 },
    },
    tip: '提醒补充致歉话术，并附加账期变更说明。',
    threadTitle: '对话节选 · conv-002',
    thread: [
      { role: '客户', text: '上个月账单有差异，请帮忙核对。', sentiment: '😐 关注', tag: '待核验' },
      { role: '工程师', text: '已推送账单核验指引，请按步骤反馈异常截图。', sentiment: '📨 已响应', tag: '指引已发' },
      { role: '客户', text: '收到，等我核对后回复。', sentiment: '🙂 中性', tag: '等待反馈' },
    ],
    insights: ['需在 2 小时内二次跟进，避免长等待', '补充致歉语与账期变更说明', '记录潜在账期调整需求，避免重复咨询'],
  },
  'conv-003': {
    title: '万象互动 · 功能体验反馈',
    urgency: '已解决',
    urgencyClass: 'chip-neutral',
    tone: 'neutral',
    sla: 'KA1',
    impact: '体验优化',
    channel: '微信',
    time: '昨天',
    summary: '功能体验反馈已处理，等待回访确认满意度并收集改进建议。',
    tags: ['体验反馈', '已解决', '待回访'],
    metrics: { urgency: '30%', emotion: 82, eta: '—' },
    dimensions: {
      emotion: { score: 82, label: '积极', bar: 82 },
      quality: { score: 90, label: '完整 · 待给时间表', bar: 90 },
      satisfaction: { score: 4.4, label: '待记录', bar: 88 },
    },
    tip: '沉淀反馈为知识库草稿，并明确改版时间表。',
    threadTitle: '对话节选 · conv-003',
    thread: [
      { role: '客户', text: '新功能体验不错，但希望加个快捷入口。', sentiment: '😊 积极', tag: '建议' },
      { role: '工程师', text: '感谢反馈，已记录并会在下个版本评估上线时间。', sentiment: '🤝 确认', tag: '待排期' },
      { role: '客户', text: '好的，期待更新。', sentiment: '🙂 满意', tag: '待回访' },
    ],
    insights: ['安排回访并记录满意度得分', '输出知识库草稿，补充上线时间表', '将需求同步到需求统计，避免遗漏'],
  },
};

async function loadTasksFromApi() {
  if (!isApiEnabled()) {
    return;
  }

  try {
    const response = await taskController.listTasks({
      assigneeId: window.config?.userId,
      status: 'all',
      limit: 12,
    });
    const payload = response?.data ?? response;
    const items = normalizeTasks(payload);
    const tasksList = qs('#tasks-list');
    if (tasksList) {
      tasksList.innerHTML = '';
    }
    items.forEach((task) => addTaskFromApi(task));
  } catch (err) {
    console.warn('[tasks] list failed', err);
  }
}

function addTaskFromApi(task) {
  if (!task) {
    return;
  }
  const taskId = task.taskId || task.id || `task-${Date.now()}`;
  const name = task.title || task.name || '任务';
  const description = task.description || task.summary || '暂无描述';
  const priority = mapTaskPriority(task.priority);
  const owner = task.owner || 'primary';
  const status = mapTaskStatus(task.status);
  addTaskToList(taskId, name, description, priority, owner, status);
}

function mapTaskStatus(status) {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('complete') || normalized.includes('done')) {
    return 'completed';
  }
  if (normalized.includes('in-progress') || normalized.includes('executing') || normalized.includes('processing')) {
    return 'in-progress';
  }
  if (normalized.includes('pending') || normalized.includes('todo') || !normalized) {
    return 'pending';
  }
  return 'pending';
}

function mapTaskPriority(priority) {
  const normalized = (priority || '').toLowerCase();
  if (normalized.includes('low')) {
    return 'low';
  }
  if (normalized.includes('high') || normalized.includes('urgent')) {
    return 'high';
  }
  return 'medium';
}

function getActiveConversationId() {
  return qs('.conversation-item.is-active')?.getAttribute('data-id') || 'conv-001';
}

export function initAgentTasks() {
  const newTaskBtn = qs('#new-task-btn');
  const newTaskForm = qs('#new-task-form');
  const cancelTaskBtn = qs('#cancel-task-btn');
  const saveTaskBtn = qs('#save-task-btn');
  const nameInput = qs('#task-name');
  const descriptionInput = qs('#task-description');
  const prioritySelect = qs('#task-priority');
  const agentSelect = qs('#task-agent');

  const taskEditor = qs('#task-editor-panel');
  const openTaskEditorBtn = qs('#open-task-editor');
  const closeTaskEditorBtn = qs('#close-task-editor');
  const customTitleInput = qs('#custom-task-title');
  const customDescInput = qs('#custom-task-desc');
  const customPrioritySelect = qs('#custom-task-priority');
  const customOwnerInput = qs('#custom-task-owner');
  const saveCustomTaskBtn = qs('#save-custom-task');
  const layoutInput = qs('#layout-command-input');
  const layoutPreview = qs('#layout-preview');
  const layoutLabel = qs('#layout-style-label');
  const layoutApplyBtn = qs('#apply-layout-btn');
  const layoutChips = qsa('.command-chip[data-layout]');
  const sidebarCreateBtn = qs('#sidebar-create-task');
  const sidebarTasksList = qs('#sidebar-tasks-list');
  const taskDetailWrapper = qs('#task-detail-wrapper');

  on(newTaskBtn, 'click', () => {
    newTaskForm?.classList.toggle('hidden');
    qs('#task-name')?.focus();
  });

  on(cancelTaskBtn, 'click', () => {
    if (!newTaskForm) {
      return;
    }
    newTaskForm.classList.add('hidden');
    if (nameInput) {
      nameInput.value = '';
    }
    if (descriptionInput) {
      descriptionInput.value = '';
    }
    if (prioritySelect) {
      prioritySelect.value = 'medium';
    }
    if (agentSelect) {
      agentSelect.value = 'primary';
    }
  });

  on(saveTaskBtn, 'click', () => {
    const name = nameInput?.value.trim();
    const description = descriptionInput?.value.trim();
    const priority = prioritySelect?.value || 'medium';
    const agent = agentSelect?.value || 'primary';

    if (!name) {
      showNotification('请输入任务名称', 'error');
      qs('#task-name')?.focus();
      return;
    }
    if (!description) {
      showNotification('请输入任务描述', 'error');
      qs('#task-description')?.focus();
      return;
    }

    const id = `task-${Date.now()}`;
    addTaskToList(id, name, description, priority, agent, 'pending');
    newTaskForm?.classList.add('hidden');
    if (nameInput) {
      nameInput.value = '';
    }
    if (descriptionInput) {
      descriptionInput.value = '';
    }
    if (prioritySelect) {
      prioritySelect.value = 'medium';
    }
    if (agentSelect) {
      agentSelect.value = 'primary';
    }
    showNotification('任务创建成功', 'success');
  });

  const tasksList = qs('#tasks-list');
  if (tasksList) {
    on(tasksList, 'click', (e) => {
      const cancelBtn = e.target.closest('.cancel-task');
      const executeBtn = e.target.closest('.execute-task');
      const viewBtn = e.target.closest('.view-task');

      if (cancelBtn) {
        const taskId = cancelBtn.getAttribute('data-task-id');
        if (isApiEnabled() && taskId) {
          actionTask(taskId, 'cancel').catch(() => {
            console.warn('[tasks] cancel API failed', taskId);
          });
        }
        cancelBtn.closest('.bg-white')?.remove();
        showNotification(`任务 ${taskId} 已取消`, 'info');
      }

      if (executeBtn) {
        const taskId = executeBtn.getAttribute('data-task-id');
        if (isApiEnabled() && taskId) {
          actionTask(taskId, 'execute').catch(() => {
            console.warn('[tasks] execute API failed', taskId);
          });
        }
        const card = executeBtn.closest('.bg-white');
        if (card) {
          startTaskProgress(card, taskId, executeBtn);
        }
      }

      if (viewBtn) {
        const taskId = viewBtn.getAttribute('data-task-id');
        showTaskDetails(taskId);
      }
    });
  }

  setupQualityPanel();
  setupTaskCommandConsole();
  setupReportShortcuts();
  setupCustomTaskEditor({
    taskEditor,
    taskDetailWrapper,
    openTaskEditorBtn,
    closeTaskEditorBtn,
    customTitleInput,
    customDescInput,
    customPrioritySelect,
    customOwnerInput,
    saveCustomTaskBtn,
    sidebarTasksList,
  });
  setupLayoutPreview({ layoutInput, layoutPreview, layoutLabel, layoutApplyBtn, layoutChips });
  setupSidebarTasks(sidebarTasksList, sidebarCreateBtn);
  setupTaskConversationFlow();
  renderQualityDrawer('conv-001', false, false);
  initQcLeanControls();
  loadTasksFromApi();
}

export function addTaskToList(taskId, name, description, priority, agent, status) {
  const tasksList = qs('#tasks-list');
  if (!tasksList) {
    return;
  }

  const taskEl = document.createElement('div');
  taskEl.className = 'bg-white border border-gray-200 rounded-lg p-3';
  if (status === 'completed') {
    taskEl.style.opacity = '0.75';
  }

  const statusMap = {
    pending: { className: 'bg-gray-100 text-gray-800', text: '待执行' },
    'in-progress': { className: 'bg-blue-100 text-blue-800', text: '进行中' },
    completed: { className: 'bg-green-100 text-green-800', text: '已完成' },
  };
  const statusInfo = statusMap[status] || statusMap.pending;

  const icon =
    status === 'completed' ? 'fa-check' : status === 'in-progress' ? 'fa-search' : 'fa-file-text-o';
  const priorityLabel = priority === 'high' ? '高' : priority === 'low' ? '低' : '中';
  const agentLabel =
    agent === 'backup' ? '备用Agent' : agent === 'specialist' ? '专家Agent' : '主要Agent';

  const actionButton =
    status === 'pending'
      ? `<button class="execute-task text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-dark" data-task-id="${taskId}">立即执行</button>`
      : `<button class="view-task text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-task-id="${taskId}">查看</button>`;

  taskEl.innerHTML = `
    <div class="flex justify-between items-start">
      <div class="flex items-start">
        <div class="w-6 h-6 rounded-full ${statusInfo.className.replace('text', 'bg').replace('-800', '-100')} flex items-center justify-center mr-2 text-primary">
          <i class="fa ${icon} text-xs"></i>
        </div>
        <div>
          <div class="flex items-center">
            <span class="text-sm font-medium text-gray-800">${name}</span>
            <span class="ml-2 text-xs px-2 py-0.5 ${statusInfo.className} rounded-full">${statusInfo.text}</span>
          </div>
          <p class="text-xs text-gray-600 mt-1">${description}</p>
          <div class="flex items-center mt-2">
            <span class="text-xs text-gray-500">优先级: ${priorityLabel} | 执行Agent: ${agentLabel}</span>
          </div>
        </div>
      </div>
      ${actionButton}
    </div>`;

  tasksList.prepend(taskEl);
}

function normalizeTasks(payload) {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  if (Array.isArray(payload.tasks)) {
    return payload.tasks;
  }
  if (Array.isArray(payload.data?.items)) {
    return payload.data.items;
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

function startTaskProgress(card, taskId, triggerBtn) {
  const statusBadge = card.querySelector('.rounded-full');
  if (statusBadge) {
    statusBadge.className = 'ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full';
    statusBadge.textContent = '进行中';
  }

  const progressContainer = document.createElement('div');
  progressContainer.className = 'flex items-center mt-2';
  progressContainer.innerHTML = `
    <div class="w-full bg-gray-200 rounded-full h-1.5">
      <div class="bg-blue-600 h-1.5 rounded-full" style="width: 0%"></div>
    </div>
    <span class="text-xs text-gray-500 ml-2">0%</span>`;

  const contentArea = card.querySelector('.flex.items-start > div:last-child');
  if (contentArea) {
    contentArea.appendChild(progressContainer);
  }

  triggerBtn.className = 'cancel-task text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300';
  triggerBtn.textContent = '取消';

  simulateTaskProgress(taskId, progressContainer, card, triggerBtn);
  showNotification('任务已开始执行', 'success');
}

function simulateTaskProgress(taskId, progressContainer, card, triggerBtn) {
  const progressBar = progressContainer.querySelector('.bg-blue-600');
  const progressText = progressContainer.querySelector('.text-gray-500');
  let progress = 0;

  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 12) + 5;
    if (progress > 100) {
      progress = 100;
    }
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    if (progressText) {
      progressText.textContent = `${progress}%`;
    }

    if (progress === 100) {
      clearInterval(interval);
      finalizeTask(card, triggerBtn, taskId);
    }
  }, 800);
}

function finalizeTask(card, triggerBtn, taskId) {
  const statusBadge = card.querySelector('.rounded-full');
  if (statusBadge) {
    statusBadge.className = 'ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full';
    statusBadge.textContent = '已完成';
  }

  const progressContainer = card.querySelector('.flex.items-center.mt-2');
  if (progressContainer) {
    progressContainer.innerHTML = `<span class="text-xs text-gray-500">完成时间: ${getCurrentTime()}</span>`;
  }

  if (triggerBtn) {
    triggerBtn.className = 'view-task text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300';
    triggerBtn.textContent = '查看';
  }

  card.style.opacity = '0.8';
  showNotification(`任务 ${taskId} 已完成`, 'success');
}

export async function createRelatedTask(solutionType, solutionName, taskDraft = null) {
  const payload = taskDraft || buildTaskPayload(solutionType, solutionName);
  let created = false;

  if (isApiEnabled()) {
    try {
      const response = await taskController.createTask({
        ...payload,
        relatedEntity: payload.relatedEntity || { conversationId: getActiveConversationId() },
      });
      const taskData = response?.data ?? response;
      addTaskFromApi(taskData);
      created = true;
    } catch (err) {
      console.warn('[tasks] create related task API failed', err);
    }
  }

  if (!created) {
    addTaskToList(`task-${Date.now()}`, payload.title, payload.description, payload.priority, 'primary', 'pending');
  }
}

function buildTaskPayload(solutionType, solutionName) {
  let title = solutionName || '自动任务';
  let description = '根据解决方案自动生成的任务';
  let priority = 'medium';

  if (solutionType === 'login-diagnosis') {
    title = '登录问题跟进';
    description = '跟进客户登录问题解决情况，确认修复效果并收集反馈';
    priority = 'high';
  } else if (solutionType === 'security-check') {
    title = '账户安全加固';
    description = '协助客户完成账户安全设置优化，确保账户安全';
    priority = 'medium';
  } else if (solutionType === 'system-diagnosis') {
    title = '系统优化建议';
    description = '基于故障排查结果，提供系统性能优化建议';
    priority = 'medium';
  }

  return {
    title,
    description,
    priority,
    owner: 'primary',
    relatedEntity: { conversationId: getActiveConversationId() },
  };
}

async function showTaskDetails(taskId) {
  if (!taskId) {
    showNotification('任务ID无效', 'warning');
    return;
  }

  try {
    const detail = await taskController.getTask(taskId);
    if (!detail) {
      showNotification(`未找到任务 ${taskId}`, 'warning');
      return;
    }

    renderTaskDetail(detail);
    showNotification(`任务 ${detail.title || taskId} 详情已加载`, 'success');
  } catch (error) {
    console.error('[tasks] showTaskDetails failed', error);
    showNotification('任务详情加载失败，请稍后重试', 'error');
  }
}

function renderTaskDetail(detail) {
  const wrapper = qs('#task-detail-wrapper');
  if (!wrapper) {
    return;
  }

  const dueText = detail.dueDate ? `截止时间：${new Date(detail.dueDate).toLocaleString()}` : '截止时间未设定';
  const statusLabel = detail.status ? detail.status.replace('_', ' ') : '未知状态';

  wrapper.innerHTML = `
    <div class="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-800">${detail.title || '任务详情'}</h3>
        <span class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">${statusLabel}</span>
      </div>
      <p class="text-sm text-gray-600">${detail.description || detail.summary || '暂无描述'}</p>
      <div class="text-xs text-gray-500 space-y-1">
        <p>优先级：${(detail.priority || 'medium').replace('_', ' ')}</p>
        <p>负责人：${detail.assignedToName || detail.assigneeName || '未指定'}</p>
        <p>${dueText}</p>
        <p>关联对话：${detail.conversationId || '无'}</p>
      </div>
    </div>
  `;
}

function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function setupCustomTaskEditor(config) {
  const {
    taskEditor,
    taskDetailWrapper,
    openTaskEditorBtn,
    closeTaskEditorBtn,
    customTitleInput,
    customDescInput,
    customPrioritySelect,
    customOwnerInput,
    saveCustomTaskBtn,
    sidebarTasksList,
  } = config;

  if (!taskEditor) {
    return;
  }

  const openEditor = () => {
    taskEditor.classList.remove('hidden');
    taskDetailWrapper?.classList.add('hidden');
    openTaskEditorBtn?.classList.add('hidden');
    customTitleInput?.focus();
  };
  const closeEditor = () => {
    taskEditor.classList.add('hidden');
    taskDetailWrapper?.classList.remove('hidden');
    openTaskEditorBtn?.classList.remove('hidden');
  };

  if (openTaskEditorBtn) {
    on(openTaskEditorBtn, 'click', openEditor);
  }
  if (closeTaskEditorBtn) {
    on(closeTaskEditorBtn, 'click', closeEditor);
  }

  if (saveCustomTaskBtn) {
    on(saveCustomTaskBtn, 'click', async () => {
      const title = customTitleInput?.value.trim();
      const desc = customDescInput?.value.trim();
      const priority = customPrioritySelect?.value || 'medium';
      const owner = customOwnerInput?.value.trim() || '负责人未填写';

      if (!title) {
        showNotification('请填写任务名称', 'warning');
        customTitleInput?.focus();
        return;
      }
      if (!desc) {
        showNotification('请填写任务描述', 'warning');
        customDescInput?.focus();
        return;
      }

      const payload = {
        title,
        description: desc,
        priority,
        owner,
        relatedEntity: { conversationId: getActiveConversationId() },
      };

      let created = false;
      if (isApiEnabled()) {
        try {
          const response = await taskController.createTask(payload);
          const taskData = response?.data ?? response;
          addTaskFromApi(taskData);
          created = true;
        } catch (err) {
          console.warn('[tasks] create task API failed', err);
        }
      }

      if (!created) {
        addTaskToList(`task-${Date.now()}`, title, desc, priority, 'primary', 'pending');
      }

      const sidebarDesc = desc || '无描述';
      if (sidebarTasksList) {
        addSidebarTask(sidebarTasksList, title, sidebarDesc, priority);
      }
      showNotification(`已创建任务：${title}（负责人：${owner}）`, 'success');
      closeEditor();
      if (customTitleInput) {
        customTitleInput.value = '';
      }
      if (customDescInput) {
        customDescInput.value = '';
      }
      if (customPrioritySelect) {
        customPrioritySelect.value = 'medium';
      }
      if (customOwnerInput) {
        customOwnerInput.value = '';
      }
    });
  }
}

function setupLayoutPreview({ layoutInput, layoutPreview, layoutLabel, layoutApplyBtn, layoutChips }) {
  if (!layoutPreview) {
    return;
  }

  const applyLayout = (style) => {
    layoutPreview.classList.remove('layout-dashboard', 'layout-board', 'layout-focus');
    layoutPreview.classList.add(`layout-${style}`);
    if (layoutLabel) {
      const textMap = {
        dashboard: '当前：双栏仪表盘',
        board: '当前：卡片瀑布流',
        focus: '当前：右侧重点',
      };
      layoutLabel.textContent = textMap[style] || '当前：双栏卡片';
    }
  };

  const inferLayout = (text) => {
    if (!text) {
      return 'dashboard';
    }
    const lower = text.toLowerCase();
    if (lower.includes('瀑布') || lower.includes('卡片') || lower.includes('board')) {
      return 'board';
    }
    if (lower.includes('右') || lower.includes('重点') || lower.includes('突出') || lower.includes('focus')) {
      return 'focus';
    }
    return 'dashboard';
  };

  const handleApply = () => {
    const command = layoutInput?.value.trim() || '';
    const style = inferLayout(command);
    applyLayout(style);
    showNotification('布局意图已应用到预览', 'info');
  };

  if (layoutApplyBtn) {
    on(layoutApplyBtn, 'click', handleApply);
  }
  if (layoutInput) {
    on(layoutInput, 'keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleApply();
      }
    });
  }

  layoutChips?.forEach((chip) => {
    on(chip, 'click', () => {
      const style = chip.dataset.layout || 'dashboard';
      applyLayout(style);
    });
  });

  applyLayout('dashboard');
}

function setupSidebarTasks(listEl, createBtn) {
  if (!listEl) {
    return;
  }
  if (createBtn) {
    on(createBtn, 'click', () => {
      qs('#open-task-editor')?.click();
    });
  }

  on(listEl, 'click', (e) => {
    const target = e.target;
    const item = target.closest('.task-list-item');
    if (!item) {
      return;
    }
    const taskTitle = item.querySelector('.text-sm.font-semibold')?.textContent?.trim() || '任务';

    if (target.classList.contains('task-delete-btn')) {
      item.remove();
      showNotification(`已删除：${taskTitle}`, 'info');
    } else if (target.classList.contains('task-edit-btn')) {
      qs('#open-task-editor')?.click();
      showNotification(`进入编辑：${taskTitle}`, 'info');
    } else if (target.classList.contains('task-view-btn')) {
      showNotification(`查看任务详情：${taskTitle}（可对接实际数据）`, 'info');
    }
  });
}

function addSidebarTask(listEl, title, desc, priority) {
  const wrapper = document.createElement('div');
  wrapper.className = 'task-list-item';
  wrapper.dataset.taskId = `task-${Date.now()}`;
  const priorityChip =
    priority === 'high'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : priority === 'low'
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-blue-50 text-blue-700 border border-blue-200';

  wrapper.innerHTML = `
    <div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-gray-800">${title}</span>
        <span class="text-[11px] px-2 py-0.5 rounded-full ${priorityChip}">${priority === 'high' ? '高' : priority === 'low' ? '低' : '中'}</span>
      </div>
      <p class="text-xs text-gray-600">${desc}</p>
    </div>
    <div class="flex items-center gap-2">
      <button class="task-view-btn text-xs text-primary hover:underline">查看</button>
      <button class="task-edit-btn text-xs text-gray-600 hover:text-primary">编辑</button>
      <button class="task-delete-btn text-xs text-red-600 hover:text-red-700">删除</button>
    </div>`;

  listEl.prepend(wrapper);
}

function setupQualityPanel() {
  const selector = qs('#quality-conversation-select');
  if (!selector) {
    return;
  }

  const scoreEl = qs('#quality-score');
  const summaryEl = qs('#quality-summary');
  const chipsEl = qs('#quality-dimension-chips');
  const actionsEl = qs('#quality-actions');

  const render = (id) => {
    const profile = qualityProfiles[id];
    if (!profile) {
      return;
    }

    if (scoreEl) {
      scoreEl.textContent = `${profile.score} 分`;
    }
    if (summaryEl) {
      summaryEl.textContent = profile.summary;
    }

    if (chipsEl) {
      chipsEl.innerHTML = '';
      profile.dimensions.forEach((dim) => {
        const chip = document.createElement('span');
        chip.className = 'quality-chip';
        chip.innerHTML = `<strong>${dim.label}</strong> ${dim.score} · ${dim.hint}`;
        chipsEl.appendChild(chip);
      });
    }

    if (actionsEl) {
      actionsEl.innerHTML = '';
      profile.actions.forEach((action) => {
        const item = document.createElement('div');
        item.className = 'quality-action';
        item.innerHTML = `<i class="fa fa-check-circle text-green-500 mr-2"></i>${action}`;
        actionsEl.appendChild(item);
      });
    }
  };

  on(selector, 'change', () => render(selector.value));
  render(selector.value || selector.options?.[0]?.value);
}

function setupTaskCommandConsole() {
  const input = qs('#task-command-input');
  const submitBtn = qs('#task-command-btn');
  const log = qs('#task-command-log');
  const chips = qsa('.command-chip');
  if (!input || !submitBtn) {
    return;
  }

  const dispatch = () => {
    const text = input.value.trim();
    if (!text) {
      showNotification('请输入要派发的自然语言指令', 'warning');
      input.focus();
      return;
    }
    addCommandLog(text, log);
    input.value = '';
    showNotification('指令已派发到质检/运营中枢（示例）', 'success');
  };

  on(submitBtn, 'click', dispatch);
  on(input, 'keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      dispatch();
    }
  });

  chips.forEach((chip) => {
    on(chip, 'click', () => {
      const command = chip.getAttribute('data-command') || chip.textContent.trim();
      input.value = command;
      input.focus();
    });
  });
}

function addCommandLog(text, logContainer) {
  if (!logContainer) {
    return;
  }
  const row = document.createElement('div');
  row.className = 'flex items-start gap-2 text-xs text-gray-600';
  row.innerHTML = `
    <i class="fa fa-check-circle text-green-500 mt-0.5"></i>
    <div>
      <div class="font-medium text-gray-800 break-words">已派发：${text}</div>
      <div class="text-[11px] text-gray-400">收件人：质检AI · ${getCurrentTime()}</div>
    </div>`;
  logContainer.prepend(row);
}

function setupReportShortcuts() {
  const reportBtns = qsa('.report-entry');
  if (!reportBtns.length) {
    return;
  }

  reportBtns.forEach((btn) => {
    on(btn, 'click', () => {
      const name = btn.getAttribute('data-report-name') || '报表';
      showNotification(`${name}入口已为领导班子加载（示例）`, 'info');
    });
  });
}

function setupTaskConversationFlow() {
  const workspace = qs('#workspace-tasks-tab');
  const qualityView = qs('#task-quality-overview');
  const conversationArea = qs('#task-conversation-area');
  const log = qs('#task-agent-log');
  const input = qs('#task-agent-command-input');
  const sendBtn = qs('#task-agent-send');
  const chips = qsa('.task-agent-chip');
  const backBtn = qs('#back-to-quality');
  const startBtn = qs('#start-task-conversation');
  const qcButtons = qsa('[data-open-qc]');

  const openConversation = () => {
    conversationArea?.classList.remove('hidden');
    qualityView?.classList.add('hidden');
    workspace?.classList.add('task-conversation-active');
  };

  if (backBtn) {
    on(backBtn, 'click', () => {
      conversationArea?.classList.add('hidden');
      qualityView?.classList.remove('hidden');
      workspace?.classList.remove('task-conversation-active');
    });
  }
  if (startBtn) {
    on(startBtn, 'click', openConversation);
  }
  qcButtons.forEach((btn) => {
    on(btn, 'click', () => {
      const convId = btn.getAttribute('data-conv-id') || 'conv-001';
      renderQualityDrawer(convId, true, true);
    });
  });

  const dispatch = () => {
    const text = input?.value.trim();
    if (!text) {
      showNotification('请输入要派发的指令', 'warning');
      input?.focus();
      return;
    }
    openConversation();

    // 1. 用户消息上屏
    appendMessage(text, 'user');
    if (input) {
      input.value = '';
    }

    // 2. 模拟Agent思考/回复
    simulateAgentReply(text, log);
  };

  if (sendBtn) {
    on(sendBtn, 'click', dispatch);
  }
  if (input) {
    on(input, 'keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        dispatch();
      }
    });
  }

  chips.forEach((chip) => {
    on(chip, 'click', () => {
      const command = chip.getAttribute('data-command') || chip.textContent.trim();
      input.value = command; // 只填充不自动发送，符合IM习惯，或者填充后focus
      input?.focus();
    });
  });
}

// 替换 appendAgentLog 为 appendMessage
function appendMessage(text, role, extraContent = '') {
  const logContainer = qs('#task-agent-log');
  if (!logContainer) {
    return;
  }

  const entry = document.createElement('div');
  const isUser = role === 'user';

  entry.className = `flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`;

  const avatarInfo = isUser
    ? '<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs ml-2 order-2">我</div>'
    : '<div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs mr-2 order-1"><i class="fa fa-android"></i></div>';

  const bubbleClass = isUser
    ? 'bg-blue-600 text-white rounded-l-lg rounded-br-lg'
    : 'bg-white border border-gray-200 text-gray-800 rounded-r-lg rounded-bl-lg';

  const contentOrder = isUser ? 'order-1' : 'order-2';

  entry.innerHTML = `
    ${avatarInfo}
    <div class="max-w-[80%] ${contentOrder}">
        <div class="px-4 py-2 ${bubbleClass} shadow-sm text-sm">
            ${text}
        </div>
        ${extraContent ? `<div class="mt-2 text-left">${extraContent}</div>` : ''}
        <div class="text-[10px] text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}">${getCurrentTime()}</div>
    </div>
  `;

  // 改为 append (正序)
  // 注意：原代码 index.js 925行 `task-agent-log` 容器里的内容会被顶上去。
  // 如果之前是 prepend，那容器看起来是倒序的。
  // 为了IM体验，我们应该 append。
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function simulateAgentReply(userText, logContainer) {
  if (!logContainer) {
    return;
  }

  // 模拟思考延迟
  setTimeout(() => {
    const intent = inferTaskIntent(userText);
    let replyText = '';
    let actionWidget = '';

    if (intent.isLongTerm) {
      replyText = `我理解您希望建立一个长期的${intent.keyword}任务。我已经为您准备好了快捷指令。`;
      actionWidget = `
                <div class="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm">
                    <div class="flex items-center gap-2 mb-2">
                         <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                         <span class="font-semibold text-emerald-900">建议：沉淀为长期指令</span>
                    </div>
                    <p class="text-emerald-800 mb-3 text-xs">"${intent.title}"</p>
                    <button class="save-long-term-btn w-full py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded hover:bg-emerald-100 transition-colors text-xs font-medium" 
                      data-title="${intent.title}" data-desc="${intent.desc}" data-priority="${intent.priority}">
                      <i class="fa fa-save mr-1"></i> 保存到任务栏
                    </button>
                </div>`;
    } else {
      replyText = `收到，我这就为您执行：${intent.title}。`;
      actionWidget = `
               <div class="bg-white border border-gray-200 rounded-lg p-3 text-sm shadow-sm mt-1">
                    <div class="flex items-center gap-2 text-gray-500 mb-2" id="exec-status-${intent.taskId}">
                        <i class="fa fa-spinner fa-spin text-primary"></i>
                        <span>正在执行中...</span>
                    </div>
                    <div class="execution-result hidden text-gray-700 bg-gray-50 p-2 rounded" id="exec-result-${intent.taskId}">
                        ${generateMockResult(intent)}
                    </div>
               </div>
            `;

      // 异步更新结果
      setTimeout(() => {
        const statusEl = document.querySelector(`#exec-status-${intent.taskId}`);
        const resultEl = document.querySelector(`#exec-result-${intent.taskId}`);
        if (statusEl) {
          statusEl.innerHTML = '<i class="fa fa-check-circle text-green-500"></i><span class="text-green-600 font-medium">执行完成</span>';
        }
        if (resultEl) {
          resultEl.classList.remove('hidden');
        }
      }, 2000);
    }

    appendMessage(replyText, 'agent', actionWidget);

    // 绑定事件 (对于新生成的 DOM)
    // 由于 innerHTML 替换比较粗暴，最好是用事件委托绑定在 container 上，
    // 或者在这里查找刚刚插入的元素。
    // 简单起见，我们在 container 上做一次针对新按钮的绑定，或者直接利用全局委托。
    // 这里尝试直接查找最新插入的按钮
    const lastBtn = logContainer.querySelector('.save-long-term-btn:last-of-type');
    if (lastBtn && !lastBtn.dataset.bound) {
      lastBtn.dataset.bound = 'true';
      on(lastBtn, 'click', (e) => {
        const btn = e.target.closest('button');
        if (btn.disabled) {
          return;
        }
        saveAsLongTermTask(btn.dataset.title, btn.dataset.desc, btn.dataset.priority);
        btn.innerHTML = '<i class="fa fa-check mr-1"></i> 已保存';
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
      });
    }

  }, 600); // 600ms network delay simulation
}

function saveAsLongTermTask(title, desc, priority) {
  const sidebarTasks = qs('#sidebar-tasks-list');
  if (!sidebarTasks) {
    return;
  }

  // 复用 addSidebarTask，但可以加一点样式区分，或者仅仅是加到列表里
  // 这里我们假设长期任务在列表里有一个特殊的标识
  const wrapper = document.createElement('div');
  wrapper.className = 'task-list-item long-term-task bg-emerald-50/30'; // 微弱背景区分
  wrapper.dataset.taskId = `task-long-${Date.now()}`;

  const priorityChip =
    priority === 'high'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : priority === 'low'
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-blue-50 text-blue-700 border border-blue-200';

  wrapper.innerHTML = `
      <div>
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="长期指令"></span>
          <span class="text-sm font-semibold text-gray-800">${title}</span>
          <span class="text-[11px] px-2 py-0.5 rounded-full ${priorityChip}">${priority === 'high' ? '高' : priority === 'low' ? '低' : '中'}</span>
        </div>
        <p class="text-xs text-gray-600 mt-0.5"><i class="fa fa-refresh text-[10px] mr-1 text-emerald-500"></i>${desc}</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="task-execute-btn text-xs text-primary hover:underline" title="立即触发">执行</button>
        <button class="task-delete-btn text-xs text-red-600 hover:text-red-700">移除</button>
      </div>`;

  // 插入到列表顶部，或者专门的长期任务区域。这里直接插顶部。
  sidebarTasks.prepend(wrapper);
  showNotification('已沉淀为长期快捷指令', 'success');
}

function generateMockResult(intent) {
  const text = intent.title;
  if (text.includes('状态') || text.includes('巡检')) {
    return '系统核心服务运行正常，CPU负载 45%，内存使用率 60%。未发现异常报警。';
  }
  if (text.includes('报表') || text.includes('报告')) {
    return '已生成《今日质量日报》，并发送至您的邮箱。关键指标：客户满意度 4.8，平均响应时间 2m。';
  }
  if (text.includes('公告')) {
    return '已生成系统维护公告草稿，并通过内部IM发送给您预览。请确认后发布。';
  }
  return '指令已执行完成。相关数据已更新至仪表盘。';
}

function inferTaskIntent(text) {
  const normalized = text.toLowerCase();

  // 长期任务关键词
  const longTermKeywords = ['长期', '持续', '每天', '每日', '每周', '固定', 'monitor', 'daily', 'every'];
  const isLongTerm = longTermKeywords.some(k => normalized.includes(k));
  const keyword = longTermKeywords.find(k => normalized.includes(k)) || '长期';

  // 优先级
  const priority = /紧急|高|重要/.test(text) ? 'high' : /低/.test(text) ? 'low' : 'medium';
  const priorityLabel = priority === 'high' ? '高' : priority === 'low' ? '低' : '中';

  // 标题和描述
  const title = text.length > 22 ? `${text.slice(0, 22).replace(/\s+/g, ' ')}...` : text || '未命名任务';
  const desc = text || '任务描述';
  const taskId = `task-${Date.now()}`;

  return { isLongTerm, keyword, priority, priorityLabel, title, desc, taskId };
}

async function renderQualityDrawer(conversationId, shouldOpen = false, useLean = false) {
  let data = conversationQcProfiles[conversationId] || conversationQcProfiles['conv-001'];
  if (isApiEnabled()) {
    try {
      const response = await fetchQualityProfile(conversationId);
      const payload = response?.data ?? response;
      if (payload && Object.keys(payload).length) {
        data = { ...data, ...payload };
      }
    } catch (err) {
      console.warn('[tasks] fetch quality profile failed', err);
    }
  }
  if (!data) {
    return;
  }

  setTextContent('analysis-case-title', data.title);
  setTextContent('analysis-case-summary', `智能摘要：${data.summary}`);
  applyAnalysisChip('analysis-urgency-chip', data.urgency, data.urgencyClass);
  applyAnalysisChip('analysis-sla-chip', data.sla || '客户等级', 'chip-sla');
  applyAnalysisChip('analysis-impact-chip', data.impact || '影响未标注', 'chip-impact');
  setTextContent('analysis-metric-urgency', data.metrics?.urgency || '--');
  setTextContent('analysis-metric-emotion', `${data.dimensions?.emotion?.score ?? '--'}%`);
  setTextContent('analysis-metric-eta', data.metrics?.eta || '--');

  // Populate Key Metrics Panel
  setTextContent('tm-urgency', data.urgency === '高紧急' ? '高' : data.urgency === '处理中' ? '中' : '低');
  const urgencyEl = qs('#tm-urgency');
  if (urgencyEl) {
    if (data.urgency === '高紧急') {
      urgencyEl.className = 'text-sm font-bold text-red-600';
    } else if (data.urgency === '处理中') {
      urgencyEl.className = 'text-sm font-bold text-blue-600';
    } else {
      urgencyEl.className = 'text-sm font-bold text-gray-600';
    }
  }

  setTextContent('tm-response', data.time ? '2m' : '--'); // Example static or derived
  setTextContent('tm-emotion', data.dimensions?.emotion?.label || '--');
  const emotionEl = qs('#tm-emotion');
  if (emotionEl) {
    const score = data.dimensions?.emotion?.score || 100;
    if (score < 60) {
      emotionEl.className = 'text-sm font-bold text-red-600';
    } else if (score < 85) {
      emotionEl.className = 'text-sm font-bold text-amber-600';
    } else {
      emotionEl.className = 'text-sm font-bold text-green-600';
    }
  }

  setTextContent('analysis-tip', data.tip || '');
  setTextContent('qc-updated-at', data.time || '刚刚');

  setTextContent('rail-emotion-value', data.dimensions?.emotion?.label || '--');
  setTextContent('rail-quality-value', data.dimensions?.quality?.label || '--');
  setTextContent('rail-satisfaction-value', data.dimensions?.satisfaction?.label || '--');

  setTextContent('qc-title', data.title);
  applyQcChip('qc-urgency', data.urgency, data.tone);
  applyQcChip('qc-channel', data.channel, 'soft');
  applyQcChip('qc-time', `最近更新 ${data.time}`, 'ghost');
  setTextContent('qc-summary', data.summary);
  renderTags('qc-tags', data.tags);
  renderDimensions(data.dimensions);
  renderThread(data.threadTitle, data.thread);
  renderInsights(data.insights);
  setTextContent('qc-action-tip', data.tip || '建议：补充回访');

  toggleQcLayout(useLean);
  if (shouldOpen) {
    toggleRightSidebar(true);
  }
}

function setTextContent(id, text) {
  const el = qs(`#${id}`);
  if (el) {
    el.textContent = text;
  }
}

function applyAnalysisChip(id, text, className) {
  const el = qs(`#${id}`);
  if (!el) {
    return;
  }
  const tone = className && className.startsWith('chip-') ? className : className ? `chip-${className}` : 'chip-neutral';
  el.className = `analysis-chip ${tone}`;
  el.textContent = text;
}

function applyQcChip(id, text, tone = 'soft') {
  const el = qs(`#${id}`);
  if (!el) {
    return;
  }
  const toneClass =
    tone === 'urgent' ? 'qc-chip-urgent' : tone === 'ghost' ? 'qc-chip-ghost' : tone === 'neutral' ? 'qc-chip-ghost' : 'qc-chip-soft';
  el.className = `qc-chip ${toneClass}`;
  el.textContent = text;
}

function renderTags(id, tags = []) {
  const wrap = qs(`#${id}`);
  if (!wrap) {
    return;
  }
  wrap.innerHTML = '';
  tags.forEach((tag) => {
    const span = document.createElement('span');
    span.className = 'qc-chip qc-chip-ghost';
    span.textContent = tag;
    wrap.appendChild(span);
  });
}

function renderDimensions(dimensions) {
  if (!dimensions) {
    return;
  }
  setTextContent('qc-emotion-score', dimensions.emotion ? `${dimensions.emotion.score}%` : '--');
  setTextContent('qc-quality-score', dimensions.quality ? `${dimensions.quality.score}` : '--');
  setTextContent('qc-satisfaction-score', dimensions.satisfaction ? `${dimensions.satisfaction.score}/5` : '--');
  setTextContent('qc-emotion-score-compact', dimensions.emotion ? `${dimensions.emotion.score}%` : '--');
  setTextContent('qc-quality-score-compact', dimensions.quality ? `${dimensions.quality.score}` : '--');
  setTextContent('qc-satisfaction-score-compact', dimensions.satisfaction ? `${dimensions.satisfaction.score}/5` : '--');
  setTextContent('qc-emotion-label', dimensions.emotion?.label || '--');
  setTextContent('qc-quality-label', dimensions.quality?.label || '--');
  setTextContent('qc-satisfaction-label', dimensions.satisfaction?.label || '--');
  setTextContent('qc-emotion-label-compact', dimensions.emotion?.label || '--');
  setTextContent('qc-quality-label-compact', dimensions.quality?.label || '--');
  setTextContent('qc-satisfaction-label-compact', dimensions.satisfaction?.label || '--');
  setBarWidth('qc-emotion-bar', dimensions.emotion?.bar);
  setBarWidth('qc-quality-bar', dimensions.quality?.bar);
  setBarWidth('qc-satisfaction-bar', dimensions.satisfaction?.bar);
  setBarWidth('qc-emotion-bar-compact', dimensions.emotion?.bar);
  setBarWidth('qc-quality-bar-compact', dimensions.quality?.bar);
  setBarWidth('qc-satisfaction-bar-compact', dimensions.satisfaction?.bar);
}

function setBarWidth(id, value) {
  const bar = qs(`#${id}`);
  if (!bar || value === undefined || value === null) {
    return;
  }
  const safeValue = Math.max(0, Math.min(100, value));
  bar.style.width = `${safeValue}%`;
}

function renderThread(title, thread = []) {
  setTextContent('qc-thread-title', title || '对话节选');
  const container = qs('#qc-thread');
  if (!container) {
    return;
  }
  container.innerHTML = '';
  thread.forEach((msg) => {
    const row = document.createElement('div');
    row.className = 'qc-message';
    row.innerHTML = `
      <div class="text-[11px] text-gray-500 font-semibold">${msg.role}</div>
      <div>
        <div class="text-sm text-gray-800 leading-snug">${msg.text}</div>
        <div class="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
          ${msg.sentiment ? `<span class="tag">${msg.sentiment}</span>` : ''}
          ${msg.tag ? `<span class="tag">${msg.tag}</span>` : ''}
        </div>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderInsights(list = []) {
  const wrap = qs('#qc-insights-list');
  if (!wrap) {
    return;
  }
  wrap.innerHTML = '';
  list.forEach((text) => {
    const row = document.createElement('div');
    row.className = 'qc-insight-row';
    row.innerHTML = `<i class="fa fa-lightbulb-o text-amber-500 mt-0.5"></i><div>${text}</div>`;
    wrap.appendChild(row);
  });
}

function initQcLeanControls() {
  const modeBtns = qsa('[data-qc-mode]');
  const main = qs('.analysis-main');
  if (main) {
    main.classList.add('mode-mixed');
  }

  modeBtns.forEach((btn) => {
    on(btn, 'click', () => {
      const mode = btn.getAttribute('data-qc-mode') || 'mixed';
      modeBtns.forEach((b) => b.classList.toggle('active', b === btn));
      if (main) {
        main.classList.remove('mode-conversation', 'mode-analysis', 'mode-mixed');
        main.classList.add(`mode-${mode}`);
      }
    });
  });
}

function toggleQcLayout(useLean) {
  const lean = qs('#qc-lean-container');
  const classic = qs('#analysis-classic');
  const railMetrics = qs('#rail-card-metrics');
  const railHistory = qs('#rail-card-history');

  if (lean) {
    lean.classList.toggle('hidden', !useLean);
  }
  if (classic) {
    classic.classList.toggle('hidden', useLean);
  }

  if (railMetrics) {
    railMetrics.classList.toggle('hidden', useLean);
  }
  if (railHistory) {
    railHistory.classList.toggle('hidden', useLean);
  }
}

export function openAnalysisPanelClassic() {
  const sidebar = document.querySelector('#right-sidebar');
  if (sidebar) {
    sidebar.classList.add('analysis-restricted');
  }
  toggleQcLayout(false);
  toggleRightSidebar(true);
}
