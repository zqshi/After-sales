import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';

export interface AssociateRequirementWithConversationRequest {
  requirementId: string;
  conversationId: string;
}

/**
 * 关联Requirement到Conversation的用例
 *
 * 使用场景：
 * - 内部需求需要与客户沟通时，创建对话并关联
 * - 保持需求与对话的双向追溯
 */
export class AssociateRequirementWithConversationUseCase {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(request: AssociateRequirementWithConversationRequest): Promise<void> {
    if (!request.requirementId) {
      throw new Error('requirementId is required');
    }
    if (!request.conversationId) {
      throw new Error('conversationId is required');
    }

    const requirement = await this.requirementRepository.findById(request.requirementId);
    if (!requirement) {
      throw new Error(`Requirement not found: ${request.requirementId}`);
    }

    // 执行领域逻辑：关联到对话
    requirement.associateWithConversation(request.conversationId);

    // 保存更新
    await this.requirementRepository.save(requirement);
  }
}
