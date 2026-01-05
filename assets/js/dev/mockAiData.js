/**
 * Mock AI分析数据 - 用于测试AI辅助面板显示
 * 在浏览器控制台运行此脚本可以临时显示测试数据
 */

export const mockAiAnalysisData = {
  detectedIssues: [
    {
      type: 'system_error',
      severity: 'p2',
      description: '故障处理问题：云服务器无法连接，预定级 P2'
    }
  ],

  lastCustomerSentiment: {
    emotion: 'urgent',
    score: 0.86,
    confidence: 0.92
  },

  replySuggestion: {
    suggestedReply: '您好，请提供具体的服务器实例ID或IP，我们高优排查该问题。',
    confidence: 0.9,
    needsHumanReview: false
  },

  knowledgeRecommendations: [
    {
      id: 'kb-011',
      title: '云服务器无法连接排查手册',
      category: '故障处理',
      score: 0.93,
      url: '/knowledge/kb-011'
    },
    {
      id: 'kb-014',
      title: '实例网络连通性诊断指南',
      category: '云服务器',
      score: 0.9,
      url: '/knowledge/kb-014'
    },
    {
      id: 'kb-018',
      title: 'P2故障升级与通报流程',
      category: '应急预案',
      score: 0.84,
      url: '/knowledge/kb-018'
    }
  ],

  relatedTasks: [
    {
      id: 2231,
      title: '云服务器实例无法连接 - P2',
      priority: 'high',
      url: '/tasks/2231'
    },
    {
      id: 2232,
      title: '客户实例test123网络排查',
      priority: 'high',
      url: '/tasks/2232'
    },
    {
      id: 2233,
      title: '云服务器连通性异常告警复盘',
      priority: 'medium',
      url: '/tasks/2233'
    }
  ]
};

/**
 * 在浏览器控制台手动触发AI面板显示（用于测试）
 */
window.testAiPanel = function() {
  console.log('🧪 [测试] 手动触发AI面板显示');

  // 获取AI面板实例
  const aiPanel = window.aiAssistantPanel; // 需要在主代码中暴露

  if (!aiPanel) {
    console.error('❌ AI面板实例未找到。请确保已初始化。');
    return;
  }

  const data = mockAiAnalysisData;

  // 1. 显示面板（问题模式）
  aiPanel.show('issue');
  console.log('✓ 面板已显示（问题模式）');

  // 2. 更新情感分析
  if (data.lastCustomerSentiment) {
    aiPanel.updateSentiment(data.lastCustomerSentiment);
    console.log('✓ 情感分析已更新');
  }

  // 3. 更新回复建议
  if (data.replySuggestion) {
    aiPanel.updateReplySuggestion(data.replySuggestion);
    console.log('✓ 回复建议已更新');
  }

  // 4. 生成解决步骤
  if (data.detectedIssues?.length > 0) {
    const issueContext = {
      description: data.detectedIssues[0].description,
      severity: data.detectedIssues[0].severity
    };
    const steps = aiPanel.generateSolutionSteps(issueContext);
    aiPanel.updateSolutionSteps(steps);
    console.log('✓ 解决步骤已生成（6步）');
  }

  // 5. 更新知识库（应触发参考资料区显示）
  if (data.knowledgeRecommendations?.length > 0) {
    aiPanel.updateKnowledgeBase(data.knowledgeRecommendations);
    console.log('✓ 知识库已更新（' + data.knowledgeRecommendations.length + '条）');
  }

  // 6. 更新关联工单（应触发参考资料区显示）
  if (data.relatedTasks?.length > 0) {
    aiPanel.updateRelatedTasks(data.relatedTasks);
    console.log('✓ 关联工单已更新（' + data.relatedTasks.length + '条）');
  }

  console.log('🎉 测试完成！请检查AI辅助面板是否正确显示。');
  console.log('📋 应该看到：');
  console.log('  - 情感分析（消极 75%）');
  console.log('  - AI回复建议');
  console.log('  - 6步解决流程');
  console.log('  - 📖 参考资料区（灰色背景）');
  console.log('    - 📚 知识库文档（3条）');
  console.log('    - 📋 相似工单（3条）');
};

// 自动执行提示
console.log('💡 Mock数据已加载！在控制台运行 testAiPanel() 来测试显示效果');
