import { qs, qsa, on } from '../core/dom.js';

let isDragging = false;
let activeResizer = null;
let startX = 0;
let startWidth = 0;

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

let drawer;
let overlay;

function initDrawer() {
  drawer = qs('#right-sidebar');
  overlay = qs('#right-sidebar-overlay');

  if (overlay) {
    on(overlay, 'click', () => toggleRightSidebar(false));
  }

  initDrawerResizer();
}

function initDrawerResizer() {
  const resizer = qs('#right-drawer-resizer');
  if (!resizer || !drawer) {
    return;
  }

  let resizing = false;
  let startClientX = 0;
  let startDrawerWidth = 0;
  const minWidth = 320;

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
    // 允许覆盖对话窗口：上限随视口变化，预留少量边距
    const viewportMax = Math.max(900, window.innerWidth - 120);
    const width = Math.min(Math.max(startDrawerWidth + delta, minWidth), viewportMax);
    drawer.style.width = `${width}px`;
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
    drawer.classList.remove('translate-x-full');
    overlay.classList.remove('hidden');
  } else {
    drawer.classList.add('translate-x-full');
    overlay.classList.add('hidden');
    // Always clear restricted mode on close to reset state
    drawer.classList.remove('analysis-restricted');
  }
}

export function openFullAnalysisPanel() {
  const drawer = qs('#right-sidebar');
  if (drawer) {
    drawer.classList.remove('analysis-restricted');
  }
  toggleRightSidebar(true);
}
