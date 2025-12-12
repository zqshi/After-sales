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
import { scrollToBottom } from './core/scroll.js';
import { initCustomerProfile, updateCustomerContext, openHistoryDetail } from './customer/index.js';
import { initRoleSwitcher } from './roles.js';

document.addEventListener('DOMContentLoaded', () => {
  initRoleSwitcher();
  initLayout();
  initChat();
  initCustomerProfile();
  initKnowledgeBase();
  initRequirementsTab();
  initRightPanelActions();
  initAiSolutions();
  initAgentTasks();
  scrollToBottom();

  const actionOverlay = document.getElementById('action-modal-overlay');
  if (actionOverlay) {
    actionOverlay.addEventListener('click', (e) => {
      if (e.target === actionOverlay) closeActionModal();
    });
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
