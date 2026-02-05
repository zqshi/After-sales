import { qs, qsa, on } from '../../core/dom.js';
import { scrollToBottom } from '../../core/scroll.js';
import { showNotification } from '../../core/notifications.js';
import { fetchConversationMessages, fetchConversationAiAnalysis, sendIncomingMessage, setConversationMode, submitAgentReview } from '../../api.js';
import { buildMessageNode } from './AgentMessageRenderer.js';
import { AgentWebSocket } from '../../infrastructure/websocket/AgentWebSocket.js';
import { AiAssistantPanel } from './AiAssistantPanel.js';
import { AiAnalysisCache } from '../../infrastructure/cache/AiAnalysisCache.js';
import { LRUCache } from '../../infrastructure/cache/LRUCache.js';
import { openAiAssistantPanel } from '../../ui/layout.js';

const DEFAULT_CUSTOMER = null;
const DEFAULT_CONVERSATION = null;

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

    // 会话消息缓存（避免切换时重复拉取）
    this.messagesCache = new LRUCache(20);
    this.messageFetchInFlight = new Map();

    // 存储消息与AI分析的映射关系
    this.messageAnalysisMap = new Map();
    this.lastCustomerMessageId = null;
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

    this.setMode(this.mode);
    if (this.conversationId) {
      this.loadConversation(this.conversationId);
    }
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
    if (!this.conversationId || !this.customerId) {
      showNotification('请先选择会话', 'warning');
      return;
    }

    // 1. 立即显示客服回复（右侧样式）
    const messageId = this.appendMessage({
      role: 'agent',
      author: '客服',
      content: text,
      timestamp: new Date().toISOString(),
    });
    this.storeMessage(this.conversationId, {
      id: messageId,
      senderType: 'agent',
      senderName: '客服',
      content: text,
      sentAt: new Date().toISOString(),
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
        mode: this.mode,
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
        if (result.data.agentSuggestion.needsHumanReview && result.data.agentSuggestion.reviewRequestId) {
          this.renderReviewRequest({
            reviewId: result.data.agentSuggestion.reviewRequestId,
            suggestion: result.data.agentSuggestion,
            confidence: result.data.agentSuggestion.confidence,
          });
        }
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
    if (!this.messagesContainer) {
      return;
    }

    // 生成唯一的消息ID
    const finalMessageId = messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const node = buildMessageNode({
      role: message.role,
      author: message.author,
      content: message.content,
      timestamp: message.timestamp,
      messageId: finalMessageId,
      metadata: message.metadata || {},
      sentiment: message.sentiment, // 传递情绪数据
    });
    this.messagesContainer.appendChild(node);

    if (message.role === 'customer') {
      this.lastCustomerMessageId = finalMessageId;
      if (message.sentiment) {
        this.updateMessageIssueIndicator(finalMessageId, { sentiment: message.sentiment });
      }
    }

    return finalMessageId;
  }

  updateMessageIssueIndicator(messageId, analysisData) {
    if (!this.messagesContainer || !messageId) {
      return;
    }
    const messageRow = this.messagesContainer.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageRow || messageRow.dataset.senderRole !== 'customer') {
      return;
    }

    const negativeEmotions = ['negative', 'angry', 'frustrated', 'anxious', 'urgent'];
    const sentimentEmotion = analysisData?.sentiment?.emotion || analysisData?.lastCustomerSentiment?.emotion;
    const hasIssue = analysisData?.detectedIssues?.length > 0 ||
      negativeEmotions.includes(sentimentEmotion);

    const issueTags = messageRow.querySelectorAll('.issue-tag');
    const messageEmotion = messageRow.dataset.sentiment || analysisData?.sentiment?.emotion || analysisData?.lastCustomerSentiment?.emotion;
    const isNegativeEmotion = negativeEmotions.includes(messageEmotion) || (!messageEmotion && analysisData?.detectedIssues?.length > 0);
    if (hasIssue) {
      messageRow.dataset.hasIssue = 'true';
      issueTags.forEach((tag) => {
        tag.style.display = isNegativeEmotion ? 'inline-flex' : 'none';
      });
    } else {
      delete messageRow.dataset.hasIssue;
      issueTags.forEach((tag) => {
        tag.style.display = 'none';
      });
    }
  }

  attachConversationIssueToLatestMessage(analysisData) {
    if (!this.lastCustomerMessageId || !analysisData) {
      return;
    }
    if (this.messageAnalysisMap.has(this.lastCustomerMessageId)) {
      const existing = this.messageAnalysisMap.get(this.lastCustomerMessageId);
      this.updateMessageIssueIndicator(this.lastCustomerMessageId, existing);
      return;
    }
    const mappedAnalysis = {
      ...analysisData,
      sentiment: analysisData.sentiment || analysisData.lastCustomerSentiment,
    };
    this.messageAnalysisMap.set(this.lastCustomerMessageId, mappedAnalysis);
    this.updateMessageIssueIndicator(this.lastCustomerMessageId, mappedAnalysis);
  }

  clearMessages() {
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
  }

  async primeConversationCache(conversations = []) {
    if (!Array.isArray(conversations) || !conversations.length) {
      return;
    }

    const ids = conversations
      .map((conv) => conv?.conversationId)
      .filter(Boolean);

    if (!ids.length) {
      return;
    }

    await Promise.allSettled(ids.map((id) => this.fetchAndCacheConversationMessages(id)));
  }

  async loadConversation(conversationId) {
    if (!conversationId) {
      return;
    }
    this.clearMessages();

    // 清空AI辅助面板和消息映射
    this.aiPanel?.clear();
    this.messageAnalysisMap.clear();
    this.lastCustomerMessageId = null;

    try {
      const items = await this.fetchAndCacheConversationMessages(conversationId);
      if (Array.isArray(items)) {
        this.renderConversationMessages(items);
        // 消息回执链路已移除，不再发送 read 回执
      }
    } catch (error) {
      console.warn('[UnifiedChat] 无法加载历史消息', error);
      showNotification('历史消息加载失败，请稍后重试', 'warning');
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

      // 检查是否有问题需要显示AI入口
      const hasIssue = analysisData.detectedIssues?.length > 0 ||
                       ['negative', 'angry', 'frustrated', 'anxious', 'urgent'].includes(
                         analysisData.lastCustomerSentiment?.emotion,
                       );

      if (hasIssue) {
        this.attachConversationIssueToLatestMessage(analysisData);
      }

      this.aiPanel?.hide();
    } catch (error) {
      console.warn('[UnifiedChat] 无法加载AI分析', error);
      showNotification('AI分析加载失败，请稍后重试', 'warning');
    }

    scrollToBottom();
    await this.connectWebSocket(conversationId);
  }

  async setConversation(conversationId, details = {}) {
    if (!conversationId) {
      this.conversationId = null;
      this.customerId = null;
      this.updateHeader({
        title: '暂无会话',
        summary: '请选择左侧会话开始处理',
        sla: '客户等级未知',
      });
      this.clearMessages();
      return;
    }
    this.conversationId = conversationId;
    this.customerId = details.customerId || this.customerId;

    // 恢复该会话的mode配置（不保存到后端，因为是恢复）
    if (details.mode) {
      this.setMode(details.mode, false);
    }

    const title =
      details.company && details.company !== '未知公司'
        ? `${details.customerName || '客户'} - ${details.company}`
        : details.customerName || '客户';

    this.updateHeader({
      title,
      summary: details.summary || details.note || 'AgentScope 人机协同模式已激活',
      sla: details.sla || '客户等级未知',
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
      if (payload.suggestions) {
        this.renderAgentSuggestions(payload);
      }
    }
    if (payload.type === 'human_input_required') {
      this.showEscalationBanner(payload.message || 'Agent 请求人工介入');
      this.renderHumanInputPrompt(payload);
    }
    if (payload.type === 'review_request') {
      this.renderReviewRequest(payload);
    }
    if (payload.type === 'domain_event') {
      this.handleDomainEvent(payload.event);
    }

    const incoming = this.extractIncomingMessage(payload);
    if (incoming) {
      this.handleIncomingMessage(incoming);
    }
  }

  handleDomainEvent(event) {
    if (!event || typeof event !== 'object') {
      return;
    }
    const eventType = event.eventType || event.type;
    if (eventType === 'AgentReviewRequested') {
      const payload = event.payload || {};
      this.renderReviewRequest({
        reviewId: payload.reviewId,
        suggestion: payload.suggestion,
        confidence: payload.confidence,
      });
    }
    if (eventType === 'ProblemResolved') {
      showNotification('问题已标记为解决，已触发质检流程', 'success');
    }
    if (eventType === 'AgentReviewCompleted') {
      showNotification('人工审核已完成', 'success');
    }
  }

  showActionPanel({ title, badge, desc, contentHtml }) {
    openAiAssistantPanel();
    const panel = document.querySelector('#ai-assistant-panel');
    const replyPanel = document.querySelector('#ai-panel-reply');
    const solutionPanel = document.querySelector('#ai-panel-solution');
    const actionPanel = document.querySelector('#ai-panel-action');
    const clarifyPanel = document.querySelector('#ai-panel-clarify');
    const requirementsPanel = document.querySelector('#ai-panel-requirements');
    if (panel) {
      panel.classList.remove('hidden');
    }
    if (replyPanel) {
      replyPanel.classList.add('hidden');
    }
    if (solutionPanel) {
      solutionPanel.classList.add('hidden');
    }
    if (clarifyPanel) {
      clarifyPanel.classList.add('hidden');
    }
    if (requirementsPanel) {
      requirementsPanel.classList.add('hidden');
    }
    if (actionPanel) {
      actionPanel.classList.remove('hidden');
    }

    const titleEl = document.querySelector('#ai-assistant-title');
    const badgeEl = document.querySelector('#ai-assistant-badge');
    const descEl = document.querySelector('#ai-assistant-desc');
    if (titleEl) {
      titleEl.textContent = title || '协作面板';
    }
    if (badgeEl) {
      badgeEl.textContent = badge || '人工';
    }
    if (descEl) {
      descEl.textContent = desc || '';
    }

    const contentEl = document.querySelector('#ai-action-content');
    if (contentEl) {
      contentEl.innerHTML = contentHtml || '';
    }
  }

  renderReviewRequest(payload) {
    const suggestion = payload?.suggestion || {};
    const reply = suggestion.suggestedReply || payload?.agent_response || '';
    const confidence = suggestion.confidence || payload?.confidence || 0;
    const reviewId = payload?.reviewId || payload?.review_id || suggestion.reviewRequestId;
    if (!reviewId) {
      // 如果是AgentScope的审核请求，允许仅展示不落库的提示
      if (payload?.agent_response) {
        this.showActionPanel({
          title: '人工审核',
          badge: '审核',
          desc: 'Agent 请求人工确认，请人工处理。',
          contentHtml: `
            <div class="panel-card space-y-3">
              <div class="text-sm font-semibold text-gray-800">人工审核请求</div>
              <div class="text-xs text-gray-500">置信度：${Math.round(confidence * 100)}%</div>
              <div class="text-sm text-gray-800 whitespace-pre-line">${this.escapeHtml(reply)}</div>
              <div class="text-xs text-gray-500">请在回复区编辑后手动发送。</div>
            </div>
          `,
        });
      }
      return;
    }

    const tasks = Array.isArray(suggestion.recommendedTasks) ? suggestion.recommendedTasks : [];
    const taskListHtml = tasks.length
      ? `<div class="mt-2 space-y-1">
          ${tasks.map((task) => `<div class="text-xs text-gray-600">• ${this.escapeHtml(task.title || '')} (${task.priority || 'medium'})</div>`).join('')}
        </div>`
      : '<div class="text-xs text-gray-500 mt-2">暂无推荐工单</div>';

    const contentHtml = `
      <div class="panel-card space-y-3">
        <div class="text-sm font-semibold text-gray-800">人工审核请求</div>
        <div class="text-xs text-gray-500">置信度：${Math.round(confidence * 100)}%</div>
        <div class="text-sm text-gray-800 whitespace-pre-line">${this.escapeHtml(reply)}</div>
        ${taskListHtml}
        <div class="space-y-2">
          <label class="text-xs text-gray-500">审核备注</label>
          <textarea id="review-note-input" rows="3" class="w-full border border-gray-200 rounded-md px-3 py-2 text-xs" placeholder="填写审核意见"></textarea>
        </div>
        <label class="flex items-center gap-2 text-xs text-gray-600">
          <input id="review-create-tasks" type="checkbox" class="rounded border-gray-300" checked>
          确认后自动创建推荐工单
        </label>
        <div class="flex gap-2">
          <button id="review-approve-btn" class="px-3 py-2 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark">确认通过</button>
          <button id="review-reject-btn" class="px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:border-primary">驳回建议</button>
        </div>
      </div>
    `;

    this.showActionPanel({
      title: '人工审核',
      badge: '审核',
      desc: '确认Agent建议后可同步创建工单并更新流程状态。',
      contentHtml,
    });

    const approveBtn = document.querySelector('#review-approve-btn');
    const rejectBtn = document.querySelector('#review-reject-btn');
    const noteInput = document.querySelector('#review-note-input');
    const taskToggle = document.querySelector('#review-create-tasks');

    const submit = async (status) => {
      try {
        await submitAgentReview({
          reviewId,
          status,
          reviewerNote: noteInput?.value?.trim?.(),
          createTasks: taskToggle?.checked ?? true,
        });
        showNotification('审核结果已提交', 'success');
      } catch (error) {
        console.warn('[UnifiedChat] submit review failed', error);
        showNotification('审核提交失败，请重试', 'error');
      }
    };

    if (approveBtn) {
      approveBtn.addEventListener('click', () => submit('approved'));
    }
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => submit('rejected'));
    }
  }

  renderHumanInputPrompt(payload) {
    const message = payload?.message || '需要人工输入处理意见';
    const contentHtml = `
      <div class="panel-card space-y-3">
        <div class="text-sm font-semibold text-gray-800">人工介入</div>
        <div class="text-xs text-gray-500">${this.escapeHtml(message)}</div>
        <textarea id="human-input-text" rows="3" class="w-full border border-gray-200 rounded-md px-3 py-2 text-xs" placeholder="输入回复或处理结果"></textarea>
        <div class="flex gap-2">
          <button id="human-input-submit" class="px-3 py-2 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark">提交给Agent</button>
        </div>
      </div>
    `;

    this.showActionPanel({
      title: '人工介入',
      badge: '人工',
      desc: 'Agent 请求人工确认，请填写处理意见。',
      contentHtml,
    });

    const submitBtn = document.querySelector('#human-input-submit');
    const input = document.querySelector('#human-input-text');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const content = input?.value?.trim?.() || '';
        if (!content) {
          showNotification('请输入处理意见', 'warning');
          return;
        }
        this.websocket?.sendHumanInput(content, payload?.metadata || {});
        showNotification('已提交给Agent', 'success');
      });
    }
  }

  renderAgentSuggestions(payload) {
    const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
    if (!suggestions.length) {
      return;
    }
    const contentHtml = `
      <div class="panel-card space-y-2">
        <div class="text-sm font-semibold text-gray-800">Agent建议资料</div>
        ${suggestions
    .map((item) => `<div class="text-xs text-gray-600">• ${this.escapeHtml(item.title || item.name || '')}</div>`)
    .join('')}
      </div>
    `;
    this.showActionPanel({
      title: '协作建议',
      badge: '建议',
      desc: 'Agent 已检索相关资料，供人工参考。',
      contentHtml,
    });
  }

  extractIncomingMessage(payload) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    if (payload.type && !['message', 'incoming_message', 'new_message', 'chat_message'].includes(payload.type)) {
      return null;
    }

    const message = payload.message || payload.data?.message || payload.data;
    if (!message || typeof message !== 'object') {
      return null;
    }

    const conversationId = payload.conversationId || message.conversationId || payload.data?.conversationId || this.conversationId;
    if (!conversationId) {
      return null;
    }

    return { conversationId, message };
  }

  handleIncomingMessage({ conversationId, message }) {
    if (!conversationId || !message) {
      return;
    }

    const normalized = this.normalizeMessage(message);
    if (!normalized) {
      return;
    }

    const stored = this.storeMessage(conversationId, normalized);
    if (!stored) {
      return;
    }

    if (conversationId === this.conversationId) {
      const role = (normalized.senderType === 'agent' || normalized.senderType === 'internal') ? 'agent' : 'customer';
      const author = normalized.senderName || (role === 'agent' ? '客服' : '客户');
      const messageId = this.appendMessage({
        role,
        author,
        content: normalized.content,
        timestamp: normalized.sentAt ?? normalized.createdAt ?? normalized.timestamp,
        metadata: normalized.metadata || {},
        sentiment: normalized.sentiment,
      }, normalized.id);

      if (normalized.aiAnalysis) {
        this.messageAnalysisMap.set(messageId, normalized.aiAnalysis);
        this.updateMessageIssueIndicator(messageId, normalized.aiAnalysis);
      }

      if (normalized.sentiment) {
        this.updateMessageSentiment({ sentiment: normalized.sentiment });
      }

      scrollToBottom();
    }
  }

  async fetchAndCacheConversationMessages(conversationId, options = {}) {
    if (!conversationId) {
      return [];
    }

    if (this.messagesCache.has(conversationId)) {
      const cached = this.messagesCache.get(conversationId);
      return cached?.items || [];
    }

    if (this.messageFetchInFlight.has(conversationId)) {
      return await this.messageFetchInFlight.get(conversationId);
    }

    const { limit = 40 } = options;

    const fetchPromise = (async () => {
      const payload = await fetchConversationMessages(conversationId, { limit });
      const data = payload?.data ?? payload ?? {};
      const items = Array.isArray(data?.items) ? data.items : (data?.messages || []);
      const normalized = Array.isArray(items) ? items.map((entry) => this.normalizeMessage(entry)).filter(Boolean) : [];

      const cacheEntry = this.buildCacheEntry(normalized);
      this.messagesCache.set(conversationId, cacheEntry);
      return normalized;
    })()
      .finally(() => {
        this.messageFetchInFlight.delete(conversationId);
      });

    this.messageFetchInFlight.set(conversationId, fetchPromise);
    return await fetchPromise;
  }

  buildCacheEntry(items = []) {
    const ids = new Set();
    items.forEach((entry) => {
      if (entry?.id) {
        ids.add(entry.id);
      }
    });
    return { items, ids };
  }

  storeMessage(conversationId, entry) {
    if (!conversationId || !entry) {
      return false;
    }

    const normalized = this.normalizeMessage(entry);
    if (!normalized) {
      return false;
    }

    const cacheEntry = this.messagesCache.get(conversationId) || { items: [], ids: new Set() };
    if (normalized.id && cacheEntry.ids.has(normalized.id)) {
      return false;
    }

    cacheEntry.items.push(normalized);
    if (normalized.id) {
      cacheEntry.ids.add(normalized.id);
    }
    this.messagesCache.set(conversationId, cacheEntry);
    return true;
  }

  normalizeMessage(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const senderType = entry.senderType || entry.role || (entry.senderRole === 'agent' ? 'agent' : entry.senderRole);
    return {
      id: entry.id || entry.messageId || entry.msgId,
      senderType: senderType || 'customer',
      senderName: entry.senderName || entry.author,
      content: entry.content || entry.text || '',
      sentAt: entry.sentAt || entry.createdAt || entry.timestamp,
      createdAt: entry.createdAt,
      timestamp: entry.timestamp,
      metadata: entry.metadata || {},
      sentiment: entry.sentiment,
      aiAnalysis: entry.aiAnalysis,
    };
  }

  renderConversationMessages(items = []) {
    items.forEach((entry) => {
      const role = (entry.senderType === 'agent' || entry.senderType === 'internal') ? 'agent' : 'customer';
      const author = entry.senderName || (role === 'agent' ? '客服' : '客户');

      if (entry.sentiment) {
        console.log('[UnifiedChat] 消息情绪数据:', entry.id, entry.sentiment);
      }

      const messageId = this.appendMessage({
        role,
        author,
        content: entry.content,
        timestamp: entry.sentAt ?? entry.createdAt ?? entry.timestamp,
        metadata: entry.metadata || {},
        sentiment: entry.sentiment,
      }, entry.id);

      if (entry.aiAnalysis) {
        this.messageAnalysisMap.set(messageId, entry.aiAnalysis);
        this.updateMessageIssueIndicator(messageId, entry.aiAnalysis);
      }
    });
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
    if (!this.messagesContainer || !message?.sentiment) {
      return;
    }

    const customerRows = this.messagesContainer.querySelectorAll('.message-row[data-sender-role="customer"]');
    const lastCustomerRow = customerRows[customerRows.length - 1];
    const lastMessage = lastCustomerRow?.querySelector('.message-bubble');

    if (lastCustomerRow && message.sentiment?.emotion) {
      lastCustomerRow.dataset.sentiment = message.sentiment.emotion;
      const messageId = lastCustomerRow.dataset.messageId;
      if (messageId) {
        this.updateMessageIssueIndicator(messageId, { sentiment: message.sentiment });
      }
    }

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
      negative: '😟',
      urgent: '⚠️',
      anxious: '😰',
      angry: '😠',
      frustrated: '😤',
    };
    return icons[emotion] || '😐';
  }

  /**
   * 添加知识卡片
   */
  appendKnowledgeCards(recommendations) {
    if (!this.messagesContainer || !Array.isArray(recommendations)) {
      return;
    }

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
    if (!panel) {
      return;
    }

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
                     ['negative', 'angry', 'frustrated', 'anxious', 'urgent'].includes(
                       analysisData.sentiment?.emotion,
                     );

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
    if (analysisData.replySuggestion?.suggestedReply) {
      this.aiPanel?.updateReplySuggestion(analysisData.replySuggestion);
    }

    // 自动生成解决步骤（仅问题模式）
    if (hasIssue && analysisData.detectedIssues?.length > 0) {
      const solutionSteps = analysisData.detectedIssues.map((issue, index) => ({
        step: issue.type || `问题 ${index + 1}`,
        description: issue.description || '暂无数据',
        status: 'pending',
      }));
      this.aiPanel?.updateSolutionSteps(solutionSteps);
    }

    // 更新知识库推荐（仅问题模式）
    if (hasIssue && analysisData.knowledgeRecommendations?.length > 0) {
      this.aiPanel?.updateKnowledgeBase(analysisData.knowledgeRecommendations);
    }

    // 更新关联工单（仅问题模式）
    if (hasIssue && analysisData.relatedTasks?.length > 0) {
      this.aiPanel?.updateRelatedTasks(analysisData.relatedTasks);
    }

    // 动态面板改为由工具入口触发显示
  }

  /**
   * 更新Agent建议面板
   */
  updateAgentSuggestionPanel(suggestion) {
    const panel = document.querySelector('.reply-suggestions');
    if (!panel) {
      return;
    }

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
