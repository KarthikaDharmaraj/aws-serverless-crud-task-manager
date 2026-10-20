'use strict';

/* =========================================================================
   1. STORAGE LAYER
   -------------------------------------------------------------------------
   Phase 6: tasks are stored in DynamoDB through API Gateway and Lambda.
   (Phase 1 used localStorage. The function names, arguments and return
   values are unchanged, so the UI code further down did not change.)

   The UI tracks completion as status: 'pending' | 'completed', while the
   API uses completed: true | false. toUi() and toApi() translate between
   the two, so that difference stays inside this layer.
   ========================================================================= */

const API_BASE = 'https://7yaglrsa5d.execute-api.eu-central-1.amazonaws.com';
const REQUEST_TIMEOUT_MS = 10000;

// API task -> UI task
function toUi(apiTask) {
  const { completed, ...rest } = apiTask;
  return { ...rest, status: completed ? 'completed' : 'pending' };
}

// UI changes -> API request body (only the fields the API accepts)
function toApi(changes) {
  const body = {};
  if ('title' in changes) body.title = changes.title;
  if ('description' in changes) body.description = changes.description;
  if ('status' in changes) body.completed = changes.status === 'completed';
  return body;
}

// Shared fetch wrapper: JSON in/out, timeout, and consistent errors.
// A 404 throws 'Task not found', which the UI already handles.
async function request(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(err.name === 'AbortError' ? 'Request timed out' : 'Network error');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) throw new Error('Task not found');
  if (response.status === 204) return null; // DELETE has no body

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data && data.message) || `Request failed (${response.status})`);
  }
  return data;
}

