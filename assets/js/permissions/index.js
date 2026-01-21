import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';

const STORAGE_KEY = 'demo.permissions.v2';
const CURRENT_MEMBER_ID = 'user-admin';

const permissionGroups = [
  {
    id: 'dock',
    name: 'Dock导航',
    items: [
      { key: 'dock.messages', label: '消息入口' },
      { key: 'dock.messages.dialog', label: '消息-对话' },
      { key: 'dock.messages.tasks', label: '消息-任务' },
      { key: 'dock.knowledge', label: '知识入口' },
      { key: 'dock.tools', label: '工具入口' },
      { key: 'dock.reports', label: '报表入口' },
      { key: 'dock.permissions', label: '权限入口' },
      { key: 'knowledge.management.view', label: '知识管理子页' },
      { key: 'knowledge.application.view', label: '知识应用子页' },
    ],
  },
  {
    id: 'chat-actions',
    name: '对话窗口快捷操作',
    items: [
      { key: 'analysis.panel.open', label: '分析面板' },
      { key: 'chat.mode.auto', label: 'Agent自动' },
      { key: 'chat.mode.supervised', label: 'Agent监督' },
      { key: 'chat.mode.human', label: '人工优先' },
      { key: 'chat.escalate.human', label: '立即交付人工' },
      { key: 'chat.action.emoji', label: '表情' },
      { key: 'chat.action.attachment', label: '附件' },
      { key: 'chat.action.mention', label: '提及' },
      { key: 'chat.action.optimize', label: '话术优化' },
      { key: 'chat.action.send', label: '发送消息' },
      { key: 'ai.reply.adopt', label: '采纳回复建议' },
    ],
  },
  {
    id: 'conversation-actions',
    name: '对话快捷入口',
    items: [
      { key: 'actions.ticket.manage', label: '工单管理' },
      { key: 'actions.reply.suggest', label: '回复建议' },
      { key: 'actions.clarify', label: '问题澄清' },
      { key: 'actions.requirement.detect', label: '需求检测' },
      { key: 'actions.ai.solution', label: 'AI解决方案' },
      { key: 'actions.assist.check', label: '辅助排查' },
      { key: 'actions.ticket.create', label: '创建工单' },
      { key: 'actions.fault.report', label: '生成故障报告' },
      { key: 'requirements.refresh', label: '需求刷新' },
      { key: 'requirements.scan', label: '需求扫描' },
      { key: 'requirements.create', label: '需求创建卡片' },
      { key: 'requirements.ignore', label: '需求忽略' },
      { key: 'requirements.view', label: '需求查看详情' },
    ],
  },
  {
    id: 'tasks',
    name: '任务与工单',
    items: [
      { key: 'tasks.delete', label: '删除任务' },
      { key: 'tasks.conversation.start', label: '对话驱动任务' },
      { key: 'tasks.agent.send', label: '派发给Agent' },
      { key: 'tasks.command.announcement', label: '公告生成' },
      { key: 'tasks.command.daily', label: '每日巡检' },
      { key: 'tasks.command.longterm', label: '长期化' },
    ],
  },
  {
    id: 'knowledge-management',
    name: '知识管理',
    items: [
      { key: 'knowledge.manage.upload', label: '上传文档' },
      { key: 'knowledge.manage.delete', label: '删除文档' },
      { key: 'knowledge.manage.faq.create', label: '新增FAQ' },
      { key: 'knowledge.manage.faq.detect', label: 'FAQ检测' },
      { key: 'knowledge.manage.faq.similar.add', label: '相似问题添加' },
      { key: 'knowledge.manage.faq.similar.generate', label: '相似问题生成' },
      { key: 'knowledge.manage.faq.save', label: 'FAQ保存' },
      { key: 'knowledge.manage.faq.delete', label: 'FAQ删除' },
    ],
  },
  {
    id: 'knowledge-application',
    name: '知识应用',
    items: [
      { key: 'knowledge.application.search', label: '搜索' },
      { key: 'knowledge.application.shortcut', label: '快捷入口' },
      { key: 'knowledge.application.copy', label: '复制内容' },
    ],
  },
  {
    id: 'tools',
    name: '工具中心',
    items: [
      { key: 'tools.system.monitor', label: '服务状态监控' },
      { key: 'tools.system.database', label: '数据库管理' },
      { key: 'tools.system.permissions', label: '用户权限管理' },
      { key: 'tools.system.backup', label: '数据备份' },
      { key: 'tools.system.logs', label: '错误日志分析' },
      { key: 'tools.system.settings', label: '系统配置' },
      { key: 'tools.quick.notify', label: '发送系统通知' },
      { key: 'tools.quick.ticket', label: '创建事件工单' },
      { key: 'tools.quick.escalate', label: '升级问题' },
      { key: 'tools.quick.report', label: '生成报告' },
    ],
  },
  {
    id: 'reports-quality',
    name: '报表与质检',
    items: [
      { key: 'reports.view', label: '报表查看' },
      { key: 'quality.view.mixed', label: '质检综合视图' },
      { key: 'quality.view.analysis', label: '质检分析视图' },
      { key: 'quality.view.conversation', label: '对话复盘视图' },
      { key: 'quality.action.report', label: '生成质检报告' },
      { key: 'quality.action.suggest', label: '推送优化建议' },
      { key: 'quality.action.followup', label: '服务回访' },
      { key: 'quality.action.review', label: '标记复盘任务' },
      { key: 'quality.conversation.open', label: '对话质检' },
      { key: 'quality.overview.back', label: '返回质检概览' },
    ],
  },
  {
    id: 'customer',
    name: '客户信息',
    items: [
      { key: 'customer.detail.open', label: '客户详情' },
      { key: 'customer.history.view', label: '历史对话记录' },
    ],
  },
];

