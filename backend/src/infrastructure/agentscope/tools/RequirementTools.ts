/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
import { RequirementDetectorService } from '@domain/requirement/services/RequirementDetectorService';

import { AgentScopeDependencies, MCPToolDefinition } from '../types';

import { optionalString, requireString } from './helpers';

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
