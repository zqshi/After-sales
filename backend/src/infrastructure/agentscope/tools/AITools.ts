import { optionalArray, optionalNumber, optionalString, requireString, toRecord } from './helpers';
import { AgentScopeDependencies, MCPToolDefinition } from '../types';
import { config } from '@config/app.config';

export function buildAITools(deps: AgentScopeDependencies): MCPToolDefinition[] {
  return [
    {
      name: 'analyzeConversation',
      description: 'AI 分析对话质量与情绪',
      parameters: {
        conversationId: { type: 'string', required: true },
        context: { type: 'string' },
        keywords: { type: 'array' },
        includeHistory: { type: 'boolean' },
      },
      handler: async (params) => {
        const keywords = optionalArray(params.keywords)
          ?.map((value) => String(value).trim())
          .filter((value) => value.length > 0);

        const options: Record<string, unknown> = {};
        if (keywords && keywords.length > 0) {
          options.keywords = keywords;
        }
        if (params.includeHistory !== undefined) {
          options.includeHistory = params.includeHistory;
        }

        return deps.analyzeConversationUseCase.execute({
          conversationId: requireString(params.conversationId, 'conversationId'),
          context: optionalString(params.context),
          options: Object.keys(options).length > 0 ? options : undefined,
        });
      },
    },
    {
      name: 'recommendKnowledge',
      description: '基于关键词推荐知识',
      parameters: {
        keywords: { type: 'array' },
        limit: { type: 'number' },
      },
      handler: async (params) => {
        const keywords = optionalArray(params.keywords)
          ?.map((entry) => String(entry).trim())
          .filter((value) => value.length > 0) ?? [];
        const limit = optionalNumber(params.limit) ?? 5;
        const pool = await deps.knowledgeRepository.findByFilters({}, { limit: limit * 3, offset: 0 });
        const normalized = pool.map((item) => ({
          id: item.id,
          title: item.title,
          tags: item.tags,
          category: item.category.value,
        }));
        const recommendations = deps.knowledgeRecommender.recommendByKeywords(normalized, keywords);
        return recommendations.slice(0, limit);
      },
    },
    {
      name: 'saveQualityReport',
      description: '保存质检报告',
      parameters: {
        conversationId: { type: 'string', required: true },
        problemId: { type: 'string' },
        qualityScore: { type: 'number' },
        report: { type: 'object', required: true },
      },
      handler: async (params) => {
        const conversationId = requireString(params.conversationId, 'conversationId');
        const report = toRecord(params.report, 'report');
        const qualityScore = optionalNumber(params.qualityScore);
        const problemId = optionalString(params.problemId);
        const saved = await deps.qualityReportRepository.save({
          conversationId,
          problemId,
          qualityScore,
          report,
        });
        return { reportId: saved.id };
      },
    },
    {
      name: 'createSurvey',
      description: '创建客户回访/满意度调研',
      parameters: {
        customerId: { type: 'string', required: true },
        conversationId: { type: 'string' },
        questions: { type: 'array', required: true },
        metadata: { type: 'object' },
      },
      handler: async (params) => {
        const customerId = requireString(params.customerId, 'customerId');
        const conversationId = optionalString(params.conversationId);
        const questions = optionalArray(params.questions)?.map((q) => String(q)) ?? [];
        if (questions.length === 0) {
          throw new Error('questions is required');
        }
        const saved = await deps.surveyRepository.save({
          customerId,
          conversationId,
          questions,
          metadata: params.metadata && typeof params.metadata === 'object'
            ? (params.metadata as Record<string, unknown>)
            : undefined,
        });
        return { surveyId: saved.id };
      },
    },
    {
      name: 'getSystemStatus',
      description: '获取系统状态与关键服务可用性',
      parameters: {
        includeStats: { type: 'boolean' },
      },
      handler: async (params) => {
        const includeStats = params.includeStats === true;
        let dbOk = true;
        let conversationCount = 0;
        let taskCount = 0;
        let knowledgeCount = 0;
        try {
          conversationCount = await deps.conversationRepository.countByFilters({});
          taskCount = await deps.taskRepository.countByFilters({});
          knowledgeCount = await deps.knowledgeRepository.countByFilters({});
        } catch (err) {
          dbOk = false;
        }

        return {
          status: dbOk ? 'ok' : 'degraded',
          components: {
            database: { ok: dbOk },
            workflow: { enabled: config.workflow.enabled },
            agentscope: { url: config.agentscope.serviceUrl },
            ai: { enabled: config.ai.enabled },
          },
          ...(includeStats ? {
            stats: {
              conversations: conversationCount,
              tasks: taskCount,
              knowledgeItems: knowledgeCount,
            },
          } : {}),
          timestamp: new Date().toISOString(),
        };
      },
    },
    {
      name: 'classifyIntent',
      description: '意图识别',
      parameters: {
        content: { type: 'string', required: true },
      },
      handler: async (params) => {
        const content = requireString(params.content, 'content');
        const llmClient = (deps.aiService as any)?.llmClient;
        if (llmClient && llmClient.isEnabled()) {
          return llmClient.extractIntent(content);
        }
        return {
          isQuestion: content.includes('?') || content.includes('？'),
          intent: 'inquiry',
          keywords: [],
          entities: {},
          confidence: 0.5,
        };
      },
    },
    {
      name: 'extractRequirement',
      description: '提取需求',
      parameters: {
        content: { type: 'string', required: true },
      },
      handler: async (params) => {
        const content = requireString(params.content, 'content');
        return deps.aiService.extractRequirements(content);
      },
    },
    {
      name: 'assessRisk',
      description: '风险评估',
      parameters: {
        content: { type: 'string', required: true },
      },
      handler: async (params) => {
        const content = requireString(params.content, 'content');
        return deps.aiService.assessRisk(content);
      },
    },
    {
      name: 'recommendNextAction',
      description: '推荐下一步动作',
      parameters: {
        riskLevel: { type: 'string' },
        sentiment: { type: 'string' },
        urgent: { type: 'boolean' },
      },
      handler: async (params) => {
        return deps.aiService.recommendNextAction({
          riskLevel: optionalString(params.riskLevel),
          sentiment: optionalString(params.sentiment),
          urgent: params.urgent === true,
        });
      },
    },
    {
      name: 'analyzeLogs',
      description: '日志分析',
      parameters: {
        logs: { type: 'string', required: true },
      },
      handler: async (params) => {
        const logs = requireString(params.logs, 'logs');
        return deps.aiService.analyzeLogs(logs);
      },
    },
    {
      name: 'classifyIssue',
      description: '问题分类',
      parameters: {
        content: { type: 'string', required: true },
      },
      handler: async (params) => {
        const content = requireString(params.content, 'content');
        return deps.aiService.classifyIssue(content);
      },
    },
    {
      name: 'recommendSolution',
      description: '方案推荐',
      parameters: {
        issue: { type: 'string', required: true },
      },
      handler: async (params) => {
        const issue = requireString(params.issue, 'issue');
        return deps.aiService.recommendSolution(issue);
      },
    },
    {
      name: 'estimateResolutionTime',
      description: '解决时长评估',
      parameters: {
        severity: { type: 'string', required: true },
      },
      handler: async (params) => {
        const severity = requireString(params.severity, 'severity');
        return deps.aiService.estimateResolutionTime(severity);
      },
    },
    {
      name: 'checkCompliance',
      description: '合规检查',
      parameters: {
        content: { type: 'string', required: true },
      },
      handler: async (params) => {
        const content = requireString(params.content, 'content');
        return deps.aiService.checkCompliance(content);
      },
    },
    {
      name: 'detectViolations',
      description: '违规检测',
      parameters: {
        content: { type: 'string', required: true },
      },
      handler: async (params) => {
        const content = requireString(params.content, 'content');
        return deps.aiService.detectViolations(content);
      },
    },
    {
      name: 'compareTeamPerformance',
      description: '团队对比分析',
      parameters: {
        reports: { type: 'array', required: true },
      },
      handler: async (params) => {
        const reports = optionalArray(params.reports) ?? [];
        const normalized = reports
          .filter((entry) => entry && typeof entry === 'object')
          .map((entry) => ({
            teamId: String((entry as any).teamId ?? 'unknown'),
            qualityScore: typeof (entry as any).qualityScore === 'number' ? (entry as any).qualityScore : undefined,
          }));
        return deps.aiService.compareTeamPerformance(normalized);
      },
    },
    {
      name: 'inspectConversation',
      description: '会话质检（生成报告）',
      parameters: {
        conversationId: { type: 'string', required: true },
      },
      handler: async (params) => {
        const conversationId = requireString(params.conversationId, 'conversationId');
        const analysis = await deps.analyzeConversationUseCase.execute({
          conversationId,
          context: 'quality',
          options: { includeHistory: true, depth: 'detailed' },
        });
        return analysis;
      },
    },
    {
      name: 'generateQualityReport',
      description: '生成质检报告（不落库）',
      parameters: {
        conversationId: { type: 'string', required: true },
      },
      handler: async (params) => {
        const conversationId = requireString(params.conversationId, 'conversationId');
        return deps.analyzeConversationUseCase.execute({
          conversationId,
          context: 'quality',
          options: { includeHistory: true, depth: 'detailed' },
        });
      },
    },
  ];
}
