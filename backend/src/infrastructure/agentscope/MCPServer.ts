/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { buildAITools } from './tools/AITools';
import { buildConversationTools } from './tools/ConversationTools';
import { buildCustomerTools } from './tools/CustomerTools';
import { buildKnowledgeTools } from './tools/KnowledgeTools';
import { buildPersistenceTools } from './tools/PersistenceTools';
import { buildRequirementTools } from './tools/RequirementTools';
import { buildTaskTools } from './tools/TaskTools';
import { AgentScopeDependencies, MCPToolDefinition } from './types';

interface MCPRequestPayload {
  method: 'tools/list' | 'tools/call';
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

export class MCPServer {
  private readonly tools = new Map<string, MCPToolDefinition>();
  private readonly allowedTools = new Set([
    'recordAgentCall',
    'recordAgentMemory',
    'getAgentMemory',
    'analyzeConversation',
    'createSurvey',
    'createTask',
    'generateQualityReport',
    'getConversationHistory',
    'getCustomerHistory',
    'getCustomerProfile',
    'getSystemStatus',
    'inspectConversation',
    'saveQualityReport',
    'searchKnowledge',
    'searchTickets',
  ]);
  private readonly allowedToolNames = Array.from(this.allowedTools);

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
      buildPersistenceTools(this.dependencies),
    ];

    for (const set of collections) {
      for (const tool of set) {
        if (!this.allowedTools.has(tool.name)) {
          this.app.log.info({ tool: tool.name }, '[MCP] tool skipped (not in allowlist)');
          continue;
        }
        this.tools.set(tool.name, tool);
      }
    }

    const missingTools = this.allowedToolNames.filter((name) => !this.tools.has(name));
    if (missingTools.length > 0) {
      this.app.log.warn(
        { missingTools },
        '[MCP] allowlist tools missing from registry',
      );
    }

    this.app.log.info(
      { tools: Array.from(this.tools.keys()), count: this.tools.size },
      '[MCP] tool registry ready',
    );
  }

  private async handleRequest(
    request: FastifyRequest<{ Body: MCPRequestPayload }>,
    reply: FastifyReply,
  ): Promise<unknown> {
    const body = request.body;
    const startedAt = Date.now();

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
      request.log.info({
        tool: toolName,
        argKeys: Object.keys(args),
      }, '[MCP] tool call start');
      try {
        const result = await tool.handler(args);
        const resultPayload = (result && typeof result === 'object' && !Array.isArray(result))
          ? (result as Record<string, unknown>)
          : { data: result };
        request.log.info({
          tool: toolName,
          durationMs: Date.now() - startedAt,
        }, '[MCP] tool call success');
        await this.dependencies.mcpToolCallRepository.save({
          toolName,
          conversationId: typeof (args as any).conversationId === 'string' ? (args as any).conversationId : undefined,
          customerId: typeof (args as any).customerId === 'string' ? (args as any).customerId : undefined,
          agentName: typeof (args as any).agentName === 'string' ? (args as any).agentName : undefined,
          status: 'success',
          durationMs: Date.now() - startedAt,
          args: args as Record<string, unknown>,
          result: resultPayload,
        });
        return { result };
      } catch (err) {
        request.log.error({
          tool: toolName,
          durationMs: Date.now() - startedAt,
          error: err instanceof Error ? err.message : String(err),
        }, '[MCP] tool call failed');
        await this.dependencies.mcpToolCallRepository.save({
          toolName,
          conversationId: typeof (args as any).conversationId === 'string' ? (args as any).conversationId : undefined,
          customerId: typeof (args as any).customerId === 'string' ? (args as any).customerId : undefined,
          agentName: typeof (args as any).agentName === 'string' ? (args as any).agentName : undefined,
          status: 'error',
          durationMs: Date.now() - startedAt,
          args: args as Record<string, unknown>,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
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
