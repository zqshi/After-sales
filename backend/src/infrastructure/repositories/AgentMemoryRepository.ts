import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { AgentMemoryEntity } from '@infrastructure/database/entities/AgentMemoryEntity';

export interface AgentMemoryInput {
  conversationId: string;
  agentName: string;
  memory: Record<string, unknown>;
}

export class AgentMemoryRepository {
  private repository: Repository<AgentMemoryEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(AgentMemoryEntity);
  }

  async saveOrUpdate(input: AgentMemoryInput): Promise<AgentMemoryEntity> {
    const existing = await this.repository.findOne({
      where: { conversationId: input.conversationId, agentName: input.agentName },
    });

    const entity = existing ?? new AgentMemoryEntity();
    if (!existing) {
      entity.id = uuidv4();
      entity.conversationId = input.conversationId;
      entity.agentName = input.agentName;
    }
    entity.memory = input.memory ?? {};
    return this.repository.save(entity);
  }

  async findByConversation(conversationId: string, agentName: string): Promise<AgentMemoryEntity | null> {
    return this.repository.findOne({
      where: { conversationId, agentName },
    });
  }
}
