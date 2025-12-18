import { RequirementDetectorService } from '@domain/requirement/services/RequirementDetectorService';
import { optionalString, requireString } from './helpers';
import { AgentScopeDependencies, MCPToolDefinition } from '../types';

const detector = new RequirementDetectorService();

export function buildRequirementTools(deps: AgentScopeDependencies): MCPToolDefinition[] {
  return [
    {
      name: 'detectRequirement',
      description: '检测消息中的需求',
      parameters: {
        text: { type: 'string', required: true },
      },
      handler: async (params) => {
        const message = requireString(params.text, 'text');
        return detector.detect(message);
      },
    },
    {
      name: 'createRequirement',
      description: '创建新的需求条目',
      parameters: {
        customerId: { type: 'string', required: true },
        title: { type: 'string', required: true },
        category: { type: 'string', required: true },
        description: { type: 'string' },
        priority: { type: 'string' },
        conversationId: { type: 'string' },
        metadata: { type: 'object' },
      },
      handler: async (params) => {
        return deps.createRequirementUseCase.execute({
          customerId: requireString(params.customerId, 'customerId'),
          title: requireString(params.title, 'title'),
          category: requireString(params.category, 'category'),
          description: optionalString(params.description),
          priority: optionalString(params.priority) as 'low' | 'medium' | 'high' | 'urgent' | undefined,
          conversationId: optionalString(params.conversationId),
          metadata: params.metadata && typeof params.metadata === 'object'
            ? (params.metadata as Record<string, unknown>)
            : undefined,
        });
      },
    },
  ];
}
