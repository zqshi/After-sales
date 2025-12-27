/**
 * Mock AI分析数据 - 用于测试AI辅助面板显示
 * 在浏览器控制台运行此脚本可以临时显示测试数据
 */

export const mockAiAnalysisData = {
  detectedIssues: [
    {
      type: 'system_error',
      severity: 'high',
      description: '系统登录失败，HTTP 502错误'
    }
  ],

  lastCustomerSentiment: {
    emotion: 'negative',
    score: 0.75,
    confidence: 0.92
  },

  replySuggestion: {
    suggestedReply: '非常抱歉给您带来不便。我们的技术团队正在紧急排查这个登录问题，初步判断是服务器网关故障。预计15分钟内可以恢复，请您稍后再试。',
    confidence: 0.88,
    needsHumanReview: false
  },

  knowledgeRecommendations: [
    {
      id: 'kb-001',
      title: '系统登录故障排查手册',
      category: '系统运维',
      score: 0.95,
      url: '/knowledge/kb-001'
    },
    {
      id: 'kb-002',
      title: 'HTTP 502错误解决方案',
      category: '故障处理',
      score: 0.89,
      url: '/knowledge/kb-002'
    },
    {
      id: 'kb-003',
      title: '网关服务重启操作指南',
      category: '运维手册',
      score: 0.82,
      url: '/knowledge/kb-003'
    }
  ],

  relatedTasks: [
    {
      id: 1234,
      title: '登录接口502错误 - 网关超时',
      priority: 'high',
      url: '/tasks/1234'
    },
    {
      id: 5678,
      title: '用户反馈无法访问系统',
      priority: 'medium',
      url: '/tasks/5678'
    },
    {
      id: 9012,
      title: '系统响应缓慢，部分功能不可用',
      priority: 'medium',
      url: '/tasks/9012'
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
