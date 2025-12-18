import { FastifyInstance } from 'fastify';

import { agentScopeConfig, AgentScopeConfig } from '@config/agentscope.config';
import { AgentScopeDependencies } from './types';
import { EventBridge } from './EventBridge';
import { EventBus } from '@infrastructure/events/EventBus';
import { MCPServer } from './MCPServer';

export class AgentScopeGateway {
  private readonly mcpServer: MCPServer;
  private readonly eventBridge: EventBridge;

  constructor(
    private readonly app: FastifyInstance,
    dependencies: AgentScopeDependencies,
    eventBus: EventBus,
    private readonly config: AgentScopeConfig = agentScopeConfig,
  ) {
    this.mcpServer = new MCPServer(app, dependencies);
    this.eventBridge = new EventBridge(app, eventBus, config);
  }

  async initialize(): Promise<void> {
    await this.mcpServer.initialize();
    await this.eventBridge.initialize();

    this.app.get('/agentscope/status', async () => ({
      status: 'online',
      version: this.config.serviceUrl,
    }));
    this.app.get('/agentscope/config', async () => this.config);
  }
}
