import { initLayout, toggleRightSidebar, openFullAnalysisPanel } from './ui/layout.js';
import {
  initChat,
  sendMessage,
  adoptSuggestion,
  optimizeMessage,
  insertText,
  insertEmoji,
  addToSuggestion,
  submitSatisfaction,
} from './chat/index.js';
import {
  initKnowledgeBase,
  openKnowledgePreview,
  toggleKnowledgePreviewExpand,
  closeKnowledgePreview,
  openKnowledgeSource,
} from './knowledge/index.js';
import {
  initRequirementsTab,
  loadRequirementsData,
  createRequirementFromList,
  ignoreUnprocessedRequirement,
  viewRequirementCard,
  initRightPanelActions,
  closeActionModal,
  scanConversationForRequirements,
} from './requirements/index.js';
import { initAiSolutions, analyzeConversation } from './ai/index.js';
import { initAgentTasks, createRelatedTask, openAnalysisPanelClassic } from './tasks/index.js';
import { initTools } from './tools/index.js';
import { scrollToBottom } from './core/scroll.js';
import { initCustomerProfile, updateCustomerContext, openHistoryDetail } from './customer/index.js';
import { initRoleSwitcher } from './roles.js';
import { initializeContainer } from './application/container/bootstrap.js';
import { EventSubscriptionManager } from './application/eventHandlers/EventSubscriptionManager.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('[Main] ========== 应用启动 ==========');

    // 1. 初始化DI容器（必须在其他初始化之前完成）
    console.log('[Main] 步骤1: 正在初始化应用服务层...');
    await initializeContainer();
    console.log('[Main] ✓ 应用服务层初始化完成');

    // 2. 初始化事件订阅（在DI容器之后，UI组件之前）
    console.log('[Main] 步骤2: 正在初始化事件订阅...');
    const eventSubscriptionManager = new EventSubscriptionManager();
    eventSubscriptionManager.initialize();
    console.log('[Main] ✓ 事件订阅初始化完成');

    // 3. 初始化UI组件
    initRoleSwitcher();
    initLayout();
    initChat();
    initCustomerProfile();
    initKnowledgeBase();
    initRequirementsTab();
    initRightPanelActions();
    initAiSolutions();
    initAgentTasks();
    initTools();
    scrollToBottom();

    const actionOverlay = document.getElementById('action-modal-overlay');
    if (actionOverlay) {
      actionOverlay.addEventListener('click', (e) => {
        if (e.target === actionOverlay) {
          closeActionModal();
        }
      });
    }

    console.log('[Main] 应用初始化完成 ✅');
  } catch (error) {
    console.error('[Main] 应用初始化失败:', error);
    alert('应用初始化失败，请刷新页面重试');
  }
});

// 兼容现有的内联事件（可逐步移除）
window.toggleRightSidebar = toggleRightSidebar;
window.openFullAnalysisPanel = openFullAnalysisPanel;
window.openKnowledgePreview = openKnowledgePreview;
window.toggleKnowledgePreviewExpand = toggleKnowledgePreviewExpand;
window.closeKnowledgePreview = closeKnowledgePreview;
window.openKnowledgeSource = openKnowledgeSource;
window.createRequirementFromList = createRequirementFromList;
window.ignoreUnprocessedRequirement = ignoreUnprocessedRequirement;
window.viewRequirementCard = viewRequirementCard;
window.closeActionModal = closeActionModal;
window.scanConversationForRequirements = scanConversationForRequirements;

window.sendMessage = sendMessage;
window.adoptSuggestion = adoptSuggestion;
window.optimizeMessage = optimizeMessage;
window.insertText = insertText;
window.insertEmoji = insertEmoji;
window.addToSuggestion = addToSuggestion;
window.submitSatisfaction = submitSatisfaction;

window.initAiSolutions = initAiSolutions;
window.analyzeConversation = analyzeConversation;
window.createRelatedTask = createRelatedTask;
window.loadRequirementsData = loadRequirementsData;
window.updateCustomerContext = updateCustomerContext;
window.openHistoryDetail = openHistoryDetail;
window.openAnalysisPanelClassic = openAnalysisPanelClassic;
