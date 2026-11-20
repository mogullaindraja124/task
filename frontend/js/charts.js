/**
 * Chart.js Visualization Module for Task Insights Page
 */

let statusChart = null;
let priorityChart = null;
let deadlineChart = null;

export function renderCharts(summaryData) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js library is not loaded');
    return;
  }

  const { completed_tasks, pending_tasks, priority_analysis, deadline_analysis } = summaryData;

  // 1. Status Chart (Doughnut)
  const statusCtx = document.getElementById('statusChart')?.getContext('2d');
  if (statusCtx) {
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending'],
        datasets: [{
          data: [completed_tasks, pending_tasks],
          backgroundColor: ['#10b981', '#f59e0b'],
          borderColor: ['#059669', '#d97706'],
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', weight: '600' } }
          }
        },
        cutout: '70%'
      }
    });
  }

  // 2. Priority Chart (Bar)
  const priorityCtx = document.getElementById('priorityChart')?.getContext('2d');
  if (priorityCtx) {
    if (priorityChart) priorityChart.destroy();
    priorityChart = new Chart(priorityCtx, {
      type: 'bar',
      data: {
        labels: ['High', 'Medium', 'Low'],
        datasets: [{
          label: 'Task Count',
          data: [priority_analysis.high, priority_analysis.medium, priority_analysis.low],
          backgroundColor: ['rgba(225, 29, 72, 0.75)', 'rgba(217, 119, 6, 0.75)', 'rgba(16, 185, 129, 0.75)'],
          borderColor: ['#e11d48', '#d97706', '#10b981'],
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', weight: '600' } }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94a3b8', precision: 0, font: { family: 'Plus Jakarta Sans' } },
            beginAtZero: true
          }
        }
      }
    });
  }

  // 3. Deadline Chart (Polar / Bar)
  const deadlineCtx = document.getElementById('deadlineChart')?.getContext('2d');
  if (deadlineCtx) {
    if (deadlineChart) deadlineChart.destroy();
    deadlineChart = new Chart(deadlineCtx, {
      type: 'doughnut',
      data: {
        labels: ['Overdue', 'Today', 'Tomorrow', 'Upcoming'],
        datasets: [{
          data: [
            deadline_analysis.overdue,
            deadline_analysis.today,
            deadline_analysis.tomorrow,
            deadline_analysis.upcoming
          ],
          backgroundColor: ['#ef4444', '#a855f7', '#3b82f6', '#64748b'],
          borderColor: ['#dc2626', '#9333ea', '#2563eb', '#475569'],
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', weight: '600' } }
          }
        },
        cutout: '65%'
      }
    });
  }
}
