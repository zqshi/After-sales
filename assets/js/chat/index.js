import { qs, qsa, on } from '../core/dom.js';
import { scrollToBottom } from '../core/scroll.js';
import { showNotification } from '../core/notifications.js';
import { UnifiedChatController } from '../presentation/chat/UnifiedChatController.js';
import {
  analyzeRequirementText,
  loadRequirementsData,
} from '../requirements/index.js';
import { updateCustomerContext } from '../customer/index.js';
import {
  fetchConversations,
  fetchSentimentAnalysis,
  isApiEnabled,
} from '../api.js';

const outboundEnabled = false;
let currentConversationId = 'conv-001';
let chatController = null;

/**
 * 根据情绪类型返回对应的emoji图标
 * @param {Object|string|null} sentiment - 情绪对象或情绪字符串
 * @returns {string} emoji图标
 */
function getSentimentIcon(sentiment) {
  if (!sentiment) return '';

  const sentimentType = typeof sentiment === 'string' ? sentiment : sentiment.type || sentiment.sentiment;

  const iconMap = {
    // 积极情绪
    'positive': '😊',
    'happy': '😊',
    'satisfied': '😊',
    'excited': '🤩',
    'grateful': '🙏',

    // 中性情绪
    'neutral': '😐',
    'calm': '😌',

    // 消极情绪
    'negative': '😟',
    'unhappy': '😔',
    'frustrated': '😤',
    'angry': '😡',
    'anxious': '😰',
    'worried': '😟',
    'confused': '😕',

    // 紧急
    'urgent': '⚠️',
    'emergency': '🚨',
  };

  return iconMap[sentimentType?.toLowerCase()] || '';
}

export function initChat() {
  chatController = new UnifiedChatController();
  chatController.init();
  initConversationList();
  initInputEvents();
  initConversationEndDetection();
  initConversationFilters();
  scrollToBottom();
}

function initConversationList() {
  loadConversationList();
}

async function loadConversationList() {
  const container = qs('.conversation-list');
  if (!container) {
    return;
  }

  if (isApiEnabled()) {
    try {
      const response = await fetchConversations({
        agentId: window.config?.userId,
        status: 'active',
        pageSize: 8,
      });
      const payload = response?.data ?? response;
      const items = payload?.items ?? payload?.conversations ?? [];
      if (items.length) {
        renderConversationItems(container, items);
      }
    } catch (e) {
      console.warn('[chat] fetch conversations failed', e);
    }
  }

  bindConversationEvents();
}

function bindConversationEvents() {
  const conversationItems = qsa('.conversation-item');
  if (!conversationItems.length) {
    return;
  }

  conversationItems.forEach((item) => {
    on(item, 'click', () => {
      conversationItems.forEach((node) => node.classList.remove('bg-blue-50'));
      item.classList.add('bg-blue-50');
      const conversationId = item.getAttribute('data-id') || 'conv-001';
      currentConversationId = conversationId;
      updateChatContent(conversationId);
      updateCustomerContext(conversationId);
    });
  });

  const active = conversationItems.find((node) => node.classList.contains('bg-blue-50'));
  if (active) {
    const activeId = active.getAttribute('data-id') || 'conv-001';
    currentConversationId = activeId;
    updateChatContent(activeId);
    updateCustomerContext(activeId);
  }
}

function renderConversationItems(container, conversations) {
  const html = conversations
    .map((conv, index) => createConversationMarkup(conv, index === 0))
    .join('');
  container.innerHTML = html;

  // 自动获取情绪分析（异步，不阻塞渲染）
  if (isApiEnabled()) {
    conversations.forEach(conv => {
      loadSentimentForConversation(conv.conversationId);
    });
  }
}

/**
 * 加载对话的情绪分析并更新UI
 * @param {string} conversationId - 对话ID
 */
async function loadSentimentForConversation(conversationId) {
  try {
    const result = await fetchSentimentAnalysis(conversationId);
    const sentiment = result?.sentiment || result?.data?.sentiment;

    if (sentiment) {
      updateConversationSentiment(conversationId, sentiment);
    }
  } catch (err) {
    console.warn(`[chat] Failed to load sentiment for ${conversationId}:`, err);
  }
}

/**
 * 更新对话列表中的情绪icon
 * @param {string} conversationId - 对话ID
 * @param {Object} sentiment - 情绪数据
 */
