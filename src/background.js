// Firefox: use the native `browser` API (Promise-based)
const METEOALARM_BASE = 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-';
const ALARM_NAME = 'weatherCheck';
const POLL_INTERVAL_MINUTES = 15;
const SUMMARY_NOTIF_ID = 'wa-summary';

browser.runtime.onInstalled.addListener(() => {
  browser.alarms.create(ALARM_NAME, {
    delayInMinutes: 0,
    periodInMinutes: POLL_INTERVAL_MINUTES,
  });
});

browser.runtime.onStartup.addListener(async () => {
  const alarm = await browser.alarms.get(ALARM_NAME);
  if (!alarm) {
    browser.alarms.create(ALARM_NAME, {
      delayInMinutes: 1,
      periodInMinutes: POLL_INTERVAL_MINUTES,
    });
  }
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) checkWeatherAlerts();
});

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'CHECK_NOW') checkWeatherAlerts();
});

// Clicking the notification opens the alerts page
browser.notifications.onClicked.addListener(() => {
  browser.tabs.create({ url: browser.runtime.getURL('alerts.html') });
});

async function checkWeatherAlerts() {
  const data = await browser.storage.local.get(['country', 'cityFilter', 'seenAlertIds']);
  const country = data.country;

  if (!country) {
    await browser.storage.local.set({
      lastCheck: new Date().toISOString(),
      lastError: 'No country configured. Open the extension to set your location.',
    });
    return;
  }

  const seenAlertIds = data.seenAlertIds || [];
  const cityFilter = (data.cityFilter || '').trim().toLowerCase();

  try {
    const allAlerts = await fetchAlerts(country);
    // Apply city/district filter if set
    const alerts = cityFilter
      ? allAlerts.filter((a) => (a.areaDesc || '').toLowerCase() == cityFilter)
      : allAlerts;

    const now = new Date().toISOString();
    const newAlerts = alerts.filter((a) => !seenAlertIds.includes(a.id));

    if (newAlerts.length > 0) {
      fireSummaryNotification(alerts.length, country, cityFilter);
    }

    await browser.storage.local.set({
      seenAlertIds: alerts.map((a) => a.id),
      allAlerts: allAlerts,      // unfiltered — used by alerts page for client-side toggle
      activeAlerts: alerts,      // filtered — used for notification count
      lastCheck: now,
      activeAlertCount: alerts.length,
      lastError: null,
    });
  } catch (err) {
    await browser.storage.local.set({
      lastError: err.message,
      lastCheck: new Date().toISOString(),
    });
  }
}

async function fetchAlerts(countrySlug) {
  const url = `${METEOALARM_BASE}${countrySlug}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`MeteoAlarm fetch failed: ${resp.status}`);
  const xml = await resp.text();
  return parseAtomEntries(xml);
}

// --- Lightweight Atom/CAP XML parser ---

function parseAtomEntries(xml) {
  const entries = [];
  const entryRegex = /<entry[\s>][\s\S]*?<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const e = match[0];
    entries.push({
      id:        getTag(e, 'id'),
      title:     stripCdata(getTag(e, 'title')),
      event:     getTag(e, 'cap:event') || getTag(e, 'event'),
      severity:  getTag(e, 'cap:severity') || getTag(e, 'severity'),
      urgency:   getTag(e, 'cap:urgency') || getTag(e, 'urgency'),
      certainty: getTag(e, 'cap:certainty') || getTag(e, 'certainty'),
      areaDesc:  getTag(e, 'cap:areaDesc') || getTag(e, 'areaDesc'),
      updated:   getTag(e, 'updated'),
      summary:   stripHtml(getTag(e, 'summary')),
    });
  }
  return entries.filter((e) => e.id && (e.event || e.title));
}

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}

function stripCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function stripHtml(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// --- Single summary notification ---

function fireSummaryNotification(count, countrySlug, cityFilter) {
  const countryLabel = countrySlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const location = cityFilter
    ? `${countryLabel} · ${cityFilter.charAt(0).toUpperCase() + cityFilter.slice(1)}`
    : countryLabel;

  browser.notifications.create(SUMMARY_NOTIF_ID, {
    type: 'basic',
    iconUrl: 'icons/weather-alert-icon128x128.png',
    title: `${count} active weather alert${count !== 1 ? 's' : ''} — ${location}`,
    message: 'Click to view all active alerts.',
  });
}
