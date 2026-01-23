import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';
import { addMessage } from '../chat/index.js';
import { createRelatedTask } from '../tasks/index.js';
import {
  analyzeConversation as apiAnalyzeConversation,
  applySolution as apiApplySolution,
  isApiEnabled,
} from '../api.js';

export function initAiSolutions() {
  bindReanalyze();
  bindApplySolutions();
}

function bindReanalyze() {
  const btn = qs('#reanalyze-btn');
  if (!btn) {
    return;
  }
  on(btn, 'click', () => runAnalysisFlow(btn));
}

function bindApplySolutions() {
  const solutionBtns = qsa('.apply-solution');
  solutionBtns.forEach((btn) => {
    on(btn, 'click', () => handleApplySolution(btn));
  });
}

async function runAnalysisFlow(triggerBtn = null) {
  const btn = triggerBtn || qs('#reanalyze-btn');
  const originalText = btn?.innerHTML;
  if (btn) {
    btn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> 分析中...';
    btn.disabled = true;
  }

  try {
    if (!isApiEnabled()) {
      renderAnalysisResultFallback();
    } else {
      const response = await apiAnalyzeConversation(
        getActiveConversationId(),
        '',
        window.config?.analysisContext || '',
      );
      const analysis = response?.data ?? response;
      if (analysis && (analysis.summary || analysis.issues?.length)) {
        renderAnalysisResult(analysis);
      } else {
        renderAnalysisResultFallback();
      }
    }
    showNotification('对话分析完成', 'success');
  } catch (err) {
    console.warn('[ai] analyze failed', err);
    renderAnalysisResultFallback();
    showNotification('对话分析异常，暂无可用数据', 'warning');
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

function renderAnalysisResult(data) {
  const result = qs('#analysis-result');
  if (!result) {
    return;
  }
  const summary = data.summary || 'AI 尚未给出结论';
  const issues = Array.isArray(data.issues) ? data.issues : [];
  const issuesHtml = issues
    .map(
      (issue) =>
        `<div class="flex items-center gap-2 text-xs text-gray-700"><i class="fa fa-bullseye text-blue-500"></i><span>${issue}</span></div>`,
    )
    .join('');
  result.innerHTML = `
      <div class="operation-result bg-blue-50 border border-blue-200 p-3 rounded-lg mt-2">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium text-blue-800">已完成实时分析</p>
            <p class="text-xs text-blue-700 mt-1">${summary}</p>
          </div>
          <button class="text-xs text-primary hover:underline" onclick="this.closest('.operation-result').remove()">关闭</button>
        </div>
        ${issues.length ? `<div class="mt-3 text-[11px] text-gray-600 font-medium">AI 检测到 ${issues.length} 个重点：</div>` : ''}
        ${issuesHtml}
      </div>`;
}

function renderAnalysisResultFallback() {
  renderAnalysisResult({
    summary: '暂无数据',
    issues: [],
  });
}

async function handleApplySolution(btn) {
  if (!btn) {
    return;
  }
  const type = btn.getAttribute('data-solution');
  if (!type) {
    return;
  }
  const template = btn.getAttribute('data-template') || btn.textContent.trim();
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  btn.disabled = true;

  if (!isApiEnabled()) {
    showNotification('AI 服务未就绪，暂无可用数据', 'warning');
    btn.innerHTML = originalText;
    btn.disabled = false;
    return;
  }
  try {
    await applySolutionFlow(type, template);
  } catch (err) {
    console.warn('[ai] apply solution failed', err);
    showNotification('解决方案生成失败，暂无可用数据', 'warning');
    btn.innerHTML = originalText;
    btn.disabled = false;
    return;
  }

  btn.innerHTML = originalText;
  btn.disabled = false;
  showNotification('已应用解决方案', 'success');
}

async function applySolutionFlow(type, template) {
  const conversationId = getActiveConversationId();
  if (!conversationId) {
    showNotification('暂无可用会话', 'warning');
    return;
  }
  const response = await apiApplySolution({
    solutionType: type,
    conversationId,
    messageTemplate: template,
  });
  const solution = response?.data ?? response;
  const messageContent = solution?.message;
  const name = solution?.title;
  if (!messageContent) {
    showNotification('暂无可用数据', 'warning');
    return;
  }
  addMessage('engineer', messageContent);
  if (name) {
    await createRelatedTask(type, name, solution?.taskDraft);
  }
}

function getActiveConversationId() {
  return qs('.conversation-item.is-active')?.getAttribute('data-id') || null;
}


export function analyzeConversation() {
  runAnalysisFlow(qs('#reanalyze-btn'));
}