function updateConversationSentiment(conversationId, sentiment) {
  const conversationItem = qs(`.conversation-item[data-id="${conversationId}"]`);
  if (!conversationItem) return;

  const sentimentIcon = getSentimentIcon(sentiment);
  if (!sentimentIcon) return;

  // 查找或创建情绪icon容器
  const existingIcon = conversationItem.querySelector('.sentiment-icon');
  if (existingIcon) {
    existingIcon.textContent = sentimentIcon;
    existingIcon.setAttribute('title', sentiment.label || sentiment.type || '情绪');
  } else {
    // 在SLA badge后面插入情绪icon
    const badgeContainer = conversationItem.querySelector('.mt-2 .flex');
    if (badgeContainer) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'sentiment-icon';
      iconSpan.textContent = sentimentIcon;
      iconSpan.setAttribute('title', sentiment.label || sentiment.type || '情绪');

      // 插入到第一个子元素（SLA badge容器）之后
      const firstChild = badgeContainer.firstElementChild;
      if (firstChild?.nextSibling) {
        badgeContainer.insertBefore(iconSpan, firstChild.nextSibling);
      } else {
        badgeContainer.appendChild(iconSpan);
      }
    }
  }
}

function createConversationMarkup(conv, isActive) {
  const name = conv.customerName || '客户';
  const initials = name.charAt(0) || '客';
  const lastMessage = conv.lastMessage || '正在加载最新消息...';
  const updatedAt = conv.updatedAt
    ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';
  const channelLabel = (conv.channel || 'IM').toUpperCase();
  const severity = conv.severity || 'normal';
  const badgeClass =
    severity === 'high'
      ? 'bg-red-100 text-red-700'
      : severity === 'low'
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-700';

  // 获取情绪信息
  const sentiment = conv.sentiment || null;
  const sentimentIcon = getSentimentIcon(sentiment);

  return `
    <div class="conversation-item p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer ${
  isActive ? 'bg-blue-50' : ''
}" data-id="${conv.conversationId}" data-channel="${conv.channel}">
      <div class="flex items-start">
        <div
          class="avatar w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
          ${initials}
        </div>
        <div class="ml-3 flex-1">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-700">${name}</span>
              <span class="text-xs text-gray-500">${channelLabel}</span>
            </div>
            <span class="text-xs text-gray-400">${updatedAt}</span>
          </div>
          <p class="text-[13px] text-gray-600 mt-1 line-clamp-2">${lastMessage}</p>
          <div class="mt-2 flex items-center justify-between text-[11px] text-gray-500">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full ${badgeClass}">${conv.slaLevel || 'SLA 级别'}</span>
              ${sentimentIcon ? `<span class="sentiment-icon" title="${sentiment?.label || '情绪识别中'}">${sentimentIcon}</span>` : ''}
            </div>
            <span class="text-xs ${conv.urgency === 'high' ? 'text-red-600' : 'text-gray-500'}">${
  conv.urgency || '正常'
}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateChatContent(conversationId) {
  currentConversationId = conversationId;
  const card = qs(`.conversation-item[data-id="${conversationId}"]`);

  // 修复：使用正确的选择器获取客户名称和摘要
  const customerName = card?.querySelector('.text-sm.font-medium')?.textContent?.trim() || '客户';
  const summary = card?.querySelector('.line-clamp-2')?.textContent?.trim() || '正在加载...';
  const slaNode = card?.querySelector('.px-2');
  const sla = slaNode?.textContent?.trim() || 'SLA 未知';

  chatController?.setConversation(conversationId, {
    customerName,
    summary,
    sla,
    customerId: card?.getAttribute('data-customer-id') || conversationId,
    company: '未知公司', // 可以从card中提取或使用默认值
  });
  updateCustomerContext(conversationId);
}

function initInputEvents() {
  const messageInput = qs('#message-input');
  const emojiButton = qs('#emoji-button');
  const emojiPanel = qs('#emoji-panel');
  const warning = qs('#low-confidence-warning');

  if (!messageInput) {
    return;
  }

  on(messageInput, 'input', () => {
    const content = messageInput.value;
    if (warning) {
      if (content.includes('赠送') || content.includes('优惠') || content.includes('折扣')) {
        warning.classList.remove('hidden');
      } else {
        warning.classList.add('hidden');
      }
    }
  });

  on(messageInput, 'keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  if (emojiButton && emojiPanel) {
    on(emojiButton, 'click', () => emojiPanel.classList.toggle('hidden'));
    on(document, 'click', (e) => {
      if (!emojiButton.contains(e.target) && !emojiPanel.contains(e.target)) {
        emojiPanel.classList.add('hidden');
      }
    });
  }
}

export function sendMessage() {
  if (!chatController) {
    showNotification('AgentScope正在启动中，请稍候', 'warning');
    return;
  }
  chatController.sendInput();
}

export function addMessage(type, content) {
  const chatMessages = qs('#chat-messages');
  if (!chatMessages) {
    return;
  }

  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  let messageHTML = '';

  if (type === 'customer') {
    messageHTML = `
      <div class="message customer-message flex fade-in">
        <div class="avatar w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">张</div>
        <div class="ml-2 max-w-[70%]">
          <div class="message-bubble bg-blue-100 p-3 message-bubble-customer"><p>${content}</p></div>
          <div class="message-meta flex justify-between items-center mt-1">
            <span class="text-xs text-gray-500">${time}</span>
            <span class="emotion-neutral text-xs px-2 py-0.5 rounded-full">😐 中性</span>
          </div>
        </div>
      </div>`;
  } else {
    messageHTML = `
      <div class="message engineer-message flex justify-end fade-in">
        <div class="mr-2 max-w-[70%]">
          <div class="message-bubble ${type === 'engineer' ? 'bg-primary' : 'bg-gray-900'} text-white p-3 message-bubble-engineer">
            ${type === 'internal' ? '<div class="flex items-center text-xs text-amber-200 mb-1"><i class="fa fa-lock mr-1"></i><span>内部备注 · 不会发送至外部IM</span></div>' : ''}
            <p>${content}</p>
          </div>
          <div class="message-meta flex justify-end mt-1"><span class="text-xs text-gray-500">${time}</span></div>
        </div>
        <div class="avatar w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">王</div>
      </div>`;
  }

  chatMessages.insertAdjacentHTML('beforeend', messageHTML);

  if (type === 'customer') {
    analyzeRequirementText(content);
    loadRequirementsData();
  }
}

export function adoptSuggestion(id) {
  const suggestionCard = qs(`.suggestion-card[data-id="${id}"]`);
  if (!suggestionCard) {
    return;
  }
  const suggestionText = suggestionCard.querySelector('p:last-of-type')?.textContent || '';
  const input = qs('#message-input');
  if (input) {
    input.value = suggestionText;
  }
}

export function optimizeMessage() {
  const messageInput = qs('#message-input');
  if (!messageInput) {
    return;
  }

  const message = messageInput.value.trim();
  if (!message) {
    showNotification('请先输入消息内容', 'error');
    return;
  }

  const optimizeButton = qs('#optimize-button');
  if (optimizeButton) {
    optimizeButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  }

  setTimeout(() => {
    if (optimizeButton) {
      optimizeButton.innerHTML = '<i class="fa fa-magic"></i>';
    }
    messageInput.value = `${message} 感谢您的理解与支持，如有其他问题，请随时联系我们。`;
    showNotification('话术已优化', 'success');
  }, 800);
}

export function insertText(text) {
  const messageInput = qs('#message-input');
  if (!messageInput) {
    return;
  }

  const { selectionStart = 0, selectionEnd = 0, value } = messageInput;
  const newValue = `${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`;
  messageInput.value = newValue;

  const cursor = selectionStart + text.length;
  messageInput.setSelectionRange(cursor, cursor);
  messageInput.focus();
}

export function insertEmoji(emoji) {
  insertText(emoji);
  qs('#emoji-panel')?.classList.add('hidden');
}

export function addToSuggestion(content) {
  const replySuggestions = qs('.reply-suggestions');
  if (!replySuggestions) {
    return;
  }

  const suggestionId = `sug-${Date.now()}`;
  const suggestionHTML = `
    <div class="suggestion-card" data-id="${suggestionId}">
      <div class="flex items-start">
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
          <i class="fa fa-lightbulb-o"></i>
        </div>
        <div class="ml-2 flex-1">
          <p class="text-xs text-gray-500">知识引用</p>
          <p class="text-sm mt-1">${content}</p>
        </div>
      </div>
      <div class="flex justify-end mt-2">
        <button class="adopt-btn text-xs px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark" onclick="adoptSuggestion('${suggestionId}')">填入草稿（内部）</button>
      </div>
    </div>`;

  replySuggestions.insertAdjacentHTML('beforeend', suggestionHTML);
}

function initConversationEndDetection() {
  const sendButton = qs('#send-button');
  on(sendButton, 'click', () => {
    const message = qs('#message-input')?.value.trim();
    if (message) {
      analyzeConversationEnd(message);
    }
  });
}

function analyzeConversationEnd(message) {
  const endKeywords = ['解决', '完成', '感谢', '不客气', '有问题随时', '祝您', '再见'];
  const hasEndKeyword = endKeywords.some((keyword) => message.includes(keyword));
  if (hasEndKeyword) {
    setTimeout(showSatisfactionSurvey, 1000);
  }
}

function showSatisfactionSurvey() {
  const card = qs('#satisfaction-card');
  if (card) {
    card.classList.remove('hidden');
    card.classList.add('fade-in');
  }
}

export function submitSatisfaction(score) {
  showNotification(`感谢反馈，评分：${score}`, 'success');
  const card = qs('#satisfaction-card');
  if (card) {
    card.classList.add('hidden');
  }
}

// 对话筛选功能
let filterState = {
  searchText: '',
  status: 'all',
  channel: '',
  urgency: '',
  sla: ''
};

function initConversationFilters() {
  // 搜索框
  const searchInput = qs('#conversation-search-input');
  if (searchInput) {
    on(searchInput, 'input', (e) => {
      filterState.searchText = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }

  // 状态筛选按钮
  const statusButtons = qsa('[data-status]');
  statusButtons.forEach(button => {
    on(button, 'click', () => {
      filterState.status = button.getAttribute('data-status');
      updateStatusButtonStyles(button);
      applyFilters();
    });
  });

  // 渠道筛选
  const channelSelect = qs('#filter-channel');
  if (channelSelect) {
    on(channelSelect, 'change', (e) => {
      filterState.channel = e.target.value.toLowerCase();
      applyFilters();
    });
  }

  // 紧急度筛选
  const urgencySelect = qs('#filter-urgency');
  if (urgencySelect) {
    on(urgencySelect, 'change', (e) => {
      filterState.urgency = e.target.value.toLowerCase();
      applyFilters();
    });
  }

  // SLA筛选
  const slaSelect = qs('#filter-sla');
  if (slaSelect) {
    on(slaSelect, 'change', (e) => {
      filterState.sla = e.target.value.toLowerCase();
      applyFilters();
    });
  }
}

function updateStatusButtonStyles(activeButton) {
  const buttons = qsa('[data-status]');
  buttons.forEach(btn => {
    if (btn === activeButton) {
      btn.classList.remove('bg-white', 'border', 'border-gray-300');
      btn.classList.add('bg-primary', 'text-white');
      const badge = btn.querySelector('[data-count]');
      if (badge) {
        badge.classList.remove('bg-red-500', 'bg-gray-200', 'text-gray-700');
        badge.classList.add('bg-white', 'text-primary');
      }
    } else {
      btn.classList.remove('bg-primary', 'text-white');
      btn.classList.add('bg-white', 'border', 'border-gray-300');
      const badge = btn.querySelector('[data-count]');
      if (badge) {
        badge.classList.remove('bg-white', 'text-primary');
        if (btn.getAttribute('data-status') === 'pending') {
          badge.classList.add('bg-red-500', 'text-white');
        } else {
          badge.classList.add('bg-gray-200', 'text-gray-700');
        }
      }
    }
  });
}

function applyFilters() {
  const conversationItems = qsa('.conversation-item');
  let visibleCount = 0;
  const statusCounts = { all: 0, pending: 0, active: 0, completed: 0 };

  conversationItems.forEach(item => {
    let shouldShow = true;

    // 搜索文本筛选
    if (filterState.searchText) {
      const customerName = item.querySelector('.customer-name, .text-sm.font-medium')?.textContent?.toLowerCase() || '';
      const preview = item.querySelector('.conv-preview, .line-clamp-2')?.textContent?.toLowerCase() || '';
      if (!customerName.includes(filterState.searchText) && !preview.includes(filterState.searchText)) {
        shouldShow = false;
      }
    }

    // 状态筛选
    const itemStatus = item.getAttribute('data-status') || getConversationStatus(item);
    if (filterState.status !== 'all' && itemStatus !== filterState.status) {
      shouldShow = false;
    }

    // 渠道筛选
    if (filterState.channel) {
      const itemChannel = (item.getAttribute('data-channel') || '').toLowerCase();
      if (itemChannel !== filterState.channel) {
        shouldShow = false;
      }
    }

    // 紧急度筛选
    if (filterState.urgency) {
      const urgencyElement = item.querySelector('.text-xs.text-red-600, .text-xs.text-gray-500');
      const urgencyText = urgencyElement?.textContent?.toLowerCase() || '';
      let itemUrgency = 'normal';
      if (urgencyText.includes('紧急') || urgencyText.includes('high')) {
        itemUrgency = 'high';
      } else if (urgencyText.includes('已解决') || urgencyText.includes('low')) {
        itemUrgency = 'low';
      }
      if (itemUrgency !== filterState.urgency) {
        shouldShow = false;
      }
    }

    // SLA筛选
    if (filterState.sla) {
      const slaElement = item.querySelector('.px-2.py-0\\.5.rounded-full');
      const slaText = slaElement?.textContent?.toLowerCase() || '';
      let itemSla = '';
      if (slaText.includes('金牌') || slaText.includes('gold')) {
        itemSla = 'gold';
      } else if (slaText.includes('银牌') || slaText.includes('silver')) {
        itemSla = 'silver';
      } else if (slaText.includes('铜牌') || slaText.includes('bronze')) {
        itemSla = 'bronze';
      }
      if (itemSla !== filterState.sla) {
        shouldShow = false;
      }
    }

    // 应用显示/隐藏
    if (shouldShow) {
      item.style.display = '';
      visibleCount++;
      statusCounts.all++;
      statusCounts[itemStatus] = (statusCounts[itemStatus] || 0) + 1;
    } else {
      item.style.display = 'none';
    }
  });

  // 更新状态计数
  updateStatusCounts(statusCounts);

  // 显示无结果提示
  showNoResultsMessage(visibleCount === 0);
}

function getConversationStatus(item) {
  // 根据对话项的内容判断状态
  const slaElement = item.querySelector('.px-2.py-0\\.5.rounded-full');
  const urgencyElement = item.querySelector('.text-xs.text-red-600, .text-xs.text-gray-500');

  const urgencyText = urgencyElement?.textContent?.toLowerCase() || '';
  const hasUrgentFlag = urgencyText.includes('紧急') || item.querySelector('.text-red-600');

  if (urgencyText.includes('已解决')) {
    return 'completed';
  } else if (hasUrgentFlag) {
    return 'pending';
  } else {
    return 'active';
  }
}

function updateStatusCounts(counts) {
  const allBadge = qs('[data-count="all"]');
  const pendingBadge = qs('[data-count="pending"]');

  if (allBadge) {
    allBadge.textContent = counts.all || 0;
  }
  if (pendingBadge) {
    pendingBadge.textContent = counts.pending || 0;
  }
}

function showNoResultsMessage(show) {
  const container = qs('.conversation-list');
  if (!container) return;

  let noResultsDiv = container.querySelector('.no-results-message');

  if (show) {
    if (!noResultsDiv) {
      noResultsDiv = document.createElement('div');
      noResultsDiv.className = 'no-results-message p-8 text-center text-gray-500';
      noResultsDiv.innerHTML = `
        <i class="fa fa-search text-4xl mb-3 text-gray-300"></i>
        <p>未找到匹配的对话</p>
        <p class="text-sm mt-1">尝试调整筛选条件</p>
      `;
      container.appendChild(noResultsDiv);
    }
    noResultsDiv.style.display = 'block';
  } else {
    if (noResultsDiv) {
      noResultsDiv.style.display = 'none';
    }
  }
}

export function resetFilters() {
  filterState = {
    searchText: '',
    status: 'all',
    channel: '',
    urgency: '',
    sla: ''
  };

  const searchInput = qs('#conversation-search-input');
  if (searchInput) searchInput.value = '';

  const channelSelect = qs('#filter-channel');
  if (channelSelect) channelSelect.value = '';

  const urgencySelect = qs('#filter-urgency');
  if (urgencySelect) urgencySelect.value = '';

  const slaSelect = qs('#filter-sla');
  if (slaSelect) slaSelect.value = '';

  const allButton = qs('#filter-status-all');
  if (allButton) updateStatusButtonStyles(allButton);

  applyFilters();
}
