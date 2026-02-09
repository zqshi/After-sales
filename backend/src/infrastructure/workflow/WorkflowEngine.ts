/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
/**
 * WorkflowEngine - 工作流引擎
 *
 * 职责：
 * 1. 加载YAML工作流定义
 * 2. 执行工作流（顺序、并行、条件分支）
 * 3. 管理步骤执行器
 * 4. 处理人工干预点
 * 5. 收集执行指标
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

import * as yaml from 'yaml';

import { ActionStepExecutor } from './executors/ActionStepExecutor';
import { HumanInLoopExecutor } from './executors/HumanInLoopExecutor';
import { ParallelStepExecutor } from './executors/ParallelStepExecutor';
import { WorkflowRunRepository } from '@infrastructure/repositories/WorkflowRunRepository';
import { WorkflowStepRepository } from '@infrastructure/repositories/WorkflowStepRepository';
import {
  WorkflowDefinition,
  WorkflowContext,
  WorkflowResult,
  WorkflowStep,
  StepResult,
  IStepExecutor,
  WorkflowEngineConfig,
  HumanInLoopResponse,
} from './types';
import { WorkflowState } from './WorkflowState';

export class WorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executors: IStepExecutor[] = [];
  private config: WorkflowEngineConfig;
  private eventEmitter: EventEmitter;
  private actionExecutor: ActionStepExecutor;
  private humanInLoopExecutor: HumanInLoopExecutor;
  private persistence?: {
    runRepository: WorkflowRunRepository;
    stepRepository: WorkflowStepRepository;
  };

  constructor(
    config: WorkflowEngineConfig,
    overrides?: {
      actionExecutor?: ActionStepExecutor;
      humanInLoopExecutor?: HumanInLoopExecutor;
      parallelExecutor?: ParallelStepExecutor;
      persistence?: {
        runRepository: WorkflowRunRepository;
        stepRepository: WorkflowStepRepository;
      };
    },
  ) {
    this.config = config;
    this.eventEmitter = new EventEmitter();

    // 初始化默认执行器
    this.actionExecutor = overrides?.actionExecutor ?? new ActionStepExecutor();
    this.humanInLoopExecutor =
      overrides?.humanInLoopExecutor ?? new HumanInLoopExecutor(this.eventEmitter);
    const parallelExecutor =
      overrides?.parallelExecutor ?? new ParallelStepExecutor(config.maxParallelSteps);

    this.executors = [this.actionExecutor, parallelExecutor, this.humanInLoopExecutor];
    this.persistence = overrides?.persistence;

    console.log('[WorkflowEngine] Initialized with config:', {
      workflowsDir: config.workflowsDir,
      defaultTimeout: config.defaultTimeout,
      maxParallelSteps: config.maxParallelSteps,
    });
  }

  /**
   * 从YAML文件加载工作流
   */
  async loadWorkflow(yamlPath: string): Promise<void> {
    try {
      const fullPath = path.isAbsolute(yamlPath)
        ? yamlPath
        : path.join(this.config.workflowsDir, yamlPath);

      const yamlContent = fs.readFileSync(fullPath, 'utf-8');
      const workflow = yaml.parse(yamlContent) as WorkflowDefinition;

      // 验证工作流定义
      this.validateWorkflow(workflow);

      this.workflows.set(workflow.name, workflow);
      console.log(`[WorkflowEngine] Loaded workflow: ${workflow.name} from ${yamlPath}`);
    } catch (err) {
      console.error(`[WorkflowEngine] Failed to load workflow from ${yamlPath}:`, err);
      throw err;
    }
  }

  /**
   * 从目录加载所有工作流
   */
  async loadWorkflowsFromDirectory(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.workflowsDir);

      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          await this.loadWorkflow(file);
        }
      }

      console.log(`[WorkflowEngine] Loaded ${this.workflows.size} workflows`);
    } catch (err) {
      console.error('[WorkflowEngine] Failed to load workflows from directory:', err);
      // 目录不存在时不抛出错误，允许运行时加载
    }
  }

  /**
   * 验证工作流定义
   */
  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.name) {
      throw new Error('Workflow must have a name');
    }
    if (!workflow.trigger) {
      throw new Error(`Workflow ${workflow.name} must have a trigger`);
    }
    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error(`Workflow ${workflow.name} must have at least one step`);
    }

    // 验证步骤名称唯一性
    const stepNames = new Set<string>();
    for (const step of workflow.steps) {
      if (stepNames.has(step.name)) {
        throw new Error(`Duplicate step name: ${step.name} in workflow ${workflow.name}`);
      }
      stepNames.add(step.name);
    }
  }

  /**
   * 执行工作流
   */
  async execute(workflowName: string, triggerData: any): Promise<WorkflowResult> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow ${workflowName} not found`);
    }

    // 创建执行上下文
    const context: WorkflowContext = {
      workflowName,
      executionId: this.generateExecutionId(),
      trigger: {
        type: workflow.trigger.type,
        data: triggerData,
      },
      variables: {
        // 初始变量
        trigger: triggerData,
        message: triggerData.message,
        conversation: triggerData.conversation,
      },
    };

    const state = new WorkflowState(context);
    const startedAt = new Date();
    const startMs = Date.now();
    await this.persistence?.runRepository.createOrUpdate({
      executionId: context.executionId,
      workflowName: context.workflowName,
      status: 'running',
      conversationId: triggerData?.conversation?.id ?? triggerData?.conversationId ?? null,
      trigger: context.trigger,
      startedAt,
    });

    console.log(
      `[WorkflowEngine] Starting execution: ${workflowName} (${context.executionId})`,
    );

    try {
      // 执行所有步骤
      for (const step of workflow.steps) {
        await this.executeStep(step, state);
      }

      // 执行完成回调
      if (workflow.onComplete && workflow.onComplete.length > 0) {
        for (const step of workflow.onComplete) {
          await this.executeStep(step, state);
        }
      }

      state.setStatus('completed');
      console.log(`[WorkflowEngine] Execution completed: ${context.executionId}`);
    } catch (err) {
      console.error(`[WorkflowEngine] Execution failed: ${context.executionId}`, err);
      state.setError((err as Error).message, 'unknown', (err as Error).stack);

      // 执行错误处理步骤
      if (workflow.onError && workflow.onError.length > 0) {
        console.log('[WorkflowEngine] Executing error handling steps');
        try {
          for (const step of workflow.onError) {
            await this.executeStep(step, state);
          }
        } catch (errHandlerError) {
          console.error('[WorkflowEngine] Error handler failed:', errHandlerError);
        }
      }
    }

    const result = state.getResult();
    await this.persistence?.runRepository.createOrUpdate({
      executionId: context.executionId,
      workflowName: context.workflowName,
      status: result.status,
      conversationId: triggerData?.conversation?.id ?? triggerData?.conversationId ?? null,
      result: result as unknown as Record<string, unknown>,
      errorMessage: result.error?.message ?? null,
      completedAt: new Date(),
      durationMs: Date.now() - startMs,
    });

    // 发出执行完成事件
    this.eventEmitter.emit('workflow_completed', result);

    // 收集指标
    if (this.config.enableMetrics) {
      this.collectMetrics(result);
    }

    return result;
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: WorkflowStep, state: WorkflowState): Promise<void> {
    const stepStartTime = Date.now();
    const stepStartedAt = new Date(stepStartTime);

    // 检查条件
    if (step.condition && !state.evaluateCondition(step.condition)) {
      console.log(`[WorkflowEngine] Skipping step ${step.name} (condition not met)`);
      state.recordStepResult({
        stepName: step.name,
        status: 'skipped',
        startedAt: stepStartedAt,
        completedAt: new Date(),
        duration: 0,
      });
      await this.persistence?.stepRepository.save({
        executionId: state.getContext().executionId,
        stepName: step.name,
        stepType: step.type,
        status: 'skipped',
        input: state.resolveInput(step.input),
        startedAt: stepStartedAt,
        completedAt: new Date(),
        durationMs: 0,
      });
      return;
    }

    console.log(`[WorkflowEngine] Executing step: ${step.name}`);

    // 并行步骤在引擎内执行，确保共享状态与结果记录
    if (step.type === 'parallel') {
      await this.executeParallelStep(step, state);
      return;
    }

    // 解析输入
    const resolvedInput = state.resolveInput(step.input);

    try {
      // 查找合适的执行器
      const executor = this.findExecutor(step);
      if (!executor) {
        throw new Error(`No executor found for step ${step.name} (type: ${step.type})`);
      }

      // 设置超时
      const timeout = step.timeout || this.config.defaultTimeout;
      const executionPromise = executor.execute(
        { ...step, input: resolvedInput },
        state.getContext(),
      );

      let output: any;
      if (step.loop) {
        const loopData = state.get(step.loop);
        if (Array.isArray(loopData)) {
          const loopResults = [];
          for (const item of loopData) {
            state.set('item', item);
            const loopInput = state.resolveInput(step.input);
            const loopPromise = executor.execute(
              { ...step, input: loopInput },
              state.getContext(),
            );
            const loopOutput =
              timeout > 0
                ? await Promise.race([
                    loopPromise,
                    this.createTimeoutPromise(timeout, step.name),
                  ])
                : await loopPromise;
            loopResults.push(loopOutput);
          }
          output = loopResults;
        } else {
          output = [];
        }
      } else if (timeout > 0) {
        output = await Promise.race([
          executionPromise,
          this.createTimeoutPromise(timeout, step.name),
        ]);
      } else {
        output = await executionPromise;
      }

      // 记录步骤结果
      const stepResult: StepResult = {
        stepName: step.name,
        status: 'completed',
        startedAt: stepStartedAt,
        completedAt: new Date(),
        duration: Date.now() - stepStartTime,
        input: resolvedInput,
        output,
      };

      state.recordStepResult(stepResult);

      // 如果步骤指定了输出变量名，设置到状态中
      if (step.output) {
        state.set(step.output, output);
      }
      await this.persistence?.stepRepository.save({
        executionId: state.getContext().executionId,
        stepName: step.name,
        stepType: step.type,
        status: 'success',
        input: resolvedInput,
        output: output ?? {},
        startedAt: stepStartedAt,
        completedAt: new Date(),
        durationMs: Date.now() - stepStartTime,
      });
    } catch (err) {
      console.error(`[WorkflowEngine] Step ${step.name} failed:`, err);

      // 记录失败结果
      const stepResult: StepResult = {
        stepName: step.name,
        status: 'failed',
        startedAt: stepStartedAt,
        completedAt: new Date(),
        duration: Date.now() - stepStartTime,
        input: resolvedInput,
        error: (err as Error).message,
      };

      state.recordStepResult(stepResult);
      await this.persistence?.stepRepository.save({
        executionId: state.getContext().executionId,
        stepName: step.name,
        stepType: step.type,
        status: 'error',
        input: resolvedInput,
        errorMessage: (err as Error).message,
        startedAt: stepStartedAt,
        completedAt: new Date(),
        durationMs: Date.now() - stepStartTime,
      });

      // 如果有降级策略，使用降级值
      if (step.fallback) {
        console.log(`[WorkflowEngine] Using fallback for step ${step.name}`);
        state.set(step.name, step.fallback);
        return;
      }

      throw err;
    }
  }

  private async executeParallelStep(step: WorkflowStep, state: WorkflowState): Promise<void> {
    const stepStartTime = Date.now();
    const stepStartedAt = new Date(stepStartTime);
    if (!step.steps || step.steps.length === 0) {
      throw new Error(`Parallel step ${step.name} has no sub-steps`);
    }

    const maxParallel = Math.max(this.config.maxParallelSteps, 1);
    const results: Record<string, any> = {};

    try {
      for (let i = 0; i < step.steps.length; i += maxParallel) {
        const batch = step.steps.slice(i, i + maxParallel);
        const batchResults = await Promise.allSettled(
          batch.map(async (subStep) => {
            await this.executeStep(subStep, state);
            return state.get(subStep.name);
          }),
        );

        batchResults.forEach((result, index) => {
          const subStep = batch[index];
          if (result.status === 'fulfilled') {
            results[subStep.name] = result.value;
          } else {
            results[subStep.name] = { error: (result.reason as Error).message };
          }
        });
      }

      const stepResult: StepResult = {
        stepName: step.name,
        status: 'completed',
        startedAt: stepStartedAt,
        completedAt: new Date(),
        duration: Date.now() - stepStartTime,
        input: state.resolveInput(step.input),
        output: results,
      };
      state.recordStepResult(stepResult);
      if (step.output) {
        state.set(step.output, results);
      }
      await this.persistence?.stepRepository.save({
        executionId: state.getContext().executionId,
        stepName: step.name,
        stepType: step.type,
        status: 'success',
        input: state.resolveInput(step.input),
        output: results,
        startedAt: stepStartedAt,
        completedAt: new Date(),
        durationMs: Date.now() - stepStartTime,
      });
    } catch (err) {
      const stepResult: StepResult = {
        stepName: step.name,
        status: 'failed',
        startedAt: stepStartedAt,
        completedAt: new Date(),
        duration: Date.now() - stepStartTime,
        input: state.resolveInput(step.input),
        error: (err as Error).message,
      };
      state.recordStepResult(stepResult);
      await this.persistence?.stepRepository.save({
        executionId: state.getContext().executionId,
        stepName: step.name,
        stepType: step.type,
        status: 'error',
        input: state.resolveInput(step.input),
        errorMessage: (err as Error).message,
        startedAt: stepStartedAt,
        completedAt: new Date(),
        durationMs: Date.now() - stepStartTime,
      });
      throw err;
    }
  }

  /**
   * 查找合适的执行器
   */
  private findExecutor(step: WorkflowStep): IStepExecutor | undefined {
    return this.executors.find((executor) => executor.supports(step));
  }

  /**
   * 创建超时Promise
   */
  private createTimeoutPromise(timeout: number, stepName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step ${stepName} timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 注册自定义执行器
   */
  registerExecutor(executor: IStepExecutor): void {
    this.executors.push(executor);
    console.log('[WorkflowEngine] Registered custom executor');
  }

  /**
   * 注册自定义动作
   */
  registerAction(
    name: string,
    handler: (input: any, context: WorkflowContext) => Promise<any>,
  ): void {
    this.actionExecutor.registerAction(name, handler);
    console.log(`[WorkflowEngine] Registered custom action: ${name}`);
  }

  /**
   * 提交人工响应
   */
  submitHumanResponse(
    executionId: string,
    stepName: string,
    response: HumanInLoopResponse,
  ): void {
    this.humanInLoopExecutor.submitResponse(executionId, stepName, response);
  }

  /**
   * 获取待处理的人工审核请求
   */
  getPendingHumanReviews() {
    return this.humanInLoopExecutor.getPendingRequests();
  }

  /**
   * 获取所有工作流名称
   */
  getWorkflowNames(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * 获取工作流定义
   */
  getWorkflow(name: string): WorkflowDefinition | undefined {
    return this.workflows.get(name);
  }

  /**
   * 监听事件
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * 收集指标
   */
  private collectMetrics(result: WorkflowResult): void {
    // Phase 2: 集成Prometheus MetricsCollector
    console.log('[WorkflowEngine] Metrics:', {
      workflow: result.workflowName,
      status: result.status,
      duration: result.duration,
      steps: result.steps.length,
    });
  }
}
