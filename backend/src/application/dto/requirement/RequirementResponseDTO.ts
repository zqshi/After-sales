export class RequirementResponseDTO {
  id: string;
  customerId: string;
  conversationId?: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  source: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;

  static fromDomain(requirement: {
    id: string;
    customerId: string;
    conversationId?: string;
    title: string;
    description?: string;
    category: string;
    priority: { value: string };
    status: string;
    source: { value: string };
    createdBy?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }): RequirementResponseDTO {
    const dto = new RequirementResponseDTO();
    dto.id = requirement.id;
    dto.customerId = requirement.customerId;
    dto.conversationId = requirement.conversationId;
    dto.title = requirement.title;
    dto.description = requirement.description;
    dto.category = requirement.category;
    dto.priority = requirement.priority.value;
    dto.status = requirement.status;
    dto.source = requirement.source.value;
    dto.createdBy = requirement.createdBy;
    dto.metadata = requirement.metadata;
    dto.createdAt = requirement.createdAt.toISOString();
    dto.updatedAt = requirement.updatedAt.toISOString();
    return dto;
  }
}
