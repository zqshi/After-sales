import { Task } from '@domain/task/models/Task';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';
import { ConversationRepository } from '@infrastructure/repositories/ConversationRepository';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';

import { Validator } from '../../../infrastructure/validation/Validator';
import { CreateTaskRequestDTO, CreateTaskRequestSchema } from '../../dto/CreateTaskRequestDTO';
import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';


export class CreateTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async execute(request: CreateTaskRequestDTO): Promise<TaskResponseDTO> {
    const validatedRequest = Validator.validate(CreateTaskRequestSchema, request);

    const priority = validatedRequest.priority
      ? TaskPriority.create(validatedRequest.priority)
      : TaskPriority.create('medium');

    const dueDate = validatedRequest.dueDate ? new Date(validatedRequest.dueDate) : undefined;

    // 如果有conversationId但没有assigneeId，从Conversation获取agentId
    let assigneeId = validatedRequest.assigneeId;
    if (validatedRequest.conversationId && !assigneeId) {
      const conversation = await this.conversationRepository.findById(validatedRequest.conversationId);
      if (conversation) {
        assigneeId = conversation.agentId;
      }
    }

    const task = Task.create({
      title: validatedRequest.title,
      type: validatedRequest.type,
      assigneeId,
      conversationId: validatedRequest.conversationId,
      requirementId: validatedRequest.requirementId,
      priority,
      dueDate,
      metadata: validatedRequest.metadata,
    });

    await this.taskRepository.save(task);
    return TaskResponseDTO.fromTask(task);
  }
}
