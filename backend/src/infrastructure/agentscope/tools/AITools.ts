import { optionalArray, optionalNumber, optionalString, requireString } from './helpers';
import { AgentScopeDependencies, MCPToolDefinition } from '../types';

export function buildAITools(deps: AgentScopeDependencies): MCPToolDefinition[] {
  return [
    {
      name: 'analyzeConversation',
      description: 'AI 分析对话质量与情绪',
      parameters: {
        conversationId: { type: 'string', required: true },
        context: { type: 'string' },
        keywords: { type: 'array' },
        includeHistory: { type: 'boolean' },
      },
      handler: async (params) => {
        const keywords = optionalArray(params.keywords)
          ?.map((value) => String(value).trim())
          .filter((value) => value.length > 0);

        const options: Record<string, unknown> = {};
        if (keywords && keywords.length > 0) {
          options.keywords = keywords;
        }
        if (params.includeHistory !== undefined) {
          options.includeHistory = params.includeHistory;
        }

        return deps.analyzeConversationUseCase.execute({
          conversationId: requireString(params.conversationId, 'conversationId'),
          context: optionalString(params.context),
          options: Object.keys(options).length > 0 ? options : undefined,
        });
      },
    },
    {
      name: 'recommendKnowledge',
      description: '基于关键词推荐知识',
      parameters: {
        keywords: { type: 'array' },
        limit: { type: 'number' },
      },
      handler: async (params) => {
        const keywords = optionalArray(params.keywords)
          ?.map((entry) => String(entry).trim())
          .filter((value) => value.length > 0) ?? [];
        const limit = optionalNumber(params.limit) ?? 5;
        const pool = await deps.knowledgeRepository.findByFilters({}, { limit: limit * 3, offset: 0 });
        const normalized = pool.map((item) => ({
          id: item.id,
          title: item.title,
          tags: item.tags,
          category: item.category.value,
        }));
        const recommendations = deps.knowledgeRecommender.recommendByKeywords(normalized, keywords);
        return recommendations.slice(0, limit);
      },
    },
  ];
}
