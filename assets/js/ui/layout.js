import { qs, qsa, on } from '../core/dom.js';

let isDragging = false;
let activeResizer = null;
let startX = 0;
let startWidth = 0;
let drawer = null;
let overlay = null;
const DRAWER_MIN_WIDTH = 320;
const DRAWER_MAX_WIDTH = 520;

function setDrawerMode(mode = 'analysis') {
  if (!drawer) {
    drawer = qs('#right-sidebar');
  }
  if (!drawer) {
    return;
  }
  const analysisPanel = qs('#analysis-panel');
  const aiPanel = qs('#ai-assistant-drawer');

  if (analysisPanel) {
    analysisPanel.classList.toggle('hidden', mode === 'ai');
  }
  if (aiPanel) {
    aiPanel.classList.toggle('hidden', mode !== 'ai');
  }

  drawer.classList.toggle('drawer-mode-ai', mode === 'ai');
  drawer.classList.toggle('drawer-mode-analysis', mode !== 'ai');
}

export function initLayout() {
  initTabs();
  initResizers();
  initDrawer();
}

function initTabs() {
  const tabBtns = Array.from(qsa('[data-tab]'));
  const tabContents = Array.from(qsa('.tab-content'));

  const setActiveTab = (group, tabId, triggerBtn) => {
    tabBtns.forEach((b) => {
      const btnGroup = b.dataset.tabGroup || 'default';
      if (btnGroup === group) {
        const isActive = triggerBtn ? b === triggerBtn : b.getAttribute('data-tab') === tabId;
        b.classList.toggle('tab-active', isActive);
      }
    });

    tabContents.forEach((content) => {
      const contentGroup = content.dataset.tabGroup || 'default';
      if (contentGroup !== group) {
        return;
      }
      const shouldShow = content.id === `${tabId}-tab`;
      content.classList.toggle('hidden', !shouldShow);
      content.classList.toggle('active', shouldShow);
    });

    if (group === 'workspace' && tabId === 'workspace-reports') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 0);
    }

    // 当切换到对话tab时，如果右侧面板是打开的且显示的是质检面板，自动切换到经典分析面板
    if (group === 'default' && tabId === 'conversations') {
      const drawer = qs('#right-sidebar');
      const leanContainer = qs('#qc-lean-container');

      // 检查侧边栏是否打开 且 质检面板是否显示
      if (drawer && !drawer.classList.contains('translate-x-full') &&
          leanContainer && !leanContainer.classList.contains('hidden')) {
        console.log('[Layout] 切换到对话tab，检测到质检面板正在显示，自动切换到经典分析面板');

        // 隐藏质检面板
        leanContainer.classList.add('hidden');
        leanContainer.style.display = 'none';

        // 显示经典面板
        const classicContainer = qs('#analysis-classic');
        if (classicContainer) {
          classicContainer.classList.remove('hidden');
          classicContainer.style.display = '';
        }

        // 显示左侧栏区块
        const railMetrics = qs('#rail-card-metrics');
        const railHistory = qs('#rail-card-history');
        if (railMetrics) {
          railMetrics.classList.remove('hidden');
          railMetrics.style.display = '';
        }
        if (railHistory) {
          railHistory.classList.remove('hidden');
          railHistory.style.display = '';
        }
      }
    }
  };

  tabBtns.forEach((btn) => {
    on(btn, 'click', () => {
      const tabId = btn.getAttribute('data-tab');
      const group = btn.dataset.tabGroup || 'default';

      setActiveTab(group, tabId, btn);

      const syncGroup = btn.dataset.syncGroup;
      const syncTab = btn.dataset.syncTab;
      if (syncGroup && syncTab) {
        setActiveTab(syncGroup, syncTab);
      }
    });
  });
}

function initResizers() {
  const appContainer = qs('.app-container');
  const leftSidebar = qs('.left-sidebar');
  const mainContent = qs('.main-content');

  if (!appContainer || !leftSidebar || !mainContent) {
    return;
  }

  const leftResizer = document.createElement('div');
  leftResizer.className = 'resizer';
  leftResizer.id = 'left-resizer';

  const rightResizer = document.createElement('div');
  rightResizer.className = 'resizer';
  rightResizer.id = 'right-resizer';

  appContainer.insertBefore(leftResizer, leftSidebar.nextSibling);
  appContainer.insertBefore(rightResizer, mainContent.nextSibling);

  [leftResizer, rightResizer].forEach((resizer) => {
    on(resizer, 'mousedown', startResize);
    on(resizer, 'touchstart', startResize, { passive: false });
  });

  on(document, 'mousemove', resize);
  on(document, 'touchmove', resize, { passive: false });
  on(document, 'mouseup', stopResize);
  on(document, 'touchend', stopResize);
}