const roleTemplates = [
  {
    id: 'role-admin',
    name: '管理员',
    description: '全局管理与配置',
    base: 'admin',
  },
  {
    id: 'role-manager',
    name: '主管',
    description: '报表/质检管理',
    base: 'manager',
  },
  {
    id: 'role-agent',
    name: '客服',
    description: '对话与知识应用',
    base: 'agent',
  },
];

const memberTemplates = [
  {
    id: 'user-admin',
    name: '李倩',
    roleId: 'role-admin',
    team: '平台团队',
    badge: '全局权限',
  },
  {
    id: 'user-manager',
    name: '王震',
    roleId: 'role-manager',
    team: '运营组',
    badge: '报表/质检',
  },
  {
    id: 'user-agent',
    name: '陈宁',
    roleId: 'role-agent',
    team: '一线客服',
    badge: '对话/知识应用',
  },
];

const basePermissions = {
  admin: () => buildAllPermissions(true),
  manager: () => buildFromKeys([
    'dock.messages',
    'dock.messages.dialog',
    'dock.messages.tasks',
    'dock.reports',
    'reports.view',
    'quality.view.mixed',
    'quality.view.analysis',
    'quality.view.conversation',
    'quality.action.report',
    'quality.action.suggest',
    'quality.action.followup',
    'quality.action.review',
    'quality.conversation.open',
    'customer.detail.open',
    'customer.history.view',
    'analysis.panel.open',
    'chat.action.emoji',
    'chat.action.attachment',
    'chat.action.mention',
    'chat.action.send',
  ]),
  agent: () => buildFromKeys([
    'dock.messages',
    'dock.messages.dialog',
    'dock.messages.tasks',
    'dock.knowledge',
    'knowledge.application.view',
    'knowledge.application.search',
    'knowledge.application.shortcut',
    'knowledge.application.copy',
    'analysis.panel.open',
    'chat.mode.auto',
    'chat.mode.supervised',
    'chat.mode.human',
    'chat.action.emoji',
    'chat.action.attachment',
    'chat.action.mention',
    'chat.action.optimize',
    'chat.action.send',
    'ai.reply.adopt',
    'actions.reply.suggest',
    'actions.clarify',
    'actions.requirement.detect',
    'actions.ai.solution',
    'actions.assist.check',
    'actions.ticket.create',
    'requirements.refresh',
    'requirements.scan',
    'requirements.create',
    'requirements.ignore',
    'requirements.view',
  ]),
};

function getAllPermissionKeys() {
  return permissionGroups.flatMap((group) => group.items.map((item) => item.key));
}

function buildAllPermissions(enabled) {
  const permissions = {};
  getAllPermissionKeys().forEach((key) => {
    permissions[key] = enabled;
  });
  return permissions;
}

function buildFromKeys(keys) {
  const permissions = buildAllPermissions(false);
  keys.forEach((key) => {
    permissions[key] = true;
  });
  return permissions;
}

