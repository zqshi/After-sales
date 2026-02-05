import { describe, it, expect, vi } from 'vitest';
import { CustomerSupportSaga } from '@application/sagas/CustomerSupportSaga';
import { Conversation } from '@domain/conversation/models/Conversation';
import { Channel } from '@domain/conversation/value-objects/Channel';

const makeConversation = () =>
  Conversation.create({
    customerId: 'cust-1',
    channel: Channel.fromString('web'),
  });

describe('CustomerSupportSaga', () => {
  it('processes customer message and creates tasks', async () => {
    const conversationRepo = {
      findByCustomerId: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
    };
    const requirementRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
    };
    const taskRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
    };
    const customerProfileRepo = {};

    const saga = new CustomerSupportSaga(
      conversationRepo as any,
      requirementRepo as any,
      taskRepo as any,
      customerProfileRepo as any,
    );

    const result = await saga.processCustomerMessage({
      customerId: 'cust-1',
      message: 'refund bug',
      channel: 'web',
    });

    expect(result.success).toBe(true);
    expect(result.requirementIds.length).toBeGreaterThan(0);
    expect(result.taskIds.length).toBeGreaterThan(0);
  });

  it('uses existing open conversation', async () => {
    const conversation = makeConversation();
    const conversationRepo = {
      findByCustomerId: vi.fn().mockResolvedValue([conversation]),
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
    };
    const requirementRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
    };
    const taskRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
    };

    const saga = new CustomerSupportSaga(
      conversationRepo as any,
      requirementRepo as any,
      taskRepo as any,
      {} as any,
    );

    const result = await saga.processCustomerMessage({
      customerId: 'cust-1',
      message: 'question',
      channel: 'web',
    });

    expect(result.success).toBe(true);
    expect(conversationRepo.save).toHaveBeenCalled();
  });

  it('marks needs human review on timeout', async () => {
    vi.useFakeTimers();
    const conversation = makeConversation();
    const conversationRepo = {
      findByCustomerId: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(conversation),
    };
    const requirementRepo = { save: vi.fn(), findById: vi.fn() };
    const taskRepo = { save: vi.fn(), findById: vi.fn() };

    const saga = new CustomerSupportSaga(
      conversationRepo as any,
      requirementRepo as any,
      taskRepo as any,
      {} as any,
    );

    (saga as any).analyzeRequirements = () => new Promise(() => {});

    const promise = saga.processCustomerMessage({
      customerId: 'cust-1',
      message: 'refund',
      channel: 'web',
    });

    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result.needsHumanReview).toBe(true);
    vi.useRealTimers();
  });

  it('compensates on failure', async () => {
    const conversationRepo = { findByCustomerId: vi.fn(), save: vi.fn(), findById: vi.fn() };
    const requirementRepo = { save: vi.fn(), findById: vi.fn() };
    const taskRepo = { save: vi.fn(), findById: vi.fn() };

    const saga = new CustomerSupportSaga(
      conversationRepo as any,
      requirementRepo as any,
      taskRepo as any,
      {} as any,
    );

    const compensate = vi.fn().mockResolvedValue(undefined);
    (saga as any).createOrGetConversation = async () => {
      throw new Error('fail');
    };
    (saga as any).compensate = compensate;

    const result = await saga.processCustomerMessage({
      customerId: 'cust-1',
      message: 'refund',
      channel: 'web',
    });

    expect(result.success).toBe(false);
    expect(compensate).toHaveBeenCalled();
  });

  it('gets saga status', async () => {
    const conversation = makeConversation();
    const conversationRepo = {
      findById: vi.fn().mockResolvedValue(conversation),
    };
    const saga = new CustomerSupportSaga(
      conversationRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await saga.getSagaStatus(conversation.id);
    expect(result.conversation).toBe(conversation);
  });
});
