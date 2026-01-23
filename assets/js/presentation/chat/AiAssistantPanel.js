/**
 * AI辅助面板控制器
 * 负责显示情感分析、回复建议、知识库推荐和关联工单
 */

const qs = (selector) => document.querySelector(selector);

export class AiAssistantPanel {
  constructor() {
    // 缓存所有DOM元素，避免重复查询
    this.elements = {
      panel: qs('#ai-assistant-panel'),
      sentimentSection: qs('#ai-panel-sentiment'),
      sentimentContent: qs('#ai-sentiment-content'),
      replySection: qs('#ai-panel-reply'),
      replyList: qs('#ai-reply-list'),
      solutionSection: qs('#ai-panel-solution'),
      solutionContent: qs('#ai-solution-steps'),
      referenceSection: qs('#ai-panel-reference'),
      knowledgeSection: qs('#ai-panel-knowledge'),
      knowledgeContent: qs('#ai-knowledge-content'),
      tasksSection: qs('#ai-panel-tasks'),
      tasksContent: qs('#ai-tasks-content'),
      messageInput: qs('#message-input')
    };

    // 兼容旧代码
    this.panel = this.elements.panel;
    this.sentimentSection = this.elements.sentimentSection;
    this.replySection = this.elements.replySection;
    this.solutionSection = this.elements.solutionSection;
    this.referenceSection = this.elements.referenceSection;
    this.knowledgeSection = this.elements.knowledgeSection;
    this.tasksSection = this.elements.tasksSection;

    // 面板状态：'expanded'展开, 'collapsed'折叠
    this.state = 'expanded';
    // 当前显示模式：'issue'问题模式, 'normal'普通模式
    this.mode = 'normal';

    this.initEventListeners();
  }

  initEventListeners() {
    // 采纳按钮由统一事件代理处理（chat/index.js）
  }

