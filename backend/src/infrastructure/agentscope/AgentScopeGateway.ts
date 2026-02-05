/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
import { FastifyInstance } from 'fastify';

import { agentScopeConfig, AgentScopeConfig } from '@config/agentscope.config';
import { EventBus } from '@infrastructure/events/EventBus';

import { AgentScopeChatClient } from './AgentScopeChatClient';
import { EventBridge } from './EventBridge';
import { MCPServer } from './MCPServer';
import { AgentScopeDependencies } from './types';

export class AgentScopeGateway {
  private readonly mcpServer: MCPServer;
  private readonly eventBridge: EventBridge;
  private readonly chatClient: AgentScopeChatClient;

  constructor(
    private readonly app: FastifyInstance,
    dependencies: AgentScopeDependencies,
    eventBus: EventBus,
    private readonly config: AgentScopeConfig = agentScopeConfig,
  ) {
    this.mcpServer = new MCPServer(app, dependencies);
    this.eventBridge = new EventBridge(app, eventBus, config);
    this.chatClient = new AgentScopeChatClient();
  }

  async initialize(): Promise<void> {
    await this.mcpServer.initialize();
    await this.eventBridge.initialize();

    this.app.get('/agentscope/status', async () => ({
      status: 'online',
      version: this.config.serviceUrl,
    }));

    this.app.get('/agentscope/config', async () => this.config);

    // 健康检查端点
    this.app.get('/agentscope/health', async () => {
      const isHealthy = await this.chatClient.checkHealth();
      const circuitState = this.chatClient.getCircuitState();

      return {
        healthy: isHealthy,
        circuitBreaker: {
          state: circuitState.state,
          failureCount: circuitState.failureCount,
          enabled: true, // Circuit breaker is always enabled in AgentScopeChatClient
        },
        serviceUrl: this.config.serviceUrl,
        timestamp: new Date().toISOString(),
      };
    });
  }
}
