import * as API from './api.js';
import { renderCharts } from './charts.js';

// Application State
const state = {
  tasks: [],
  summary: null,
  filters: {
    search: '',
    status: 'all',
    priority: 'all',
    deadline: 'all',
    sort_by: 'id',
    order: 'asc'
  },
  currentTab: 'tasks', // 'tasks' or 'insights'
  editingTaskId: null,
  deletingTaskId: null
};

// DOM Elements
const elements = {
  // Stat Cards
  totalTasksVal: document.getElementById('totalTasksVal'),
  completedTasksVal: document.getElementById('completedTasksVal'),
  pendingTasksVal: document.getElementById('pendingTasksVal'),
  overdueTasksVal: document.getElementById('overdueTasksVal'),
  todayTasksVal: document.getElementById('todayTasksVal'),
  backendHealth: document.getElementById('backendHealth'),
  
  // Tabs & Views
  tabTasksBtn: document.getElementById('tabTasksBtn'),
  tabInsightsBtn: document.getElementById('tabInsightsBtn'),
  viewTasksContainer: document.getElementById('viewTasksContainer'),
  viewInsightsContainer: document.getElementById('viewInsightsContainer'),
  
  // Toolbar controls
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  priorityFilter: document.getElementById('priorityFilter'),
  deadlineFilter: document.getElementById('deadlineFilter'),
  sortSelect: document.getElementById('sortSelect'),
  
  // Containers
  tableViewWrapper: document.getElementById('tableViewWrapper'),
  taskTableBody: document.getElementById('taskTableBody'),
  emptyState: document.getElementById('emptyState'),
  
  // Summary Details
  sumTotal: document.getElementById('sumTotal'),
  sumCompleted: document.getElementById('sumCompleted'),
  sumPending: document.getElementById('sumPending'),
  sumRate: document.getElementById('sumRate'),
  sumHigh: document.getElementById('sumHigh'),
  sumMed: document.getElementById('sumMed'),
  sumLow: document.getElementById('sumLow'),
  sumOverdue: document.getElementById('sumOverdue'),
  sumToday: document.getElementById('sumToday'),
  
  // Modals
  addTaskBtn: document.getElementById('addTaskBtn'),
  taskModal: document.getElementById('taskModal'),
  modalTitle: document.getElementById('modalTitle'),
  taskForm: document.getElementById('taskForm'),
  taskNameInput: document.getElementById('taskNameInput'),
  taskPrioritySelect: document.getElementById('taskPrioritySelect'),
  taskDueDateInput: document.getElementById('taskDueDateInput'),
  taskStatusGroup: document.getElementById('taskStatusGroup'),
  taskStatusSelect: document.getElementById('taskStatusSelect'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  
  // Delete Modal
  deleteModal: document.getElementById('deleteModal'),
  closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  deleteTaskName: document.getElementById('deleteTaskName'),

  // Theme & Toast
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  toastContainer: document.getElementById('toastContainer')
};

// Date Format Helpers (DD-MM-YYYY <-> YYYY-MM-DD)
function backendDateToIso(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

function isoDateToBackend(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

// Toast Notifications
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : '⚠️'}</span>
    <span>${message}</span>
  `;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setDefaultDueDate();
  await checkHealth();
  await loadData();
});

function setDefaultDueDate() {
  const today = new Date().toISOString().split('T')[0];
  elements.taskDueDateInput.value = today;
}

async function checkHealth() {
  const health = await API.fetchHealth();
  if (health.status === 'online') {
    elements.backendHealth.innerHTML = `<span class="pulse-dot"></span> Backend Connected (t.json)`;
  } else {
    elements.backendHealth.innerHTML = `<span class="pulse-dot" style="background:#ef4444;box-shadow:none;"></span> Backend Offline`;
  }
}

async function loadData() {
  try {
    const [tasksRes, summaryRes] = await Promise.all([
      API.fetchTasks(state.filters),
      API.fetchSummary()
    ]);

    state.tasks = tasksRes.tasks || [];
    state.summary = summaryRes.summary || null;

    renderStats();
    renderTasks();
    if (state.summary) {
      renderSummaryDetails();
      renderCharts(state.summary);
    }
  } catch (err) {
    console.error('Error loading data:', err);
    showToast('Failed to connect to backend server', 'error');
  }
}

// Render Stats Cards
function renderStats() {
  if (!state.summary) return;
  const { total_tasks, completed_tasks, pending_tasks, deadline_analysis } = state.summary;
  elements.totalTasksVal.textContent = total_tasks;
  elements.completedTasksVal.textContent = completed_tasks;
  elements.pendingTasksVal.textContent = pending_tasks;
  elements.overdueTasksVal.textContent = deadline_analysis.overdue;
  elements.todayTasksVal.textContent = deadline_analysis.today;
}

// Render Summary Details on Insights Tab
function renderSummaryDetails() {
  const s = state.summary;
  if (!s) return;
  elements.sumTotal.textContent = s.total_tasks;
  elements.sumCompleted.textContent = s.completed_tasks;
  elements.sumPending.textContent = s.pending_tasks;
  elements.sumRate.textContent = `${s.completion_rate}%`;
  elements.sumHigh.textContent = s.priority_analysis.high;
  elements.sumMed.textContent = s.priority_analysis.medium;
  elements.sumLow.textContent = s.priority_analysis.low;
  elements.sumOverdue.textContent = s.deadline_analysis.overdue;
  elements.sumToday.textContent = s.deadline_analysis.today;
}

// Render Tasks List Table
function renderTasks() {
  if (state.tasks.length === 0) {
    elements.emptyState.style.display = 'block';
    elements.tableViewWrapper.style.display = 'none';
    return;
  }

  elements.emptyState.style.display = 'none';
  elements.tableViewWrapper.style.display = 'block';
  renderTableView();
}

function getPriorityBadgeHtml(priority) {
  const p = (priority || 'low').toLowerCase();
  return `<span class="priority-badge priority-${p}">● ${p}</span>`;
}

function getDeadlineBadgeHtml(deadline, dueDateStr) {
  const dl = (deadline || 'Upcoming').toLowerCase();
  let icon = '📅';
  if (dl === 'overdue') icon = '⚠️';
  else if (dl === 'today') icon = '⚡';
  else if (dl === 'tomorrow') icon = '⏰';

  return `<span class="deadline-badge deadline-${dl}">${icon} ${deadline} (${dueDateStr})</span>`;
}

// Render Table View
function renderTableView() {
  elements.taskTableBody.innerHTML = state.tasks.map(t => {
    const isCompleted = t.status === 'completed';
    return `
      <tr class="${isCompleted ? 'completed-row' : ''}">
        <td>
          <input type="checkbox" class="custom-checkbox" ${isCompleted ? 'checked' : ''} data-toggle-id="${t.id}">
        </td>
        <td class="task-id">#${t.id}</td>
        <td class="task-name">${escapeHtml(t.name)}</td>
        <td>${getPriorityBadgeHtml(t.priority)}</td>
        <td>${getDeadlineBadgeHtml(t.deadline, t.due_date)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-secondary" data-edit-id="${t.id}">✏️ Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-delete-id="${t.id}">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Event Listeners
function setupEventListeners() {
  // Navigation Tabs
  elements.tabTasksBtn.addEventListener('click', () => switchTab('tasks'));
  elements.tabInsightsBtn.addEventListener('click', () => switchTab('insights'));

  // Search & Filters
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = e.target.value;
      loadData();
    }, 250);
  });

  elements.statusFilter.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    loadData();
  });

  elements.priorityFilter.addEventListener('change', (e) => {
    state.filters.priority = e.target.value;
    loadData();
  });

  elements.deadlineFilter.addEventListener('change', (e) => {
    state.filters.deadline = e.target.value;
    loadData();
  });

  elements.sortSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'priority_desc') {
      state.filters.sort_by = 'priority';
      state.filters.order = 'asc'; // High first
    } else if (val === 'due_date') {
      state.filters.sort_by = 'due_date';
      state.filters.order = 'asc';
    } else if (val === 'name') {
      state.filters.sort_by = 'name';
      state.filters.order = 'asc';
    } else {
      state.filters.sort_by = 'id';
      state.filters.order = 'asc';
    }
    loadData();
  });

  // Table Action Delegations (Toggle Checkbox, Edit, Delete)
  const handleTaskAction = async (e) => {
    const toggleCheckbox = e.target.closest('[data-toggle-id]');
    if (toggleCheckbox) {
      const id = parseInt(toggleCheckbox.dataset.toggleId, 10);
      try {
        await API.toggleTask(id);
        showToast(`Task #${id} status updated`);
        await loadData();
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    const editBtn = e.target.closest('[data-edit-id]');
    if (editBtn) {
      const id = parseInt(editBtn.dataset.editId, 10);
      openEditModal(id);
      return;
    }

    const deleteBtn = e.target.closest('[data-delete-id]');
    if (deleteBtn) {
      const id = parseInt(deleteBtn.dataset.deleteId, 10);
      openDeleteModal(id);
      return;
    }
  };

  elements.tableViewWrapper.addEventListener('click', handleTaskAction);

  // Add / Edit Modal Controls
  elements.addTaskBtn.addEventListener('click', () => openAddModal());
  elements.closeModalBtn.addEventListener('click', () => closeModal());
  elements.cancelModalBtn.addEventListener('click', () => closeModal());
  elements.taskForm.addEventListener('submit', handleTaskFormSubmit);

  // Delete Modal Controls
  elements.closeDeleteModalBtn.addEventListener('click', () => closeDeleteModal());
  elements.cancelDeleteBtn.addEventListener('click', () => closeDeleteModal());
  elements.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

  // Theme Switcher
  elements.themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    elements.themeToggleBtn.textContent = newTheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
  });
}

