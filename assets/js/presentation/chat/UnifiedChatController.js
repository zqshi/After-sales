import { qs, qsa, on } from '../../core/dom.js';
import { scrollToBottom } from '../../core/scroll.js';
import { showNotification } from '../../core/notifications.js';
import { fetchConversationMessages, fetchConversationAiAnalysis, sendIncomingMessage, setConversationMode } from '../../api.js';
import { buildMessageNode } from './AgentMessageRenderer.js';
import { AgentWebSocket } from '../../infrastructure/websocket/AgentWebSocket.js';
import { AiAssistantPanel } from './AiAssistantPanel.js';
import { AiAnalysisCache } from '../../infrastructure/cache/AiAnalysisCache.js';

const DEFAULT_CUSTOMER = 'customer-001';
const DEFAULT_CONVERSATION = 'conv-001';

export class UnifiedChatController {
  constructor() {
    this.messagesContainer = qs('#chat-messages');
    this.input = qs('#message-input');
    this.sendButton = qs('#send-button');
    this.modeButtons = qsa('[data-chat-mode]');
    this.statusPill = qs('#agent-status-pill');
    this.escalationBanner = qs('#escalation-banner');
    this.escalationText = this.escalationBanner?.querySelector('.escalation-text');
    this.escalationAction = this.escalationBanner?.querySelector('.escalation-action');
    this.agentScopeUrl = window.config?.agentScopeUrl || '';
    this.wsBaseUrl = window.config?.agentScopeWebSocketUrl || '';
    this.websocket = null;
    this.mode = 'agent_auto';
    this.conversationId = DEFAULT_CONVERSATION;
    this.customerId = DEFAULT_CUSTOMER;

    // 初始化AI辅助面板
    this.aiPanel = new AiAssistantPanel();

    // 初始化AI分析缓存（最多缓存10个会话，有效期1分钟）
    this.aiAnalysisCache = new AiAnalysisCache(10, 60000);

    // 存储消息与AI分析的映射关系
    this.messageAnalysisMap = new Map();
  }

