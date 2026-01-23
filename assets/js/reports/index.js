import { fetchAuditSummary, isApiEnabled } from '../api.js';
import { qs } from '../core/dom.js';

function formatDate(value) {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function formatCount(value, suffix) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return '--';
  }
  return suffix ? `${numberValue} ${suffix}` : `${numberValue}`;
}

function formatMinutes(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return '--';
  }
  return `${numberValue.toFixed(1)} 分钟`;
}

function formatPercent(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return '--';
  }
  const normalized = numberValue > 1 ? numberValue : numberValue * 100;
  return `${normalized.toFixed(1)}%`;
}

function setReportField(key, value) {
  const node = qs(`[data-report-field="${key}"]`);
  if (node) {
    node.textContent = value;
  }
}

const REPORT_FIELDS = [
  'totalConversations',
  'activeConversations',
  'ticketsCreated',
  'avgFirstResponse',
  'firstResponseSlaRate',
  'updateSyncRate',
  'resolutionRate',
  'satisfactionScore',
  'violationCount',
  'ticketsResolved',
  'avgTicketHandleTime',
  'escalationComplianceRate',
];

export async function initReports() {
  const ctx = qs('#reportsChart');
  if (!ctx || !window.Chart) {
    return;
  }

  let summary = null;
  if (isApiEnabled()) {
    try {
      const response = await fetchAuditSummary(7);
      summary = response?.data ?? response;
    } catch (error) {
      console.warn('[reports] fetch audit summary failed', error);
    }
  }

  const reportSummary = summary?.report || summary?.summary || summary || null;
  const hasSummary = REPORT_FIELDS.some((key) => reportSummary?.[key] !== undefined && reportSummary?.[key] !== null);

  let chartLabels = [];
  let chartData = [];
  let chartDataset = [];

  if (!hasSummary) {
    REPORT_FIELDS.forEach((key) => setReportField(key, '--'));
  } else {
    setReportField('totalConversations', formatCount(reportSummary?.totalConversations, '个'));
    setReportField('activeConversations', formatCount(reportSummary?.activeConversations, '个'));
    setReportField('ticketsCreated', formatCount(reportSummary?.ticketsCreated, '个'));
    setReportField('avgFirstResponse', formatMinutes(reportSummary?.avgFirstResponseMinutes));
    setReportField('firstResponseSlaRate', formatPercent(reportSummary?.firstResponseSlaRate));
    setReportField('updateSyncRate', formatPercent(reportSummary?.updateSyncRate));
    setReportField('resolutionRate', formatPercent(reportSummary?.resolutionRate));
    setReportField('satisfactionScore', formatCount(reportSummary?.satisfactionScore, '分'));
    setReportField('violationCount', formatCount(reportSummary?.violationCount, '次'));
    setReportField('ticketsResolved', formatCount(reportSummary?.ticketsResolved, '单'));
    setReportField('avgTicketHandleTime', formatMinutes(reportSummary?.avgTicketHandleMinutes));
    setReportField('escalationComplianceRate', formatPercent(reportSummary?.escalationComplianceRate));

    const trend = reportSummary?.trend || null;
    const trendLabels = Array.isArray(trend?.labels) ? trend.labels : [];
    const trendConversationCounts = Array.isArray(trend?.conversationCounts)
      ? trend.conversationCounts
      : [];
    const trendFirstResponseMinutes = Array.isArray(trend?.firstResponseMinutes)
      ? trend.firstResponseMinutes
      : [];
    const hasTrend = trendLabels.length > 0
      && trendConversationCounts.length === trendLabels.length
      && trendFirstResponseMinutes.length === trendLabels.length;

    if (hasTrend) {
      chartLabels = trendLabels;
      chartDataset = [
        {
          label: '会话量',
          data: trendConversationCounts,
          backgroundColor: 'rgba(30, 64, 175, 0.2)',
          borderColor: '#1E40AF',
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: '首响时长(分钟)',
          data: trendFirstResponseMinutes,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: '#10B981',
          borderWidth: 2,
          yAxisID: 'y1',
        },
      ];
    }
  }

  const chart = new window.Chart(ctx, {
    type: chartDataset.length ? 'line' : 'bar',
    data: {
      labels: chartLabels,
      datasets: chartDataset.length
        ? chartDataset
        : [
          {
            label: '趋势',
            data: chartData,
            backgroundColor: 'rgba(30, 64, 175, 0.35)',
            borderColor: '#1E40AF',
            borderWidth: 1,
          },
        ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: { drawOnChartArea: false },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 10 } },
        },
      },
    },
    plugins: [
      {
        id: 'emptyState',
        afterDraw(chartInstance) {
          const hasData = chartInstance.data.labels?.length;
          if (hasData) {
            return;
          }
          const { ctx: context, chartArea } = chartInstance;
          if (!chartArea) {
            return;
          }
          context.save();
          context.fillStyle = '#9CA3AF';
          context.font = '12px sans-serif';
          context.textAlign = 'center';
          context.fillText('--', (chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2);
          context.restore();
        },
      },
    ],
  });

  return chart;
}
