/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
import { RefreshCustomerProfileRequest } from '@application/use-cases/customer/RefreshCustomerProfileUseCase';

import { AgentScopeDependencies, MCPToolDefinition } from '../types';

import { optionalArray, optionalNumber, optionalString, requireString } from './helpers';

export function buildCustomerTools(deps: AgentScopeDependencies): MCPToolDefinition[] {
  return [
    {
      name: 'getCustomerProfile',
      description: '获取客户画像',
      parameters: {
        customerId: { type: 'string', required: true },
      },
      handler: async (params) => {
        return deps.getCustomerProfileUseCase.execute({
          customerId: requireString(params.customerId, 'customerId'),
        });
      },
    },
    {
      name: 'updateRiskLevel',
      description: '重新计算客户风险等级并更新画像',
      parameters: {
        customerId: { type: 'string', required: true },
        source: { type: 'string' },
        metrics: { type: 'object' },
        interactions: { type: 'array' },
        serviceRecords: { type: 'array' },
      },
      handler: async (params) => {
        const payload: RefreshCustomerProfileRequest = {
          customerId: requireString(params.customerId, 'customerId'),
          source: optionalString(params.source) ?? 'agentscope',
          metrics: params.metrics && typeof params.metrics === 'object'
            ? (params.metrics as RefreshCustomerProfileRequest['metrics'])
            : undefined,
          interactions: optionalArray(params.interactions),
          serviceRecords: optionalArray(params.serviceRecords),
        };

        return deps.refreshCustomerProfileUseCase.execute(payload);
      },
    },
    {
      name: 'addServiceRecord',
      description: '为客户添加服务记录',
      parameters: {
        customerId: { type: 'string', required: true },
        title: { type: 'string', required: true },
        description: { type: 'string', required: true },
        ownerId: { type: 'string' },
        outcome: { type: 'string' },
      },
      handler: async (params) => {
        return deps.addServiceRecordUseCase.execute({
          customerId: requireString(params.customerId, 'customerId'),
          title: requireString(params.title, 'title'),
          description: requireString(params.description, 'description'),
          ownerId: optionalString(params.ownerId),
          outcome: optionalString(params.outcome),
        });
      },
    },
    {
      name: 'getCustomerHistory',
      description: '获取客户历史对话列表',
      parameters: {
        customerId: { type: 'string', required: true },
        limit: { type: 'number' },
        page: { type: 'number' },
      },
      handler: async (params) => {
        const customerId = requireString(params.customerId, 'customerId');
        const limit = optionalNumber(params.limit);
        const page = optionalNumber(params.page);
        return deps.listConversationsUseCase.execute({
          customerId,
          limit,
          page,
        });
      },
    },
  ];
}
