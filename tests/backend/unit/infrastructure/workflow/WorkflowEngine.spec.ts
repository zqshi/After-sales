import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WorkflowEngine } from '@infrastructure/workflow/WorkflowEngine';
import type { WorkflowDefinition } from '@infrastructure/workflow/types';

const createTempDir = () => fs.mkdtempSync(path.join(process.cwd(), 'tmp-workflow-'));

const createEngine = (workflowsDir: string) =>
  new WorkflowEngine({
    workflowsDir,
    defaultTimeout: 10,
    maxParallelSteps: 2,
    enableLogging: false,
    enableMetrics: false,
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WorkflowEngine', () => {
  it('loads workflow from yaml and validates', async () => {
    const dir = createTempDir();
    const yamlPath = path.join(dir, 'flow.yaml');
    fs.writeFileSync(
      yamlPath,
      `name: sample\ntrigger:\n  type: manual\nsteps:\n  - name: step1\n    action: log\n`,
    );

    const engine = createEngine(dir);
    await engine.loadWorkflow('flow.yaml');

    expect(engine.getWorkflowNames()).toContain('sample');
    expect(engine.getWorkflow('sample')?.steps.length).toBe(1);
  });

  it('rejects invalid workflow definitions', async () => {
    const dir = createTempDir();
    const yamlPath = path.join(dir, 'bad.yaml');
    fs.writeFileSync(
      yamlPath,
      `name: bad\ntrigger:\n  type: manual\nsteps: []\n`,
    );

    const engine = createEngine(dir);
    await expect(engine.loadWorkflow('bad.yaml')).rejects.toThrow('at least one step');
  });

  it('executes workflow with conditions and onComplete steps', async () => {
    const dir = createTempDir();
    const engine = createEngine(dir);

    engine.registerAction('set_confidence', async () => 0.9);

    const workflow: WorkflowDefinition = {
      name: 'cond-flow',
      trigger: { type: 'manual' },
      steps: [
        { name: 'conf', action: 'set_confidence', output: 'confidence' },
        { name: 'high', action: 'log', condition: '$confidence > 0.8', output: 'high' },
      ],
      onComplete: [{ name: 'done', action: 'log', output: 'done' }],
    };

    engine['workflows'].set(workflow.name, workflow);

    const result = await engine.execute('cond-flow', { message: {} });

    const highStep = result.steps.find((step) => step.stepName === 'high');
    expect(result.status).toBe('completed');
    expect(highStep?.status).toBe('completed');
    expect(result.output.done).toBeDefined();
  });

  it('skips step when condition not met', async () => {
    const dir = createTempDir();
    const engine = createEngine(dir);

    engine.registerAction('set_confidence', async () => 0.4);

    const workflow: WorkflowDefinition = {
      name: 'skip-flow',
      trigger: { type: 'manual' },
      steps: [
        { name: 'conf', action: 'set_confidence', output: 'confidence' },
        { name: 'high', action: 'log', condition: '$confidence > 0.8' },
      ],
    };

    engine['workflows'].set(workflow.name, workflow);

    const result = await engine.execute('skip-flow', { message: {} });
    const highStep = result.steps.find((step) => step.stepName === 'high');
    expect(highStep?.status).toBe('skipped');
  });

  it('executes loop steps and aggregates outputs', async () => {
    const dir = createTempDir();
    const engine = createEngine(dir);

    engine.registerAction('echo', async (input) => input);

    const workflow: WorkflowDefinition = {
      name: 'loop-flow',
      trigger: { type: 'manual' },
      steps: [
        {
          name: 'loop-step',
          action: 'echo',
          loop: '$trigger.items',
          input: '$item',
          output: 'loopResult',
        },
      ],
    };

    engine['workflows'].set(workflow.name, workflow);

    const result = await engine.execute('loop-flow', { items: [1, 2, 3], message: {} });
    expect(result.output.loopResult).toEqual([1, 2, 3]);
  });

  it('uses fallback when step times out', async () => {
    const dir = createTempDir();
    const engine = createEngine(dir);

    const workflow: WorkflowDefinition = {
      name: 'timeout-flow',
      trigger: { type: 'manual' },
      steps: [
        {
          name: 'wait-step',
          action: 'wait',
          timeout: 5,
          input: { duration: 50 },
          fallback: 'fallback-value',
        },
      ],
    };

    engine['workflows'].set(workflow.name, workflow);

    const result = await engine.execute('timeout-flow', { message: {} });
    expect(result.status).toBe('completed');
    expect(result.output['wait-step']).toBe('fallback-value');
  });

  it('executes parallel steps and aggregates outputs', async () => {
    const dir = createTempDir();
    const engine = createEngine(dir);

    engine.registerAction('echo', async (input) => input);

    const workflow: WorkflowDefinition = {
      name: 'parallel-flow',
      trigger: { type: 'manual' },
      steps: [
        {
          name: 'parallel',
          type: 'parallel',
          output: 'parallelOutput',
          steps: [
            { name: 'a', action: 'echo', input: 'A', output: 'a' },
            { name: 'b', action: 'echo', input: 'B', output: 'b' },
          ],
        },
      ],
    };

    engine['workflows'].set(workflow.name, workflow);

    const result = await engine.execute('parallel-flow', { message: {} });
    expect(result.output.parallelOutput).toEqual({ a: 'A', b: 'B' });
  });
});