function startResize(e) {
  e.preventDefault();
  isDragging = true;
  activeResizer = e.currentTarget;
  startX = e.clientX || e.touches?.[0]?.clientX || 0;

  if (activeResizer.id === 'left-resizer') {
    startWidth = qs('.left-sidebar')?.offsetWidth || 0;
  } else {
    startWidth = qs('#right-sidebar')?.offsetWidth || 0;
  }

  activeResizer.classList.add('active');
}

function resize(e) {
  if (!isDragging || !activeResizer) {
    return;
  }
  e.preventDefault();

  const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
  const deltaX = clientX - startX;

  if (activeResizer.id === 'left-resizer') {
    const newWidth = startWidth + deltaX;
    if (newWidth > 150 && newWidth < 420) {
      const sidebar = qs('.left-sidebar');
      if (sidebar) {
        sidebar.style.width = `${newWidth}px`;
      }
    }
  } else {
    const newWidth = startWidth - deltaX;
    if (newWidth > 280 && newWidth < 520) {
      const drawer = qs('#right-sidebar');
      if (drawer) {
        drawer.style.width = `${newWidth}px`;
      }
    }
  }
}

function stopResize() {
  if (!isDragging) {
    return;
  }
  isDragging = false;
  if (activeResizer) {
    activeResizer.classList.remove('active');
    activeResizer = null;
  }
}

function initDrawer() {
  drawer = qs('#right-sidebar');
  overlay = qs('#right-sidebar-overlay');

  if (overlay) {
    on(overlay, 'click', () => toggleRightSidebar(false));
  }

  initDrawerResizer();
  syncDrawerWidth();
  setDrawerMode('analysis');
}

function syncDrawerWidth() {
  if (!drawer) {
    return;
  }
  const width = drawer.offsetWidth || 0;
  document.documentElement.style.setProperty('--drawer-width', `${width}px`);
}

function getDrawerMaxWidth() {
  const viewportMax = Math.min(DRAWER_MAX_WIDTH, window.innerWidth - 120);
  return Math.max(DRAWER_MIN_WIDTH, viewportMax);
}

function setDrawerWidth(width) {
  if (!drawer) {
    return;
  }
  drawer.style.width = `${width}px`;
  syncDrawerWidth();
}

function initDrawerResizer() {
  const resizer = qs('#right-drawer-resizer');
  if (!resizer || !drawer) {
    return;
  }

  let resizing = false;
  let startClientX = 0;
  let startDrawerWidth = 0;
  const minWidth = DRAWER_MIN_WIDTH;

  const beginResize = (event) => {
    resizing = true;
    startClientX = event.clientX || event.touches?.[0]?.clientX || 0;
    startDrawerWidth = drawer.offsetWidth;
    event.preventDefault();
  };

  const performResize = (event) => {
    if (!resizing) {
      return;
    }
    const clientX = event.clientX || event.touches?.[0]?.clientX || 0;
    const delta = startClientX - clientX;
    const viewportMax = Math.min(DRAWER_MAX_WIDTH, window.innerWidth - 120);
    const width = Math.min(Math.max(startDrawerWidth + delta, minWidth), viewportMax);
    setDrawerWidth(width);
  };

  const endResize = () => {
    resizing = false;
  };

  on(resizer, 'mousedown', beginResize);
  on(resizer, 'touchstart', beginResize, { passive: false });
  on(document, 'mousemove', performResize);
  on(document, 'touchmove', performResize, { passive: false });
  on(document, 'mouseup', endResize);
  on(document, 'touchend', endResize);
}

export function toggleRightSidebar(forceState) {
  if (!drawer || !overlay) {
    drawer = qs('#right-sidebar');
    overlay = qs('#right-sidebar-overlay');
  }
  if (!drawer || !overlay) {
    return;
  }

  const shouldOpen =
    typeof forceState === 'boolean'
      ? forceState
      : drawer.classList.contains('translate-x-full');

  if (shouldOpen) {
    setDrawerWidth(getDrawerMaxWidth());
    drawer.classList.remove('translate-x-full');
    overlay.classList.add('hidden');
    document.body.classList.add('drawer-open');
  } else {
    drawer.classList.add('translate-x-full');
    overlay.classList.add('hidden');
    // Always clear restricted mode on close to reset state
    drawer.classList.remove('analysis-restricted');
    setDrawerMode('analysis');
    document.body.classList.remove('drawer-open');
  }
}