  init() {
    this.modeButtons.forEach((button) => button.addEventListener('click', () => this.setMode(button.dataset.chatMode)));
    on(this.sendButton, 'click', () => this.sendInput());
    if (this.input) {
      this.input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          this.sendInput();
        }
      });
    }

    if (this.escalationAction) {
      this.escalationAction.addEventListener('click', () => {
        showNotification('已请求人工介入', 'warning');
        this.websocket?.sendInterrupt();
      });
    }

    // 使用事件委托处理AI辅助icon点击
    if (this.messagesContainer) {
      this.messagesContainer.addEventListener('click', (event) => {
        const aiIcon = event.target.closest('.ai-assist-icon');
        if (aiIcon) {
          const messageRow = aiIcon.closest('.message-row');
          const messageId = messageRow?.dataset.messageId;
          if (messageId) {
            this.showAiAssistForMessage(messageId);
          }
        }
      });
    }

    this.setMode(this.mode);
    this.loadConversation(this.conversationId);
  }

  async setMode(mode = 'agent_auto', saveToBackend = true) {
    if (this.mode === mode && !saveToBackend) {
      return; // 已经是当前模式，无需切换
    }

    this.mode = mode;
    this.modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.chatMode === mode);
    });

    // 保存模式到后端
    if (saveToBackend && this.conversationId) {
      try {
        await setConversationMode(this.conversationId, mode);
        console.log(`[UnifiedChat] 会话 ${this.conversationId} 模式已更新为: ${mode}`);
        showNotification(`已切换到${this.getModeName(mode)}模式`, 'success');
      } catch (error) {
        console.error('[UnifiedChat] setMode error', error);
        showNotification('模式切换失败', 'error');
      }
    }
  }

  getModeName(mode) {
    const modeNames = {
      'agent_auto': 'Agent自动',
      'agent_supervised': 'Agent监督',
      'human_first': '人工优先',
    };
    return modeNames[mode] || mode;
  }

  async sendInput() {
    const text = this.input?.value.trim();
    if (!text) {
      showNotification('请输入消息内容', 'warning');
      return;
    }

    // 1. 立即显示客服回复（右侧样式）
    const messageId = this.appendMessage({
      role: 'agent',
      author: '客服',
      content: text,
      timestamp: new Date().toISOString(),
    });

    if (this.input) {
      this.input.value = '';
    }
    scrollToBottom();

    try {
      // 2. 调用新的IM接入API（替换原有的AgentScope调用）
      const result = await sendIncomingMessage({
        customerId: this.customerId,
        content: text,
        channel: 'web',
        senderId: this.customerId,
      });

      if (!result.success) {
        throw new Error(result.error || '消息处理失败');
      }

      // 3. 更新消息的情绪标记
      if (result.data.message?.sentiment) {
        this.updateMessageSentiment(result.data.message);
      }

      // 4. 显示Agent回复建议（在辅助面板，不追加到聊天区）
      if (result.data.agentSuggestion) {
        this.updateAgentSuggestionPanel(result.data.agentSuggestion);
      }

      // 5. 如果有知识推荐，展示卡片
      if (result.data.analysis?.knowledgeRecommendations?.length > 0) {
        this.appendKnowledgeCards(result.data.analysis.knowledgeRecommendations);
      }

      // 6. 更新右侧分析面板
      if (result.data.analysis) {
        this.updateAnalysisPanel(result.data.analysis);
      }

      scrollToBottom();
    } catch (error) {
      console.error('[UnifiedChat] sendInput error', error);
      showNotification('消息处理失败，请重试', 'error');
    }
  }

  applyMetadata(metadata = {}) {
    if (metadata.mode) {
      this.setMode(metadata.mode);
    }

    if (metadata.escalated || metadata.mode === 'human_first') {
      this.showEscalationBanner(metadata.escalationReason || 'Agent 建议人工介入');
    } else {
      this.hideEscalationBanner();
    }
  }

  appendMessage(message, messageId = null) {
    if (!this.messagesContainer) return;

    // 生成唯一的消息ID
    const finalMessageId = messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const node = buildMessageNode({
      role: message.role,
      author: message.author,
      content: message.content,
      timestamp: message.timestamp,
      messageId: finalMessageId,
      sentiment: message.sentiment, // 传递情绪数据
    });
    this.messagesContainer.appendChild(node);

    return finalMessageId;
  }

  clearMessages() {
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
  }

  async loadConversation(conversationId) {
    if (!conversationId) return;
    this.clearMessages();

    // 清空AI辅助面板和消息映射
    this.aiPanel?.clear();
    this.messageAnalysisMap.clear();

    try {
      const payload = await fetchConversationMessages(conversationId, { limit: 40 });
      const data = payload?.data ?? payload ?? {};
      const items = data?.items ?? data?.messages ?? [];
      if (Array.isArray(items)) {
        items.forEach((entry) => {
          // 修正：后端返回的是 'agent' 或 'customer'，不是 'internal'
          const role = (entry.senderType === 'agent' || entry.senderType === 'internal') ? 'agent' : 'customer';
          const author = entry.senderName || (role === 'agent' ? '客服' : '客户');

          // 调试：打印sentiment数据
          if (entry.sentiment) {
            console.log('[UnifiedChat] 消息情绪数据:', entry.id, entry.sentiment);
          }

          const messageId = this.appendMessage({
            role,
            author,
            content: entry.content,
            timestamp: entry.sentAt ?? entry.createdAt ?? entry.timestamp,
            sentiment: entry.sentiment, // 传递情绪数据
          }, entry.id);

          // 如果有AI分析数据，存储映射
          if (entry.aiAnalysis) {
            this.messageAnalysisMap.set(messageId, entry.aiAnalysis);
          }
        });
      }
    } catch (error) {
      console.warn('[UnifiedChat] 无法加载历史消息', error);
    }

    // 加载AI分析数据（带缓存）
    try {
      console.log('[UnifiedChat] 🔍 开始加载AI分析数据...');
      let analysisData = null;

      // 先尝试从缓存获取
      const cachedAnalysis = this.aiAnalysisCache.get(conversationId);
      if (cachedAnalysis) {
        console.log('[UnifiedChat] ✓ 使用缓存的AI分析数据');
        analysisData = cachedAnalysis;
      } else {
        // 缓存未命中，从API获取
        console.log('[UnifiedChat] 📡 调用API获取AI分析数据:', `/im/conversations/${conversationId}/ai-analysis`);
        const aiAnalysis = await fetchConversationAiAnalysis(conversationId);
        console.log('[UnifiedChat] 📥 API返回数据:', aiAnalysis);
        analysisData = aiAnalysis?.data ?? aiAnalysis ?? {};

        // 存入缓存
        if (analysisData && Object.keys(analysisData).length > 0) {
          this.aiAnalysisCache.set(conversationId, analysisData);
          console.log('[UnifiedChat] ✓ AI分析数据已缓存');
        } else {
          console.warn('[UnifiedChat] ⚠️ API返回空数据');
        }
      }

      // === 临时测试数据 - 确保detectedIssues存在，触发问题模式 ===
      if (!analysisData.detectedIssues || analysisData.detectedIssues.length === 0) {
        console.warn('[临时] 后端未返回问题数据，添加测试问题以触发完整AI辅助');
        analysisData.detectedIssues = [{
          type: 'system_error',
          severity: 'high',
          description: '系统登录失败'
        }];
        // 同时添加负面情感，确保hasIssue为true
        if (!analysisData.lastCustomerSentiment || analysisData.lastCustomerSentiment.emotion !== 'negative') {
          analysisData.lastCustomerSentiment = {
            emotion: 'negative',
            score: 0.75,
            confidence: 0.9
          };
        }
      }
      // === 临时测试数据结束 ===

      // 检查是否有问题需要显示AI辅助（新增逻辑）
      const hasIssue = analysisData.detectedIssues?.length > 0 ||
                       analysisData.lastCustomerSentiment?.emotion === 'negative';

      if (!hasIssue) {
        // 没有检测到问题，仅显示回复建议
        console.log('[UnifiedChat] 未检测到问题，仅显示回复建议');
        if (analysisData.replySuggestion) {
          this.aiPanel?.updateReplySuggestion(analysisData.replySuggestion);
          this.aiPanel?.show('normal');
        } else {
          this.aiPanel?.hide();
        }
        return;
      }

      // 有问题，显示完整的AI辅助信息（问题模式）
      this.aiPanel?.show('issue');

      // 更新情感分析
      if (analysisData.lastCustomerSentiment) {
        this.aiPanel?.updateSentiment(analysisData.lastCustomerSentiment);
      }

      // 更新回复建议
      if (analysisData.replySuggestion) {
        this.aiPanel?.updateReplySuggestion(analysisData.replySuggestion);
      }

      // 自动生成解决步骤
      if (analysisData.detectedIssues?.length > 0) {
        const issueContext = {
          description: analysisData.detectedIssues?.[0]?.description || '当前问题',
          severity: analysisData.detectedIssues?.[0]?.severity || 'medium'
        };
        const solutionSteps = this.aiPanel?.generateSolutionSteps(issueContext);
        if (solutionSteps) {
          this.aiPanel?.updateSolutionSteps(solutionSteps);
        }
      }

      // === 临时测试数据 - 后端API未返回知识库和工单，先用mock数据验证显示 ===
      if (!analysisData.knowledgeRecommendations || analysisData.knowledgeRecommendations.length === 0) {
        console.warn('[临时] 后端未返回知识库数据，使用测试数据');
        analysisData.knowledgeRecommendations = [
          { id: 'kb-001', title: '系统登录故障排查手册', category: '系统运维', score: 0.95, url: '/knowledge/kb-001' },
          { id: 'kb-002', title: 'HTTP 502错误解决方案', category: '故障处理', score: 0.89, url: '/knowledge/kb-002' },
          { id: 'kb-003', title: '网关服务重启操作指南', category: '运维手册', score: 0.82, url: '/knowledge/kb-003' }
        ];
      }
      if (!analysisData.relatedTasks || analysisData.relatedTasks.length === 0) {
        console.warn('[临时] 后端未返回工单数据，使用测试数据');
        analysisData.relatedTasks = [
          { id: 1234, title: '登录接口502错误 - 网关超时', priority: 'high', url: '/tasks/1234' },
          { id: 5678, title: '用户反馈无法访问系统', priority: 'medium', url: '/tasks/5678' },
          { id: 9012, title: '系统响应缓慢，部分功能不可用', priority: 'medium', url: '/tasks/9012' }
        ];
      }
      // === 临时测试数据结束 ===

      // 更新知识库推荐
      if (analysisData.knowledgeRecommendations?.length > 0) {
        this.aiPanel?.updateKnowledgeBase(analysisData.knowledgeRecommendations);
      }

      // 更新关联工单
      if (analysisData.relatedTasks?.length > 0) {
        this.aiPanel?.updateRelatedTasks(analysisData.relatedTasks);
      }
    } catch (error) {
      console.warn('[UnifiedChat] 无法加载AI分析', error);
    }

    scrollToBottom();
    await this.connectWebSocket(conversationId);
  }

  async setConversation(conversationId, details = {}) {
    this.conversationId = conversationId || DEFAULT_CONVERSATION;
    this.customerId = details.customerId || this.customerId;

    // 恢复该会话的mode配置（不保存到后端，因为是恢复）
    if (details.mode) {
      this.setMode(details.mode, false);
    }

    this.updateHeader({
      title: `${details.customerName || '客户'} - ${details.company || '未知公司'}`,
      summary: details.summary || details.note || 'AgentScope 人机协同模式已激活',
      sla: details.sla || 'SLA 未知',
    });
    await this.loadConversation(this.conversationId);
  }

  updateHeader({ title, summary, sla } = {}) {
    const titleNode = qs('#chat-header-title');
    const summaryNode = qs('#chat-header-summary');
    const slaNode = qs('#chat-header-sla');

    if (titleNode && title) {
      titleNode.textContent = title;
    }
    if (summaryNode && summary) {
      summaryNode.innerHTML = `<span>智能摘要：</span><span>${summary}</span>`;
    }
    if (slaNode && sla) {
      slaNode.textContent = sla;
    }
  }

  async connectWebSocket(conversationId) {
    if (!this.wsBaseUrl) {
      this.updateStatus('offline', 'WS 未配置');
      return;
    }

    if (!conversationId) {
      return;
    }

    if (this.websocket) {
      this.websocket.close();
    }

    this.websocket = new AgentWebSocket(this.wsBaseUrl);
    this.websocket.on('open', () => this.updateStatus('online', 'Agent WebSocket 已连接'));
    this.websocket.on('close', () => this.updateStatus('offline', 'Agent WebSocket 已断开'));
    this.websocket.on('message', (payload) => this.handleSocketMessage(payload));
    this.websocket.on('error', () => this.updateStatus('offline', 'Agent WebSocket 错误'));

    try {
      await this.websocket.connect(conversationId);
    } catch (error) {
      console.warn('[UnifiedChat] WebSocket 连接失败', error);
    }
  }

  handleSocketMessage(payload) {
    if (!payload) {
      return;
    }
    if (payload.type === 'agent_suggestions') {
      showNotification('Agent 提供新建议，已同步到前端', 'info');
    }
    if (payload.type === 'human_input_required') {
      this.showEscalationBanner(payload.message || 'Agent 请求人工介入');
    }
  }

  updateStatus(state, label) {
    if (!this.statusPill) {
      return;
    }
    this.statusPill.textContent = label || 'Agent 未连接';
    this.statusPill.classList.remove('agent-status-online', 'agent-status-offline');
    this.statusPill.classList.add(state === 'online' ? 'agent-status-online' : 'agent-status-offline');
  }

  showEscalationBanner(text) {
    if (!this.escalationBanner) {
      return;
    }
    if (this.escalationText) {
      this.escalationText.textContent = text;
    }
    this.escalationBanner.classList.remove('hidden');
  }

  hideEscalationBanner() {
    this.escalationBanner?.classList.add('hidden');
  }

  /**
   * 更新消息的情绪标记
   */
  updateMessageSentiment(message) {
    if (!this.messagesContainer || !message?.sentiment) return;

    const messages = this.messagesContainer.querySelectorAll('.message-bubble');
    const lastMessage = messages[messages.length - 1];

    if (lastMessage) {
      const badge = document.createElement('span');
      badge.className = `sentiment-badge sentiment-${message.sentiment.emotion}`;
      badge.textContent = this.getSentimentIcon(message.sentiment.emotion);
      badge.title = `情绪: ${message.sentiment.emotion} (${Math.round(message.sentiment.score * 100)}%)`;
      lastMessage.appendChild(badge);
    }
  }

  /**
   * 获取情绪图标
   */
  getSentimentIcon(emotion) {
    const icons = {
      positive: '😊',
      neutral: '😐',
      negative: '😟'
    };
    return icons[emotion] || '😐';
  }

  /**
   * 添加知识卡片
   */
  appendKnowledgeCards(recommendations) {
    if (!this.messagesContainer || !Array.isArray(recommendations)) return;

    recommendations.forEach(rec => {
      const card = this.createKnowledgeCard(rec);
      this.messagesContainer.appendChild(card);
    });
  }

  /**
   * 创建知识卡片元素
   */
  createKnowledgeCard(recommendation) {
    const card = document.createElement('div');
    card.className = 'knowledge-card';
    card.innerHTML = `
      <div class="card-header">
        <span class="card-icon">📖</span>
        <span class="card-category">${this.escapeHtml(recommendation.category)}</span>
      </div>
      <h4 class="card-title">${this.escapeHtml(recommendation.title)}</h4>
      <div class="card-footer">
        <span class="card-score">匹配度: ${Math.round(recommendation.score * 100)}%</span>
        <a href="${recommendation.url}" target="_blank" class="card-link">查看详情 →</a>
      </div>
    `;
    return card;
  }

  /**
   * 更新分析面板
   */
  updateAnalysisPanel(analysis) {
    const panel = document.querySelector('#agent-analysis-panel');
    if (!panel) return;

    // 更新需求列表
    const reqSection = panel.querySelector('.requirements-list');
    if (reqSection && analysis.requirements) {
      reqSection.innerHTML = analysis.requirements.map(req => `
        <div class="requirement-item">
          <span class="req-badge ${req.priority}">${req.priority}</span>
          <span class="req-title">${this.escapeHtml(req.title)}</span>
        </div>
      `).join('');
    }

    // 更新知识推荐
    const kbSection = panel.querySelector('.knowledge-recommendations');
    if (kbSection && analysis.knowledgeRecommendations) {
      kbSection.innerHTML = analysis.knowledgeRecommendations.map(item => `
        <div class="recommendation-item">
          <a href="${item.url}" target="_blank">${this.escapeHtml(item.title)}</a>
          <span class="score">${Math.round(item.score * 100)}%</span>
        </div>
      `).join('');
    }

    // 更新工单链接
    const taskSection = panel.querySelector('.related-tasks');
    if (taskSection && analysis.relatedTasks) {
      taskSection.innerHTML = analysis.relatedTasks.map(task => `
        <div class="task-item">
          <a href="${task.url}">${this.escapeHtml(task.title)}</a>
        </div>
      `).join('');
    }
  }

  /**
   * HTML转义工具函数
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 显示特定消息的AI辅助信息
   * @param {string} messageId - 消息ID
   */
  showAiAssistForMessage(messageId) {
    const analysisData = this.messageAnalysisMap.get(messageId);

    if (!analysisData) {
      console.warn('[UnifiedChat] 未找到消息的AI分析数据', messageId);
      showNotification('该消息暂无AI分析数据', 'info');
      return;
    }

    // 检查是否有问题
    const hasIssue = analysisData.detectedIssues?.length > 0 ||
                     analysisData.sentiment?.emotion === 'negative';

    // 清空当前面板
    this.aiPanel?.clear();

    // 根据是否有问题决定显示模式
    const mode = hasIssue ? 'issue' : 'normal';
    this.aiPanel?.show(mode);

    // 更新情感分析
    if (analysisData.sentiment) {
      this.aiPanel?.updateSentiment(analysisData.sentiment);
    }

    // 更新回复建议
    if (analysisData.replySuggestion) {
      this.aiPanel?.updateReplySuggestion(analysisData.replySuggestion);
    }

    // 自动生成解决步骤（仅问题模式）
    if (hasIssue) {
      const issueContext = {
        description: analysisData.detectedIssues?.[0]?.description || '当前问题',
        severity: analysisData.detectedIssues?.[0]?.severity || 'medium'
      };
      const solutionSteps = this.aiPanel?.generateSolutionSteps(issueContext);
      if (solutionSteps) {
        this.aiPanel?.updateSolutionSteps(solutionSteps);
      }
    }

    // === 临时测试数据 - 后端API未返回知识库和工单，先用mock数据验证显示 ===
    if (hasIssue && (!analysisData.knowledgeRecommendations || analysisData.knowledgeRecommendations.length === 0)) {
      console.warn('[临时] 后端未返回知识库数据，使用测试数据');
      analysisData.knowledgeRecommendations = [
        { id: 'kb-001', title: '系统登录故障排查手册', category: '系统运维', score: 0.95, url: '/knowledge/kb-001' },
        { id: 'kb-002', title: 'HTTP 502错误解决方案', category: '故障处理', score: 0.89, url: '/knowledge/kb-002' },
        { id: 'kb-003', title: '网关服务重启操作指南', category: '运维手册', score: 0.82, url: '/knowledge/kb-003' }
      ];
    }
    if (hasIssue && (!analysisData.relatedTasks || analysisData.relatedTasks.length === 0)) {
      console.warn('[临时] 后端未返回工单数据，使用测试数据');
      analysisData.relatedTasks = [
        { id: 1234, title: '登录接口502错误 - 网关超时', priority: 'high', url: '/tasks/1234' },
        { id: 5678, title: '用户反馈无法访问系统', priority: 'medium', url: '/tasks/5678' },
        { id: 9012, title: '系统响应缓慢，部分功能不可用', priority: 'medium', url: '/tasks/9012' }
      ];
    }
    // === 临时测试数据结束 ===

    // 更新知识库推荐（仅问题模式）
    if (hasIssue && analysisData.knowledgeRecommendations?.length > 0) {
      this.aiPanel?.updateKnowledgeBase(analysisData.knowledgeRecommendations);
    }

    // 更新关联工单（仅问题模式）
    if (hasIssue && analysisData.relatedTasks?.length > 0) {
      this.aiPanel?.updateRelatedTasks(analysisData.relatedTasks);
    }

    // 滚动到AI辅助面板
    const panel = this.aiPanel?.panel;
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * 更新Agent建议面板
   */
  updateAgentSuggestionPanel(suggestion) {
    const panel = document.querySelector('.reply-suggestions');
    if (!panel) return;

    // 清空现有建议
    panel.innerHTML = `
      <h4 class="text-sm font-medium text-gray-700 mb-2">AI回复建议（内部参考，不会自动发送）：</h4>
      <div class="suggestion-card p-3 bg-white rounded-lg border border-gray-200 mb-2">
        <div class="flex items-start">
          <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <i class="fa fa-lightbulb-o"></i>
          </div>
          <div class="ml-3 flex-1">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-gray-700">AI建议回复</span>
              <span class="text-xs text-gray-500">置信度: ${Math.round(suggestion.confidence * 100)}%</span>
            </div>
            <p class="text-sm text-gray-800 mb-2">${this.escapeHtml(suggestion.suggestedReply)}</p>
            <div class="flex gap-2">
              <button class="adopt-suggestion-btn px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark"
                      data-suggestion="${this.escapeHtml(suggestion.suggestedReply)}">
                采纳建议
              </button>
              <button class="text-xs text-gray-500 hover:text-gray-700">编辑后采纳</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 绑定采纳按钮事件
    const adoptBtn = panel.querySelector('.adopt-suggestion-btn');
    if (adoptBtn) {
      adoptBtn.addEventListener('click', (e) => {
        const suggestionText = e.target.dataset.suggestion;
        if (this.input) {
          this.input.value = suggestionText;
          this.input.focus();
          showNotification('已采纳AI建议，可编辑后发送', 'success');
        }
      });
    }

    // 如果需要人工审核，显示提示
    if (suggestion.needsHumanReview) {
      const alert = document.createElement('div');
      alert.className = 'p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded text-xs text-yellow-800 mt-2';
      alert.innerHTML = `<strong>⚠️ 需要人工审核：</strong>${this.escapeHtml(suggestion.reason || '检测到复杂需求')}`;
      panel.appendChild(alert);
    }
  }
}
