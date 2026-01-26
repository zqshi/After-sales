import { config } from '@config/app.config';
import { ProblemResolvedEvent } from '@domain/problem/events/ProblemResolvedEvent';
import { QualityReportRepository } from '@infrastructure/repositories/QualityReportRepository';

export class ProblemResolvedEventHandler {
  constructor(private readonly qualityReportRepository?: QualityReportRepository) {}

  async handle(event: ProblemResolvedEvent): Promise<void> {
    const conversationId = event.payload.conversationId;

    console.log(`[ProblemResolvedEventHandler] Triggering quality inspection for conversation: ${conversationId}`);

    try {
      const agentscopeUrl = config.agentscope.serviceUrl;
      const inspectUrl = `${agentscopeUrl}/api/agents/inspect`;

      const response = await fetch(inspectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          problem_id: event.payload.problemId,
        }),
        signal: AbortSignal.timeout(config.agentscope.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AgentScope API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (this.qualityReportRepository) {
        await this.qualityReportRepository.save({
          conversationId,
          problemId: event.payload.problemId,
          qualityScore: typeof result.quality_score === 'number' ? result.quality_score : undefined,
          report: result,
        });
      }

      console.log(`[ProblemResolvedEventHandler] Quality inspection completed for conversation ${conversationId}:`, {
        success: result.success,
        quality_score: result.quality_score,
      });

      if (result.quality_score < config.quality.lowScoreThreshold) {
        console.warn(`[ProblemResolvedEventHandler] Low quality score (${result.quality_score}) detected for conversation ${conversationId}`);
      }
    } catch (error) {
      console.error(`[ProblemResolvedEventHandler] Failed to trigger quality inspection for conversation ${conversationId}:`, error);
    }
  }
}
