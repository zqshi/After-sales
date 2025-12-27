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
      sentimentSection: qs('#sentiment-analysis'),
      sentimentContent: qs('#sentiment-content'),
      replySection: qs('#reply-suggestion'),
      replyContent: qs('#reply-content'),
      useSuggestionBtn: qs('#use-suggestion-btn'),
      solutionSection: qs('#solution-steps'),
      solutionContent: qs('#solution-content'),
      referenceSection: qs('#reference-materials'),
      knowledgeSection: qs('#knowledge-base'),
      knowledgeContent: qs('#knowledge-content'),
      tasksSection: qs('#related-tasks'),
      tasksContent: qs('#tasks-content'),
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
    this.initToggleButton();
  }

  initEventListeners() {
    // 使用建议按钮
    if (this.elements.useSuggestionBtn) {
      this.elements.useSuggestionBtn.addEventListener('click', () => {
        if (this.elements.replyContent && this.elements.messageInput) {
          const text = this.elements.replyContent.textContent.trim();
          if (text) {
            this.elements.messageInput.value = text;
            this.elements.messageInput.focus();
          }
        }
      });
    }
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
      positive: { icon: '😊', label: '积极', class: 'sentiment-positive' },
      neutral: { icon: '😐', label: '中性', class: 'sentiment-neutral' },
      negative: { icon: '😟', label: '消极', class: 'sentiment-negative' }
    };

    const emotionInfo = emotionMap[emotion] || emotionMap.neutral;

    if (this.elements.sentimentContent) {
      this.elements.sentimentContent.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="sentiment-badge ${emotionInfo.class}">
            ${emotionInfo.icon} ${emotionInfo.label}
          </span>
          <div class="flex-1">
            <div class="text-xs text-gray-500 mb-1">情感分值</div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full ${emotion === 'positive' ? 'bg-green-500' : emotion === 'negative' ? 'bg-red-500' : 'bg-gray-400'}"
                     style="width: ${Math.round(score * 100)}%"></div>
              </div>
              <span class="text-xs font-semibold">${Math.round(score * 100)}%</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-500">置信度</div>
            <div class="text-sm font-semibold">${Math.round(confidence * 100)}%</div>
          </div>
        </div>
      `;
    }

    this.sentimentSection.classList.remove('hidden');
    this.show();
  }

  /**
   * 更新回复建议
   * @param {Object} suggestion - 建议数据 {suggestedReply, confidence, needsHumanReview}
   */
  updateReplySuggestion(suggestion) {
    if (!suggestion || !this.replySection) return;

    const { suggestedReply, confidence, needsHumanReview } = suggestion;

    if (this.elements.replyContent) {
      const reviewBadge = needsHumanReview
        ? '<span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded ml-2">需人工审核</span>'
        : '';

      this.elements.replyContent.innerHTML = `
        <div>
          <div class="mb-2">
            <span class="text-xs text-gray-500">置信度: ${Math.round(confidence * 100)}%</span>
            ${reviewBadge}
          </div>
          <div class="text-gray-800">${this.escapeHtml(suggestedReply)}</div>
        </div>
      `;
    }

    this.replySection.classList.remove('hidden');
    this.show();
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
        <div class="knowledge-item" onclick="window.open('${item.url}', '_blank')">
          <div class="knowledge-item-title">${this.escapeHtml(item.title)}</div>
          <div class="flex items-center justify-between knowledge-item-meta">
            <span>📂 ${this.escapeHtml(item.category)}</span>
            <span class="knowledge-score">匹配度 ${Math.round(item.score * 100)}%</span>
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
          <div class="solution-step-item" data-step="${stepNumber}">
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
          </div>
        `;
      }).join('');
    }

    this.solutionSection.classList.remove('hidden');
    this.show();
  }

  /**
   * 根据问题上下文自动生成解决步骤（纯操作步骤，不包含参考资料）
   * @param {Object} issueContext - 问题上下文
   * @returns {Array} 步骤列表
   */
  generateSolutionSteps(issueContext = {}) {
    const steps = [];

    // 步骤1：确认问题
    steps.push({
      step: '确认问题详情',
      description: `与客户确认${issueContext.description || '问题'}的具体表现、发生时间和影响范围`,
      status: 'pending'
    });

    // 步骤2：查阅资料
    steps.push({
      step: '查阅参考资料',
      description: '参考知识库文档和历史工单，了解标准处理流程和有效解决方案',
      status: 'pending'
    });

    // 步骤3：执行排查
    steps.push({
      step: '执行问题排查',
      description: '根据标准流程进行系统检查，定位问题根因',
      status: 'pending'
    });

    // 步骤4：实施解决方案
    steps.push({
      step: '实施解决方案',
      description: '根据排查结果，执行相应的修复或配置操作',
      status: 'pending'
    });

    // 步骤5：验证结果
    steps.push({
      step: '验证修复效果',
      description: '与客户确认问题是否已解决，系统功能是否恢复正常',
      status: 'pending'
    });

    // 步骤6：记录总结
    steps.push({
      step: '记录问题总结',
      description: '更新工单记录，总结问题原因和解决方案，便于后续参考',
      status: 'pending'
    });

    return steps;
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
        const priorityClass = `task-priority-${task.priority}`;
        const priorityLabel = task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低';

        return `
          <div class="task-item" onclick="window.open('${task.url}', '_blank')">
            <div class="task-item-title">${this.escapeHtml(task.title)}</div>
            <div class="flex items-center justify-between mt-1">
              <span class="task-priority ${priorityClass}">优先级: ${priorityLabel}</span>
              <span class="text-xs text-gray-500">工单 #${task.id}</span>
            </div>
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
    this.hide();
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
