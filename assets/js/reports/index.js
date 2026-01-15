import { qs } from '../core/dom.js';

export function initReports() {
  const ctx = qs('#reportsChart');
  if (!ctx || !window.Chart) {
    return;
  }

  const chart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      datasets: [
        {
          label: '平均响应时间(分钟)',
          data: [2.1, 1.9, 1.8, 2.0, 1.7, 1.6, 1.8],
          borderColor: '#1E40AF',
          backgroundColor: 'rgba(30, 64, 175, 0.1)',
          tension: 0.35,
          fill: true,
        },
        {
          label: '满意度(分)',
          data: [4.2, 4.3, 4.5, 4.4, 4.6, 4.5, 4.5],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.35,
          fill: true,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: {
          beginAtZero: false,
          ticks: { stepSize: 0.5 },
        },
        y1: {
          beginAtZero: false,
          position: 'right',
          grid: { drawOnChartArea: false },
          min: 4.0,
          max: 5.0,
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 10 } },
        },
      },
    },
  });

  return chart;
}
