// Firefox: use the native `browser` API (Promise-based)

let cachedAllAlerts = [];
let cachedCityFilter = '';
let cachedCountry = '';
let cachedLastCheck = '';
let filterEnabled = true;

async function loadAlerts() {
  const data = await browser.storage.local.get(['allAlerts', 'country', 'cityFilter', 'lastCheck']);
  cachedAllAlerts  = data.allAlerts ?? [];
  cachedCityFilter = data.cityFilter || '';
  cachedCountry    = data.country || '';
  cachedLastCheck  = data.lastCheck || '';
  renderPage();
}

function renderPage() {
  const alerts = (filterEnabled && cachedCityFilter)
    ? cachedAllAlerts.filter((a) =>
        (a.areaDesc || '').toLowerCase() === cachedCityFilter.toLowerCase())
    : cachedAllAlerts;

  renderSubheading();
  renderList(alerts);
}

function renderSubheading() {
  const countryLabel = cachedCountry
    ? cachedCountry.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Unknown';
  const lastCheckStr = cachedLastCheck ? new Date(cachedLastCheck).toLocaleString() : 'Never';
  const sub = document.getElementById('subheading');

  if (cachedCityFilter) {
    const filterText = escHtml(cachedCityFilter);
    const toggleBtn = filterEnabled
      ? `<button class="btn-filter-toggle active" id="btnToggleFilter">Filtered: ${filterText} ×</button>`
      : `<button class="btn-filter-toggle" id="btnToggleFilter">+ ${filterText}</button>`;

    sub.innerHTML = `${escHtml(countryLabel)} · ${toggleBtn} · Last checked: ${lastCheckStr}`;
    document.getElementById('btnToggleFilter').addEventListener('click', () => {
      filterEnabled = !filterEnabled;
      renderPage();
    });
  } else {
    sub.textContent = `${countryLabel} · Last checked: ${lastCheckStr}`;
  }
}

function renderList(alerts) {
  const list = document.getElementById('alertList');
  if (alerts.length === 0) {
    list.innerHTML = filterEnabled && cachedCityFilter
      ? `<div class="empty">No active alerts match <strong>${escHtml(cachedCityFilter)}</strong>. <button class="btn-link" id="btnShowAll">Show all alerts</button></div>`
      : '<div class="empty">No active weather alerts for your area.</div>';
    if (filterEnabled && cachedCityFilter) {
      document.getElementById('btnShowAll').addEventListener('click', () => {
        filterEnabled = false;
        renderPage();
      });
    }
    return;
  }
  list.innerHTML = alerts.map(alertCard).join('');
}

function alertCard(alert) {
  const severity = (alert.severity || 'unknown').toLowerCase();
  const severityClass = ['extreme', 'severe', 'moderate', 'minor'].includes(severity)
    ? severity : 'unknown';

  const event     = escHtml(alert.event || alert.title || 'Weather Alert');
  const area      = escHtml(alert.areaDesc || '');
  const summary   = escHtml(alert.summary || '');
  const urgency   = escHtml(alert.urgency || '');
  const certainty = escHtml(alert.certainty || '');
  const updated   = alert.updated ? new Date(alert.updated).toLocaleString() : '';

  return `
    <div class="alert-card severity-${severityClass}">
      <div class="card-header">
        <span class="card-event">${event}</span>
        <span class="severity-badge ${severityClass}">${escHtml(alert.severity || 'Unknown')}</span>
      </div>
      ${area    ? `<div class="card-area">${area}</div>` : ''}
      <div class="card-meta">
        ${urgency   ? `<span data-label="Urgency">${urgency}</span>`    : ''}
        ${certainty ? `<span data-label="Certainty">${certainty}</span>` : ''}
      </div>
      ${summary ? `<div class="card-summary">${summary}</div>` : ''}
      ${updated ? `<div class="card-footer">Updated: ${updated}</div>` : ''}
    </div>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('btnRefresh').addEventListener('click', () => {
  browser.runtime.sendMessage({ type: 'CHECK_NOW' });
  setTimeout(loadAlerts, 2500);
});

loadAlerts();
