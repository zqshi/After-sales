import { Requirement } from '@domain/requirement/models/Requirement';
import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';
import { RequirementDetectorService } from '@domain/requirement/services/RequirementDetectorService';
import { CreateRequirementRequestDTO } from '../../dto/requirement/CreateRequirementRequestDTO';
import { RequirementResponseDTO } from '../../dto/requirement/RequirementResponseDTO';
import { Priority } from '@domain/requirement/value-objects/Priority';
import { RequirementSource } from '@domain/requirement/value-objects/RequirementSource';

export class CreateRequirementUseCase {
  private detector: RequirementDetectorService;

  constructor(private readonly requirementRepository: RequirementRepository) {
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

    await this.requirementRepository.save(requirement);
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
