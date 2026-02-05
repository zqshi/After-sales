import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';
import {
  fetchCurrentUser,
  fetchSessionPermissions,
  fetchRoleList,
  createRole,
  updateRole,
  deleteRole,
  fetchMembers,
  createMember,
  updateMember,
  deleteMember,
  isApiEnabled,
} from '../api.js';

const ROLE_LABELS = {
  admin: '管理员',
  manager: '主管',
  agent: '客服',
};

const ROLE_DESCRIPTIONS = {
  admin: '全局管理与配置',
  manager: '运营与任务管理',
  agent: '一线客服',
};

const PERMISSION_GROUP_LABELS = {
  customers: '客户',
  requirements: '需求',
  tasks: '任务',
  knowledge: '知识',
  conversations: '对话',
  im: 'IM',
  ai: 'AI',
  audit: '审计',
  monitoring: '监控',
  session: '会话',
};

const PERMISSION_ACTION_LABELS = {
  read: '读取',
  write: '写入',
  delete: '删除',
  assign: '分配',
  complete: '完成',
  use: '使用',
};

let permissionGroups = [];
const MANAGE_ROLE_PERMISSION_KEY = 'permissions.roles.manage';
const MANAGE_MEMBER_PERMISSION_KEY = 'permissions.members.manage';
let canManageRoles = false;
let canManageMembers = false;
let currentUserId = null;
let currentUserRole = null;

function formatRoleName(role) {
  return ROLE_LABELS[role] || role || '未知角色';
}

function formatRoleDescription(role) {
  return ROLE_DESCRIPTIONS[role] || '权限角色';
}

function buildPermissionGroups(allPermissions) {
  const grouped = {};
  allPermissions.forEach((key) => {
    const [prefix, action] = key.split('.');
    const groupId = prefix || 'other';
    if (!grouped[groupId]) {
      grouped[groupId] = {
        id: groupId,
        name: PERMISSION_GROUP_LABELS[groupId] || groupId,
        items: [],
      };
    }
    const actionLabel = PERMISSION_ACTION_LABELS[action] || action || key;
    grouped[groupId].items.push({ key, label: actionLabel });
  });

  return Object.values(grouped);
}

function buildPermissionMap(allPermissions, grantedPermissions) {
  const permissions = {};
  const baseKeys = allPermissions.length ? allPermissions : grantedPermissions;
  baseKeys.forEach((key) => {
    permissions[key] = false;
  });
  grantedPermissions.forEach((key) => {
    permissions[key] = true;
  });
  return permissions;
}

function clonePermissionsMap(source) {
  return Object.keys(source || {}).reduce((acc, key) => {
    acc[key] = Boolean(source[key]);
    return acc;
  }, {});
}

function getEnabledPermissionKeys(permissions) {
  return Object.keys(permissions || {}).filter((key) => permissions[key]);
}

function getRoleById(roles, roleId) {
  return roles.find((role) => role.id === roleId);
}

