/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
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

/**
 * 熔断器状态
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // 正常状态
  OPEN = 'OPEN',         // 熔断打开，拒绝请求
  HALF_OPEN = 'HALF_OPEN', // 半开状态，尝试恢复
}

export class AgentScopeChatClient {
  private failureCount = 0;
  private circuitState: CircuitState = CircuitState.CLOSED;
  private lastFailureTime: number = 0;
  private lastHealthCheck: number = 0;
  private isHealthy: boolean = true;

  /**
   * 健康检查
   */
  async checkHealth(): Promise<boolean> {
    const now = Date.now();
    // 5分钟内检查过，直接返回缓存结果
    if (now - this.lastHealthCheck < 300000) {
      return this.isHealthy;
    }

    const baseUrl = config.agentscope.serviceUrl;
    if (!baseUrl) {
      this.isHealthy = false;
      return false;
    }

    try {
      const url = `${baseUrl.replace(/\/$/, '')}/health`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5秒超时

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      this.isHealthy = response.ok;
      this.lastHealthCheck = now;
      return this.isHealthy;
    } catch (error) {
      console.warn('[AgentScopeChatClient] Health check failed', error);
      this.isHealthy = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * 检查熔断器状态
   */
  private checkCircuitBreaker(): boolean {
    if (!config.agentscope.circuitBreaker.enabled) {
      return true; // 熔断器未启用，允许请求
    }

    const now = Date.now();

    // 如果熔断器打开，检查是否可以进入半开状态
    if (this.circuitState === CircuitState.OPEN) {
      if (now - this.lastFailureTime >= config.agentscope.circuitBreaker.resetTimeout) {
        console.log('[AgentScopeChatClient] Circuit breaker entering HALF_OPEN state');
        this.circuitState = CircuitState.HALF_OPEN;
        this.failureCount = 0;
        return true;
      }
      console.warn('[AgentScopeChatClient] Circuit breaker is OPEN, rejecting request');
      return false;
    }

    return true;
  }

  /**
   * 记录成功
   */
  private recordSuccess(): void {
    if (!config.agentscope.circuitBreaker.enabled) {
      return;
    }

    if (this.circuitState === CircuitState.HALF_OPEN) {
      console.log('[AgentScopeChatClient] Circuit breaker closing (recovered)');
      this.circuitState = CircuitState.CLOSED;
    }
    this.failureCount = 0;
  }

  /**
   * 记录失败
   */
  private recordFailure(): void {
    if (!config.agentscope.circuitBreaker.enabled) {
      return;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= config.agentscope.circuitBreaker.failureThreshold) {
      console.error(
        `[AgentScopeChatClient] Circuit breaker opening (failures: ${this.failureCount})`,
      );
      this.circuitState = CircuitState.OPEN;
    }
  }

  /**
   * 获取熔断器状态
   */
  getCircuitState(): { state: CircuitState; failureCount: number; isHealthy: boolean } {
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
      isHealthy: this.isHealthy,
    };
  }

  async sendMessage(request: AgentScopeChatRequest): Promise<AgentScopeChatResponse | null> {
    // 检查熔断器
    if (!this.checkCircuitBreaker()) {
      return null;
    }

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

      const result = await response.json();
      this.recordSuccess();
      return result;
    } catch (error) {
      console.warn('[AgentScopeChatClient] Failed to call AgentScope', error);
      this.recordFailure();
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
