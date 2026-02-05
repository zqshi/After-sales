import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';
import { toggleRightSidebar } from '../ui/layout.js';
import {
  isApiEnabled,
  actionTask,
  fetchQualityProfile,
} from '../api.js';
import { taskController } from '../presentation/task/TaskController.js';


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
  return qs('.conversation-item.is-active')?.getAttribute('data-id') || null;
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
  const activeConversationId = getActiveConversationId();
  if (activeConversationId) {
    renderQualityDrawer(activeConversationId, false, false);
  }
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
      showNotification(`查看任务详情：${taskTitle}`, 'info');
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

  const render = async (id) => {
    if (!id || !isApiEnabled()) {
      return;
    }
    try {
      const response = await fetchQualityProfile(id);
      const payload = response?.data ?? response;
      if (!payload) {
        return;
      }

      if (scoreEl) {
        scoreEl.textContent = `${payload.score ?? '--'} 分`;
      }
      if (summaryEl) {
        summaryEl.textContent = payload.summary || '暂无质检摘要';
      }

      if (chipsEl) {
        chipsEl.innerHTML = '';
        const dims = payload.dimensions || [];
        dims.forEach((dim) => {
          const chip = document.createElement('span');
          chip.className = 'quality-chip';
          chip.innerHTML = `<strong>${dim.label || '维度'}</strong> ${dim.score || '--'} · ${dim.hint || ''}`;
          chipsEl.appendChild(chip);
        });
      }

      if (actionsEl) {
        actionsEl.innerHTML = '';
        (payload.actions || []).forEach((action) => {
          const item = document.createElement('div');
          item.className = 'quality-action';
          item.innerHTML = `<i class="fa fa-check-circle text-green-500 mr-2"></i>${action}`;
          actionsEl.appendChild(item);
        });
      }
    } catch (err) {
      console.warn('[quality] load failed', err);
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
    showNotification('指令已派发到质检/运营中枢', 'success');
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
      showNotification(`${name}入口已加载`, 'info');
    });
  });
}

function setupTaskConversationFlow() {
  const workspace = qs('#workspace-tasks-tab');
  const qualityView = qs('#task-quality-overview');
  const conversationArea = qs('#task-conversation-area');
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
    if (startBtn) {
      startBtn.textContent = '返回质检概览';
    }
  };
  const closeConversation = () => {
    conversationArea?.classList.add('hidden');
    qualityView?.classList.remove('hidden');
    workspace?.classList.remove('task-conversation-active');
    if (startBtn) {
      startBtn.textContent = '对话驱动任务';
    }
  };

  if (backBtn) {
    on(backBtn, 'click', () => {
      closeConversation();
    });
  }
  if (startBtn) {
    on(startBtn, 'click', () => {
      const isHidden = conversationArea?.classList.contains('hidden');
      if (isHidden) {
        openConversation();
      } else {
        closeConversation();
      }
    });
  }
  qcButtons.forEach((btn) => {
    on(btn, 'click', () => {
      const convId = btn.getAttribute('data-conv-id') || getActiveConversationId();
      if (!convId) {
        showNotification('暂无可用会话', 'warning');
        return;
      }
      renderQualityDrawer(convId, true, true);
    });
  });

  const dispatch = async () => {
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

    // 2. 创建任务并回写结果
    try {
      const intent = inferTaskIntent(text);
      const result = await taskController.createTask({
        title: intent.title,
        description: intent.desc,
        priority: intent.priority,
        type: intent.isLongTerm ? 'long_term' : 'agent_command',
        assigneeId: window.config?.userId,
      });
      const taskId = result?.data?.id || result?.id || `task-${Date.now()}`;
      appendMessage(`已创建任务：${taskId}`, 'agent');
      showNotification('任务已创建', 'success');
      await loadTasksFromApi();
    } catch (err) {
      console.warn('[tasks] create task failed', err);
      appendMessage('任务创建失败，请稍后重试。', 'agent');
      showNotification('任务创建失败', 'error');
    }
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
  if (!isApiEnabled()) {
    showNotification('API 未启用，无法加载质检数据', 'warning');
    return;
  }

  const normalizedConversationId =
    conversationId && conversationId.startsWith('conv-')
      ? getActiveConversationId()
      : conversationId;
  if (!normalizedConversationId) {
    showNotification('暂无可用会话', 'warning');
    return;
  }

  let data = null;
  try {
    const response = await fetchQualityProfile(normalizedConversationId);
    data = response?.data ?? response;
  } catch (err) {
    console.warn('[tasks] fetch quality profile failed', err);
    showNotification('质检数据加载失败', 'warning');
    return;
  }

  if (!data) {
    showNotification('暂无质检数据', 'info');
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
  setTextContent('qc-quality-score', dimensions.quality ? `${dimensions.quality.score}%` : '--');
  setTextContent('qc-satisfaction-score', dimensions.satisfaction ? `${dimensions.satisfaction.score}%` : '--');
  setTextContent('qc-emotion-score-compact', dimensions.emotion ? `${dimensions.emotion.score}%` : '--');
  setTextContent('qc-quality-score-compact', dimensions.quality ? `${dimensions.quality.score}%` : '--');
  setTextContent('qc-satisfaction-score-compact', dimensions.satisfaction ? `${dimensions.satisfaction.score}%` : '--');
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
    if (useLean) {
      lean.style.display = '';
      lean.style.visibility = '';
    } else {
      lean.style.display = 'none';
      lean.style.visibility = 'hidden';
    }
  }
  if (classic) {
    classic.classList.toggle('hidden', useLean);
    if (useLean) {
      classic.style.display = 'none';
      classic.style.visibility = 'hidden';
    } else {
      classic.style.display = '';
      classic.style.visibility = '';
    }
  }

  if (railMetrics) {
    railMetrics.classList.toggle('hidden', useLean);
    railMetrics.style.display = useLean ? 'none' : '';
  }
  if (railHistory) {
    railHistory.classList.toggle('hidden', useLean);
    railHistory.style.display = useLean ? 'none' : '';
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
