const cards = [{"label": "Current", "value": "22°C", "delta": "Clear"}, {"label": "Humidity", "value": "48%", "delta": "-5%"}, {"label": "Wind", "value": "12 km/h", "delta": "NE"}, {"label": "Alerts", "value": "0", "delta": "None"}];
const rows = [{"title": "London", "status": "Rain later", "detail": "Carry an umbrella after 5 PM."}, {"title": "New York", "status": "Sunny", "detail": "Good conditions for outdoor plans."}, {"title": "Tokyo", "status": "Humid", "detail": "Hydration reminder recommended."}, {"title": "Berlin", "status": "Cloudy", "detail": "Mild temperature with light wind."}];
const insights = ["Best outdoor window is late morning.", "Air quality is moderate in two saved cities.", "Temperature swing suggests layering."];
const storageKey = 'vizvasanlya-weather-app-items';
let saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
let filter = 'all';

const statsEl = document.querySelector('#stats');
const listEl = document.querySelector('#list');
const insightsEl = document.querySelector('#insights');
const form = document.querySelector('#add-item');
const input = document.querySelector('#itemInput');

function renderStats() {
  statsEl.innerHTML = cards.map((item) => `
    <article class="metric">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
      <em>${item.delta}</em>
    </article>
  `).join('');
}

function renderList() {
  const visible = rows.filter((row) => filter === 'all' || row.status.includes(filter));
  if (!visible.length) {
    listEl.innerHTML = '<p class="empty">No items match this filter yet.</p>';
    return;
  }
  listEl.innerHTML = visible.map((row) => `
    <article class="row">
      <div>
        <h3>${row.title}</h3>
        <p>${row.detail}</p>
      </div>
      <span class="badge">${row.status}</span>
    </article>
  `).join('');
}

function renderInsights() {
  insightsEl.innerHTML = insights.map((item) => `<li>${item}</li>`).join('');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  saved.unshift({ title: value, status: 'Active', detail: 'Added from the quick capture form.' });
  localStorage.setItem(storageKey, JSON.stringify(saved.slice(0, 10)));
  input.value = '';
  renderList();
});

document.querySelectorAll('.filters button').forEach((button) => {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('.filters button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    renderList();
  });
});

renderStats();
renderList();
renderInsights();