function switchTab(tab) {
  state.currentTab = tab;
  if (tab === 'tasks') {
    elements.tabTasksBtn.classList.add('active');
    elements.tabInsightsBtn.classList.remove('active');
    elements.viewTasksContainer.classList.add('active');
    elements.viewInsightsContainer.classList.remove('active');
  } else {
    elements.tabInsightsBtn.classList.add('active');
    elements.tabTasksBtn.classList.remove('active');
    elements.viewInsightsContainer.classList.add('active');
    elements.viewTasksContainer.classList.remove('active');
    if (state.summary) renderCharts(state.summary);
  }
}

function openAddModal() {
  state.editingTaskId = null;
  elements.modalTitle.textContent = '➕ Add New Task';
  elements.taskForm.reset();
  setDefaultDueDate();
  elements.taskStatusGroup.style.display = 'none';
  elements.taskModal.classList.add('active');
}

function openEditModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  state.editingTaskId = taskId;
  elements.modalTitle.textContent = `✏️ Edit Task #${taskId}`;
  elements.taskNameInput.value = task.name;
  elements.taskPrioritySelect.value = task.priority;
  elements.taskDueDateInput.value = backendDateToIso(task.due_date);
  elements.taskStatusSelect.value = task.status;
  elements.taskStatusGroup.style.display = 'block';

  elements.taskModal.classList.add('active');
}

