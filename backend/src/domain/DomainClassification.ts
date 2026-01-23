/**
 * DomainClassification - 领域分类标记
 *
 * 根据DDD战略设计，将系统中的限界上下文分类为：
 * - Core Domain（核心域）：业务差异化竞争力所在
 * - Supporting Subdomain（支撑域）：支撑核心业务，可自研
 * - Generic Subdomain（通用域）：通用功能，可外包或采购SaaS
 *
 * 目的：
 * 1. 明确投资重点（核心域需要最优秀的团队和最多资源）
 * 2. 指导技术决策（通用域可考虑采购，支撑域可适度投入）
 * 3. 团队协作清晰（核心域团队需要深度业务理解）
 */

/**
 * 域分类枚举
 */
export enum DomainType {
  CORE = 'CORE', // 核心域
  SUPPORTING = 'SUPPORTING', // 支撑域
  GENERIC = 'GENERIC', // 通用域
}

/**
 * 域特征
 */
export interface DomainCharacteristics {
  type: DomainType;
  businessValue: 'high' | 'medium' | 'low'; // 业务价值
  complexity: 'high' | 'medium' | 'low'; // 复杂度
  changeFrequency: 'high' | 'medium' | 'low'; // 变化频率
  competitiveAdvantage: boolean; // 是否构成竞争优势
  canOutsource: boolean; // 是否可外包
}

/**
 * 域描述
 */
export interface DomainDescription {
  name: string;
  contextName: string;
  classification: DomainCharacteristics;
  strategicValue: string; // 战略价值说明
  investmentPriority: 'P0' | 'P1' | 'P2'; // 投资优先级
  teamRequirement: string; // 团队要求
  technologyStrategy: string; // 技术策略
}

/**
 * ===========================
 * 核心域（Core Domain）
 * ===========================
 *
 * 特征：
 * - 构成业务差异化竞争力
 * - 高业务价值 + 高复杂度
 * - 需要最优秀的团队
 * - 不可外包
 */

export const ConversationDomain: DomainDescription = {
  name: '对话管理域',
  contextName: 'Conversation Context',
  classification: {
    type: DomainType.CORE,
    businessValue: 'high',
    complexity: 'high',
    changeFrequency: 'high',
    competitiveAdvantage: true,
    canOutsource: false,
  },
  strategicValue: `
    智能售后工作台的核心竞争力所在：
    1. AI辅助对话：自动推荐回复、知识库引用、情感分析
    2. 智能分配策略：基于客户画像、客服能力、客户等级的多维度分配
    3. 实时协作：多客服协同、对话转接、会话升级
    4. 对话质检：自动质检、满意度预测

    核心价值：提升客服效率30%，客户满意度提升20%
  `,
  investmentPriority: 'P0',
  teamRequirement: `
    - 需要高级工程师（3年以上DDD经验）
    - 需要深度理解客服业务场景
    - 需要AI/NLP技术背景
    - 团队规模：3-4人全职投入
  `,
  technologyStrategy: `
    - 自研核心领域模型（Conversation聚合根）
    - 集成顶级AI服务（GPT-4、Claude等）
    - 高可用架构（99.9%+ 客户等级）
    - 持续优化分配算法
  `,
};

export const CustomerDomain: DomainDescription = {
  name: '客户画像域',
  contextName: 'Customer Context',
  classification: {
    type: DomainType.CORE,
    businessValue: 'high',
    complexity: 'high',
    changeFrequency: 'medium',
    competitiveAdvantage: true,
    canOutsource: false,
  },
  strategicValue: `
    360°客户画像是智能分配和个性化服务的基础：
    1. 健康度评分：预测客户流失风险
    2. 风险等级评估：识别高危客户，优先响应
    3. 价值分层：VIP/KA/普通客户差异化服务
    4. 行为洞察：消费习惯、互动偏好、满意度趋势

    核心价值：客户留存率提升15%，LTV提升25%
  `,
  investmentPriority: 'P0',
  teamRequirement: `
    - 需要数据分析能力（BI、机器学习）
    - 需要客户成功经验
    - 团队规模：2-3人
  `,
  technologyStrategy: `
    - 自研健康度和风险评估算法
    - 集成数据分析平台
    - 实时画像更新
  `,
};

/**
 * ===========================
 * 支撑域（Supporting Subdomain）
 * ===========================
 *
 * 特征：
 * - 支撑核心业务，但非差异化竞争力
 * - 中等业务价值 + 中等复杂度
 * - 可自研，但不需要顶级团队
 */