  /**
   * 初始化折叠/展开按钮
   */
  initToggleButton() {
    if (!this.panel) return;

    // 创建折叠按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'ai-panel-toggle';
    toggleBtn.className = 'ai-panel-toggle';
    toggleBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 4l4 4-4 4V4z"/>
      </svg>
    `;
    toggleBtn.title = '折叠AI辅助面板';
    toggleBtn.addEventListener('click', () => this.toggle());

    // 插入到面板顶部
    const panelContent = this.panel.querySelector('.p-4');
    if (panelContent) {
      panelContent.insertBefore(toggleBtn, panelContent.firstChild);
    }
  }

  /**
   * 切换面板展开/折叠状态
   */
  toggle() {
    if (this.state === 'expanded') {
      this.collapse();
    } else {
      this.expand();
    }
  }

  /**
   * 折叠面板
   */
  collapse() {
    if (!this.panel) return;
    this.state = 'collapsed';
    this.panel.classList.add('collapsed');
    const toggleBtn = this.panel.querySelector('#ai-panel-toggle');
    if (toggleBtn) {
      toggleBtn.classList.add('collapsed');
      toggleBtn.title = '展开AI辅助面板';
    }
  }

  /**
   * 展开面板
   */
  expand() {
    if (!this.panel) return;
    this.state = 'expanded';
    this.panel.classList.remove('collapsed');
    const toggleBtn = this.panel.querySelector('#ai-panel-toggle');
    if (toggleBtn) {
      toggleBtn.classList.remove('collapsed');
      toggleBtn.title = '折叠AI辅助面板';
    }
  }

  /**
   * 显示面板（根据模式决定显示内容）
   * @param {string} mode - 'issue'问题模式或'normal'普通模式
   */
  show(mode = 'normal') {
    if (!this.panel) return;

    this.mode = mode;
    this.panel.classList.remove('hidden');

    // 根据模式显示/隐藏内容
    if (mode === 'normal') {
      // 普通模式：只显示回复建议
      if (this.sentimentSection) this.sentimentSection.classList.add('hidden');
      if (this.knowledgeSection) this.knowledgeSection.classList.add('hidden');
      if (this.tasksSection) this.tasksSection.classList.add('hidden');
    } else if (mode === 'issue') {
      // 问题模式：显示全部内容（由各update方法控制具体显示）
      // 不做隐藏操作，让数据决定显示什么
    }

    // 默认展开状态
    this.expand();
    this.syncSuggestionGrid();
  }

  /**
   * 隐藏面板
   */
  hide() {
    if (this.panel) {
      this.panel.classList.add('hidden');
    }
  }

  /**
   * 更新情感分析
   * @param {Object} sentiment - 情感数据 {emotion, score, confidence}
   */
  updateSentiment(sentiment) {
    if (!sentiment || !this.elements.sentimentSection) return;

    const { emotion, score, confidence } = sentiment;

    // 情感图标和颜色映射
    const emotionMap = {
      positive: { icon: '😊', label: '积极', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      neutral: { icon: '😐', label: '中性', class: 'bg-slate-100 text-slate-700 border-slate-200' },
      negative: { icon: '😟', label: '消极', class: 'bg-rose-50 text-rose-700 border-rose-200' },
      urgent: { icon: '⚠️', label: '急切', class: 'bg-rose-50 text-rose-700 border-rose-200' },
      anxious: { icon: '😰', label: '焦虑', class: 'bg-rose-50 text-rose-700 border-rose-200' }
    };

    const emotionInfo = emotionMap[emotion] || emotionMap.neutral;

    if (this.elements.sentimentContent) {
      this.elements.sentimentContent.innerHTML = `
        <div class="ai-panel-grid">
          <div>情绪：<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${emotionInfo.class}">${emotionInfo.icon} ${emotionInfo.label}</span></div>
          <div>置信度：<span class="font-semibold text-slate-700">${Math.round(confidence * 100)}%</span></div>
          <div>情感分值：<span class="font-semibold text-slate-700">${Math.round(score * 100)}%</span></div>
          <div>建议：<span class="text-slate-600">${emotion === 'negative' ? '需要优先跟进并同步进展' : '保持常规跟进与反馈'}</span></div>
        </div>
      `;
    }

    this.sentimentSection.classList.remove('hidden');
    this.show();
    this.syncSuggestionGrid();
  }

  /**
   * 更新回复建议
   * @param {Object} suggestion - 建议数据 {suggestedReply, confidence, needsHumanReview}
   */
  updateReplySuggestion(suggestion) {
    if (!this.replySection) return;

    const { suggestedReply, confidence, needsHumanReview } = suggestion || {};
    const normalizedReply = (suggestedReply || '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    if (this.elements.replyList) {
      if (!normalizedReply) {
        this.elements.replyList.innerHTML =
          `<div class="ai-panel-card text-xs text-gray-600 flex flex-col items-center justify-center gap-2 py-6">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 4h12a1 1 0 0 1 1 1v12a4 4 0 0 1-4 4H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="#cbd5e1" stroke-width="1.5"/>
              <path d="M8 9h8M8 12h5M8 15h6" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <div>暂无数据</div>
          </div>`;
        this.replySection.classList.remove('hidden');
        this.show();
        this.syncSuggestionGrid();
        return;
      }
      const reviewBadge = needsHumanReview
        ? '<span class="reply-review-badge">需人工审核</span>'
        : '';

      this.elements.replyList.innerHTML = `
        <div class="ai-panel-card">
          <div>
            <div class="text-xs text-gray-400 mb-1">AI建议 · 置信度 ${Math.round(confidence * 100)}%</div>
            ${reviewBadge}
            <p class="text-sm text-gray-700 mt-1">${this.escapeHtml(normalizedReply)}</p>
            <div class="mt-3 flex justify-end">
              <button class="ai-reply-adopt text-xs px-3 py-1 bg-primary text-white rounded-full hover:bg-primary-dark" data-permission="ai.reply.adopt" data-suggestion="${this.escapeHtml(normalizedReply)}">采纳</button>
            </div>
          </div>
        </div>
      `;
    }

    this.replySection.classList.remove('hidden');
    this.show();
    this.syncSuggestionGrid();
  }

  /**
   * 更新知识库推荐
   * @param {Array} knowledgeList - 知识库列表 [{id, title, category, score, url}]
   */
  updateKnowledgeBase(knowledgeList) {
    console.log('[AiPanel] updateKnowledgeBase called:', knowledgeList);

    if (!knowledgeList || knowledgeList.length === 0) {
      console.warn('[AiPanel] 知识库列表为空，跳过');
      return;
    }

    if (!this.knowledgeSection) {
      console.error('[AiPanel] 知识库区DOM元素不存在！');
      return;
    }

    if (this.elements.knowledgeContent) {
      this.elements.knowledgeContent.innerHTML = knowledgeList.map(item => `
        <div class="ai-panel-card ai-panel-card--compact">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-sm font-semibold text-gray-800">${this.escapeHtml(item.title)}</div>
              <div class="text-xs text-gray-500 mt-1">分类：${this.escapeHtml(item.category)}</div>
              <div class="text-[11px] text-gray-400 mt-1">匹配度 ${Math.round(item.score * 100)}%</div>
            </div>
            <button class="ai-panel-chip" onclick="window.open('${item.url}', '_blank')">查看</button>
          </div>
        </div>
      `).join('');
      console.log('[AiPanel] ✅ 知识库内容已渲染（' + knowledgeList.length + '条）');
    }

    this.knowledgeSection.classList.remove('hidden');
    console.log('[AiPanel] ✅ 知识库区已显示（移除hidden类）');

    this.showReferenceSection();
    this.show();
  }

  /**
   * 更新解决步骤
   * @param {Array} steps - 解决步骤列表 [{step, description, status, reference}]
   */
  updateSolutionSteps(steps) {
    if (!steps || steps.length === 0 || !this.solutionSection) return;

    if (this.elements.solutionContent) {
      this.elements.solutionContent.innerHTML = steps.map((step, index) => {
        const stepNumber = index + 1;
        const statusIcon = step.status === 'completed' ? '✓' :
                          step.status === 'in_progress' ? '⏳' : '○';
        const statusClass = step.status === 'completed' ? 'text-green-600' :
                           step.status === 'in_progress' ? 'text-blue-600' : 'text-gray-400';

        return `
          <li>
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                ${stepNumber}
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <h5 class="text-sm font-semibold text-gray-800">${this.escapeHtml(step.step)}</h5>
                  <span class="${statusClass} text-lg">${statusIcon}</span>
                </div>
                <p class="text-xs text-gray-600">${this.escapeHtml(step.description)}</p>
              </div>
            </div>
          </li>
        `;
      }).join('');
    }

    this.solutionSection.classList.remove('hidden');
    this.show();
  }

  /**
   * 更新关联工单
   * @param {Array} tasksList - 工单列表 [{id, title, priority, url}]
   */
  updateRelatedTasks(tasksList) {
    console.log('[AiPanel] updateRelatedTasks called:', tasksList);

    if (!tasksList || tasksList.length === 0) {
      console.warn('[AiPanel] 工单列表为空，跳过');
      return;
    }

    if (!this.tasksSection) {
      console.error('[AiPanel] 工单区DOM元素不存在！');
      return;
    }

    if (this.elements.tasksContent) {
      this.elements.tasksContent.innerHTML = tasksList.map(task => {
        const priorityLabel = task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低';
        const priorityClass = task.priority === 'high'
          ? 'chip-urgent'
          : task.priority === 'medium'
            ? 'chip-soft'
            : 'chip-neutral';

        return `
          <div class="ai-panel-card ai-panel-card--compact">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-gray-800">${this.escapeHtml(task.title)}</div>
                <div class="text-xs text-gray-500 mt-1">工单 #${task.id}</div>
              </div>
              <span class="analysis-chip ${priorityClass}">优先级 ${priorityLabel}</span>
            </div>
            <button class="text-xs text-primary hover:underline mt-2" onclick="window.open('${task.url}', '_blank')">查看详情</button>
          </div>
        `;
      }).join('');
      console.log('[AiPanel] ✅ 工单内容已渲染（' + tasksList.length + '条）');
    }

    this.tasksSection.classList.remove('hidden');
    console.log('[AiPanel] ✅ 工单区已显示（移除hidden类）');

    this.showReferenceSection();
    this.show();
  }

  /**
   * 显示参考资料区块（当知识库或工单有内容时）
   */
  showReferenceSection() {
    if (!this.referenceSection) {
      console.error('[AiPanel] 参考资料区DOM元素不存在！');
      return;
    }

    const hasKnowledge = this.knowledgeSection && !this.knowledgeSection.classList.contains('hidden');
    const hasTasks = this.tasksSection && !this.tasksSection.classList.contains('hidden');

    console.log('[AiPanel] showReferenceSection:', {
      hasKnowledge,
      hasTasks,
      knowledgeSection: this.knowledgeSection,
      tasksSection: this.tasksSection,
      referenceSection: this.referenceSection
    });

    if (hasKnowledge || hasTasks) {
      this.referenceSection.classList.remove('hidden');
      console.log('[AiPanel] ✅ 参考资料区已显示');
    } else {
      console.warn('[AiPanel] ⚠️ 知识库和工单都没有内容，参考资料区不显示');
    }
  }

  /**
   * 清空所有内容
   */
  clear() {
    if (this.sentimentSection) this.sentimentSection.classList.add('hidden');
    if (this.replySection) this.replySection.classList.add('hidden');
    if (this.solutionSection) this.solutionSection.classList.add('hidden');
    if (this.referenceSection) this.referenceSection.classList.add('hidden');
    if (this.knowledgeSection) this.knowledgeSection.classList.add('hidden');
    if (this.tasksSection) this.tasksSection.classList.add('hidden');
    this.syncSuggestionGrid();
    this.hide();
  }

  syncSuggestionGrid() {
    if (!this.replySection || !this.sentimentSection) return;
    const replyVisible = !this.replySection.classList.contains('hidden');
    const sentimentVisible = !this.sentimentSection.classList.contains('hidden');
    this.replySection.classList.toggle('full-span', replyVisible && !sentimentVisible);
    this.sentimentSection.classList.toggle('full-span', sentimentVisible && !replyVisible);
  }

  /**
   * 转义HTML特殊字符
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
