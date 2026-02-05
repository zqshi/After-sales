import { Requirement } from '@domain/requirement/models/Requirement';
import { RequirementDetectorService } from '@domain/requirement/services/RequirementDetectorService';
import { Priority } from '@domain/requirement/value-objects/Priority';
import { RequirementSource } from '@domain/requirement/value-objects/RequirementSource';
import { EventBus } from '@infrastructure/events/EventBus';
import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';

import { shouldPublishDirectly } from '../../../infrastructure/events/outboxPolicy';
import { Validator } from '../../../infrastructure/validation/Validator';
import {
  CreateRequirementRequestDTO,
  CreateRequirementRequestSchema,
} from '../../dto/requirement/CreateRequirementRequestDTO';
import { RequirementResponseDTO } from '../../dto/requirement/RequirementResponseDTO';

export class CreateRequirementUseCase {
  private detector: RequirementDetectorService;

  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly eventBus: EventBus,
  ) {
    this.detector = new RequirementDetectorService();
  }

  async execute(request: CreateRequirementRequestDTO): Promise<RequirementResponseDTO> {
    const validatedRequest = Validator.validate(CreateRequirementRequestSchema, request);

    const priority = validatedRequest.priority
      ? Priority.create(validatedRequest.priority)
      : Priority.create('medium');

    const source = validatedRequest.source
      ? RequirementSource.create(validatedRequest.source)
      : validatedRequest.description
        ? RequirementSource.create(this.detector.detect(validatedRequest.description).source)
        : RequirementSource.create('manual');

    const requirement = Requirement.create({
      customerId: validatedRequest.customerId,
      conversationId: validatedRequest.conversationId,
      title: validatedRequest.title,
      description: validatedRequest.description,
      category: validatedRequest.category,
      priority,
      source,
      createdBy: validatedRequest.createdBy,
      metadata: validatedRequest.metadata,
    });

    // 获取未提交的事件
    const events = requirement.getUncommittedEvents();

    // 保存聚合根
    await this.requirementRepository.save(requirement);

    // 发布领域事件
    if (shouldPublishDirectly()) {
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      requirement.clearEvents();
    }

    return RequirementResponseDTO.fromDomain(requirement);
  }

}
