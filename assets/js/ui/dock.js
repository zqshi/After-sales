import { qsa, on } from '../core/dom.js';
import { toggleRightSidebar } from './layout.js';

export function initDockNavigation() {
  const dockButtons = qsa('.dock-btn');

  dockButtons.forEach(btn => {
    on(btn, 'click', () => {
      const dockTab = btn.getAttribute('data-dock-tab');
      handleDockTabSwitch(dockTab, btn);
    });
  });

  initDockSubmenus();
  initMessageSubtabs();

  setRightSidebarMode('split');
  setKnowledgeLayout(false);
  setToolsLayout(false);
}

function initDockSubmenus() {
  const submenuButtons = qsa('.dock-submenu-item');
  submenuButtons.forEach((btn) => {
    on(btn, 'click', () => {
      const subtab = btn.getAttribute('data-dock-subtab');
      const parent = btn.getAttribute('data-dock-parent')
        || btn.closest('.dock-item')?.querySelector('.dock-btn')?.getAttribute('data-dock-tab')
        || 'messages';

      if (parent === 'knowledge') {
        if (subtab === 'knowledge-application') {
          showKnowledgeApplicationContent();
        } else {
          showKnowledgeManagementContent();
        }
        return;
      }

      showMessagesContent();
      if (subtab === 'tasks') {
        showTasksContent();
      } else {
        showDialogContent();
      }
    });
  });
}

function initMessageSubtabs() {
  const subtabButtons = qsa('.subtab-btn');
  subtabButtons.forEach((btn) => {
    on(btn, 'click', () => {
      const subtab = btn.getAttribute('data-subtab');
      if (subtab === 'tasks') {
        showTasksContent();
      } else {
        showDialogContent();
      }
    });
  });
}

function showDialogContent() {
  setMessageSubtabActive('dialog');
  const sidebarTabs = qsa('.sidebar-tab');
  sidebarTabs.forEach((tab) => {
    const tabId = tab.getAttribute('data-tab');
    const tabGroup = tab.getAttribute('data-tab-group');
    if (tabGroup === 'sidebar') {
      tab.classList.toggle('tab-active', tabId === 'dialog');
    }
  });

  // 显示对话内容
  const tabContents = qsa('.tab-content');
  tabContents.forEach(content => {
    const contentGroup = content.getAttribute('data-tab-group');
    if (contentGroup === 'sidebar') {
      if (content.id === 'dialog-tab') {
        content.classList.remove('hidden');
        content.classList.add('active');
      } else {
        content.classList.add('hidden');
        content.classList.remove('active');
      }
    }
  });

  showWorkspaceContent('workspace-dialog');
}

function showTasksContent() {
  setMessageSubtabActive('tasks');
  const sidebarTabs = qsa('.sidebar-tab');
  sidebarTabs.forEach((tab) => {
    const tabId = tab.getAttribute('data-tab');
    const tabGroup = tab.getAttribute('data-tab-group');
    if (tabGroup === 'sidebar') {
      tab.classList.toggle('tab-active', tabId === 'tasks');
    }
  });

  // 显示任务内容
  const tabContents = qsa('.tab-content');
  tabContents.forEach(content => {
    const contentGroup = content.getAttribute('data-tab-group');
    if (contentGroup === 'sidebar') {
      if (content.id === 'tasks-tab') {
        content.classList.remove('hidden');
        content.classList.add('active');
      } else {
        content.classList.add('hidden');
        content.classList.remove('active');
      }
    }
  });

  showWorkspaceContent('workspace-tasks');
}

function handleDockTabSwitch(dockTab, clickedBtn) {
  // 移除所有按钮的激活状态
  qsa('.dock-btn').forEach(btn => {
    btn.classList.remove('dock-active');
  });

  // 为当前点击的按钮添加激活状态
  clickedBtn.classList.add('dock-active');

  // 根据dockTab类型切换内容
  switch(dockTab) {
    case 'messages':
      // 显示消息相关的内容，包括对话和任务tab
      showMessagesContent();
      break;
    case 'knowledge':
      // 显示知识内容
      showKnowledgeManagementContent();
      break;
    case 'tools':
      // 显示工具内容
      showToolsContent();
      break;
    default:
      showMessagesContent();
  }
}

