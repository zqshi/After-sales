import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SurveyEntity } from '@infrastructure/database/entities/SurveyEntity';

export class SurveyRepository {
  private repository: Repository<SurveyEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(SurveyEntity);
  }

  async save(input: {
    customerId: string;
    conversationId?: string;
    questions: string[];
    metadata?: Record<string, unknown>;
  }): Promise<SurveyEntity> {
    const entity = new SurveyEntity();
    entity.id = uuidv4();
    entity.customerId = input.customerId;
    entity.conversationId = input.conversationId ?? null;
    entity.questions = input.questions;
    entity.responses = [];
    entity.status = 'pending';
    entity.metadata = input.metadata ?? {};
    return this.repository.save(entity);
  }
}
