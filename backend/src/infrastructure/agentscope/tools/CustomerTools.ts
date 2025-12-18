import { RefreshCustomerProfileRequest } from '@application/use-cases/customer/RefreshCustomerProfileUseCase';
import { optionalArray, optionalString, requireString } from './helpers';
import { AgentScopeDependencies, MCPToolDefinition } from '../types';

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
          interactions: optionalArray(params.interactions) as RefreshCustomerProfileRequest['interactions'] | undefined,
          serviceRecords: optionalArray(params.serviceRecords) as RefreshCustomerProfileRequest['serviceRecords'] | undefined,
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
  ];
}
