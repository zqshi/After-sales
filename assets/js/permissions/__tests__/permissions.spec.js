import { describe, it, expect, beforeEach, vi } from 'vitest';

const showNotification = vi.fn();
const fetchCurrentUser = vi.fn();
const fetchSessionPermissions = vi.fn();
const fetchRoleList = vi.fn();
const createRole = vi.fn();
const updateRole = vi.fn();
const deleteRole = vi.fn();
const fetchMembers = vi.fn();
const createMember = vi.fn();
const updateMember = vi.fn();
const deleteMember = vi.fn();
const isApiEnabled = vi.fn();

vi.mock('../../core/notifications.js', () => ({
  showNotification: (...args) => showNotification(...args),
}));

vi.mock('../../api.js', () => ({
  fetchCurrentUser: (...args) => fetchCurrentUser(...args),
  fetchSessionPermissions: (...args) => fetchSessionPermissions(...args),
  fetchRoleList: (...args) => fetchRoleList(...args),
  createRole: (...args) => createRole(...args),
  updateRole: (...args) => updateRole(...args),
  deleteRole: (...args) => deleteRole(...args),
  fetchMembers: (...args) => fetchMembers(...args),
  createMember: (...args) => createMember(...args),
  updateMember: (...args) => updateMember(...args),
  deleteMember: (...args) => deleteMember(...args),
  isApiEnabled: () => isApiEnabled(),
}));

const add = (tag, id, parent = document.body) => {
  const el = document.createElement(tag);
  if (id) {
    el.id = id;
  }
  parent.appendChild(el);
  return el;
};

