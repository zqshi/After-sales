import { HumanInLoopExecutor } from './executors/HumanInLoopExecutor';
import { HumanInLoopResponse } from './types';
import { WorkflowEngine } from './WorkflowEngine';

export class WorkflowRegistry {
  private static engine?: WorkflowEngine;
  private static humanExecutor?: HumanInLoopExecutor;

  static setWorkflowEngine(engine: WorkflowEngine, humanExecutor: HumanInLoopExecutor): void {
    WorkflowRegistry.engine = engine;
    WorkflowRegistry.humanExecutor = humanExecutor;
  }

  static getWorkflowEngine(): WorkflowEngine | undefined {
    return WorkflowRegistry.engine;
  }

  static submitHumanResponse(
    executionId: string,
    stepName: string,
    response: HumanInLoopResponse,
  ): void {
    if (!WorkflowRegistry.humanExecutor) {
      return;
    }
    WorkflowRegistry.humanExecutor.submitResponse(executionId, stepName, response);
  }
}