function hydrateData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.roles && parsed?.members) {
        return parsed;
      }
    } catch (err) {
      console.warn('[permissions] Failed to parse stored data', err);
    }
  }

  const roles = roleTemplates.map((role) => ({
    ...role,
    permissions: basePermissions[role.base] ? basePermissions[role.base]() : buildAllPermissions(false),
  }));

  const members = memberTemplates.map((member) => ({
    ...member,
  }));

  return { roles, members };
}

function persistData(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function getRoleById(roles, roleId) {
  return roles.find((role) => role.id === roleId);
}

function getMemberPermissions(members, roles, memberId) {
  const member = members.find((item) => item.id === memberId);
  if (!member) {
    return buildAllPermissions(false);
  }
  const role = getRoleById(roles, member.roleId);
  return role?.permissions || buildAllPermissions(false);
}

function renderMembers(members, roles, activeId, searchValue) {
  const container = qs('#permissions-member-list');
  if (!container) {
    return;
  }
  container.innerHTML = '';

  const list = members.filter((member) => {
    if (!searchValue) {
      return true;
    }
    const keyword = searchValue.toLowerCase();
    return (
      member.name.toLowerCase().includes(keyword) ||
      member.role.toLowerCase().includes(keyword) ||
      member.team.toLowerCase().includes(keyword)
    );
  });

  list.forEach((member) => {
    const roleName = getRoleById(roles, member.roleId)?.name || '未分配';
    const row = document.createElement('div');
    row.className = 'grid grid-cols-6 gap-2 items-center text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white';
    row.dataset.memberId = member.id;
    row.innerHTML = `
      <div class="font-semibold text-gray-800 truncate">${member.name}</div>
      <div class="text-gray-600 truncate">${member.team || '-'}</div>
      <div class="text-gray-600 truncate">${roleName}</div>
      <div class="text-gray-500 truncate">${member.badge || '-'}</div>
      <div class="text-gray-500 truncate">${member.id === CURRENT_MEMBER_ID ? '当前登录' : '-'}</div>
      <div class="flex items-center justify-end gap-2">
        <button class="permissions-member-edit text-primary hover:text-primary-dark">编辑</button>
        <button class="permissions-member-delete text-red-600 hover:text-red-700">删除</button>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderRoleList(roles, activeRoleId) {
  const container = qs('#permissions-role-list');
  if (!container) {
    return;
  }
  container.innerHTML = '';
  roles.forEach((role) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `w-full text-left p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between ${
      role.id === activeRoleId ? 'ring-1 ring-primary' : ''
    }`;
    item.dataset.roleId = role.id;
    item.innerHTML = `
      <div>
        <div class="font-semibold text-gray-800">${role.name}</div>
        <div class="text-gray-500">${role.description}</div>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderRoleSelector(roles, activeRoleId) {
  const select = qs('#permissions-role-select');
  if (!select) {
    return;
  }
  select.innerHTML = '';
  roles.forEach((role) => {
    const option = document.createElement('option');
    option.value = role.id;
    option.textContent = role.name;
    option.selected = role.id === activeRoleId;
    select.appendChild(option);
  });
}

function renderMemberRoleSelector(roles, member) {
  const select = qs('#permissions-member-role');
  if (!select || !member) {
    return;
  }
  select.innerHTML = '';
  roles.forEach((role) => {
    const option = document.createElement('option');
    option.value = role.id;
    option.textContent = role.name;
    option.selected = role.id === member.roleId;
    select.appendChild(option);
  });
}

function renderRoleOptions(selectEl, roles, selectedId) {
  if (!selectEl) {
    return;
  }
  selectEl.innerHTML = '';
  roles.forEach((role) => {
    const option = document.createElement('option');
    option.value = role.id;
    option.textContent = role.name;
    option.selected = role.id === selectedId;
    selectEl.appendChild(option);
  });
}

function renderPermissionGroups(permissions) {
  const container = qs('#permissions-group-list');
  if (!container) {
    return;
  }

  container.innerHTML = '';
  permissionGroups.forEach((group) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'p-3 border border-gray-200 rounded-lg bg-white';
    groupEl.innerHTML = `
      <div class="font-semibold text-gray-700 mb-2">${group.name}</div>
      <div class="grid grid-cols-2 gap-2" data-group="${group.id}"></div>
    `;

    const listEl = groupEl.querySelector(`[data-group="${group.id}"]`);
    group.items.forEach((item) => {
      const label = document.createElement('label');
      label.className = 'flex items-center gap-2';
      label.innerHTML = `
        <input type="checkbox" data-permission-key="${item.key}" ${permissions[item.key] ? 'checked' : ''} />
        ${item.label}
      `;
      listEl.appendChild(label);
    });

    container.appendChild(groupEl);
  });
}

function applyPermissionsToUI(permissions) {
  const elements = qsa('[data-permission]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-permission');
    if (!key) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(permissions, key)) {
      return;
    }
    const allowed = Boolean(permissions[key]);
    const mode = el.getAttribute('data-permission-mode') || 'hide';

    if (!allowed) {
      if (mode === 'disable') {
        const wasHidden = el.dataset.permissionState === 'hidden';
        el.setAttribute('aria-disabled', 'true');
        el.classList.add('permission-disabled');
        el.dataset.permissionState = 'disabled';
        if ('disabled' in el) {
          el.disabled = true;
        }
        if (wasHidden) {
          el.classList.remove('hidden');
        }
      } else {
        const hadHidden = el.classList.contains('hidden');
        if (!hadHidden) {
          el.classList.add('hidden');
          el.dataset.permissionState = 'hidden';
        }
      }
    } else {
      if (el.dataset.permissionState === 'hidden') {
        el.classList.remove('hidden');
        delete el.dataset.permissionState;
      }
      if (el.dataset.permissionState === 'disabled') {
        el.classList.remove('permission-disabled');
        if ('disabled' in el) {
          el.disabled = false;
        }
        el.removeAttribute('aria-disabled');
        delete el.dataset.permissionState;
      }
    }
  });

  const activeDock = qs('.dock-btn.dock-active');
  if (activeDock && activeDock.classList.contains('hidden') && activeDock.dataset.dockTab !== 'permissions') {
    const fallback = qs('[data-dock-tab="messages"]');
    fallback?.click();
  }
}

