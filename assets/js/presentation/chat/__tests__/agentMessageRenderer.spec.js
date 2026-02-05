import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../customer/index.js', () => ({
  getCurrentProfile: () => ({
    products: ['旧产品', '路由器, P1'],
  }),
}));

describe('AgentMessageRenderer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('builds customer message with sentiment badge and issue tags', async () => {
    const { buildMessageNode } = await import('../AgentMessageRenderer.js');

    const node = buildMessageNode({
      role: 'customer',
      author: '张三',
      content: '问题 <script>alert(1)</script>\n继续',
      timestamp: '2024-01-01T00:00:00Z',
      messageId: 'm1',
      sentiment: { emotion: 'negative', confidence: 0.87 },
      metadata: {},
    });

    expect(node.dataset.senderRole).toBe('customer');
    expect(node.dataset.messageId).toBe('m1');
    expect(node.dataset.sentiment).toBe('negative');

    const content = node.querySelector('.message-bubble p');
    expect(content.innerHTML).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');

    const sentimentBadge = node.querySelector('.sentiment-badge');
    expect(sentimentBadge).not.toBeNull();

    const issueTags = node.querySelectorAll('.issue-tag');
    expect(issueTags.length).toBeGreaterThan(0);
    const metaText = node.querySelector('.message-meta-line').textContent;
    expect(metaText).toContain('问题产品定位');
    expect(metaText).toContain('故障等级');
    expect(metaText).toContain('P1');
  });

  it('renders AI agent message with confidence indicator', async () => {
    const { renderAgentMessage } = await import('../AgentMessageRenderer.js');

    const node = renderAgentMessage({
      content: 'AI reply',
      confidence: 0.82,
      agentName: 'AI助手',
      timestamp: '2024-01-01T00:00:00Z',
    });

    expect(node.dataset.senderRole).toBe('agent');
    expect(node.dataset.aiAgent).toBe('true');
    expect(node.querySelector('.agent-badge')).not.toBeNull();

    const confidence = node.querySelector('.confidence-indicator');
    expect(confidence).not.toBeNull();
    expect(confidence.textContent).toContain('82%');
  });
});
