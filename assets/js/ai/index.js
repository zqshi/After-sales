import { qs, qsa, on } from '../core/dom.js';
import { showNotification } from '../core/notifications.js';
import { addMessage } from '../chat/index.js';
import { createRelatedTask } from '../tasks/index.js';

export function initAiSolutions() {
  bindReanalyze();
  bindApplySolutions();
}

function bindReanalyze() {
  const btn = qs('#reanalyze-btn');
  if (!btn) return;

  on(btn, 'click', () => {
    btn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> 分析中...';
    btn.disabled = true;

    setTimeout(() => {
      const issues = ['系统登录问题', '账户权限错误', '数据同步失败', '界面显示异常'];
      const selectedIssue = issues[Math.floor(Math.random() * issues.length)];
      const analysisResult = qs('#ai-solutions-tab .bg-white p');
      if (analysisResult) {
        analysisResult.innerHTML = `基于当前对话内容，AI检测到客户需求为：<span class="font-medium text-primary">${selectedIssue}</span>`;
      }
      btn.innerHTML = '<i class="fa fa-refresh mr-1"></i> 重新分析';
      btn.disabled = false;
      showNotification('对话分析完成', 'success');
    }, 1200);
  });
}

function bindApplySolutions() {
  const solutionBtns = qsa('.apply-solution');
  solutionBtns.forEach((btn) => {
    on(btn, 'click', () => {
      const type = btn.getAttribute('data-solution');
      if (!type) return;

      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;

        const solution = buildSolutionContent(type);
        addMessage('engineer', solution);
        createRelatedTask(type, solution.title || '自动任务');
        showNotification('已应用解决方案', 'success');
      }, 1000);
    });
  });
}

function buildSolutionContent(type) {
  switch (type) {
    case 'login-diagnosis':
      return '根据诊断，建议执行以下步骤解决登录问题：<br>1. 清除浏览器缓存和Cookie<br>2. 尝试使用无痕模式登录<br>3. 验证用户名和密码是否正确<br>4. 检查网络连接状态';
    case 'security-check':
      return '账户安全检查结果：<br>1. 建议立即修改密码<br>2. 开启双因素认证<br>3. 检查近期登录记录<br>4. 更新安全问题设置';
    case 'system-diagnosis':
      return '系统故障排查结果：<br>1. 检测到服务器响应延迟<br>2. 建议重启应用程序<br>3. 检查系统更新状态<br>4. 验证数据库连接';
    default:
      return '已应用解决方案';
  }
}

export function analyzeConversation() {
  const result = qs('#analysis-result');
  if (result) {
    result.innerHTML = `
      <div class="operation-result bg-blue-50 border border-blue-200 p-3 rounded-lg mt-2">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium text-blue-800">已完成实时分析</p>
            <p class="text-xs text-blue-700 mt-1">AI检测到客户关注登录问题，建议优先执行“登录诊断”方案。</p>
          </div>
          <button class="text-xs text-primary hover:underline" onclick="this.closest('.operation-result').remove()">关闭</button>
        </div>
      </div>`;
  }
  showNotification('已完成对话分析', 'success');
}
