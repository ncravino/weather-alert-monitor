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

  sub.textContent = '';

  if (cachedCityFilter) {
    sub.appendChild(document.createTextNode(`${countryLabel} · `));

    const btn = document.createElement('button');
    btn.className = filterEnabled ? 'btn-filter-toggle active' : 'btn-filter-toggle';
    btn.textContent = filterEnabled ? `Filtered: ${cachedCityFilter} ×` : `+ ${cachedCityFilter}`;
    btn.addEventListener('click', () => {
      filterEnabled = !filterEnabled;
      renderPage();
    });
    sub.appendChild(btn);

    sub.appendChild(document.createTextNode(` · Last checked: ${lastCheckStr}`));
  } else {
    sub.textContent = `${countryLabel} · Last checked: ${lastCheckStr}`;
  }
}

function renderList(alerts) {
  const list = document.getElementById('alertList');
  list.textContent = '';

  if (alerts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';

    if (filterEnabled && cachedCityFilter) {
      empty.appendChild(document.createTextNode('No active alerts match '));
      const strong = document.createElement('strong');
      strong.textContent = cachedCityFilter;
      empty.appendChild(strong);
      empty.appendChild(document.createTextNode('. '));
      const btn = document.createElement('button');
      btn.className = 'btn-link';
      btn.textContent = 'Show all alerts';
      btn.addEventListener('click', () => {
        filterEnabled = false;
        renderPage();
      });
      empty.appendChild(btn);
    } else {
      empty.textContent = 'No active weather alerts for your area.';
    }

    list.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  alerts.forEach((alert) => fragment.appendChild(alertCard(alert)));
  list.appendChild(fragment);
}

function alertCard(alert) {
  const severity = (alert.severity || 'unknown').toLowerCase();
  const severityClass = ['extreme', 'severe', 'moderate', 'minor'].includes(severity)
    ? severity : 'unknown';

  const card = document.createElement('div');
  card.className = `alert-card severity-${severityClass}`;

  const header = document.createElement('div');
  header.className = 'card-header';
  const eventSpan = document.createElement('span');
  eventSpan.className = 'card-event';
  eventSpan.textContent = alert.event || alert.title || 'Weather Alert';
  const badge = document.createElement('span');
  badge.className = `severity-badge ${severityClass}`;
  badge.textContent = alert.severity || 'Unknown';
  header.appendChild(eventSpan);
  header.appendChild(badge);
  card.appendChild(header);

  if (alert.areaDesc) {
    const area = document.createElement('div');
    area.className = 'card-area';
    area.textContent = alert.areaDesc;
    card.appendChild(area);
  }

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  if (alert.urgency) {
    const span = document.createElement('span');
    span.dataset.label = 'Urgency';
    span.textContent = alert.urgency;
    meta.appendChild(span);
  }
  if (alert.certainty) {
    const span = document.createElement('span');
    span.dataset.label = 'Certainty';
    span.textContent = alert.certainty;
    meta.appendChild(span);
  }
  card.appendChild(meta);

  if (alert.summary) {
    const summary = document.createElement('div');
    summary.className = 'card-summary';
    summary.textContent = alert.summary;
    card.appendChild(summary);
  }

  if (alert.updated) {
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    footer.textContent = `Updated: ${new Date(alert.updated).toLocaleString()}`;
    card.appendChild(footer);
  }

  return card;
}

document.getElementById('btnRefresh').addEventListener('click', () => {
  browser.runtime.sendMessage({ type: 'CHECK_NOW' });
  setTimeout(loadAlerts, 2500);
});

loadAlerts();