export function openFullAnalysisPanel() {
  console.log('[Layout] ========== openFullAnalysisPanel 调用开始 ==========');

  const drawer = qs('#right-sidebar');
  setDrawerMode('analysis');
  if (drawer) {
    const beforeClasses = drawer.className;
    drawer.classList.remove('analysis-restricted');
    console.log('[Layout] 侧边栏类名变化:', beforeClasses, '->', drawer.className);
  } else {
    console.error('[Layout] ❌ 找不到 #right-sidebar 元素！');
  }

  // 重置为经典分析面板模式,隐藏质检面板
  const leanContainer = qs('#qc-lean-container');
  const classicContainer = qs('#analysis-classic');
  const railMetrics = qs('#rail-card-metrics');
  const railHistory = qs('#rail-card-history');

  console.log('[Layout] 查找DOM元素结果:', {
    leanContainer: leanContainer ? `找到 (类名: ${leanContainer.className})` : '❌ 未找到',
    classicContainer: classicContainer ? `找到 (类名: ${classicContainer.className})` : '❌ 未找到',
    railMetrics: railMetrics ? `找到 (类名: ${railMetrics.className})` : '❌ 未找到',
    railHistory: railHistory ? `找到 (类名: ${railHistory.className})` : '❌ 未找到'
  });

  // 强制隐藏质检面板
  if (leanContainer) {
    const wasHidden = leanContainer.classList.contains('hidden');
    leanContainer.classList.add('hidden');
    leanContainer.style.display = 'none';
    leanContainer.style.visibility = 'hidden';
    console.log('[Layout] 质检面板:', wasHidden ? '已经是隐藏状态' : '✓ 从显示改为隐藏', '| 当前类名:', leanContainer.className);
  } else {
    console.warn('[Layout] ⚠️ 找不到质检面板容器 #qc-lean-container');
  }

  // 强制显示经典面板
  if (classicContainer) {
    const wasHidden = classicContainer.classList.contains('hidden');
    classicContainer.classList.remove('hidden');
    classicContainer.style.display = '';
    classicContainer.style.visibility = '';
    console.log('[Layout] 经典面板:', wasHidden ? '✓ 从隐藏改为显示' : '已经是显示状态', '| 当前类名:', classicContainer.className);
  } else {
    console.warn('[Layout] ⚠️ 找不到经典分析面板 #analysis-classic');
  }

  // 显示左侧栏区块
  if (railMetrics) {
    railMetrics.classList.remove('hidden');
    railMetrics.style.display = '';
    console.log('[Layout] ✓ 显示关键指标');
  }
  if (railHistory) {
    railHistory.classList.remove('hidden');
    railHistory.style.display = '';
    console.log('[Layout] ✓ 显示历史对话');
  }

  // 先打开侧边栏
  toggleRightSidebar(true);
  const overlayEl = qs('#right-sidebar-overlay');
  if (overlayEl) {
    overlayEl.classList.add('hidden');
  }

  // 在下一个事件循环中再次确保状态正确，防止被其他代码覆盖
  setTimeout(() => {
    // 再次确保质检面板隐藏，经典面板显示
    const leanCheck = qs('#qc-lean-container');
    const classicCheck = qs('#analysis-classic');

    if (leanCheck && !leanCheck.classList.contains('hidden')) {
      console.warn('[Layout] ⚠️ 检测到质检面板意外显示，再次隐藏');
      leanCheck.classList.add('hidden');
      leanCheck.style.display = 'none';
    }

    if (classicCheck && classicCheck.classList.contains('hidden')) {
      console.warn('[Layout] ⚠️ 检测到经典面板意外隐藏，再次显示');
      classicCheck.classList.remove('hidden');
      classicCheck.style.display = '';
    }

    console.log('[Layout] 【最终状态验证】');
    console.log('  质检面板显示状态:', leanCheck ? `hidden类:${leanCheck.classList.contains('hidden')}, display:${leanCheck.style.display}` : '元素不存在');
    console.log('  经典面板显示状态:', classicCheck ? `hidden类:${classicCheck.classList.contains('hidden')}, display:${classicCheck.style.display}` : '元素不存在');
  }, 50);

  console.log('[Layout] ========== openFullAnalysisPanel 调用结束 ==========');
}

export function openAiAssistantPanel() {
  setDrawerMode('ai');
  const aiPanel = qs('#ai-assistant-drawer');
  const analysisPanel = qs('#analysis-panel');
  if (aiPanel) {
    aiPanel.classList.remove('hidden');
    aiPanel.style.display = '';
  }
  if (analysisPanel) {
    analysisPanel.classList.add('hidden');
  }
  toggleRightSidebar(true);
}
