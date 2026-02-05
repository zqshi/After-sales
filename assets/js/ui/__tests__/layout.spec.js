import { describe, it, expect, beforeEach, vi } from 'vitest';

const setOffsetWidth = (el, width) => {
  Object.defineProperty(el, 'offsetWidth', {
    configurable: true,
    get() {
      return width;
    },
  });
};

describe('layout', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `
      <div class="app-container">
        <div class="left-sidebar" style="width:200px"></div>
        <div class="main-content"></div>
        <div id="right-sidebar" class="translate-x-full" style="width:300px"></div>
        <div id="right-sidebar-overlay" class="hidden"></div>
      </div>
      <div id="analysis-panel"></div>
      <div id="ai-assistant-drawer" class="hidden"></div>
      <div id="analysis-classic" class="hidden"></div>
      <div id="qc-lean-container"></div>
      <div id="rail-card-metrics" class="hidden"></div>
      <div id="rail-card-history" class="hidden"></div>
      <button data-tab="conversations" data-tab-group="default" class="tab-btn"></button>
      <button data-tab="workspace-reports" data-tab-group="workspace" class="tab-btn"></button>
      <div class="tab-content" id="conversations-tab" data-tab-group="default"></div>
      <div class="tab-content" id="other-tab" data-tab-group="default"></div>
      <div class="tab-content" id="workspace-reports-tab" data-tab-group="workspace"></div>
      <div id="right-drawer-resizer"></div>
    `;
  });

  it('initializes tabs and resizers', async () => {
    const layout = await import('../layout.js');
    const left = document.querySelector('.left-sidebar');
    const right = document.querySelector('#right-sidebar');
    setOffsetWidth(left, 200);
    setOffsetWidth(right, 300);

    layout.initLayout();

    const leftResizer = document.querySelector('#left-resizer');
    const rightResizer = document.querySelector('#right-resizer');
    expect(leftResizer).toBeTruthy();
    expect(rightResizer).toBeTruthy();

    leftResizer.dispatchEvent(new MouseEvent('mousedown', { clientX: 100 }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 140 }));
    document.dispatchEvent(new MouseEvent('mouseup'));
    expect(left.style.width).toBe('240px');

    const tabBtn = document.querySelector('[data-tab="conversations"]');
    tabBtn.dispatchEvent(new MouseEvent('click'));
    const tab = document.querySelector('#conversations-tab');
    expect(tab.classList.contains('active')).toBe(true);
  });

  it('toggles right sidebar and opens panels', async () => {
    const layout = await import('../layout.js');
    const right = document.querySelector('#right-sidebar');
    const overlay = document.querySelector('#right-sidebar-overlay');
    setOffsetWidth(right, 300);

    layout.toggleRightSidebar(true);
    expect(right.classList.contains('translate-x-full')).toBe(false);
    expect(document.body.classList.contains('drawer-open')).toBe(true);
    expect(overlay.classList.contains('hidden')).toBe(true);

    layout.toggleRightSidebar(false);
    expect(right.classList.contains('translate-x-full')).toBe(true);
    expect(document.body.classList.contains('drawer-open')).toBe(false);

    layout.openAiAssistantPanel();
    const aiPanel = document.querySelector('#ai-assistant-drawer');
    const analysisPanel = document.querySelector('#analysis-panel');
    expect(aiPanel.classList.contains('hidden')).toBe(false);
    expect(analysisPanel.classList.contains('hidden')).toBe(true);
  });

  it('opens full analysis panel and hides QC lean', async () => {
    vi.useFakeTimers();
    const layout = await import('../layout.js');
    const right = document.querySelector('#right-sidebar');
    setOffsetWidth(right, 300);

    const lean = document.querySelector('#qc-lean-container');
    const classic = document.querySelector('#analysis-classic');
    lean.classList.remove('hidden');
    classic.classList.add('hidden');

    layout.openFullAnalysisPanel();
    vi.runAllTimers();

    expect(lean.classList.contains('hidden')).toBe(true);
    expect(classic.classList.contains('hidden')).toBe(false);
    expect(right.classList.contains('translate-x-full')).toBe(false);

    vi.useRealTimers();
  });
});
