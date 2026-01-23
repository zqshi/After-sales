import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';

export interface RequirementStatisticsResponse {
  total: number;
  byStatus: Record<string, number>;
}

const STATUSES = ['pending', 'approved', 'resolved', 'ignored', 'cancelled'] as const;

export class GetRequirementStatisticsUseCase {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(): Promise<RequirementStatisticsResponse> {
    const counts = await Promise.all(
      STATUSES.map(async (status) => ({
        status,
        count: await this.requirementRepository.countByFilters({ status }),
      })),
    );

    const byStatus = counts.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});

    const total = counts.reduce((sum, item) => sum + item.count, 0);

    return { total, byStatus };
  }
}
