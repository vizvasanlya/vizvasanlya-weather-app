let config = {};
let state = { resources: [], activity: [], selectedId: null, search: '', status: 'all', sort: 'priority', view: 'grid' };
let storageKey = 'mvp';

const $ = (selector) => document.querySelector(selector);
const els = {
  title: $('#appTitle'), description: $('#appDescription'), eyebrow: $('#eyebrow'), brandTitle: $('#brandTitle'), brandSubtitle: $('#brandSubtitle'), logoMark: $('#logoMark'),
  metrics: $('#metrics'), workspace: $('#workspace'), details: $('#details'), activity: $('#activity'), selectedTitle: $('#selectedTitle'), selectedMeta: $('#selectedMeta'),
  search: $('#searchInput'), statusFilter: $('#statusFilter'), sortBy: $('#sortBy'), addButton: $('#addButton'), seedButton: $('#seedButton'), exportButton: $('#exportButton'),
  importInput: $('#importInput'), dialog: $('#itemDialog'), form: $('#itemForm'), dialogTitle: $('#dialogTitle'), itemId: $('#itemId'), itemTitle: $('#itemTitle'), itemOwner: $('#itemOwner'),
  itemStatus: $('#itemStatus'), itemPriority: $('#itemPriority'), itemDueDate: $('#itemDueDate'), itemValue: $('#itemValue'), itemNotes: $('#itemNotes'), deleteButton: $('#deleteButton'), clearActivityButton: $('#clearActivityButton')
};

fetch('/data.json')
  .then((response) => response.json())
  .then((data) => {
    config = data;
    storageKey = `mvp:${config.name}`;
    document.title = `${config.title} | MVP`;
    document.querySelector('meta[name="description"]').content = config.description;
    document.documentElement.style.setProperty('--accent', config.accent);
    document.documentElement.style.setProperty('--accent-soft', hexToSoft(config.accent));
    els.eyebrow.textContent = config.eyebrow;
    els.title.textContent = config.title;
    els.description.textContent = config.description;
    els.brandTitle.textContent = config.title;
    els.brandSubtitle.textContent = config.subtitle;
    els.logoMark.textContent = config.initial;
    populateStatuses();
    loadState();
    bindEvents();
    render();
  });

