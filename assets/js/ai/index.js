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
    showNotification('对话分析异常，已使用本地提示', 'warning');
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
    summary: 'AI 服务暂未就绪，正在使用本地经验提供建议。',
    issues: ['建议检查登录凭据与认证服务', '确认网络/限流后再联系客户', '记录当前快照供后续分析'],
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
  let usedFallback = false;

  if (!isApiEnabled()) {
    usedFallback = true;
    await fallbackApplySolution(type);
  } else {
    try {
      await applySolutionFlow(type, template);
    } catch (err) {
      console.warn('[ai] apply solution failed', err);
      usedFallback = true;
      await fallbackApplySolution(type);
    }
  }

  btn.innerHTML = originalText;
  btn.disabled = false;
  showNotification(usedFallback ? 'AI 服务未就绪，已使用本地建议' : '已应用解决方案', usedFallback ? 'warning' : 'success');
}

async function applySolutionFlow(type, template) {
  const fallback = buildSolutionContent(type);
  const response = await apiApplySolution({
    solutionType: type,
    conversationId: getActiveConversationId(),
    messageTemplate: template,
  });
  const solution = response?.data ?? response;
  const messageContent = solution?.message || fallback.message;
  const name = solution?.title || fallback.title;
  addMessage('engineer', messageContent);
  await createRelatedTask(type, name, solution?.taskDraft);
}

async function fallbackApplySolution(type) {
  const fallback = buildSolutionContent(type);
  await delay(1000);
  addMessage('engineer', fallback.message);
  await createRelatedTask(type, fallback.title);
}

function getActiveConversationId() {
  return qs('.conversation-item.bg-blue-50')?.getAttribute('data-id') || 'conv-001';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSolutionContent(type) {
  switch (type) {
    case 'login-diagnosis':
      return {
        title: '登录问题跟进',
        message:
          '根据诊断，建议执行以下步骤解决登录问题：<br>1. 清除浏览器缓存和Cookie<br>2. 尝试使用无痕模式登录<br>3. 验证用户名和密码是否正确<br>4. 检查网络连接状态',
      };
    case 'security-check':
      return {
        title: '账户安全加固',
        message:
          '账户安全检查结果：<br>1. 建议立即修改密码<br>2. 开启双因素认证<br>3. 检查近期登录记录<br>4. 更新安全问题设置',
      };
    case 'system-diagnosis':
      return {
        title: '系统优化建议',
        message:
          '系统故障排查结果：<br>1. 检测到服务器响应延迟<br>2. 建议重启应用程序<br>3. 检查系统更新状态<br>4. 验证数据库连接',
      };
    default:
      return {
        title: '自动任务',
        message: '已应用解决方案',
      };
  }
}

export function analyzeConversation() {
  runAnalysisFlow(qs('#reanalyze-btn'));
}
