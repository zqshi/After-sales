import { getCurrentProfile } from '../../customer/index.js';

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

function getPurchasedProductLabel() {
  const profile = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
  const products = Array.isArray(profile?.products) ? profile.products.filter(Boolean) : [];
  if (!products.length) {
    return '未标注';
  }
  return products[products.length - 1];
}

export function buildMessageNode({ role, author = '客户', content, timestamp, metadata = {}, messageId = null, sentiment = null }) {
  const wrapper = document.createElement('div');
  const normalizedRole = role === 'agent' ? 'agent' : role === 'human' ? 'human' : 'customer';
  const isAIAgent = metadata.fromAI || metadata.agentType === 'ai';

  wrapper.className = `message-row ${normalizedRole === 'agent' ? 'justify-end' : 'justify-start'}`;
  wrapper.dataset.senderRole = normalizedRole;
  if (isAIAgent) wrapper.dataset.aiAgent = 'true';
  if (messageId) wrapper.dataset.messageId = messageId;
  if (sentiment?.emotion) wrapper.dataset.sentiment = sentiment.emotion;

  const avatar = document.createElement('div');
  avatar.className = `avatar ${isAIAgent ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`;
  avatar.textContent = isAIAgent ? '🤖' : ((author || '??').charAt(0) || '·');

  const displayAuthor = isAIAgent ? 'AI助手' : author;

  const header = document.createElement('div');
  header.className = `message-header ${normalizedRole === 'agent' ? 'message-header-right' : 'message-header-left'}`;

  const headerText = document.createElement('div');
  headerText.className = 'message-header-text';
  headerText.innerHTML = `
    <span class="message-author">${escapeHtml(displayAuthor)}</span>
    <span class="message-time">${formatTime(timestamp)}</span>
  `;
  header.appendChild(headerText);
  header.appendChild(avatar);

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

  let meta = null;
  if (normalizedRole === 'customer') {
    meta = document.createElement('div');
    meta.className = 'message-meta-line';
  }

  // 构建meta内容，为客户消息添加情绪icon
  let metaContent = '';

  // 为客户消息添加情绪icon（在时间戳右侧）
  if (meta && sentiment) {
    console.log('[buildMessageNode] 渲染情绪icon:', sentiment);

    // 根据情绪类型选择图标和标签
    let icon = '';
    let label = '';
    let bgColor = '';

    switch (sentiment.emotion) {
      case 'positive':
        icon = '😊';
        label = '积极';
        bgColor = '#dcfce7'; // 浅绿色背景
        break;
      case 'negative':
        icon = '😟';
        label = '消极';
        bgColor = '#fee2e2'; // 浅红色背景
        break;
      case 'angry':
        icon = '😠';
        label = '愤怒';
        bgColor = '#fecaca'; // 红色背景
        break;
      case 'frustrated':
        icon = '😤';
        label = '沮丧';
        bgColor = '#fed7aa'; // 橙色背景
        break;
      case 'anxious':
        icon = '😰';
        label = '焦虑';
        bgColor = '#fed7aa'; // 橙色背景
        break;
      case 'urgent':
        icon = '⚠️';
        label = '急切';
        bgColor = '#fee2e2'; // 浅红色背景
        break;
      case 'neutral':
      default:
        icon = '😐';
        label = '中性';
        bgColor = '#f3f4f6'; // 灰色背景
        break;
    }

    const confidencePercent = Math.round((sentiment.confidence || 0) * 100);
    metaContent += `<span class="sentiment-badge" style="
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: ${bgColor};
      border-radius: 12px;
      font-size: 11px;
      cursor: help;
      position: relative;
    "
    onmouseenter="this.querySelector('.sentiment-tooltip').style.display='block'"
    onmouseleave="this.querySelector('.sentiment-tooltip').style.display='none'">
      <span style="font-size: 14px;">${icon}</span>
      <span style="color: #6b7280;">${label} ${confidencePercent}%</span>
      <span class="sentiment-tooltip" style="
        display: none;
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 8px;
        padding: 6px 12px;
        background: #1f2937;
        color: white;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      ">
        情绪识别：${label}<br/>
        置信度：${confidencePercent}%
        <span style="
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: #1f2937;
        "></span>
      </span>
    </span>`;
  }

  if (meta) {
    const issueProductLabelRaw = getPurchasedProductLabel();
    let issueProductName = issueProductLabelRaw;
    let issueSeverity = '';

    if (issueProductLabelRaw && issueProductLabelRaw !== '未标注') {
      const parts = issueProductLabelRaw.split(/[，,]\s*/).filter(Boolean);
      if (parts.length > 1) {
        const severityPart = parts.find((part) => /P[0-4]/i.test(part));
        const namePart = parts.find((part) => !/P[0-4]/i.test(part));
        issueProductName = namePart || issueProductLabelRaw;
        issueSeverity = severityPart || '';
      } else if (/P[0-4]/i.test(issueProductLabelRaw)) {
        issueProductName = issueProductLabelRaw.replace(/P[0-4]/gi, '').replace(/[，,]\s*/g, '').trim() || issueProductLabelRaw;
        issueSeverity = issueProductLabelRaw.match(/P[0-4]/i)?.[0] || '';
      }
    }

    const issueProductLabel = escapeHtml(issueProductName || issueProductLabelRaw);
    metaContent += `<span class="issue-tags" style="display: inline-flex; align-items: center; gap: 6px; margin-left: 6px;">
      <span class="issue-tag" style="
        display: none;
        align-items: center;
        padding: 2px 8px;
        background: #ede9fe;
        color: #6d28d9;
        border: 1px solid #ddd6fe;
        border-radius: 9999px;
        font-size: 11px;
      ">问题产品定位：${issueProductLabel}</span>`;
    if (issueSeverity) {
      metaContent += `<span class="issue-tag" style="
        display: none;
        align-items: center;
        padding: 2px 8px;
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
        border-radius: 9999px;
        font-size: 11px;
      ">故障等级：${escapeHtml(issueSeverity.toUpperCase())}</span>`;
    }
    metaContent += '</span>';
    meta.innerHTML = metaContent;
  }

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'message-content-wrapper';
  contentWrapper.appendChild(header);
  contentWrapper.appendChild(bubble);
  if (meta) {
    contentWrapper.appendChild(meta);
  }

  wrapper.appendChild(contentWrapper);

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
