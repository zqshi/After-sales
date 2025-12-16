import { qs, qsa, on } from '../core/dom.js';
import { scrollToBottom } from '../core/scroll.js';
import { showNotification } from '../core/notifications.js';
import {
  analyzeRequirementText,
  loadRequirementsData,
} from '../requirements/index.js';
import { updateCustomerContext } from '../customer/index.js';
import {
  fetchConversations,
  sendChatMessage,
  postAuditEvent,
  isApiEnabled,
} from '../api.js';

const outboundEnabled = false;
let currentConversationId = 'conv-001';

export function initChat() {
  initConversationList();
  initInputEvents();
  initConversationEndDetection();
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
    updateCustomerContext(activeId);
  }
}

function renderConversationItems(container, conversations) {
  const html = conversations
    .map((conv, index) => createConversationMarkup(conv, index === 0))
    .join('');
  container.innerHTML = html;
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
            <span class="px-2 py-0.5 rounded-full ${badgeClass}">${conv.slaLevel || 'SLA 级别'}</span>
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
  const chatMessages = qs('#chat-messages');
  if (!chatMessages) {
    return;
  }

  if (conversationId !== 'conv-001') {
    const anchorLabelMap = {
      'conv-002': '账单核对咨询',
      'conv-003': '新功能使用反馈',
      'conv-004': 'API密钥申请指引',
      'conv-005': '数据同步异常',
    };
    const anchorLabel = anchorLabelMap[conversationId] || '会话记录';

    chatMessages.innerHTML = `
      <div class="flex justify-center">
        <span class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">加载对话中...</span>
      </div>
    `;

    setTimeout(() => {
      chatMessages.innerHTML = `
        <div class="flex justify-center">
          <span class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">今天 09:45</span>
        </div>
        <div class="message customer-message flex" data-history-label="${anchorLabel}">
          <div class="avatar w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
            ${conversationId === 'conv-002' ? '李' : conversationId === 'conv-003' ? '王' : '赵'}
          </div>
          <div class="ml-2 max-w-[70%]">
            <div class="message-bubble bg-blue-100 p-3 message-bubble-customer">
              <p>${
  conversationId === 'conv-002'
    ? '关于上个月的账单有一些疑问，想咨询一下'
    : conversationId === 'conv-003'
      ? '新功能使用很流畅，感谢你们的支持！'
      : '需要申请新的API密钥，请问如何操作？'
}</p>
            </div>
            <div class="message-meta flex justify-between items-center mt-1">
              <span class="text-xs text-gray-500">09:45</span>
              <span class="emotion-neutral text-xs px-2 py-0.5 rounded-full">😊 满意</span>
            </div>
          </div>
        </div>
      `;
      scrollToBottom();
    }, 500);
  }
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
  const messageInput = qs('#message-input');
  if (!messageInput) {
    return;
  }

  const message = messageInput.value.trim();
  if (!message) {
    return;
  }

  if (!outboundEnabled) {
    addMessage('internal', message);
    showNotification('已记录为内部备注，未对外发送', 'info');
  }

  messageInput.value = '';
  qs('#low-confidence-warning')?.classList.add('hidden');
  qs('#emoji-panel')?.classList.add('hidden');

  analyzeConversationEnd(message);
  scrollToBottom();

  const conversationId = currentConversationId || 'conv-001';
  if (!isApiEnabled()) {
    return;
  }

  const payload = {
    type: outboundEnabled ? 'response' : 'internal',
    content: message,
    channel: 'web',
    traceId: `msg-${Date.now()}`,
  };

  sendChatMessage(conversationId, payload)
    .then(() => {
      postAuditEvent({
        userId: window.config?.userId || 'unknown',
        action: 'send_message',
        entity: conversationId,
        result: 'success',
        traceId: payload.traceId,
        metadata: { type: payload.type },
      }).catch(() => {});
    })
    .catch(() => {
      showNotification('消息同步接口异常，已记录为本地内容', 'warning');
    });
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
