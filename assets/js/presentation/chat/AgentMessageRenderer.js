function escapeHtml(value) {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(timestamp) {
  if (!timestamp) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function buildMessageNode({ role, author = '客户', content, timestamp, metadata = {} }) {
  const wrapper = document.createElement('div');
  const normalizedRole = role === 'agent' ? 'agent' : role === 'human' ? 'human' : 'customer';
  const isAIAgent = metadata.fromAI || metadata.agentType === 'ai';

  wrapper.className = `message-row ${normalizedRole === 'agent' ? 'justify-end' : 'justify-start'}`;
  wrapper.dataset.senderRole = normalizedRole;
  if (isAIAgent) wrapper.dataset.aiAgent = 'true';

  const avatar = document.createElement('div');
  avatar.className = `avatar ${isAIAgent ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`;
  avatar.textContent = isAIAgent ? '🤖' : ((author || '??').charAt(0) || '·');

  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${normalizedRole === 'agent' ? 'agent' : 'customer'} ${isAIAgent ? 'ai-agent-message' : ''}`;

  // Agent badge for AI messages
  if (isAIAgent && normalizedRole === 'agent') {
    const badge = document.createElement('div');
    badge.className = 'agent-badge';
    badge.innerHTML = '🤖 AI助手';
    badge.style.cssText = 'display: inline-block; background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-bottom: 4px;';
    bubble.appendChild(badge);
  }

  const contentPara = document.createElement('p');
  contentPara.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
  bubble.appendChild(contentPara);

  // Confidence indicator for AI messages
  if (isAIAgent && metadata.confidence !== undefined) {
    const confidenceBar = document.createElement('div');
    confidenceBar.className = 'confidence-indicator';
    const confidencePercent = Math.round(metadata.confidence * 100);
    confidenceBar.innerHTML = `
      <div style="display: flex; align-items: center; margin-top: 8px; font-size: 11px; color: #666;">
        <span style="margin-right: 8px;">置信度:</span>
        <div style="flex: 1; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
          <div style="width: ${confidencePercent}%; height: 100%; background: ${confidencePercent > 70 ? '#10b981' : confidencePercent > 40 ? '#f59e0b' : '#ef4444'};"></div>
        </div>
        <span style="margin-left: 8px; font-weight: 600;">${confidencePercent}%</span>
      </div>
    `;
    bubble.appendChild(confidenceBar);
  }

  const meta = document.createElement('div');
  meta.className = 'message-meta flex justify-between items-center';
  const displayAuthor = isAIAgent ? 'AI助手' : author;
  meta.innerHTML = `<span>${formatTime(timestamp)}</span><span>${escapeHtml(displayAuthor)}</span>`;

  const contentWrapper = document.createElement('div');
  contentWrapper.appendChild(bubble);
  contentWrapper.appendChild(meta);

  if (normalizedRole === 'agent') {
    wrapper.appendChild(contentWrapper);
    wrapper.appendChild(avatar);
  } else {
    wrapper.appendChild(avatar);
    wrapper.appendChild(contentWrapper);
  }

  return wrapper;
}

/**
 * 专门用于渲染Agent消息的函数
 * @param {Object} message - 消息对象
 * @param {string} message.content - 消息内容
 * @param {number} [message.confidence] - AI置信度 (0-1)
 * @param {string} [message.agentName] - Agent名称
 * @param {string} [message.timestamp] - 时间戳
 * @param {Object} [message.metadata] - 额外元数据
 * @returns {HTMLElement} 消息DOM节点
 */
export function renderAgentMessage(message) {
  return buildMessageNode({
    role: 'agent',
    author: message.agentName || 'AI助手',
    content: message.content,
    timestamp: message.timestamp,
    metadata: {
      fromAI: true,
      agentType: 'ai',
      confidence: message.confidence,
      ...message.metadata
    }
  });
}