export const RequirementDomain: DomainDescription = {
  name: '需求管理域',
  contextName: 'Requirement Context',
  classification: {
    type: DomainType.SUPPORTING,
    businessValue: 'medium',
    complexity: 'medium',
    changeFrequency: 'medium',
    competitiveAdvantage: false,
    canOutsource: false,
  },
  strategicValue: `
    支撑客户需求的收集、分析、跟进：
    1. 需求检测：AI自动识别对话中的需求
    2. 优先级计算：多维度动态优先级
    3. 需求分类：技术、产品、售后等
    4. 自动流转：高优需求自动创建Task

    支撑价值：确保客户需求不遗漏，提升响应速度
  `,
  investmentPriority: 'P1',
  teamRequirement: `
    - 中级工程师即可（1-2年经验）
    - 团队规模：1-2人
  `,
  technologyStrategy: `
    - 自研需求管理逻辑
    - 集成AI需求检测服务
    - 标准化CRUD + 业务规则
  `,
};

export const TaskDomain: DomainDescription = {
  name: '任务管理域',
  contextName: 'Task Context',
  classification: {
    type: DomainType.SUPPORTING,
    businessValue: 'medium',
    complexity: 'medium',
    changeFrequency: 'low',
    competitiveAdvantage: false,
    canOutsource: false,
  },
  strategicValue: `
    支撑内部任务流转和协作：
    1. 任务创建：手动/自动创建
    2. 任务分配：指派给客服或技术团队
    3. 任务跟踪：状态流转、完成时限
    4. 任务关联：关联对话、需求、客户

    支撑价值：确保任务闭环，提升执行效率
  `,
  investmentPriority: 'P1',
  teamRequirement: `
    - 初中级工程师（基础DDD理解）
    - 团队规模：1人
  `,
  technologyStrategy: `
    - 标准任务管理模式
    - 状态机模式管理流转
    - 可考虑集成第三方任务管理工具（如Jira、飞书任务）
  `,
};

export const QualityDomain: DomainDescription = {
  name: '质检域',
  contextName: 'Quality Context',
  classification: {
    type: DomainType.SUPPORTING,
    businessValue: 'medium',
    complexity: 'medium',
    changeFrequency: 'low',
    competitiveAdvantage: false,
    canOutsource: false,
  },
  strategicValue: `
    支撑服务质量监控和改进：
    1. 对话质检：合规性、专业性、满意度
    2. 客服评分：基于质检结果的绩效评估
    3. 问题发现：识别常见服务问题
    4. 改进建议：基于质检数据的优化建议

    支撑价值：持续提升服务质量，降低投诉率
  `,
  investmentPriority: 'P1',
  teamRequirement: `
    - 中级工程师 + 质检专家配合
    - 团队规模：1-2人
  `,
  technologyStrategy: `
    - 自研质检规则引擎
    - 集成AI质检服务
    - 定期评估质检准确率
  `,
};

/**
 * ===========================
 * 通用域（Generic Subdomain）
 * ===========================
 *
 * 特征：
 * - 通用功能，各行业通用
 * - 低业务价值（对本业务）
 * - 可外包或采购SaaS
 */

export const KnowledgeDomain: DomainDescription = {
  name: '知识库域',
  contextName: 'Knowledge Context',
  classification: {
    type: DomainType.GENERIC,
    businessValue: 'low',
    complexity: 'low',
    changeFrequency: 'low',
    competitiveAdvantage: false,
    canOutsource: true,
  },
  strategicValue: `
    通用知识管理功能：
    1. 知识创建、编辑、归档
    2. 知识分类、标签
    3. 知识搜索、推荐
    4. 知识版本管理

    建议：优先考虑集成第三方知识库SaaS（如语雀、Notion、飞书文档）
  `,
  investmentPriority: 'P2',
  teamRequirement: `
    - 初级工程师（主要做集成）
    - 团队规模：0.5人（兼职）
  `,
  technologyStrategy: `
    - 优先级1：采购SaaS（语雀企业版、Notion Team等）
    - 优先级2：开源方案（Wiki.js、BookStack）
    - 优先级3：自研（仅在前两者不满足时）
  `,
};

export const AIAnalysisDomain: DomainDescription = {
  name: 'AI分析域',
  contextName: 'AI Analysis Context',
  classification: {
    type: DomainType.GENERIC,
    businessValue: 'low',
    complexity: 'high',
    changeFrequency: 'low',
    competitiveAdvantage: false,
    canOutsource: true,
  },
  strategicValue: `
    通用AI能力（非核心差异化）：
    1. 情感分析
    2. 意图识别
    3. 关键词提取
    4. 文本摘要

    建议：直接采购云AI服务（OpenAI、Azure Cognitive、百度AI等）
  `,
  investmentPriority: 'P2',
  teamRequirement: `
    - AI集成工程师
    - 团队规模：0.5人（兼职）
  `,
  technologyStrategy: `
    - 采购云AI服务（OpenAI API、Azure AI）
    - 不自研NLP模型
    - 通过Prompt工程优化效果
  `,
};