const setupDom = () => {
  document.body.innerHTML = '';
  const app = add('div', 'permissions-app');
  app.appendChild(document.createElement('div')).id = 'permissions-panel-members';
  app.appendChild(document.createElement('div')).id = 'permissions-panel-roles';

  add('button', 'permissions-tab-members');
  add('button', 'permissions-tab-roles');

  add('div', 'permissions-member-list');
  add('div', 'permissions-role-list');
  add('div', 'permissions-group-list');
  const configPanel = add('div', 'permissions-config-panel');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.setAttribute('data-permission-key', 'tasks.read');
  configPanel.appendChild(checkbox);

  add('select', 'permissions-role-select');
  add('select', 'permissions-member-role');
  add('input', 'permissions-member-search');

  add('button', 'permissions-add-role');
  add('button', 'permissions-save-role');
  add('button', 'permissions-reset');
  add('button', 'permissions-add-member');

  add('div', 'permissions-role-modal');
  add('div', 'permissions-role-modal-title');
  add('input', 'permissions-role-name');
  add('input', 'permissions-role-desc');
  add('div', 'permissions-role-error');
  add('button', 'permissions-role-save');
  add('button', 'permissions-role-cancel');
  add('button', 'permissions-role-close');

  add('div', 'permissions-member-modal');
  add('div', 'permissions-member-modal-title');
  add('div', 'permissions-member-delete-modal');
  add('div', 'permissions-member-delete-message');
  add('button', 'permissions-member-delete-confirm');
  add('button', 'permissions-member-delete-cancel');
  add('button', 'permissions-member-delete-close');
  add('input', 'permissions-member-name');
  add('input', 'permissions-member-email');
  add('input', 'permissions-member-phone');
  add('input', 'permissions-member-team');
  add('select', 'permissions-member-role-modal');
  add('input', 'permissions-member-badge');
  add('input', 'permissions-member-password');
  const pwdField = add('div', 'permissions-member-password-field');
  pwdField.classList.add('hidden');
  add('div', 'permissions-member-error');
  add('button', 'permissions-member-save');
  add('button', 'permissions-member-cancel');
  add('button', 'permissions-member-close');

  const permissionBtn = document.createElement('button');
  permissionBtn.setAttribute('data-permission', 'tasks.read');
  permissionBtn.setAttribute('data-permission-mode', 'hide');
  document.body.appendChild(permissionBtn);

  const permissionDisableBtn = document.createElement('button');
  permissionDisableBtn.setAttribute('data-permission', 'tasks.delete');
  permissionDisableBtn.setAttribute('data-permission-mode', 'disable');
  document.body.appendChild(permissionDisableBtn);

  const dockActive = document.createElement('button');
  dockActive.className = 'dock-btn dock-active hidden';
  dockActive.dataset.dockTab = 'tasks';
  document.body.appendChild(dockActive);
  const dockFallback = document.createElement('button');
  dockFallback.className = 'dock-btn';
  dockFallback.dataset.dockTab = 'messages';
  dockFallback.click = vi.fn();
  document.body.appendChild(dockFallback);
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('permissions manager', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDom();
    showNotification.mockReset();
    fetchCurrentUser.mockReset();
    fetchSessionPermissions.mockReset();
    fetchRoleList.mockReset();
    createRole.mockReset();
    updateRole.mockReset();
    deleteRole.mockReset();
    fetchMembers.mockReset();
    createMember.mockReset();
    updateMember.mockReset();
    deleteMember.mockReset();
    isApiEnabled.mockReset();
  });

  it('loads roles/members and applies permissions to UI', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchCurrentUser.mockResolvedValue({ data: { id: 'm1', role: 'admin' } });
    fetchSessionPermissions.mockResolvedValue({
      role: 'admin',
      allPermissions: ['tasks.read', 'tasks.delete'],
      permissions: ['tasks.read'],
      uiPermissions: {
        'permissions.roles.manage': true,
        'permissions.members.manage': true,
        'tasks.read': false,
        'tasks.delete': false,
      },
    });
    fetchRoleList.mockResolvedValue({
      items: [
        { id: 'admin', name: '管理员', description: '全局', uiPermissions: { 'tasks.read': true } },
        { id: 'agent', name: '客服', description: '一线', uiPermissions: { 'tasks.read': false } },
      ],
    });
    fetchMembers.mockResolvedValue({
      items: [
        { id: 'm1', name: 'Alice', roleId: 'admin', team: 'A', badge: 'Lead', status: 'active' },
        { id: 'm2', name: 'Bob', roleId: 'agent', team: 'B', badge: 'New', status: 'active' },
      ],
    });

    const { initPermissionManager } = await import('../index.js');
    initPermissionManager();
    await flushPromises();
    await flushPromises();

    expect(document.querySelector('#permissions-role-list').textContent).toContain('管理员');
    expect(document.querySelector('#permissions-member-list').textContent).toContain('Alice');

    const hideBtn = document.querySelector('[data-permission="tasks.read"]');
    expect(hideBtn.classList.contains('hidden')).toBe(true);
    const disableBtn = document.querySelector('[data-permission="tasks.delete"]');
    expect(disableBtn.classList.contains('permission-disabled')).toBe(true);
  });

  it('supports role CRUD and permission updates', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchCurrentUser.mockResolvedValue({ data: { id: 'm1', role: 'admin' } });
    fetchSessionPermissions.mockResolvedValue({
      role: 'admin',
      allPermissions: ['tasks.read'],
      permissions: ['tasks.read'],
      uiPermissions: {
        'permissions.roles.manage': true,
        'permissions.members.manage': true,
        'tasks.read': true,
      },
    });
    fetchRoleList.mockResolvedValue({
      items: [
        { id: 'admin', name: '管理员', description: '全局', uiPermissions: { 'tasks.read': true }, isSystem: false },
      ],
    });
    fetchMembers.mockResolvedValue({ items: [] });

    const { initPermissionManager } = await import('../index.js');
    initPermissionManager();
    await flushPromises();
    await flushPromises();

    document.querySelector('#permissions-add-role').click();
    document.querySelector('#permissions-role-name').value = '新角色';
    document.querySelector('#permissions-role-desc').value = '描述';
    createRole.mockResolvedValue({ id: 'role-1', name: '新角色', description: '描述', uiPermissions: [] });
    document.querySelector('#permissions-role-save').click();
    await flushPromises();

    expect(createRole).toHaveBeenCalled();
    expect(document.querySelector('#permissions-role-list').textContent).toContain('新角色');

    const editBtn = document.querySelector('.permissions-role-edit');
    editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.querySelector('#permissions-role-name').value = '管理员-更新';
    updateRole.mockResolvedValue({ id: 'admin', name: '管理员-更新', description: '全局' });
    document.querySelector('#permissions-role-save').click();
    await flushPromises();
    expect(updateRole).toHaveBeenCalled();

    const checkbox = document.querySelector('#permissions-config-panel [data-permission-key]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    const saveBtn = document.querySelector('#permissions-save-role');
    expect(saveBtn.textContent).toContain('*');

    deleteRole.mockResolvedValue({});
    const deleteBtn = document.querySelector('.permissions-role-delete');
    deleteBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(deleteRole).toHaveBeenCalled();
  });

  it('supports member CRUD', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchCurrentUser.mockResolvedValue({ data: { id: 'm1', role: 'admin' } });
    fetchSessionPermissions.mockResolvedValue({
      role: 'admin',
      allPermissions: ['tasks.read'],
      permissions: ['tasks.read'],
      uiPermissions: {
        'permissions.roles.manage': true,
        'permissions.members.manage': true,
        'tasks.read': true,
      },
    });
    fetchRoleList.mockResolvedValue({ items: [{ id: 'admin', name: '管理员', uiPermissions: { 'tasks.read': true } }] });
    fetchMembers.mockResolvedValue({ items: [{ id: 'm1', name: 'Alice', roleId: 'admin', status: 'active' }] });

    const { initPermissionManager } = await import('../index.js');
    initPermissionManager();
    await flushPromises();
    await flushPromises();

    document.querySelector('#permissions-add-member').click();
    document.querySelector('#permissions-member-name').value = 'Bob';
    document.querySelector('#permissions-member-email').value = 'bob@example.com';
    document.querySelector('#permissions-member-password').value = 'pwd';
    document.querySelector('#permissions-member-role-modal').innerHTML = '<option value="admin">admin</option>';
    createMember.mockResolvedValue({ id: 'm2', name: 'Bob', roleId: 'admin', status: 'active' });
    document.querySelector('#permissions-member-save').click();
    await flushPromises();
    expect(createMember).toHaveBeenCalled();

    const deleteBtn = document.querySelector('.permissions-member-delete');
    if (deleteBtn) {
      deleteBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    deleteMember.mockResolvedValue({});
    document.querySelector('#permissions-member-delete-confirm').click();
    await flushPromises();
    expect(deleteMember).toHaveBeenCalled();
  });

  it('blocks role save when name missing', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchCurrentUser.mockResolvedValue({ data: { id: 'm1', role: 'admin' } });
    fetchSessionPermissions.mockResolvedValue({
      role: 'admin',
      allPermissions: ['tasks.read'],
      permissions: ['tasks.read'],
      uiPermissions: { 'permissions.roles.manage': true, 'permissions.members.manage': true, 'tasks.read': true },
    });
    fetchRoleList.mockResolvedValue({ items: [{ id: 'admin', name: '管理员', uiPermissions: { 'tasks.read': true } }] });
    fetchMembers.mockResolvedValue({ items: [] });

    const { initPermissionManager } = await import('../index.js');
    initPermissionManager();
    await flushPromises();
    await flushPromises();

    document.querySelector('#permissions-add-role').click();
    document.querySelector('#permissions-role-name').value = '';
    document.querySelector('#permissions-role-save').click();

    expect(createRole).not.toHaveBeenCalled();
    expect(document.querySelector('#permissions-role-error').classList.contains('hidden')).toBe(false);
  });

  it('prevents deleting system role', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchCurrentUser.mockResolvedValue({ data: { id: 'm1', role: 'admin' } });
    fetchSessionPermissions.mockResolvedValue({
      role: 'admin',
      allPermissions: ['tasks.read'],
      permissions: ['tasks.read'],
      uiPermissions: { 'permissions.roles.manage': true, 'permissions.members.manage': true, 'tasks.read': true },
    });
    fetchRoleList.mockResolvedValue({
      items: [{ id: 'admin', name: '管理员', uiPermissions: { 'tasks.read': true }, isSystem: true }],
    });
    fetchMembers.mockResolvedValue({ items: [] });

    const { initPermissionManager } = await import('../index.js');
    initPermissionManager();
    await flushPromises();
    await flushPromises();

    const roleItem = document.querySelector('[data-role-id="admin"]');
    const fakeDelete = document.createElement('button');
    fakeDelete.className = 'permissions-role-delete';
    roleItem.appendChild(fakeDelete);
    fakeDelete.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(deleteRole).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith('系统角色不可删除', 'warning');
  });

  it('prevents deleting current member', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchCurrentUser.mockResolvedValue({ data: { id: 'm1', role: 'admin' } });
    fetchSessionPermissions.mockResolvedValue({
      role: 'admin',
      allPermissions: ['tasks.read'],
      permissions: ['tasks.read'],
      uiPermissions: { 'permissions.roles.manage': true, 'permissions.members.manage': true, 'tasks.read': true },
    });
    fetchRoleList.mockResolvedValue({ items: [{ id: 'admin', name: '管理员', uiPermissions: { 'tasks.read': true } }] });
    fetchMembers.mockResolvedValue({ items: [{ id: 'm1', name: 'Alice', roleId: 'admin', status: 'active' }] });

    const { initPermissionManager } = await import('../index.js');
    initPermissionManager();
    await flushPromises();
    await flushPromises();

    const deleteBtn = document.querySelector('.permissions-member-delete');
    if (deleteBtn) {
      deleteBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    expect(showNotification).toHaveBeenCalledWith('当前登录账号不可删除', 'warning');
  });

  it('validates member edit when email and phone missing', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchCurrentUser.mockResolvedValue({ data: { id: 'm1', role: 'admin' } });
    fetchSessionPermissions.mockResolvedValue({
      role: 'admin',
      allPermissions: ['tasks.read'],
      permissions: ['tasks.read'],
      uiPermissions: { 'permissions.roles.manage': true, 'permissions.members.manage': true, 'tasks.read': true },
    });
    fetchRoleList.mockResolvedValue({ items: [{ id: 'admin', name: '管理员', uiPermissions: { 'tasks.read': true } }] });
    fetchMembers.mockResolvedValue({ items: [{ id: 'm2', name: 'Bob', roleId: 'admin', status: 'active' }] });

    const { initPermissionManager } = await import('../index.js');
    initPermissionManager();
    await flushPromises();
    await flushPromises();

    const editBtn = document.querySelector('.permissions-member-edit');
    editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.querySelector('#permissions-member-email').value = '';
    document.querySelector('#permissions-member-phone').value = '';
    document.querySelector('#permissions-member-save').click();

    expect(updateMember).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith('请填写邮箱或手机号', 'warning');
  });

  it('falls back to messages dock when active dock hidden', async () => {
    isApiEnabled.mockReturnValue(true);
    fetchCurrentUser.mockResolvedValue({ data: { id: 'm1', role: 'admin' } });
    fetchSessionPermissions.mockResolvedValue({
      role: 'admin',
      allPermissions: ['tasks.read'],
      permissions: [],
      uiPermissions: { 'permissions.roles.manage': true, 'permissions.members.manage': true, 'tasks.read': false },
    });
    fetchRoleList.mockResolvedValue({ items: [{ id: 'admin', name: '管理员', uiPermissions: { 'tasks.read': false } }] });
    fetchMembers.mockResolvedValue({ items: [] });

    const { initPermissionManager } = await import('../index.js');
    initPermissionManager();
    await flushPromises();
    await flushPromises();

    const fallback = document.querySelector('[data-dock-tab="messages"]');
    expect(fallback.click).toHaveBeenCalled();
  });
});
