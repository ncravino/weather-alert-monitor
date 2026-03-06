// Firefox: use the native `browser` API (Promise-based)

const COUNTRY_CODE_MAP = {
  at: 'austria',
  be: 'belgium',
  ba: 'bosnia-herzegovina',
  bg: 'bulgaria',
  hr: 'croatia',
  cy: 'cyprus',
  cz: 'czech-republic',
  dk: 'denmark',
  ee: 'estonia',
  fi: 'finland',
  fr: 'france',
  de: 'germany',
  gr: 'greece',
  hu: 'hungary',
  is: 'iceland',
  ie: 'ireland',
  il: 'israel',
  it: 'italy',
  xk: 'kosovo',
  lv: 'latvia',
  lt: 'lithuania',
  lu: 'luxembourg',
  mt: 'malta',
  md: 'moldova',
  me: 'montenegro',
  nl: 'netherlands',
  mk: 'north-macedonia',
  no: 'norway',
  pl: 'poland',
  pt: 'portugal',
  ro: 'romania',
  rs: 'serbia',
  sk: 'slovakia',
  si: 'slovenia',
  es: 'spain',
  se: 'sweden',
  ch: 'switzerland',
  tr: 'turkey',
  gb: 'united-kingdom',
};

document.getElementById('btnDetect').addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by this browser.');
    return;
  }

  const btn = document.getElementById('btnDetect');
  btn.textContent = '...';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (!resp.ok) throw new Error('Reverse geocoding failed.');
        const data = await resp.json();
        const code = data?.address?.country_code?.toLowerCase();
        const slug = COUNTRY_CODE_MAP[code];
        if (!slug) {
          showError(`Your location (${data?.address?.country ?? code}) is not covered by MeteoAlarm.`);
        } else {
          document.getElementById('selectCountry').value = slug;
          document.getElementById('geoResult').style.display = 'block';
          document.getElementById('geoResult').textContent = `Detected: ${data.address.country}`;
          hideError();
        }
      } catch (err) {
        showError(`Auto-detect failed: ${err.message}`);
      } finally {
        btn.textContent = '⊙ Detect';
        btn.disabled = false;
      }
    },
    (err) => {
      showError(`Location error: ${err.message}`);
      btn.textContent = '⊙ Detect';
      btn.disabled = false;
    }
  );
});

// Open alerts page
document.getElementById('alertSummary').addEventListener('click', () => {
  browser.tabs.create({ url: browser.runtime.getURL('alerts.html') });
});

document.getElementById('btnSave').addEventListener('click', async () => {
  const country = document.getElementById('selectCountry').value;
  if (!country) {
    showError('Please select a country.');
    return;
  }

  hideError();
  const btn = document.getElementById('btnSave');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const cityFilter = document.getElementById('inputCityFilter').value.trim();
  await browser.storage.local.set({ country, cityFilter, seenAlertIds: [] });
  browser.runtime.sendMessage({ type: 'CHECK_NOW' });

  btn.textContent = 'Saved!';
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Save & Check Now';
  }, 1500);

  setTimeout(loadStatus, 3000);
});

function showError(msg) {
  const el = document.getElementById('saveError');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  document.getElementById('saveError').style.display = 'none';
}

async function loadStatus() {
  const data = await browser.storage.local.get([
    'country', 'cityFilter', 'lastCheck', 'activeAlertCount', 'lastError',
  ]);

  if (data.country) {
    document.getElementById('selectCountry').value = data.country;
  }
  if (data.cityFilter) {
    document.getElementById('inputCityFilter').value = data.cityFilter;
  }

  const statusEl = document.getElementById('statusText');
  if (data.lastError) {
    statusEl.textContent = `Error: ${data.lastError}`;
    statusEl.style.color = '#f87171';
  } else if (data.country) {
    const label = document.querySelector(`#selectCountry option[value="${data.country}"]`)?.textContent ?? data.country;
    const filter = data.cityFilter ? ` · ${data.cityFilter}` : '';
    statusEl.textContent = `Monitoring ${label}${filter}`;
    statusEl.style.color = '';
  } else {
    statusEl.textContent = 'No country configured';
    statusEl.style.color = '#94a3b8';
  }

  const alertSummary = document.getElementById('alertSummary');
  const count = data.activeAlertCount ?? 0;
  if (count > 0) {
    alertSummary.style.display = 'flex';
    document.getElementById('alertBadge').textContent = count;
    document.getElementById('alertSummaryText').textContent =
      count === 1 ? 'active alert in your country' : 'active alerts in your country';
  } else {
    alertSummary.style.display = 'none';
  }

  const lastCheckEl = document.getElementById('lastCheckText');
  lastCheckEl.textContent = data.lastCheck
    ? `Last check: ${new Date(data.lastCheck).toLocaleTimeString()}`
    : 'Never checked';
}

loadStatus();