function showMessagesContent() {
  setRightSidebarMode('split');
  setKnowledgeLayout(false);
  setToolsLayout(false);
  setDockActive('messages');

  showDialogContent();
}

function showKnowledgeManagementContent() {
  setRightSidebarMode('panel');
  toggleRightSidebar(false);
  setKnowledgeLayout(true);
  setToolsLayout(false);
  setDockActive('knowledge');
  // 显示左侧sidebar的知识tab内容
  const sidebarTabs = qsa('.sidebar-tab');
  sidebarTabs.forEach(tab => {
    const tabId = tab.getAttribute('data-tab');
    const tabGroup = tab.getAttribute('data-tab-group');
    
    if (tabGroup === 'sidebar') {
      if (tabId === 'knowledge') {
        tab.classList.add('tab-active');
      } else {
        tab.classList.remove('tab-active');
      }
    }
  });

  // 显示对应的tab内容
  const tabContents = qsa('.tab-content');
  tabContents.forEach(content => {
    const contentGroup = content.getAttribute('data-tab-group');
    if (contentGroup === 'sidebar') {
      if (content.id === 'knowledge-tab') {
        content.classList.remove('hidden');
        content.classList.add('active');
      } else {
        content.classList.add('hidden');
        content.classList.remove('active');
      }
    }
  });

  showWorkspaceContent('workspace-knowledge');
}

function showKnowledgeApplicationContent() {
  setRightSidebarMode('panel');
  toggleRightSidebar(false);
  setKnowledgeLayout(true);
  setToolsLayout(false);
  setDockActive('knowledge');
  showWorkspaceContent('workspace-knowledge-application');
}

function showToolsContent() {
  setRightSidebarMode('panel');
  toggleRightSidebar(false);
  setKnowledgeLayout(false);
  setToolsLayout(true);
  setDockActive('tools');
  // 显示左侧sidebar的工具tab内容
  const sidebarTabs = qsa('.sidebar-tab');
  sidebarTabs.forEach(tab => {
    const tabId = tab.getAttribute('data-tab');
    const tabGroup = tab.getAttribute('data-tab-group');
    
    if (tabGroup === 'sidebar') {
      if (tabId === 'tools') {
        tab.classList.add('tab-active');
      } else {
        tab.classList.remove('tab-active');
      }
    }
  });

  // 显示对应的tab内容
  const tabContents = qsa('.tab-content');
  tabContents.forEach(content => {
    const contentGroup = content.getAttribute('data-tab-group');
    if (contentGroup === 'sidebar') {
      if (content.id === 'tools-tab') {
        content.classList.remove('hidden');
        content.classList.add('active');
      } else {
        content.classList.add('hidden');
        content.classList.remove('active');
      }
    }
  });

  showWorkspaceContent('workspace-tools');
}

function showWorkspaceContent(tabId) {
  const tabContents = qsa('.tab-content');
  tabContents.forEach(content => {
    const contentGroup = content.getAttribute('data-tab-group');
    if (contentGroup === 'workspace') {
      const shouldShow = content.id === `${tabId}-tab`;
      content.classList.toggle('hidden', !shouldShow);
      content.classList.toggle('active', shouldShow);
    }
  });
}

function setRightSidebarMode(mode) {
  const drawer = document.querySelector('#right-sidebar');
  if (!drawer) {
    return;
  }
  drawer.classList.toggle('panel-only', mode === 'panel');
  document.body.classList.toggle('panel-mode', mode === 'panel');
}

function setKnowledgeLayout(isKnowledge) {
  document.body.classList.toggle('knowledge-mode', isKnowledge);
}

function setToolsLayout(isTools) {
  document.body.classList.toggle('tools-mode', isTools);
}

function setDockActive(dockTab) {
  qsa('.dock-btn').forEach(btn => {
    btn.classList.toggle('dock-active', btn.getAttribute('data-dock-tab') === dockTab);
  });
}

function setMessageSubtabActive(subtab) {
  qsa('.subtab-btn').forEach((btn) => {
    btn.classList.toggle('tab-active', btn.getAttribute('data-subtab') === subtab);
  });
}
