import { config } from '@config/app.config';

export interface AgentScopeChatRequest {
  conversationId: string;
  customerId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface AgentScopeChatResponse {
  success: boolean;
  message: string;
  agent_name: string;
  mode?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export class AgentScopeChatClient {
  async sendMessage(request: AgentScopeChatRequest): Promise<AgentScopeChatResponse | null> {
    const baseUrl = config.agentscope.serviceUrl;
    if (!baseUrl) {
      return null;
    }

    const url = `${baseUrl.replace(/\/$/, '')}/api/chat/message`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.agentscope.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: request.conversationId,
          message: request.message,
          customer_id: request.customerId,
          metadata: request.metadata ?? {},
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AgentScope API error: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('[AgentScopeChatClient] Failed to call AgentScope', error);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