export function initPermissionManager() {
  const app = qs('#permissions-app');
  if (!app) {
    return;
  }

  const memberTabBtn = qs('#permissions-tab-members');
  const roleTabBtn = qs('#permissions-tab-roles');
  const memberPanel = qs('#permissions-panel-members');
  const rolePanel = qs('#permissions-panel-roles');

  let data = hydrateData();
  let { roles, members } = data;
  let activeMemberId = members[0]?.id;
  let activeRoleId = roles[0]?.id;
  let dirty = false;
  let currentPreviewPermissions = getMemberPermissions(members, roles, CURRENT_MEMBER_ID);
  let observerStarted = false;

  let activePanel = 'members';
  const setActivePanel = (panel) => {
    activePanel = panel;
    if (panel === 'roles') {
      rolePanel?.classList.remove('hidden');
      memberPanel?.classList.add('hidden');
      roleTabBtn?.classList.add('tab-active');
      memberTabBtn?.classList.remove('tab-active');
    } else {
      memberPanel?.classList.remove('hidden');
      rolePanel?.classList.add('hidden');
      memberTabBtn?.classList.add('tab-active');
      roleTabBtn?.classList.remove('tab-active');
    }
  };

  const update = () => {
    const activeMember = members.find((member) => member.id === activeMemberId) || members[0];
    const currentMember = members.find((member) => member.id === CURRENT_MEMBER_ID) || members[0];
    if (activePanel === 'members' && activeMember) {
      activeRoleId = activeMember.roleId;
    }
    const activeRole = getRoleById(roles, activeRoleId) || roles[0];

    renderRoleList(roles, activeRole?.id);
    renderMembers(members, roles, activeMember?.id, qs('#permissions-member-search')?.value || '');
    renderRoleSelector(roles, activeRole?.id);
    renderMemberRoleSelector(roles, activeMember);
    renderPermissionGroups(activeRole?.permissions || buildAllPermissions(false));
    currentPreviewPermissions = getMemberPermissions(members, roles, currentMember?.id);
    applyPermissionsToUI(currentPreviewPermissions);

    const saveBtn = qs('#permissions-save');
    if (saveBtn) {
      saveBtn.textContent = dirty ? '保存变更*' : '保存变更';
    }
  };

  update();
  setActivePanel('members');

  if (!observerStarted) {
    const observer = new MutationObserver(() => {
      applyPermissionsToUI(currentPreviewPermissions);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    observerStarted = true;
  }

  const memberList = qs('#permissions-member-list');
  if (memberList) {
    on(memberList, 'click', (event) => {
      const row = event.target.closest('[data-member-id]');
      if (!row) {
        return;
      }
      const memberId = row.dataset.memberId;
      const member = members.find((item) => item.id === memberId);
      if (!member) {
        return;
      }
      if (event.target.closest('.permissions-member-edit')) {
        openMemberModal(member);
        return;
      }
      if (event.target.closest('.permissions-member-delete')) {
        if (member.id === CURRENT_MEMBER_ID) {
          showNotification('当前登录账号不可删除', 'warning');
          return;
        }
        deletingMemberId = member.id;
        if (deleteMessage) {
          deleteMessage.textContent = `确认删除成员「${member.name}」？删除后不可恢复。`;
        }
        deleteModal?.classList.remove('hidden');
        return;
      }
      activeMemberId = memberId;
      dirty = false;
      update();
    });
  }

  const roleList = qs('#permissions-role-list');
  if (roleList) {
    on(roleList, 'click', (event) => {
      const button = event.target.closest('[data-role-id]');
      if (!button) {
        return;
      }
      activeRoleId = button.dataset.roleId;
      dirty = false;
      update();
    });
  }

  const searchInput = qs('#permissions-member-search');
  if (searchInput) {
    on(searchInput, 'input', () => update());
  }

  const roleSelect = qs('#permissions-role-select');
  if (roleSelect) {
    on(roleSelect, 'change', (event) => {
      activeRoleId = event.target.value;
      dirty = false;
      update();
    });
  }

  const memberRoleSelect = qs('#permissions-member-role');
  if (memberRoleSelect) {
    on(memberRoleSelect, 'change', (event) => {
      const member = members.find((item) => item.id === activeMemberId);
      if (!member) {
        return;
      }
      member.roleId = event.target.value;
      dirty = true;
      update();
    });
  }

  const configPanel = qs('#permissions-config-panel');
  if (configPanel) {
    on(configPanel, 'change', (event) => {
      const target = event.target;
      if (!target || target.type !== 'checkbox') {
        return;
      }
      const key = target.getAttribute('data-permission-key');
      if (!key) {
        return;
      }
      const role = roles.find((item) => item.id === activeRoleId);
      if (!role) {
        return;
      }
      role.permissions[key] = target.checked;
      dirty = true;
      update();
    });
  }

  const resetBtn = qs('#permissions-reset');
  if (resetBtn) {
    on(resetBtn, 'click', () => {
      const role = roles.find((item) => item.id === activeRoleId);
      if (!role) {
        return;
      }
      role.permissions = basePermissions[role.base] ? basePermissions[role.base]() : buildAllPermissions(false);
      dirty = true;
      update();
    });
  }

  const saveBtn = qs('#permissions-save');
  if (saveBtn) {
    on(saveBtn, 'click', () => {
      persistData({ roles, members });
      dirty = false;
      update();
    });
  }

  const saveRoleBtn = qs('#permissions-save-role');
  if (saveRoleBtn) {
    on(saveRoleBtn, 'click', () => {
      persistData({ roles, members });
      dirty = false;
      update();
    });
  }

  const addRoleBtn = qs('#permissions-add-role');
  const roleModal = qs('#permissions-role-modal');
  const roleNameInput = qs('#permissions-role-name');
  const roleDescInput = qs('#permissions-role-desc');
  const roleError = qs('#permissions-role-error');
  const roleSave = qs('#permissions-role-save');
  const roleCancel = qs('#permissions-role-cancel');
  const roleClose = qs('#permissions-role-close');

  const closeRoleModal = () => {
    roleModal?.classList.add('hidden');
    roleError?.classList.add('hidden');
  };

  const openRoleModal = () => {
    if (roleNameInput) roleNameInput.value = '';
    if (roleDescInput) roleDescInput.value = '';
    roleError?.classList.add('hidden');
    roleModal?.classList.remove('hidden');
  };

  if (addRoleBtn) {
    on(addRoleBtn, 'click', () => openRoleModal());
  }

  if (roleCancel) {
    on(roleCancel, 'click', () => closeRoleModal());
  }

  if (roleClose) {
    on(roleClose, 'click', () => closeRoleModal());
  }

  if (roleSave) {
    on(roleSave, 'click', () => {
      const name = roleNameInput?.value?.trim();
      if (!name) {
        roleError?.classList.remove('hidden');
        return;
      }
      const role = {
        id: `role-custom-${Date.now()}`,
        name,
        description: roleDescInput?.value?.trim() || '自定义权限组合',
        base: 'custom',
        permissions: buildAllPermissions(false),
      };
      roles = [role, ...roles];
      activeRoleId = role.id;
      dirty = true;
      update();
      closeRoleModal();
    });
  }

  const addBtn = qs('#permissions-add-member');
  const memberModal = qs('#permissions-member-modal');
  const deleteModal = qs('#permissions-member-delete-modal');
  const deleteMessage = qs('#permissions-member-delete-message');
  const deleteConfirm = qs('#permissions-member-delete-confirm');
  const deleteCancel = qs('#permissions-member-delete-cancel');
  const deleteClose = qs('#permissions-member-delete-close');
  const memberNameInput = qs('#permissions-member-name');
  const memberTeamInput = qs('#permissions-member-team');
  const memberRoleModal = qs('#permissions-member-role-modal');
  const memberBadgeInput = qs('#permissions-member-badge');
  const memberError = qs('#permissions-member-error');
  const memberSave = qs('#permissions-member-save');
  const memberCancel = qs('#permissions-member-cancel');
  const memberClose = qs('#permissions-member-close');
  let editingMemberId = null;
  let deletingMemberId = null;

  const closeMemberModal = () => {
    memberModal?.classList.add('hidden');
    memberError?.classList.add('hidden');
    editingMemberId = null;
  };

  const closeDeleteModal = () => {
    deleteModal?.classList.add('hidden');
    deletingMemberId = null;
  };

  const openMemberModal = (member) => {
    if (memberNameInput) memberNameInput.value = '';
    if (memberTeamInput) memberTeamInput.value = '';
    if (memberBadgeInput) memberBadgeInput.value = '';
    renderRoleOptions(memberRoleModal, roles, roles[0]?.id);
    memberError?.classList.add('hidden');
    memberModal?.classList.remove('hidden');
    editingMemberId = null;
    if (member) {
      if (memberNameInput) memberNameInput.value = member.name || '';
      if (memberTeamInput) memberTeamInput.value = member.team || '';
      if (memberBadgeInput) memberBadgeInput.value = member.badge || '';
      renderRoleOptions(memberRoleModal, roles, member.roleId);
      editingMemberId = member.id;
    }
  };

  if (addBtn) {
    on(addBtn, 'click', () => openMemberModal());
  }

  if (memberCancel) {
    on(memberCancel, 'click', () => closeMemberModal());
  }

  if (memberClose) {
    on(memberClose, 'click', () => closeMemberModal());
  }

  if (deleteCancel) {
    on(deleteCancel, 'click', () => closeDeleteModal());
  }

  if (deleteClose) {
    on(deleteClose, 'click', () => closeDeleteModal());
  }

  if (deleteConfirm) {
    on(deleteConfirm, 'click', () => {
      if (!deletingMemberId) {
        return;
      }
      members = members.filter((item) => item.id !== deletingMemberId);
      if (activeMemberId === deletingMemberId) {
        activeMemberId = members[0]?.id;
      }
      dirty = true;
      update();
      closeDeleteModal();
      showNotification('成员已删除', 'success');
    });
  }

  if (memberSave) {
    on(memberSave, 'click', () => {
      const name = memberNameInput?.value?.trim();
      const roleId = memberRoleModal?.value;
      if (!name || !roleId) {
        memberError?.classList.remove('hidden');
        return;
      }
      if (editingMemberId) {
        const member = members.find((item) => item.id === editingMemberId);
        if (!member) {
          return;
        }
        member.name = name;
        member.roleId = roleId;
        member.team = memberTeamInput?.value?.trim() || '未分配';
        member.badge = memberBadgeInput?.value?.trim() || '自定义权限';
        activeMemberId = member.id;
      } else {
        const member = {
          id: `user-custom-${Date.now()}`,
          name,
          roleId,
          team: memberTeamInput?.value?.trim() || '未分配',
          badge: memberBadgeInput?.value?.trim() || '自定义权限',
        };
        members = [member, ...members];
        activeMemberId = member.id;
      }
      dirty = true;
      update();
      closeMemberModal();
    });
  }

  if (memberTabBtn) {
    on(memberTabBtn, 'click', () => setActivePanel('members'));
  }

  if (roleTabBtn) {
    on(roleTabBtn, 'click', () => setActivePanel('roles'));
  }
}
