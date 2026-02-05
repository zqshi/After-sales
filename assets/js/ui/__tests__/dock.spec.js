import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../layout.js', () => ({
  toggleRightSidebar: vi.fn(),
}));

describe('dock navigation', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.className = '';
    document.body.innerHTML = `
      <div id="right-sidebar" class="translate-x-full"></div>
      <button class="dock-btn" data-dock-tab="messages"></button>
      <button class="dock-btn" data-dock-tab="knowledge"></button>
      <button class="dock-btn" data-dock-tab="tools"></button>
      <button class="dock-btn" data-dock-tab="reports"></button>
      <button class="dock-btn" data-dock-tab="permissions"></button>

      <button class="dock-submenu-item" data-dock-subtab="knowledge-application" data-dock-parent="knowledge"></button>
      <button class="dock-submenu-item" data-dock-subtab="knowledge-management" data-dock-parent="knowledge"></button>
      <button class="dock-submenu-item" data-dock-subtab="reports" data-dock-parent="tools"></button>
      <button class="dock-submenu-item" data-dock-subtab="tools" data-dock-parent="tools"></button>
      <button class="dock-submenu-item" data-dock-subtab="tasks" data-dock-parent="messages"></button>

      <button class="subtab-btn" data-subtab="dialog"></button>
      <button class="subtab-btn" data-subtab="tasks"></button>

      <button class="sidebar-tab" data-tab-group="sidebar" data-tab="dialog"></button>
      <button class="sidebar-tab" data-tab-group="sidebar" data-tab="tasks"></button>
      <button class="sidebar-tab" data-tab-group="sidebar" data-tab="knowledge"></button>
      <button class="sidebar-tab" data-tab-group="sidebar" data-tab="tools"></button>
      <button class="sidebar-tab" data-tab-group="sidebar" data-tab="reports"></button>

      <div class="tab-content" id="dialog-tab" data-tab-group="sidebar"></div>
      <div class="tab-content" id="tasks-tab" data-tab-group="sidebar"></div>
      <div class="tab-content" id="knowledge-tab" data-tab-group="sidebar"></div>
      <div class="tab-content" id="tools-tab" data-tab-group="sidebar"></div>
      <div class="tab-content" id="reports-tab" data-tab-group="sidebar"></div>

      <div class="tab-content" id="workspace-dialog-tab" data-tab-group="workspace"></div>
      <div class="tab-content" id="workspace-tasks-tab" data-tab-group="workspace"></div>
      <div class="tab-content" id="workspace-knowledge-tab" data-tab-group="workspace"></div>
      <div class="tab-content" id="workspace-knowledge-application-tab" data-tab-group="workspace"></div>
      <div class="tab-content" id="workspace-tools-tab" data-tab-group="workspace"></div>
      <div class="tab-content" id="workspace-reports-tab" data-tab-group="workspace"></div>
      <div class="tab-content" id="workspace-permissions-tab" data-tab-group="workspace"></div>
    `;
  });

  it('initializes and switches dock tabs', async () => {
    const { initDockNavigation } = await import('../dock.js');
    initDockNavigation();

    const knowledgeBtn = document.querySelector('[data-dock-tab="knowledge"]');
    knowledgeBtn.dispatchEvent(new MouseEvent('click'));

    expect(document.body.classList.contains('knowledge-mode')).toBe(true);
    const knowledgeTab = document.querySelector('#knowledge-tab');
    expect(knowledgeTab.classList.contains('active')).toBe(true);
    const workspaceKnowledge = document.querySelector('#workspace-knowledge-tab');
    expect(workspaceKnowledge.classList.contains('active')).toBe(true);

    const toolsBtn = document.querySelector('[data-dock-tab="tools"]');
    toolsBtn.dispatchEvent(new MouseEvent('click'));
    expect(document.body.classList.contains('tools-mode')).toBe(true);
  });

  it('handles submenus and subtabs', async () => {
    const { initDockNavigation } = await import('../dock.js');
    initDockNavigation();

    const submenu = document.querySelector('[data-dock-subtab="knowledge-application"]');
    submenu.dispatchEvent(new MouseEvent('click'));
    const workspaceKnowledgeApp = document.querySelector('#workspace-knowledge-application-tab');
    expect(workspaceKnowledgeApp.classList.contains('active')).toBe(true);

    const taskSubtab = document.querySelector('[data-subtab="tasks"]');
    taskSubtab.dispatchEvent(new MouseEvent('click'));
    const workspaceTasks = document.querySelector('#workspace-tasks-tab');
    expect(workspaceTasks.classList.contains('active')).toBe(true);
  });
});
