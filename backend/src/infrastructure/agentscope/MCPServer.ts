import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AgentScopeDependencies, MCPToolDefinition } from './types';
import { buildConversationTools } from './tools/ConversationTools';
import { buildCustomerTools } from './tools/CustomerTools';
import { buildKnowledgeTools } from './tools/KnowledgeTools';
import { buildRequirementTools } from './tools/RequirementTools';
import { buildTaskTools } from './tools/TaskTools';
import { buildAITools } from './tools/AITools';

interface MCPRequestPayload {
  method: 'tools/list' | 'tools/call';
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

export class MCPServer {
  private readonly tools = new Map<string, MCPToolDefinition>();

  constructor(
    private readonly app: FastifyInstance,
    private readonly dependencies: AgentScopeDependencies,
  ) {}

  async initialize(): Promise<void> {
    this.registerTools();
    this.app.post('/mcp', this.handleRequest.bind(this));
    this.app.get('/mcp', this.handleToolsList.bind(this));
    this.app.get('/mcp/tools', this.handleToolsList.bind(this));
  }

  private registerTools(): void {
    const collections = [
      buildConversationTools(this.dependencies),
      buildCustomerTools(this.dependencies),
      buildKnowledgeTools(this.dependencies),
      buildRequirementTools(this.dependencies),
      buildTaskTools(this.dependencies),
      buildAITools(this.dependencies),
    ];

    for (const set of collections) {
      for (const tool of set) {
        this.tools.set(tool.name, tool);
      }
    }
  }

  private async handleRequest(
    request: FastifyRequest<{ Body: MCPRequestPayload }>,
    reply: FastifyReply,
  ): Promise<unknown> {
    const body = request.body;

    if (!body || !body.method) {
      // Graceful fallback for clients that probe /mcp without payload.
      return this.listTools();
    }

    if (body.method === 'tools/list') {
      return this.listTools();
    }

    if (body.method === 'tools/call') {
      const params = body.params ?? {};
      const toolName = params.name;
      if (!toolName) {
        reply.status(400);
        return { error: 'tool name is required' };
      }

      const tool = this.tools.get(toolName);
      if (!tool) {
        reply.status(404);
        return { error: `tool ${toolName} not found` };
      }

      const args = params.arguments ?? {};
      try {
        const result = await tool.handler(args);
        return { result };
      } catch (err) {
        reply.status(500);
        return { error: err instanceof Error ? err.message : 'tool execution failed' };
      }
    }

    reply.status(400);
    return { error: 'unsupported method' };
  }

  private listTools(): { tools: Array<{ name: string; description: string; parameters: Record<string, unknown> }> } {
    return {
      tools: Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    };
  }

  private handleToolsList(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    reply.send(this.listTools());
  }
}
