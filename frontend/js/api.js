/**
 * API Service for Python Task Management Backend
 */

const API_BASE = '/api';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return await res.json();
  } catch (err) {
    console.error('Health check error:', err);
    return { status: 'offline' };
  }
}

export async function fetchTasks(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.priority && params.priority !== 'all') query.append('priority', params.priority);
  if (params.deadline && params.deadline !== 'all') query.append('deadline', params.deadline);
  if (params.sort_by) query.append('sort_by', params.sort_by);
  if (params.order) query.append('order', params.order);

  const url = `${API_BASE}/tasks?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function addTask(taskData) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add task');
  }
  return await res.json();
}

export async function updateTask(taskId, taskData) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update task');
  }
  return await res.json();
}

export async function toggleTask(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/toggle`, {
    method: 'PATCH'
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to toggle task status');
  }
  return await res.json();
}

export async function deleteTask(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete task');
  }
  return await res.json();
}

export async function fetchSummary() {
  const res = await fetch(`${API_BASE}/summary`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return await res.json();
}