function closeModal() {
  elements.taskModal.classList.remove('active');
}

async function handleTaskFormSubmit(e) {
  e.preventDefault();
  const name = elements.taskNameInput.value.trim();
  const priority = elements.taskPrioritySelect.value;
  const dueDateIso = elements.taskDueDateInput.value;
  const due_date = isoDateToBackend(dueDateIso);
  const status = elements.taskStatusSelect.value;

  if (!name) {
    showToast('Please enter a task name', 'error');
    return;
  }

  try {
    if (state.editingTaskId) {
      await API.updateTask(state.editingTaskId, { name, priority, due_date, status });
      showToast(`Task #${state.editingTaskId} updated successfully!`);
    } else {
      await API.addTask({ name, priority, due_date });
      showToast('New task added successfully!');
    }
    closeModal();
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openDeleteModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  state.deletingTaskId = taskId;
  elements.deleteTaskName.textContent = `"${task.name}" (ID #${taskId})`;
  elements.deleteModal.classList.add('active');
}

function closeDeleteModal() {
  elements.deleteModal.classList.remove('active');
}

async function handleConfirmDelete() {
  if (!state.deletingTaskId) return;
  try {
    await API.deleteTask(state.deletingTaskId);
    showToast(`Task #${state.deletingTaskId} deleted successfully`);
    closeDeleteModal();
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
