import { SearchKnowledgeRequest } from '@application/use-cases/knowledge/SearchKnowledgeUseCase';

import { AgentScopeDependencies, MCPToolDefinition } from '../types';

import { optionalString, requireString } from './helpers';

const stripDataPrefix = (value: string): string => {
  const match = value.match(/^data:.*;base64,(.*)$/);
  return match ? match[1] : value;
};

export function buildKnowledgeTools(deps: AgentScopeDependencies): MCPToolDefinition[] {
  return [
    {
      name: 'searchKnowledge',
      description: '查询知识库',
      parameters: {
        query: { type: 'string', required: true },
        mode: { type: 'string' },
        filters: { type: 'object' },
      },
      handler: async (params) => {
        const request: SearchKnowledgeRequest = {
          query: requireString(params.query, 'query'),
          mode: optionalString(params.mode) as SearchKnowledgeRequest['mode'] | undefined,
          filters: params.filters && typeof params.filters === 'object'
            ? (params.filters as SearchKnowledgeRequest['filters'])
            : undefined,
        };
        return deps.searchKnowledgeUseCase.execute(request);
      },
    },
    {
      name: 'uploadDocument',
      description: '上传文档到知识库',
      parameters: {
        title: { type: 'string', required: true },
        fileBase64: { type: 'string', required: true },
        category: { type: 'string' },
        companyEntity: { type: 'string' },
      },
      handler: async (params) => {
        const fileBase64 = requireString(params.fileBase64, 'fileBase64');
        const cleanBase64 = stripDataPrefix(fileBase64);
        const buffer = Buffer.from(cleanBase64, 'base64');
        return deps.uploadDocumentUseCase.execute({
          title: requireString(params.title, 'title'),
          file: buffer,
          category: optionalString(params.category),
          companyEntity: optionalString(params.companyEntity),
        });
      },
    },
    {
      name: 'getKnowledgeDetail',
      description: '获取知识详情',
      parameters: {
        knowledgeId: { type: 'string', required: true },
      },
      handler: async (params) => {
        return deps.getKnowledgeItemUseCase.execute({
          knowledgeId: requireString(params.knowledgeId, 'knowledgeId'),
        });
      },
    },
  ];
}
