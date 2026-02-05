import { describe, it, expect, beforeEach } from 'vitest';
import { AiAssistantPanel } from '../AiAssistantPanel.js';

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
  const panel = add('div', 'ai-assistant-panel');
  panel.classList.add('hidden');
  const content = document.createElement('div');
  content.className = 'p-4';
  const placeholder = document.createElement('div');
  placeholder.textContent = 'content';
  content.appendChild(placeholder);
  panel.appendChild(content);

  add('div', 'ai-panel-sentiment').classList.add('hidden');
  add('div', 'ai-sentiment-content');
  add('div', 'ai-panel-reply').classList.add('hidden');
  add('div', 'ai-reply-list');
  add('div', 'ai-panel-solution').classList.add('hidden');
  add('ul', 'ai-solution-steps');
  add('div', 'ai-panel-reference').classList.add('hidden');
  add('div', 'ai-panel-knowledge').classList.add('hidden');
  add('div', 'ai-knowledge-content');
  add('div', 'ai-panel-tasks').classList.add('hidden');
  add('div', 'ai-tasks-content');
  add('input', 'message-input');
};

describe('AiAssistantPanel', () => {
  beforeEach(() => {
    setupDom();
  });

  it('toggles panel collapse/expand', () => {
    const panel = new AiAssistantPanel();
    panel.initToggleButton();

    const toggleBtn = document.querySelector('#ai-panel-toggle');
    expect(toggleBtn).not.toBeNull();

    toggleBtn.click();
    expect(panel.state).toBe('collapsed');
    expect(panel.panel.classList.contains('collapsed')).toBe(true);

    toggleBtn.click();
    expect(panel.state).toBe('expanded');
    expect(panel.panel.classList.contains('collapsed')).toBe(false);
  });

  it('renders reply suggestion and empty state', () => {
    const panel = new AiAssistantPanel();

    panel.updateReplySuggestion({ suggestedReply: '', confidence: 0.5 });
    const replyList = document.querySelector('#ai-reply-list');
    expect(replyList.textContent).toContain('暂无数据');

    panel.updateReplySuggestion({ suggestedReply: 'line1\nline2', confidence: 0.8, needsHumanReview: true });
    const adoptBtn = replyList.querySelector('.ai-reply-adopt');
    expect(adoptBtn).not.toBeNull();
    expect(adoptBtn.dataset.suggestion).toContain('line1');
  });

  it('updates sentiment and solution steps', () => {
    const panel = new AiAssistantPanel();

    panel.updateSentiment({ emotion: 'positive', score: 0.9, confidence: 0.86 });
    const sentimentContent = document.querySelector('#ai-sentiment-content');
    expect(sentimentContent.textContent).toContain('积极');

    panel.updateSolutionSteps([
      { step: '定位问题', description: '检查日志', status: 'completed' },
      { step: '回滚', description: '执行回滚', status: 'in_progress' },
    ]);
    const steps = document.querySelectorAll('#ai-solution-steps li');
    expect(steps.length).toBe(2);
  });

  it('renders knowledge and related tasks lists', () => {
    const panel = new AiAssistantPanel();

    panel.updateKnowledgeBase([
      { id: 'k1', title: 'FAQ', category: '指南', score: 0.8, url: 'https://example.com' },
    ]);
    const knowledgeContent = document.querySelector('#ai-knowledge-content');
    expect(knowledgeContent.textContent).toContain('FAQ');

    panel.updateRelatedTasks([
      { id: 't1', title: '修复任务', priority: 'high', url: 'https://example.com' },
    ]);
    const tasksContent = document.querySelector('#ai-tasks-content');
    expect(tasksContent.textContent).toContain('修复任务');

    const referenceSection = document.querySelector('#ai-panel-reference');
    expect(referenceSection.classList.contains('hidden')).toBe(false);
  });

  it('clears panel content and hides sections', () => {
    const panel = new AiAssistantPanel();

    panel.updateReplySuggestion({ suggestedReply: 'ready', confidence: 0.7 });
    panel.updateSentiment({ emotion: 'negative', score: 0.4, confidence: 0.5 });

    panel.clear();

    expect(panel.panel.classList.contains('hidden')).toBe(true);
    expect(panel.replySection.classList.contains('hidden')).toBe(true);
    expect(panel.sentimentSection.classList.contains('hidden')).toBe(true);
  });
});
