import { RequirementResponseDTO } from './RequirementResponseDTO';

export class RequirementListResponseDTO {
  items: RequirementResponseDTO[];
  total: number;
  page: number;
  limit: number;

  static from(
    items: RequirementResponseDTO[],
    total: number,
    page: number,
    limit: number,
  ): RequirementListResponseDTO {
    const dto = new RequirementListResponseDTO();
    dto.items = items;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
