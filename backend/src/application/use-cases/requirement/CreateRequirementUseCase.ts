import { Requirement } from '@domain/requirement/models/Requirement';
import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { RequirementDetectorService } from '@domain/requirement/services/RequirementDetectorService';
import { CreateRequirementRequestDTO } from '../../dto/requirement/CreateRequirementRequestDTO';
import { RequirementResponseDTO } from '../../dto/requirement/RequirementResponseDTO';
import { Priority } from '@domain/requirement/value-objects/Priority';
import { RequirementSource } from '@domain/requirement/value-objects/RequirementSource';
import { EventBus } from '@infrastructure/events/EventBus';

export class CreateRequirementUseCase {
  private detector: RequirementDetectorService;

  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly eventBus: EventBus,
  ) {
    this.detector = new RequirementDetectorService();
  }

  async execute(request: CreateRequirementRequestDTO): Promise<RequirementResponseDTO> {
    this.validate(request);

    const priority = request.priority
      ? Priority.create(request.priority)
      : Priority.create('medium');

    const source = request.source
      ? RequirementSource.create(request.source)
      : request.description
        ? RequirementSource.create(this.detector.detect(request.description).source)
        : RequirementSource.create('manual');

    const requirement = Requirement.create({
      customerId: request.customerId,
      conversationId: request.conversationId,
      title: request.title,
      description: request.description,
      category: request.category,
      priority,
      source,
      createdBy: request.createdBy,
      metadata: request.metadata,
    });

    // 获取未提交的事件
    const events = requirement.getUncommittedEvents();

    // 保存聚合根
    await this.requirementRepository.save(requirement);

    // 发布领域事件
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    requirement.clearEvents();

    return RequirementResponseDTO.fromDomain(requirement);
  }

  private validate(request: CreateRequirementRequestDTO): void {
    if (!request.customerId) {
      throw new Error('customerId is required');
    }
    if (!request.title) {
      throw new Error('title is required');
    }
    if (!request.category) {
      throw new Error('category is required');
    }
  }
}