const taskApi = {
  // GET /tasks
  async listTasks() {
    const tasks = await request('/tasks');
    return tasks.map(toUi);
  },

  // GET /tasks/{id}  (not used by the UI yet, included to match the API)
  async getTask(id) {
    return toUi(await request(`/tasks/${encodeURIComponent(id)}`));
  },

  // POST /tasks
  async createTask({ title, description }) {
    return toUi(await request('/tasks', { method: 'POST', body: { title, description } }));
  },

  // PUT /tasks/{id}
  async updateTask(id, changes) {
    return toUi(await request(`/tasks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: toApi(changes),
    }));
  },

  // DELETE /tasks/{id}
  async deleteTask(id) {
    await request(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

/* =========================================================================
   2. VALIDATION
   The same rules will be enforced again in the Lambda function (Phase 4):
   never trust the browser alone.
   ========================================================================= */

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 500;

function validateTask({ title, description }) {
  if (!title) return 'Title is required.';
  if (title.length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer.`;
  if (description.length > DESCRIPTION_MAX) {
    return `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }
  return null;
}

/* =========================================================================
   3. UI STATE AND RENDERING
   Text is always inserted with textContent (never innerHTML) so a task
   title like <script> is shown as text and cannot run as code.
   ========================================================================= */

const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descriptionInput = document.getElementById('task-description');
const formError = document.getElementById('form-error');
const listEl = document.getElementById('task-list');
const emptyEl = document.getElementById('empty-state');
const countEl = document.getElementById('task-count');
const statusEl = document.getElementById('status');
const filterButtons = document.querySelectorAll('.filter');

let tasks = [];
let currentFilter = 'all';
let editingId = null;
let statusTimer = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function actionButton(label, action, extraClass = '') {
  const btn = el('button', `btn small ${extraClass}`.trim(), label);
  btn.type = 'button';
  btn.dataset.action = action;
  return btn;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error-status', isError);
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 3000);
}

function isCompleted(task) {
  return task.status === 'completed';
}

function render() {
  const visible = tasks
    .filter((t) => {
      if (currentFilter === 'active') return !isCompleted(t);
      if (currentFilter === 'completed') return isCompleted(t);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // newest first

  listEl.replaceChildren(...visible.map(renderTask));

  const done = tasks.filter(isCompleted).length;
  countEl.textContent = tasks.length
    ? `${tasks.length} task${tasks.length === 1 ? '' : 's'} · ${done} completed`
    : '';

  emptyEl.hidden = visible.length > 0;
  emptyEl.textContent = tasks.length === 0
    ? 'No tasks yet. Add your first one above.'
    : 'No tasks match this filter.';
}

function renderTask(task) {
  const li = el('li', 'task');
  li.dataset.id = task.id;
  if (isCompleted(task)) li.classList.add('completed');

  if (task.id === editingId) {
    li.append(renderEditForm(task));
    return li;
  }

  const checkbox = el('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isCompleted(task);
  checkbox.dataset.action = 'toggle';
  checkbox.setAttribute(
    'aria-label',
    `Mark "${task.title}" as ${isCompleted(task) ? 'not completed' : 'completed'}`
  );

  const body = el('div', 'task-body');
  body.append(el('p', 'task-title', task.title));
  if (task.description) body.append(el('p', 'task-description', task.description));
  const updated = task.updatedAt !== task.createdAt ? ` · Updated ${formatDate(task.updatedAt)}` : '';
  body.append(el('p', 'task-meta', `Created ${formatDate(task.createdAt)}${updated}`));

  const actions = el('div', 'task-actions');
  actions.append(actionButton('Edit', 'edit'), actionButton('Delete', 'delete', 'danger'));

  li.append(checkbox, body, actions);
  return li;
}

function renderEditForm(task) {
  const editForm = el('form', 'edit-form');
  editForm.noValidate = true;

  const title = el('input');
  title.type = 'text';
  title.name = 'title';
  title.value = task.title;
  title.maxLength = TITLE_MAX;
  title.setAttribute('aria-label', 'Task title');

  const description = el('textarea');
  description.name = 'description';
  description.rows = 2;
  description.value = task.description || '';
  description.maxLength = DESCRIPTION_MAX;
  description.setAttribute('aria-label', 'Task description');

  const error = el('p', 'error');
  error.setAttribute('role', 'alert');

  const save = el('button', 'btn small primary', 'Save');
  save.type = 'submit';

  const actions = el('div', 'actions');
  actions.append(save, actionButton('Cancel', 'cancel'));

  editForm.append(title, description, error, actions);
  return editForm;
}

async function refresh() {
  tasks = await taskApi.listTasks();
  render();
}

function handleError(err, fallbackMessage) {
  console.error(err);
  const message = err.message === 'Task not found' ? 'That task no longer exists.' : fallbackMessage;
  showStatus(message, true);
  refresh().catch((refreshErr) => console.error(refreshErr)); // API may be unreachable
}

/* =========================================================================
   4. EVENT HANDLERS
   ========================================================================= */

// Create
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
  };

  const error = validateTask(input);
  formError.textContent = error || '';
  if (error) {
    titleInput.focus();
    return;
  }

  try {
    await taskApi.createTask(input);
    form.reset();
    titleInput.focus();
    await refresh();
    showStatus('Task added.');
  } catch (err) {
    handleError(err, 'Could not add the task.');
  }
});

// Complete, edit, cancel, delete (one listener for the whole list)
listEl.addEventListener('click', async (event) => {
  const target = event.target.closest('button[data-action], input[data-action]');
  if (!target) return;

  const id = target.closest('.task').dataset.id;
  const task = tasks.find((t) => t.id === id);
  const action = target.dataset.action;

  try {
    if (action === 'toggle') {
      await taskApi.updateTask(id, { status: isCompleted(task) ? 'pending' : 'completed' });
      await refresh();
    }

    if (action === 'edit') {
      editingId = id;
      render();
      listEl.querySelector('.edit-form input').focus();
    }

    if (action === 'cancel') {
      editingId = null;
      render();
    }

    if (action === 'delete') {
      if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
      await taskApi.deleteTask(id);
      if (editingId === id) editingId = null;
      await refresh();
      showStatus('Task deleted.');
    }
  } catch (err) {
    handleError(err, 'Something went wrong. Please try again.');
  }
});

// Save an edit
listEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  const editForm = event.target;
  const id = editForm.closest('.task').dataset.id;
  const input = {
    title: editForm.elements.title.value.trim(),
    description: editForm.elements.description.value.trim(),
  };

  const error = validateTask(input);
  if (error) {
    editForm.querySelector('.error').textContent = error;
    editForm.elements.title.focus();
    return;
  }

  try {
    await taskApi.updateTask(id, input);
    editingId = null;
    await refresh();
    showStatus('Task updated.');
  } catch (err) {
    editingId = null;
    handleError(err, 'Could not update the task.');
  }
});

// Escape cancels editing
listEl.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && editingId) {
    editingId = null;
    render();
  }
});

// Filters
filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach((b) => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    render();
  });
});

/* =========================================================================
   5. START
   ========================================================================= */

refresh().catch((err) => handleError(err, 'Could not load tasks.'));