function renderMembers(members, roles, activeId, searchValue) {
  const container = qs('#permissions-member-list');
  if (!container) {
    return;
  }
  container.innerHTML = '';

  if (!members.length) {
    container.innerHTML = '<div class="text-xs text-gray-500">暂无成员信息</div>';
    return;
  }

  const list = members.filter((member) => {
    if (!searchValue) {
      return true;
    }
    const keyword = searchValue.toLowerCase();
    const roleName = getRoleById(roles, member.roleId)?.name || '';
    return (
      (member.name || '').toLowerCase().includes(keyword) ||
      roleName.toLowerCase().includes(keyword) ||
      (member.team || '').toLowerCase().includes(keyword) ||
      (member.badge || '').toLowerCase().includes(keyword)
    );
  });

  list.forEach((member) => {
    const roleName = getRoleById(roles, member.roleId)?.name || '未分配';
    const statusLabel = member.id === currentUserId ? '当前登录' : member.status || '-';
    const canEdit = canManageMembers;
    const actionHtml = canEdit
      ? `
        <button class="permissions-member-edit text-primary hover:text-primary-dark" data-permission="${MANAGE_MEMBER_PERMISSION_KEY}">编辑</button>
        <button class="permissions-member-delete text-red-600 hover:text-red-700" data-permission="${MANAGE_MEMBER_PERMISSION_KEY}">删除</button>
      `
      : '<span class="text-gray-400">-</span>';
    const row = document.createElement('div');
    row.className = 'grid grid-cols-6 gap-2 items-center text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white';
    row.dataset.memberId = member.id;
    row.innerHTML = `
      <div class="font-semibold text-gray-800 truncate">${member.name || member.id || '-'}</div>
      <div class="text-gray-600 truncate">${member.team || '-'}</div>
      <div class="text-gray-600 truncate">${roleName}</div>
      <div class="text-gray-500 truncate">${member.badge || '-'}</div>
      <div class="text-gray-500 truncate">${statusLabel}</div>
      <div class="flex items-center justify-end gap-2">${actionHtml}</div>
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
  if (!roles.length) {
    container.innerHTML = '<div class="text-xs text-gray-500">暂无角色信息</div>';
    return;
  }
  roles.forEach((role) => {
    const item = document.createElement('div');
    item.className = `w-full text-left p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between cursor-pointer ${
      role.id === activeRoleId ? 'ring-1 ring-primary' : ''
    }`;
    item.dataset.roleId = role.id;
    const actionHtml = canManageRoles
      ? `
        <div class="flex items-center gap-2 text-xs">
          <button class="permissions-role-edit text-primary hover:text-primary-dark" data-permission="${MANAGE_ROLE_PERMISSION_KEY}">编辑</button>
          ${
  role.isSystem
    ? '<span class="text-gray-400">系统</span>'
    : '<button class="permissions-role-delete text-red-600 hover:text-red-700" data-permission="permissions.roles.manage">删除</button>'
}
        </div>
      `
      : '';
    item.innerHTML = `
      <div>
        <div class="font-semibold text-gray-800">${role.name}</div>
        <div class="text-gray-500">${role.description || '-'}</div>
      </div>
      ${actionHtml}
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
  if (!roles.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '暂无角色';
    select.appendChild(option);
    return;
  }
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
  if (!roles.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '暂无角色';
    select.appendChild(option);
    return;
  }
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
  if (!roles.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '暂无角色';
    selectEl.appendChild(option);
    return;
  }
  roles.forEach((role) => {
    const option = document.createElement('option');
    option.value = role.id;
    option.textContent = role.name;
    option.selected = role.id === selectedId;
    selectEl.appendChild(option);
  });
}

function renderPermissionGroups(permissions, readOnly) {
  const container = qs('#permissions-group-list');
  if (!container) {
    return;
  }

  container.innerHTML = '';
  if (!permissionGroups.length) {
    container.innerHTML = '<div class="text-xs text-gray-500">暂无权限配置</div>';
    return;
  }
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
        <input type="checkbox" data-permission-key="${item.key}" ${permissions[item.key] ? 'checked' : ''} ${readOnly ? 'disabled' : ''} />
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

  let readOnly = true;
  const loadServerPermissions = async () => {
    if (!isApiEnabled()) {
      showNotification('权限 API 未配置', 'warning');
      return null;
    }
    try {
      const response = await fetchSessionPermissions();
      return response?.data ?? response;
    } catch (err) {
      console.warn('[permissions] Failed to fetch server permissions', err);
      return null;
    }
  };

  const memberTabBtn = qs('#permissions-tab-members');
  const roleTabBtn = qs('#permissions-tab-roles');
  const memberPanel = qs('#permissions-panel-members');
  const rolePanel = qs('#permissions-panel-roles');

  let roles = [];
  let members = [];
  let activeMemberId = null;
  let activeRoleId = null;
  let dirty = false;
  let currentPreviewPermissions = {};
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
    const activeMember = members.find((member) => member.id === activeMemberId) || members[0] || null;
    if (activePanel === 'members' && activeMember) {
      activeRoleId = activeMember.roleId;
    }
    const activeRole = getRoleById(roles, activeRoleId) || roles[0] || null;

    readOnly = !canManageRoles;
    renderRoleList(roles, activeRole?.id);
    renderMembers(members, roles, activeMember?.id, qs('#permissions-member-search')?.value || '');
    renderRoleSelector(roles, activeRole?.id);
    renderMemberRoleSelector(roles, activeMember);
    renderPermissionGroups(activeRole?.permissions || {}, readOnly);
    applyPermissionsToUI(currentPreviewPermissions);

    const saveRoleBtn = qs('#permissions-save-role');
    if (saveRoleBtn && canManageRoles) {
      saveRoleBtn.textContent = dirty ? '保存变更*' : '保存变更';
    }
  };

  const updateEditControls = () => {
    const addMemberBtn = qs('#permissions-add-member');
    const addRoleBtn = qs('#permissions-add-role');
    const saveRoleBtn = qs('#permissions-save-role');
    const resetBtn = qs('#permissions-reset');
    if (addMemberBtn) {
      addMemberBtn.classList.toggle('hidden', !canManageMembers);
    }
    if (addRoleBtn) {
      addRoleBtn.classList.toggle('hidden', !canManageRoles);
    }
    if (saveRoleBtn) {
      saveRoleBtn.classList.toggle('hidden', !canManageRoles);
    }
    if (resetBtn) {
      resetBtn.classList.toggle('hidden', !canManageRoles);
    }

    const roleSelect = qs('#permissions-role-select');
    if (roleSelect) {
      roleSelect.disabled = !canManageRoles;
    }
    const memberRoleSelect = qs('#permissions-member-role');
    if (memberRoleSelect) {
      memberRoleSelect.disabled = !canManageMembers;
    }
  };
  update();
  setActivePanel('members');
  updateEditControls();

  const loadServerState = () => {
    if (!isApiEnabled()) {
      return Promise.resolve([null, null]);
    }
    return Promise.all([fetchCurrentUser(), loadServerPermissions()]);
  };

  loadServerState()
    .then(([currentUserResponse, serverPermissions]) => {
      if (!serverPermissions) {
        return;
      }
      const currentUserPayload = currentUserResponse?.data ?? currentUserResponse;
      const permissionPayload = serverPermissions;
      const role = permissionPayload.role || currentUserPayload?.role || 'agent';
      currentUserRole = role;
      const allPermissions = Array.isArray(permissionPayload.allPermissions) ? permissionPayload.allPermissions : [];
      const grantedPermissions = Array.isArray(permissionPayload.permissions) ? permissionPayload.permissions : [];
      const uiPermissionGroups = Array.isArray(permissionPayload.uiPermissionGroups)
        ? permissionPayload.uiPermissionGroups
        : [];
      const uiPermissions = permissionPayload.uiPermissions && typeof permissionPayload.uiPermissions === 'object'
        ? permissionPayload.uiPermissions
        : null;

      permissionGroups = uiPermissionGroups.length
        ? uiPermissionGroups
        : buildPermissionGroups(allPermissions.length ? allPermissions : grantedPermissions);
      currentUserId = currentUserPayload?.id || null;
      canManageRoles = Boolean(uiPermissions?.[MANAGE_ROLE_PERMISSION_KEY]);
      canManageMembers = Boolean(uiPermissions?.[MANAGE_MEMBER_PERMISSION_KEY]);
      currentPreviewPermissions = uiPermissions || buildPermissionMap(allPermissions, grantedPermissions);
      applyPermissionsToUI(currentPreviewPermissions);
      updateEditControls();

      if (!isApiEnabled()) {
        return;
      }

      return Promise.all([fetchRoleList(), fetchMembers()]).then(([rolesResponse, membersResponse]) => {
        const rolesPayload = rolesResponse?.data ?? rolesResponse;
        const membersPayload = membersResponse?.data ?? membersResponse;
        const loadedRoles = Array.isArray(rolesPayload) ? rolesPayload : rolesPayload?.items || [];
        const loadedMembers = Array.isArray(membersPayload) ? membersPayload : membersPayload?.items || [];

        roles = loadedRoles.map((item) => ({
          id: item.id,
          name: item.name || formatRoleName(item.id),
          description: item.description || formatRoleDescription(item.id),
          permissions: clonePermissionsMap(item.uiPermissions || {}),
          savedPermissions: clonePermissionsMap(item.uiPermissions || {}),
          isSystem: Boolean(item.isSystem),
        }));

        members = loadedMembers.map((item) => ({
          id: item.id,
          name: item.name,
          email: item.email,
          phone: item.phone,
          roleId: item.roleId,
          team: item.team,
          badge: item.badge,
          status: item.status,
        }));

        activeMemberId = currentUserId || members[0]?.id;
        activeRoleId = roles.find((item) => item.id === currentUserRole)?.id || roles[0]?.id;
        dirty = false;
        update();
      });
    })
    .catch(() => {
      showNotification('加载权限数据失败，请稍后重试', 'error');
    });

  if (!observerStarted) {
    const observer = new MutationObserver(() => {
      applyPermissionsToUI(currentPreviewPermissions);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    observerStarted = true;
  }

  const addRoleBtn = qs('#permissions-add-role');
  const roleModal = qs('#permissions-role-modal');
  const roleModalTitle = qs('#permissions-role-modal-title');
  const roleNameInput = qs('#permissions-role-name');
  const roleDescInput = qs('#permissions-role-desc');
  const roleError = qs('#permissions-role-error');
  const roleSave = qs('#permissions-role-save');
  const roleCancel = qs('#permissions-role-cancel');
  const roleClose = qs('#permissions-role-close');
  let editingRoleId = null;

  const closeRoleModal = () => {
    roleModal?.classList.add('hidden');
    roleError?.classList.add('hidden');
    editingRoleId = null;
  };

  const openRoleModal = (role) => {
    if (roleModalTitle) {
      roleModalTitle.textContent = role ? '编辑角色' : '新增角色';
    }
    if (roleNameInput) {
      roleNameInput.value = role?.name || '';
    }
    if (roleDescInput) {
      roleDescInput.value = role?.description || '';
    }
    roleError?.classList.add('hidden');
    roleModal?.classList.remove('hidden');
    editingRoleId = role?.id || null;
  };

  if (addRoleBtn) {
    on(addRoleBtn, 'click', () => {
      if (!canManageRoles) {
        return;
      }
      openRoleModal();
    });
  }

  if (roleCancel) {
    on(roleCancel, 'click', () => closeRoleModal());
  }

  if (roleClose) {
    on(roleClose, 'click', () => closeRoleModal());
  }

  if (roleSave) {
    on(roleSave, 'click', async () => {
      const name = roleNameInput?.value?.trim();
      if (!name) {
        roleError?.classList.remove('hidden');
        return;
      }
      try {
        if (editingRoleId) {
          const response = await updateRole(editingRoleId, {
            name,
            description: roleDescInput?.value?.trim() || '',
          });
          const payload = response?.data ?? response;
          const idx = roles.findIndex((item) => item.id === editingRoleId);
          if (idx >= 0) {
            roles[idx] = {
              ...roles[idx],
              name: payload.name,
              description: payload.description,
            };
          }
        } else {
          const response = await createRole({
            name,
            description: roleDescInput?.value?.trim() || '',
            uiPermissions: [],
          });
          const payload = response?.data ?? response;
          roles = [
            {
              id: payload.id,
              name: payload.name,
              description: payload.description,
              permissions: clonePermissionsMap(payload.uiPermissions || {}),
              savedPermissions: clonePermissionsMap(payload.uiPermissions || {}),
              isSystem: Boolean(payload.isSystem),
            },
            ...roles,
          ];
          activeRoleId = payload.id;
        }
        dirty = false;
        update();
        closeRoleModal();
      } catch (error) {
        showNotification('保存角色失败，请稍后重试', 'error');
      }
    });
  }

  const addMemberBtn = qs('#permissions-add-member');
  const memberModal = qs('#permissions-member-modal');
  const memberModalTitle = qs('#permissions-member-modal-title');
  const deleteModal = qs('#permissions-member-delete-modal');
  const deleteMessage = qs('#permissions-member-delete-message');
  const deleteConfirm = qs('#permissions-member-delete-confirm');
  const deleteCancel = qs('#permissions-member-delete-cancel');
  const deleteClose = qs('#permissions-member-delete-close');
  const memberNameInput = qs('#permissions-member-name');
  const memberEmailInput = qs('#permissions-member-email');
  const memberPhoneInput = qs('#permissions-member-phone');
  const memberTeamInput = qs('#permissions-member-team');
  const memberRoleModal = qs('#permissions-member-role-modal');
  const memberBadgeInput = qs('#permissions-member-badge');
  const memberPasswordInput = qs('#permissions-member-password');
  const memberPasswordField = qs('#permissions-member-password-field');
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
    if (memberModalTitle) {
      memberModalTitle.textContent = member ? '编辑成员' : '新增成员';
    }
    if (memberNameInput) {
      memberNameInput.value = member?.name || '';
    }
    if (memberEmailInput) {
      memberEmailInput.value = member?.email || '';
    }
    if (memberPhoneInput) {
      memberPhoneInput.value = member?.phone || '';
    }
    if (memberTeamInput) {
      memberTeamInput.value = member?.team || '';
    }
    if (memberBadgeInput) {
      memberBadgeInput.value = member?.badge || '';
    }
    if (memberPasswordInput) {
      memberPasswordInput.value = '';
    }
    if (memberPasswordField) {
      memberPasswordField.classList.toggle('hidden', Boolean(member));
    }
    renderRoleOptions(memberRoleModal, roles, member?.roleId || roles[0]?.id);
    memberError?.classList.add('hidden');
    memberModal?.classList.remove('hidden');
    editingMemberId = member?.id || null;
  };

  if (addMemberBtn) {
    on(addMemberBtn, 'click', () => {
      if (!canManageMembers) {
        return;
      }
      openMemberModal();
    });
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
    on(deleteConfirm, 'click', async () => {
      if (!deletingMemberId) {
        return;
      }
      if (deletingMemberId === currentUserId) {
        showNotification('当前登录账号不可删除', 'warning');
        return;
      }
      try {
        await deleteMember(deletingMemberId);
        members = members.filter((item) => item.id !== deletingMemberId);
        if (activeMemberId === deletingMemberId) {
          activeMemberId = members[0]?.id;
        }
        dirty = false;
        update();
        closeDeleteModal();
        showNotification('成员已删除', 'success');
      } catch (error) {
        showNotification('删除成员失败，请稍后重试', 'error');
      }
    });
  }

  if (memberSave) {
    on(memberSave, 'click', async () => {
      const name = memberNameInput?.value?.trim();
      const roleId = memberRoleModal?.value;
      if (!name || !roleId) {
        memberError?.classList.remove('hidden');
        return;
      }
      try {
        if (editingMemberId) {
          const email = memberEmailInput?.value?.trim() || undefined;
          const phone = memberPhoneInput?.value?.trim() || undefined;
          const existingMember = members.find((item) => item.id === editingMemberId);
          if (!email && !phone && !existingMember?.email && !existingMember?.phone) {
            memberError?.classList.remove('hidden');
            showNotification('请填写邮箱或手机号', 'warning');
            return;
          }
          const response = await updateMember(editingMemberId, {
            name,
            email,
            phone,
            roleId,
            team: memberTeamInput?.value?.trim() || '',
            badge: memberBadgeInput?.value?.trim() || '',
          });
          const payload = response?.data ?? response;
          members = members.map((item) => (item.id === editingMemberId ? payload : item));
          activeMemberId = editingMemberId;
        } else {
          const email = memberEmailInput?.value?.trim() || undefined;
          const phone = memberPhoneInput?.value?.trim() || undefined;
          if (!email && !phone) {
            memberError?.classList.remove('hidden');
            showNotification('请填写邮箱或手机号', 'warning');
            return;
          }
          const password = memberPasswordInput?.value?.trim();
          if (!password) {
            memberError?.classList.remove('hidden');
            return;
          }
          const response = await createMember({
            name,
            email,
            phone,
            password,
            roleId,
            team: memberTeamInput?.value?.trim() || '',
            badge: memberBadgeInput?.value?.trim() || '',
          });
          const payload = response?.data ?? response;
          members = [payload, ...members];
          activeMemberId = payload.id;
        }
        dirty = false;
        update();
        closeMemberModal();
      } catch (error) {
        showNotification('保存成员失败，请稍后重试', 'error');
      }
    });
  }

  const memberList = qs('#permissions-member-list');
  if (memberList) {
    on(memberList, 'click', (event) => {
      if (event.target.closest('.permissions-member-edit')) {
        const row = event.target.closest('[data-member-id]');
        const member = members.find((item) => item.id === row?.dataset?.memberId);
        if (member) {
          openMemberModal(member);
        }
        return;
      }
      if (event.target.closest('.permissions-member-delete')) {
        const row = event.target.closest('[data-member-id]');
        const member = members.find((item) => item.id === row?.dataset?.memberId);
        if (!member) {
          return;
        }
        if (member.id === currentUserId) {
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
      const row = event.target.closest('[data-member-id]');
      if (!row) {
        return;
      }
      const memberId = row.dataset.memberId;
      if (!members.find((item) => item.id === memberId)) {
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
      const editBtn = event.target.closest('.permissions-role-edit');
      if (editBtn) {
        const row = event.target.closest('[data-role-id]');
        const role = roles.find((item) => item.id === row?.dataset?.roleId);
        if (role) {
          openRoleModal(role);
        }
        return;
      }
      const deleteBtn = event.target.closest('.permissions-role-delete');
      if (deleteBtn) {
        const row = event.target.closest('[data-role-id]');
        const role = roles.find((item) => item.id === row?.dataset?.roleId);
        if (!role) {
          return;
        }
        if (role.isSystem) {
          showNotification('系统角色不可删除', 'warning');
          return;
        }
        deleteRole(role.id)
          .then(() => {
            roles = roles.filter((item) => item.id !== role.id);
            if (activeRoleId === role.id) {
              activeRoleId = roles[0]?.id;
            }
            dirty = false;
            update();
            showNotification('角色已删除', 'success');
          })
          .catch(() => {
            showNotification('删除角色失败，请稍后重试', 'error');
          });
        return;
      }
      const row = event.target.closest('[data-role-id]');
      if (!row) {
        return;
      }
      activeRoleId = row.dataset.roleId;
      dirty = false;
      update();
    });
  }

  const configPanel = qs('#permissions-config-panel');
  if (configPanel) {
    on(configPanel, 'change', (event) => {
      if (readOnly) {
        return;
      }
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
      if (readOnly) {
        return;
      }
      const role = roles.find((item) => item.id === activeRoleId);
      if (!role) {
        return;
      }
      role.permissions = clonePermissionsMap(role.savedPermissions || {});
      dirty = true;
      update();
    });
  }

  const saveRoleBtn = qs('#permissions-save-role');
  if (saveRoleBtn) {
    on(saveRoleBtn, 'click', async () => {
      if (readOnly) {
        return;
      }
      const role = roles.find((item) => item.id === activeRoleId);
      if (!role) {
        return;
      }
      try {
        const response = await updateRole(role.id, {
          uiPermissions: getEnabledPermissionKeys(role.permissions),
        });
        const payload = response?.data ?? response;
        role.permissions = clonePermissionsMap(payload.uiPermissions || {});
        role.savedPermissions = clonePermissionsMap(payload.uiPermissions || {});
        dirty = false;
        update();
        showNotification('角色权限已更新', 'success');
      } catch (error) {
        showNotification('保存角色权限失败，请稍后重试', 'error');
      }
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
    on(memberRoleSelect, 'change', async (event) => {
      if (!canManageMembers) {
        return;
      }
      const member = members.find((item) => item.id === activeMemberId);
      if (!member) {
        return;
      }
      try {
        const response = await updateMember(member.id, {
          roleId: event.target.value,
        });
        const payload = response?.data ?? response;
        members = members.map((item) => (item.id === member.id ? payload : item));
        dirty = false;
        update();
        showNotification('成员角色已更新', 'success');
      } catch (error) {
        showNotification('更新成员角色失败，请稍后重试', 'error');
      }
    });
  }

  if (memberTabBtn) {
    on(memberTabBtn, 'click', () => setActivePanel('members'));
  }

  if (roleTabBtn) {
    on(roleTabBtn, 'click', () => setActivePanel('roles'));
  }
}
