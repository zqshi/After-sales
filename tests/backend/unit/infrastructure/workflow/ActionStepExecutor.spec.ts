import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionStepExecutor } from '@infrastructure/workflow/executors/ActionStepExecutor';
import type { WorkflowContext, WorkflowStep } from '@infrastructure/workflow/types';

const baseContext: WorkflowContext = {
  workflowName: 'test',
  executionId: 'exec-1',
  trigger: { type: 'manual', data: {} },
  variables: {},
};

describe('ActionStepExecutor', () => {
  let aiService: any;
  let executor: ActionStepExecutor;

  beforeEach(() => {
    aiService = {
      analyzeSentiment: vi.fn().mockResolvedValue({
        overallSentiment: 'neutral',
        score: 0.6,
        confidence: 0.7,
      }),
      classifyIssue: vi.fn().mockResolvedValue({
        issue_type: 'fault',
        category: 'technical',
        severity: 'P1',
        confidence: 0.8,
      }),
      recommendSolution: vi.fn().mockResolvedValue({
        steps: ['step1'],
        temporary_solution: 'tmp',
      }),
      estimateResolutionTime: vi.fn().mockResolvedValue({ estimate: '2小时内' }),
      checkCompliance: vi.fn().mockResolvedValue({ compliant: false, issues: ['bad'] }),
      detectViolations: vi.fn().mockResolvedValue({ violations: ['bad'] }),
      compareTeamPerformance: vi.fn().mockResolvedValue({ averages: { a: 80 }, overall: 80 }),
      analyzeConversation: vi.fn().mockResolvedValue({ conversationId: 'c1' }),
      analyzeLogs: vi.fn().mockResolvedValue({ summary: 'ok', error_signatures: [], root_cause: 'x' }),
      llmClient: {
        isEnabled: vi.fn().mockReturnValue(true),
        extractIntent: vi.fn().mockResolvedValue({
          intent: 'urgent',
          confidence: 0.9,
          keywords: ['x'],
        }),
        generateReply: vi.fn().mockResolvedValue({
          suggestedReply: 'reply',
          confidence: 0.88,
        }),
      },
    };

    executor = new ActionStepExecutor({
      aiService,
      searchKnowledgeUseCase: { execute: vi.fn().mockResolvedValue([{ id: 'k1' }]) },
      conversationRepository: {
        findById: vi.fn().mockResolvedValue({
          id: 'c1',
          customerId: 'cust-1',
          status: 'open',
          channel: 'web',
          priority: 'normal',
          messages: [
            {
              senderType: 'customer',
              senderId: 'u1',
              content: 'hi',
              sentAt: new Date('2024-01-01T00:00:00Z'),
            },
          ],
        }),
      },
      createReviewRequestUseCase: { execute: vi.fn().mockResolvedValue({ id: 'r1' }) },
      sendMessageUseCase: { execute: vi.fn().mockResolvedValue({ ok: true }) },
      createTaskUseCase: { execute: vi.fn().mockResolvedValue({ id: 't1' }) },
      createRequirementUseCase: { execute: vi.fn().mockResolvedValue({ id: 'req1' }) },
      closeConversationUseCase: { execute: vi.fn().mockResolvedValue({}) },
      mode: 'analysis_only',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports action steps by default', () => {
    expect(executor.supports({ name: 's1', type: 'action' })).toBe(true);
    expect(executor.supports({ name: 's2' })).toBe(true);
  });

  it('executes custom action when registered', async () => {
    executor.registerAction('custom_action', async (input) => ({ ok: input.value }));
    const step: WorkflowStep = { name: 'custom', action: 'custom_action', input: { value: 1 } };
    const result = await executor.execute(step, baseContext);
    expect(result.ok).toBe(1);
  });

  it('throws when action missing', async () => {
    await expect(executor.execute({ name: 'missing' }, baseContext)).rejects.toThrow(
      'has no action specified',
    );
  });

  it('throws when action unknown', async () => {
    const step: WorkflowStep = { name: 'unknown', action: 'not_supported' };
    await expect(executor.execute(step, baseContext)).rejects.toThrow('Unknown action: not_supported');
  });

  it('handles classify with sentiment agent', async () => {
    const step: WorkflowStep = {
      name: 'classify',
      action: 'classify',
      agent: 'sentiment_analyzer',
      input: { content: 'hello' },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.sentiment).toBe('neutral');
    expect(aiService.analyzeSentiment).toHaveBeenCalled();
  });

  it('handles classify with knowledge manager', async () => {
    const step: WorkflowStep = {
      name: 'classify',
      action: 'classify',
      agent: 'knowledge_manager',
      input: { query: 'login' },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.count).toBe(1);
  });

  it('handles classify with requirement collector', async () => {
    const step: WorkflowStep = {
      name: 'collect',
      action: 'classify',
      agent: 'requirement_collector',
      input: { message: '需要新增功能' },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.requirements.length).toBe(1);
  });

  it('handles classify with requirement collector no requirement', async () => {
    const step: WorkflowStep = {
      name: 'collect',
      action: 'classify',
      agent: 'requirement_collector',
      input: { message: '你好' },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.requirements.length).toBe(0);
  });

  it('handles classify with customer service and llm reply', async () => {
    const step: WorkflowStep = {
      name: 'service',
      action: 'classify',
      agent: 'customer_service',
      input: { content: 'hi', knowledge: [{ title: 'KB', url: 'x' }] },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.reply).toBe('reply');
    expect(aiService.llmClient.generateReply).toHaveBeenCalled();
  });

  it('handles default classify routing', async () => {
    const step: WorkflowStep = {
      name: 'default',
      action: 'classify',
      input: { content: 'urgent issue' },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.routeToAgent).toBe('engineer');
  });

  it('falls back classify_intent when llm disabled', async () => {
    aiService.llmClient.isEnabled.mockReturnValue(false);
    const step: WorkflowStep = { name: 'intent', action: 'classify_intent', input: 'help?' };
    const result = await executor.execute(step, baseContext);
    expect(result.intent).toBe('inquiry');
    expect(result.isQuestion).toBe(true);
  });

  it('returns conversation context', async () => {
    const step: WorkflowStep = {
      name: 'context',
      action: 'get_conversation_context',
      input: { conversationId: 'c1', limit: 1 },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.conversation.id).toBe('c1');
    expect(result.messages.length).toBe(1);
  });

  it('normalizes negative limit for conversation context', async () => {
    const step: WorkflowStep = {
      name: 'context',
      action: 'get_conversation_context',
      input: { conversationId: 'c1', limit: -1 },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.messages.length).toBe(1);
  });

  it('returns dry-run for escalate_to_human when not full', async () => {
    const step: WorkflowStep = {
      name: 'escalate',
      action: 'escalate_to_human',
      input: { conversationId: 'c1' },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.dryRun).toBe(true);
  });

  it('returns dry-run for send_message in analysis mode', async () => {
    const step: WorkflowStep = {
      name: 'send',
      action: 'send_message',
      channel: 'web',
      input: { conversationId: 'c1', content: 'hello' },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.dryRun).toBe(true);
  });

  it('returns dry-run for create_task in analysis mode', async () => {
    const step: WorkflowStep = {
      name: 'task',
      action: 'create_task',
      input: { title: 'T' },
    };
    const result = await executor.execute(step, baseContext);
    expect(result.dryRun).toBe(true);
  });

  it('throws when create_requirement missing customerId', async () => {
    const fullExecutor = new ActionStepExecutor({
      createRequirementUseCase: { execute: vi.fn() },
      mode: 'full',
    });
    const step: WorkflowStep = {
      name: 'req',
      action: 'create_requirement',
      input: { title: 'R' },
    };
    await expect(fullExecutor.execute(step, baseContext)).rejects.toThrow(
      'customerId is required',
    );
  });

  it('skips close_conversation for IM channel', async () => {
    const context: WorkflowContext = {
      ...baseContext,
      variables: { conversation: { id: 'c1', channel: 'wecom' } },
    };
    const step: WorkflowStep = {
      name: 'close',
      action: 'close_conversation',
      input: { conversationId: 'c1' },
    };
    const result = await executor.execute(step, context);
    expect(result.skipped).toBe(true);
  });

  it('handles diagnose_fault without ai service', async () => {
    const noAiExecutor = new ActionStepExecutor();
    const step: WorkflowStep = { name: 'diagnose', action: 'diagnose_fault', input: 'oops' };
    const result = await noAiExecutor.execute(step, baseContext);
    expect(result.root_cause).toBe('unknown');
  });
});

describe('ActionStepExecutor extra', () => {
  let aiService: any;
  let executor: ActionStepExecutor;

  beforeEach(() => {
    aiService = {
      analyzeSentiment: vi.fn().mockResolvedValue({
        overallSentiment: 'neutral',
        score: 0.6,
        confidence: 0.7,
      }),
      classifyIssue: vi.fn().mockResolvedValue({
        issue_type: 'fault',
        category: 'technical',
        severity: 'P1',
        confidence: 0.8,
      }),
      recommendSolution: vi.fn().mockResolvedValue({
        steps: ['step1'],
        temporary_solution: 'tmp',
      }),
      estimateResolutionTime: vi.fn().mockResolvedValue({ estimate: '2小时内' }),
      checkCompliance: vi.fn().mockResolvedValue({ compliant: false, issues: ['bad'] }),
      detectViolations: vi.fn().mockResolvedValue({ violations: ['bad'] }),
      compareTeamPerformance: vi.fn().mockResolvedValue({ averages: { a: 80 }, overall: 80 }),
      analyzeConversation: vi.fn().mockResolvedValue({ conversationId: 'c1' }),
      analyzeLogs: vi.fn().mockResolvedValue({ summary: 'ok', error_signatures: [], root_cause: 'x' }),
    };

    executor = new ActionStepExecutor({ aiService } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates technical ticket in full mode', async () => {
    const createTaskUseCase = { execute: vi.fn().mockResolvedValue({ id: 't-tech' }) };
    const fullExecutor = new ActionStepExecutor({ createTaskUseCase, mode: 'full' });
    const step: WorkflowStep = { name: 'tech', action: 'create_technical_ticket', input: { conversationId: 'c1' } };

    const result = await fullExecutor.execute(step, baseContext);

    expect(createTaskUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'technical', title: 'Technical Ticket' }),
    );
    expect(result.id).toBe('t-tech');
  });

  it('creates requirement in full mode using context customer', async () => {
    const createRequirementUseCase = { execute: vi.fn().mockResolvedValue({ id: 'req1' }) };
    const fullExecutor = new ActionStepExecutor({ createRequirementUseCase, mode: 'full' });
    const context: WorkflowContext = {
      ...baseContext,
      variables: { conversation: { id: 'c1', customerId: 'cust-1' } },
    };
    const step: WorkflowStep = { name: 'req', action: 'create_requirement', input: { title: 'Need' } };

    const result = await fullExecutor.execute(step, context);

    expect(createRequirementUseCase.execute).toHaveBeenCalled();
    expect(result.id).toBe('req1');
  });

  it('closes conversation in full mode', async () => {
    const closeConversationUseCase = { execute: vi.fn().mockResolvedValue(undefined) };
    const fullExecutor = new ActionStepExecutor({ closeConversationUseCase, mode: 'full' });
    const step: WorkflowStep = { name: 'close', action: 'close_conversation', input: { conversationId: 'c1' } };

    const result = await fullExecutor.execute(step, baseContext);

    expect(closeConversationUseCase.execute).toHaveBeenCalled();
    expect(result.conversationId).toBe('c1');
  });

  it('throws when inspect conversation missing id', async () => {
    const fullExecutor = new ActionStepExecutor({ aiService } as any);
    const step: WorkflowStep = { name: 'inspect', action: 'inspect_conversation', input: {} };

    await expect(fullExecutor.execute(step, baseContext)).rejects.toThrow('conversationId is required');
  });

  it('runs ai diagnose and classify issue actions', async () => {
    const stepDiagnose: WorkflowStep = { name: 'diag', action: 'diagnose_fault', input: { description: 'error' } };
    const stepIssue: WorkflowStep = { name: 'issue', action: 'classify_issue', input: { content: 'error' } };

    const resultDiag = await executor.execute(stepDiagnose, baseContext);
    const resultIssue = await executor.execute(stepIssue, baseContext);

    expect(resultDiag.severity).toBe('P1');
    expect(resultIssue.issue_type).toBe('fault');
  });

  it('handles analyze logs and recommend solution', async () => {
    const stepLogs: WorkflowStep = { name: 'logs', action: 'analyze_logs', input: { logs: 'stack' } };
    const stepRec: WorkflowStep = { name: 'solution', action: 'recommend_solution', input: { issue: 'error' } };

    const logs = await executor.execute(stepLogs, baseContext);
    const solution = await executor.execute(stepRec, baseContext);

    expect(logs.summary).toBe('ok');
    expect(solution.steps.length).toBe(1);
  });

  it('handles compliance, violations, team compare, estimate time', async () => {
    const stepCompliance: WorkflowStep = { name: 'comp', action: 'check_compliance', input: { content: 'text' } };
    const stepViolations: WorkflowStep = { name: 'viol', action: 'detect_violations', input: { content: 'text' } };
    const stepCompare: WorkflowStep = { name: 'compare', action: 'compare_team_performance', input: { reports: [{ teamId: 't1', qualityScore: 80 }] } };
    const stepEstimate: WorkflowStep = { name: 'estimate', action: 'estimate_resolution_time', input: { severity: 'P1' } };

    const compliance = await executor.execute(stepCompliance, baseContext);
    const violations = await executor.execute(stepViolations, baseContext);
    const compare = await executor.execute(stepCompare, baseContext);
    const estimate = await executor.execute(stepEstimate, baseContext);

    expect(compliance.compliant).toBe(false);
    expect(violations.violations.length).toBe(1);
    expect(compare.overall).toBe(80);
    expect(estimate.estimate).toBe('2小时内');
  });

  it('inspects and generates quality report', async () => {
    const stepInspect: WorkflowStep = { name: 'inspect', action: 'inspect_conversation', input: { conversationId: 'c1' } };
    const stepReport: WorkflowStep = { name: 'report', action: 'generate_quality_report', input: { conversationId: 'c1' } };

    const inspect = await executor.execute(stepInspect, baseContext);
    const report = await executor.execute(stepReport, baseContext);

    expect(inspect.conversationId).toBe('c1');
    expect(report.conversationId).toBe('c1');
  });

  it('logs and waits', async () => {
    const stepLog: WorkflowStep = { name: 'log', action: 'log', input: 'hello' };
    const stepWait: WorkflowStep = { name: 'wait', action: 'wait', timeout: 10 };

    vi.useFakeTimers();
    const logResult = await executor.execute(stepLog, baseContext);
    const promise = executor.execute(stepWait, baseContext);
    await vi.advanceTimersByTimeAsync(10);
    const waitResult = await promise;
    vi.useRealTimers();

    expect(logResult.logged).toBe(true);
    expect(waitResult.waited).toBe(10);
  });

  it('handles customer_service without llm', async () => {
    const noLlmService = {
      analyzeSentiment: vi.fn().mockResolvedValue({ overallSentiment: 'neutral', score: 0.5, confidence: 0.5 }),
      llmClient: { isEnabled: vi.fn().mockReturnValue(false) },
    };
    const noLlmExecutor = new ActionStepExecutor({ aiService: noLlmService } as any);
    const step: WorkflowStep = { name: 'service', action: 'classify', agent: 'customer_service', input: { content: 'hi' } };

    const result = await noLlmExecutor.execute(step, baseContext);

    expect(result.reply).toContain('已收到');
  });

  it('handles fault_agent branches', async () => {
    const stepCheck: WorkflowStep = { name: 'check_completeness', action: 'classify', agent: 'fault_agent', input: { content: '短' } };
    const stepSeverity: WorkflowStep = { name: 'assess_severity', action: 'classify', agent: 'fault_agent', input: { content: 'urgent 崩溃' } };
    const stepDiagnose: WorkflowStep = { name: 'diagnose', action: 'classify', agent: 'fault_agent', input: { content: 'error' } };
    const stepSolution: WorkflowStep = { name: 'generate_solution', action: 'classify', agent: 'fault_agent', input: { content: 'error' } };
    const stepDefault: WorkflowStep = { name: 'summary', action: 'classify', agent: 'fault_agent', input: { content: 'error' } };

    const check = await executor.execute(stepCheck, baseContext);
    const severity = await executor.execute(stepSeverity, baseContext);
    const diagnose = await executor.execute(stepDiagnose, baseContext);
    const solution = await executor.execute(stepSolution, baseContext);
    const fallback = await executor.execute(stepDefault, baseContext);

    expect(check.is_complete).toBe(false);
    expect(severity.severity).toBe('P0');
    expect(diagnose.root_cause).toBe('unknown');
    expect(solution.steps.length).toBeGreaterThan(0);
    expect(fallback.title).toBeTruthy();
  });

  it('handles requirement_agent branches', async () => {
    const stepPriority: WorkflowStep = { name: 'assess_priority', action: 'classify', agent: 'requirement_agent', input: { content: 'urgent 崩溃' } };
    const stepFeasible: WorkflowStep = { name: 'feasibility_analysis', action: 'classify', agent: 'requirement_agent', input: { content: 'feature' } };
    const stepBreakdown: WorkflowStep = { name: 'task_breakdown', action: 'classify', agent: 'requirement_agent', input: { content: 'feature' } };
    const stepDefault: WorkflowStep = { name: 'summary', action: 'classify', agent: 'requirement_agent', input: { content: 'feature' } };

    const priority = await executor.execute(stepPriority, baseContext);
    const feasible = await executor.execute(stepFeasible, baseContext);
    const breakdown = await executor.execute(stepBreakdown, baseContext);
    const fallback = await executor.execute(stepDefault, baseContext);

    expect(priority.priority).toBe('urgent');
    expect(feasible.is_feasible).toBe(true);
    expect(breakdown.task_list.length).toBe(1);
    expect(fallback.task_list.length).toBe(1);
  });

  it('throws on close_conversation when missing id', async () => {
    const fullExecutor = new ActionStepExecutor({ closeConversationUseCase: { execute: vi.fn() }, mode: 'full' } as any);
    const step: WorkflowStep = { name: 'close', action: 'close_conversation', input: {} };

    await expect(fullExecutor.execute(step, baseContext)).rejects.toThrow('conversationId is required');
  });

  it('uses llm intent for classify_intent', async () => {
    const llmService = {
      llmClient: { isEnabled: vi.fn().mockReturnValue(true), extractIntent: vi.fn().mockResolvedValue({ intent: 'urgent' }) },
    };
    const fullExecutor = new ActionStepExecutor({ aiService: llmService } as any);
    const step: WorkflowStep = { name: 'intent', action: 'classify_intent', input: 'help' };

    const result = await fullExecutor.execute(step, baseContext);

    expect(result.intent).toBe('urgent');
  });

  it('throws when conversationRepository missing for context', async () => {
    const fullExecutor = new ActionStepExecutor();
    const step: WorkflowStep = { name: 'context', action: 'get_conversation_context', input: { conversationId: 'c1' } };

    await expect(fullExecutor.execute(step, baseContext)).rejects.toThrow('conversationRepository is required');
  });

  it('throws when conversation not found', async () => {
    const repoExecutor = new ActionStepExecutor({
      conversationRepository: { findById: vi.fn().mockResolvedValue(null) } as any,
    });
    const step: WorkflowStep = { name: 'context', action: 'get_conversation_context', input: { conversationId: 'c1' } };

    await expect(repoExecutor.execute(step, baseContext)).rejects.toThrow('Conversation not found: c1');
  });

  it('escalates to human in full mode', async () => {
    const createReviewRequestUseCase = { execute: vi.fn().mockResolvedValue({ id: 'r1' }) };
    const fullExecutor = new ActionStepExecutor({ createReviewRequestUseCase, mode: 'full' } as any);
    const step: WorkflowStep = { name: 'escalate', action: 'escalate_to_human', input: { conversationId: 'c1' } };

    const result = await fullExecutor.execute(step, baseContext);

    expect(result.reviewRequestId).toBe('r1');
  });

  it('sends message in full mode', async () => {
    const sendMessageUseCase = { execute: vi.fn().mockResolvedValue({ ok: true }) };
    const fullExecutor = new ActionStepExecutor({ sendMessageUseCase, mode: 'full' } as any);
    const step: WorkflowStep = { name: 'send', action: 'send_message', input: { conversationId: 'c1', content: 'hi' } };

    await fullExecutor.execute(step, baseContext);

    expect(sendMessageUseCase.execute).toHaveBeenCalledWith({
      conversationId: 'c1',
      senderId: 'system',
      senderType: 'internal',
      content: 'hi',
      metadata: { channel: undefined },
    });
  });

  it('throws on send_message when conversationId missing', async () => {
    const fullExecutor = new ActionStepExecutor({ sendMessageUseCase: { execute: vi.fn() }, mode: 'full' } as any);
    const step: WorkflowStep = { name: 'send', action: 'send_message', input: { content: 'hi' } };

    await expect(fullExecutor.execute(step, baseContext)).rejects.toThrow('conversationId is required');
  });

  it('creates task in full mode', async () => {
    const createTaskUseCase = { execute: vi.fn().mockResolvedValue({ id: 't1' }) };
    const fullExecutor = new ActionStepExecutor({ createTaskUseCase, mode: 'full' } as any);
    const step: WorkflowStep = { name: 'task', action: 'create_task', input: { title: 'T', conversationId: 'c1' } };

    const result = await fullExecutor.execute(step, baseContext);

    expect(result.id).toBe('t1');
  });

  it('returns fallback outputs when aiService missing', async () => {
    const noAiExecutor = new ActionStepExecutor();
    const issue = await noAiExecutor.execute({ name: 'issue', action: 'classify_issue', input: 'x' }, baseContext);
    const logs = await noAiExecutor.execute({ name: 'logs', action: 'analyze_logs', input: 'x' }, baseContext);
    const compliance = await noAiExecutor.execute({ name: 'comp', action: 'check_compliance', input: 'x' }, baseContext);
    const violations = await noAiExecutor.execute({ name: 'viol', action: 'detect_violations', input: 'x' }, baseContext);
    const compare = await noAiExecutor.execute({ name: 'compare', action: 'compare_team_performance', input: {} }, baseContext);

    expect(issue.issue_type).toBe('inquiry');
    expect(logs.summary).toBe('no ai service');
    expect(compliance.compliant).toBe(true);
    expect(violations.violations).toEqual([]);
    expect(compare.overall).toBe(0);
  });

  it('falls back when llm intent throws', async () => {
    const llmService = {
      llmClient: { isEnabled: vi.fn().mockReturnValue(true), extractIntent: vi.fn().mockRejectedValue(new Error('boom')) },
      analyzeSentiment: vi.fn().mockResolvedValue({ overallSentiment: 'neutral', score: 0.5, confidence: 0.5 }),
    };
    const fullExecutor = new ActionStepExecutor({ aiService: llmService } as any);
    const step: WorkflowStep = { name: 'default', action: 'classify', input: { content: 'hello' } };

    const result = await fullExecutor.execute(step, baseContext);

    expect(result.routeToAgent).toBe('assistant');
  });

  it('returns ai disabled summary in inspect', async () => {
    const noAiExecutor = new ActionStepExecutor();
    const step: WorkflowStep = { name: 'inspect', action: 'inspect_conversation', input: { conversationId: 'c1' } };

    const result = await noAiExecutor.execute(step, baseContext);

    expect(result.summary).toBe('ai disabled');
  });

  it('throws when escalate_to_human missing conversationId', async () => {
    const fullExecutor = new ActionStepExecutor({ createReviewRequestUseCase: { execute: vi.fn() }, mode: 'full' } as any);
    const step: WorkflowStep = { name: 'escalate', action: 'escalate_to_human', input: {} };

    await expect(fullExecutor.execute(step, baseContext)).rejects.toThrow('conversationId is required');
  });
});