function hexToSoft(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.16)`;
}

function populateStatuses() {
  const statuses = [...new Set([...config.statuses, ...config.resources.map((item) => item.status)])];
  els.statusFilter.innerHTML = `<option value="all">All statuses</option>${statuses.map((status) => `<option value="${status}">${status}</option>`).join('')}`;
  els.itemStatus.innerHTML = statuses.map((status) => `<option value="${status}">${status}</option>`).join('');
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && Array.isArray(saved.resources)) {
      state.resources = saved.resources;
      state.activity = saved.activity || [];
    } else {
      state.resources = config.resources.map((item) => ({ ...item, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()) }));
      state.activity = config.activity || [];
    }
  } catch {
    state.resources = config.resources.map((item) => ({ ...item, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()) }));
    state.activity = config.activity || [];
  }
  state.selectedId = state.resources[0]?.id || null;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({ resources: state.resources, activity: state.activity }));
}

function bindEvents() {
  els.search.addEventListener('input', () => { state.search = els.search.value; render(); });
  els.statusFilter.addEventListener('change', () => { state.status = els.statusFilter.value; render(); });
  els.sortBy.addEventListener('change', () => { state.sort = els.sortBy.value; render(); });
  els.addButton.addEventListener('click', () => openDialog());
  els.seedButton.addEventListener('click', () => {
    if (!confirm('Reset demo data?')) return;
    state.resources = config.resources.map((item) => ({ ...item, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()) }));
    state.activity = [{ text: 'Demo data reset.', at: new Date().toISOString() }, ...state.activity].slice(0, 20);
    state.selectedId = state.resources[0]?.id || null;
    saveState();
    render();
  });
  els.exportButton.addEventListener('click', exportData);
  els.importInput.addEventListener('change', importData);
  els.deleteButton.addEventListener('click', deleteSelected);
  els.clearActivityButton.addEventListener('click', () => { state.activity = []; saveState(); render(); });
  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveDialog();
  });
  document.querySelectorAll('.nav button').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      document.querySelectorAll('.nav button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      render();
    });
  });
}

function filteredResources() {
  const term = state.search.toLowerCase();
  return state.resources
    .filter((item) => state.status === 'all' || item.status === state.status)
    .filter((item) => [item.title, item.owner, item.notes, item.detail].join(' ').toLowerCase().includes(term))
    .sort((a, b) => {
      if (state.sort === 'title') return a.title.localeCompare(b.title);
      if (state.sort === 'status') return a.status.localeCompare(b.status);
      if (state.sort === 'dueDate') return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
      if (state.sort === 'value') return Number(b.value || 0) - Number(a.value || 0);
      return priorityRank(b.priority) - priorityRank(a.priority);
    });
}

function priorityRank(value) {
  return { Low: 1, Medium: 2, High: 3, Critical: 4 }[value] || 0;
}

function render() {
  renderMetrics();
  renderWorkspace();
  renderDetails();
  renderActivity();
  renderSelected();
}

function renderMetrics() {
  const total = state.resources.length;
  const active = state.resources.filter((item) => item.status === 'Active' || item.status === 'In progress' || item.status === 'Queued' || item.status === 'Draft').length;
  const done = state.resources.filter((item) => ['Done', 'Completed', 'Published', 'Confirmed', 'Healthy'].includes(item.status)).length;
  const critical = state.resources.filter((item) => item.priority === 'Critical' || item.priority === 'High').length;
  const value = state.resources.reduce((sum, item) => sum + Number(item.value || 0), 0);
  els.metrics.innerHTML = config.metrics.map((metric) => {
    const valueText = metricValue(metric, { total, active, done, critical, value, resources: state.resources });
    return `<article class="metric"><span>${metric.label}</span><strong>${valueText}</strong><em>${metric.delta}</em></article>`;
  }).join('');
}

function metricValue(metric, stats) {
  if (metric.type === 'currency') return `$${stats.value.toLocaleString()}`;
  if (metric.type === 'percent') return `${Math.round((stats.done / Math.max(stats.total, 1)) * 100)}%`;
  if (metric.valueKey === 'active') return stats.active;
  if (metric.valueKey === 'critical') return stats.critical;
  if (metric.valueKey === 'value') return `$${stats.value.toLocaleString()}`;
  return stats.total;
}

function renderWorkspace() {
  const items = filteredResources();
  els.workspace.className = `workspace ${state.view}-view`;
  if (!items.length) {
    els.workspace.innerHTML = `<div class="empty">No items match the current search or filter.</div>`;
    return;
  }
  if (state.view === 'analytics') {
    els.workspace.innerHTML = analyticsHtml(items);
    return;
  }
  els.workspace.innerHTML = items.map((item) => `
    <article class="card ${item.id === state.selectedId ? 'selected' : ''}" data-id="${item.id}">
      <div class="card-head">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="badge">${escapeHtml(item.status)}</span>
      </div>
      <p>${escapeHtml(item.detail)}</p>
      <div class="meta"><span>${escapeHtml(item.owner)}</span><span>${escapeHtml(item.priority)}</span><span>${item.dueDate || 'No due date'}</span></div>
    </article>
  `).join('');
  els.workspace.querySelectorAll('.card').forEach((card) => card.addEventListener('click', () => {
    state.selectedId = card.dataset.id;
    saveState();
    render();
  }));
}

function analyticsHtml(items) {
  const byStatus = {};
  const byPriority = {};
  items.forEach((item) => {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
  });
  const statusBars = Object.entries(byStatus).map(([status, count]) => barHtml(status, count, items.length));
  const priorityBars = Object.entries(byPriority).map(([priority, count]) => barHtml(priority, count, items.length));
  const top = [...items].sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority)).slice(0, 5);
  return `
    <article class="panel"><div class="panel-title"><div><p class="eyebrow">Distribution</p><h2>Status mix</h2></div></div>${statusBars.join('')}</article>
    <article class="panel"><div class="panel-title"><div><p class="eyebrow">Focus</p><h2>Priority mix</h2></div></div>${priorityBars.join('')}</article>
    <article class="panel" style="grid-column: 1 / -1"><div class="panel-title"><div><p class="eyebrow">Top focus</p><h2>Highest priority items</h2></div></div>${top.map((item) => `<div class="card"><div class="card-head"><h3>${escapeHtml(item.title)}</h3><span class="badge">${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.detail)}</p></div>`).join('')}</article>
  `;
}

function barHtml(label, count, total) {
  const width = Math.max(8, Math.round((count / Math.max(total, 1)) * 100));
  return `<div class="bar"><span>${escapeHtml(label)}</span><div><i style="width:${width}%"></i></div><strong>${count}</strong></div>`;
}

function renderDetails() {
  const item = state.resources.find((entry) => entry.id === state.selectedId) || state.resources[0];
  if (!item) {
    els.details.innerHTML = `<div class="empty">Add an item to start.</div>`;
    els.deleteButton.disabled = true;
    return;
  }
  state.selectedId = item.id;
  els.deleteButton.disabled = false;
  els.details.innerHTML = `
    <dl>
      <dt>Title</dt><dd>${escapeHtml(item.title)}</dd>
      <dt>Owner</dt><dd>${escapeHtml(item.owner)}</dd>
      <dt>Status</dt><dd><span class="badge">${escapeHtml(item.status)}</span></dd>
      <dt>Priority</dt><dd>${escapeHtml(item.priority)}</dd>
      <dt>Due date</dt><dd>${item.dueDate || 'Not scheduled'}</dd>
      <dt>Value</dt><dd>${Number(item.value || 0).toLocaleString()}</dd>
      <dt>Notes</dt><dd>${escapeHtml(item.notes || item.detail)}</dd>
    </dl>
    <div class="hero-actions">
      <button id="completeButton" type="button">${isComplete(item.status) ? 'Reopen item' : 'Mark complete'}</button>
      <button id="editButton" type="button">Edit item</button>
    </div>
  `;
  $('#completeButton').addEventListener('click', () => toggleComplete(item.id));
  $('#editButton').addEventListener('click', () => openDialog(item.id));
}

function renderActivity() {
  if (!state.activity.length) {
    els.activity.innerHTML = `<li class="muted">No activity yet.</li>`;
    return;
  }
  els.activity.innerHTML = state.activity.slice(0, 12).map((entry) => `<li><time>${new Date(entry.at).toLocaleString()}</time><br>${escapeHtml(entry.text)}</li>`).join('');
}

function renderSelected() {
  const item = state.resources.find((entry) => entry.id === state.selectedId) || state.resources[0];
  els.selectedTitle.textContent = item ? item.title : 'No item selected';
  els.selectedMeta.textContent = item ? `${item.status} · ${item.owner}` : 'Choose an item to view details.';
}

function openDialog(id = null) {
  const item = id ? state.resources.find((entry) => entry.id === id) : null;
  els.dialogTitle.textContent = item ? 'Edit item' : 'Add item';
  els.itemId.value = item?.id || '';
  els.itemTitle.value = item?.title || '';
  els.itemOwner.value = item?.owner || '';
  els.itemStatus.value = item?.status || config.statuses[0] || 'Active';
  els.itemPriority.value = item?.priority || 'Medium';
  els.itemDueDate.value = item?.dueDate || '';
  els.itemValue.value = item?.value || 0;
  els.itemNotes.value = item?.notes || '';
  els.dialog.showModal();
}

function saveDialog() {
  const payload = {
    title: els.itemTitle.value.trim(),
    owner: els.itemOwner.value.trim(),
    status: els.itemStatus.value,
    priority: els.itemPriority.value,
    dueDate: els.itemDueDate.value,
    value: Number(els.itemValue.value || 0),
    notes: els.itemNotes.value.trim(),
    detail: els.itemNotes.value.trim() || 'New MVP item created from the workspace.'
  };
  if (!payload.title || !payload.owner) return;
  if (els.itemId.value) {
    const index = state.resources.findIndex((item) => item.id === els.itemId.value);
    state.resources[index] = { ...state.resources[index], ...payload };
    addActivity(`Updated ${payload.title}.`);
  } else {
    const item = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), ...payload };
    state.resources.unshift(item);
    state.selectedId = item.id;
    addActivity(`Added ${payload.title}.`);
  }
  saveState();
  els.dialog.close();
  render();
}

function toggleComplete(id) {
  const item = state.resources.find((entry) => entry.id === id);
  if (!item) return;
  item.status = isComplete(item.status) ? 'Active' : 'Completed';
  addActivity(`Changed status for ${item.title} to ${item.status}.`);
  saveState();
  render();
}

function deleteSelected() {
  const item = state.resources.find((entry) => entry.id === state.selectedId);
  if (!item || !confirm(`Delete ${item.title}?`)) return;
  state.resources = state.resources.filter((entry) => entry.id !== item.id);
  state.selectedId = state.resources[0]?.id || null;
  addActivity(`Deleted ${item.title}.`);
  saveState();
  render();
}

function addActivity(text) {
  state.activity.unshift({ text, at: new Date().toISOString() });
  state.activity = state.activity.slice(0, 30);
}

function exportData() {
  const blob = new Blob([JSON.stringify({ resources: state.resources, activity: state.activity }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${config.name}-export.json`;
  link.click();
  URL.revokeObjectURL(url);
  addActivity('Exported workspace data.');
  saveState();
  render();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.resources)) throw new Error('Invalid file');
      state.resources = parsed.resources.map((item) => ({ ...item, id: item.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())) }));
      state.activity = Array.isArray(parsed.activity) ? parsed.activity : state.activity;
      state.selectedId = state.resources[0]?.id || null;
      addActivity('Imported workspace data.');
      saveState();
      render();
    } catch {
      alert('Invalid JSON import file.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function isComplete(status) {
  return ['Done', 'Completed', 'Published', 'Confirmed', 'Healthy'].includes(status);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}
