import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource, OptimisticLockVersionMismatchError } from '../../../../backend/node_modules/typeorm/index.js';

import { Conversation } from '@domain/conversation/models/Conversation';
import { Channel } from '@domain/conversation/value-objects/Channel';
import { Task } from '@domain/task/models/Task';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';
import { OutboxEventBus } from '@infrastructure/events/OutboxEventBus';
import { ConversationRepository } from '@infrastructure/repositories/ConversationRepository';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { closeTestDataSource, getTestDataSource } from '../../helpers/testDatabase';
const describeWithDb = process.env.SKIP_TEST_ENV_SETUP === 'true' ? describe.skip : describe;

describeWithDb('Optimistic locking (integration)', () => {
  let dataSource: DataSource;
  let conversationRepository: ConversationRepository;
  let taskRepository: TaskRepository;

  beforeAll(async () => {
    dataSource = await getTestDataSource();
    conversationRepository = new ConversationRepository(dataSource);
    taskRepository = new TaskRepository(dataSource, new OutboxEventBus(dataSource));
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await closeTestDataSource();
  });

  it('rejects stale updates for conversations', async () => {
    const conversation = Conversation.create({
      customerId: 'cust-optimistic-1',
      channel: Channel.fromString('chat'),
      agentId: 'agent-1',
    });

    await conversationRepository.save(conversation);

    const first = await conversationRepository.findById(conversation.id);
    const second = await conversationRepository.findById(conversation.id);

    if (!first || !second) {
      throw new Error('Conversation not found for optimistic lock test');
    }

    first.sendMessage({
      senderId: 'agent-1',
      senderType: 'agent',
      content: 'First update',
    });
    await conversationRepository.save(first);

    second.sendMessage({
      senderId: 'agent-1',
      senderType: 'agent',
      content: 'Stale update',
    });

    await expect(conversationRepository.save(second)).rejects.toBeInstanceOf(
      OptimisticLockVersionMismatchError,
    );
  });

  it('rejects stale updates for tasks', async () => {
    const task = Task.create({
      title: 'Optimistic lock task',
      priority: TaskPriority.create('medium'),
    });

    await taskRepository.save(task);

    const first = await taskRepository.findById(task.id);
    const second = await taskRepository.findById(task.id);

    if (!first || !second) {
      throw new Error('Task not found for optimistic lock test');
    }

    first.start();
    await taskRepository.save(first);

    second.start();

    await expect(taskRepository.save(second)).rejects.toBeInstanceOf(
      OptimisticLockVersionMismatchError,
    );
  });
});