export const SystemDomain: DomainDescription = {
  name: '系统管理域',
  contextName: 'System Context',
  classification: {
    type: DomainType.GENERIC,
    businessValue: 'low',
    complexity: 'low',
    changeFrequency: 'low',
    competitiveAdvantage: false,
    canOutsource: true,
  },
  strategicValue: `
    通用系统管理功能：
    1. 用户管理（RBAC）
    2. 权限管理
    3. 日志审计
    4. 系统配置

    建议：使用开源方案或采购IAM服务
  `,
  investmentPriority: 'P2',
  teamRequirement: `
    - 运维/基础设施工程师
    - 团队规模：共享基础设施团队
  `,
  technologyStrategy: `
    - 采购IAM服务（Auth0、Okta、阿里云RAM）
    - 或使用开源方案（Keycloak、Casbin）
  `,
};

/**
 * ===========================
 * 域分类汇总
 * ===========================
 */

export const DomainClassifications: Record<string, DomainDescription> = {
  Conversation: ConversationDomain,
  Customer: CustomerDomain,
  Requirement: RequirementDomain,
  Task: TaskDomain,
  Quality: QualityDomain,
  Knowledge: KnowledgeDomain,
  AIAnalysis: AIAnalysisDomain,
  System: SystemDomain,
};

/**
 * 按分类分组
 */
export const DomainsByType = {
  [DomainType.CORE]: [ConversationDomain, CustomerDomain],
  [DomainType.SUPPORTING]: [
    RequirementDomain,
    TaskDomain,
    QualityDomain,
  ],
  [DomainType.GENERIC]: [
    KnowledgeDomain,
    AIAnalysisDomain,
    SystemDomain,
  ],
};

/**
 * ===========================
 * 投资策略建议
 * ===========================
 */

export const InvestmentStrategy = {
  coreDomains: {
    teamAllocation: '60%团队资源',
    talentRequirement: '高级工程师 + 业务专家',
    budgetAllocation: '70%研发预算',
    focusAreas: [
      '持续优化核心算法（对话分配、健康度评分）',
      '深度集成顶级AI服务',
      '高可用架构演进',
      '性能优化',
    ],
  },
  supportingDomains: {
    teamAllocation: '30%团队资源',
    talentRequirement: '中级工程师',
    budgetAllocation: '20%研发预算',
    focusAreas: [
      '满足基本业务需求',
      '适度优化，避免过度设计',
      '考虑集成第三方服务',
    ],
  },
  genericDomains: {
    teamAllocation: '10%团队资源（主要做集成）',
    talentRequirement: '初级工程师 + 外包',
    budgetAllocation: '10%研发预算（SaaS采购费用）',
    focusAreas: [
      '优先采购SaaS服务',
      '次选开源方案',
      '避免自研（除非无可替代方案）',
    ],
  },
};

/**
 * ===========================
 * 辅助方法
 * ===========================
 */

/**
 * 获取域分类
 */
export function getDomainClassification(
  contextName: string,
): DomainDescription | undefined {
  return Object.values(DomainClassifications).find(
    (d) => d.contextName === contextName,
  );
}

/**
 * 获取核心域列表
 */
export function getCoreDomains(): DomainDescription[] {
  return DomainsByType[DomainType.CORE];
}

/**
 * 判断是否为核心域
 */
export function isCoreDomain(contextName: string): boolean {
  const domain = getDomainClassification(contextName);
  return domain?.classification.type === DomainType.CORE;
}

/**
 * 获取投资优先级
 */
export function getInvestmentPriority(
  contextName: string,
): 'P0' | 'P1' | 'P2' | undefined {
  return getDomainClassification(contextName)?.investmentPriority;
}

/**
 * 生成域分类报告
 */
export function generateDomainReport(): string {
  let report = '# 领域分类报告\n\n';

  for (const [type, domains] of Object.entries(DomainsByType)) {
    report += `## ${type}\n\n`;
    domains.forEach((domain) => {
      report += `### ${domain.name} (${domain.contextName})\n`;
      report += `- 业务价值: ${domain.classification.businessValue}\n`;
      report += `- 复杂度: ${domain.classification.complexity}\n`;
      report += `- 投资优先级: ${domain.investmentPriority}\n`;
      report += `- 可外包: ${domain.classification.canOutsource ? '是' : '否'}\n`;
      report += `\n战略价值: ${domain.strategicValue.trim()}\n\n`;
    });
  }

  return report;
}
