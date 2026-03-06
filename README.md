# Weather Alert Monitor

A browser extension that polls [MeteoAlarm](https://www.meteoalarm.org/) every 15 minutes and sends browser notifications for active weather alerts in your country.

**Coverage:** 39 European countries via the MeteoAlarm network.
**Cost:** Free — no API key required.

---

## Installation

### 1. Download the extension

Clone or download this repository, then navigate to the `weather-alert-extension/` folder.

### 2. Load in your browser

**Firefox:**

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select any file inside the `weather-alert-extension-firefox/` folder (e.g. `manifest.json`)
4. The extension icon will appear in your toolbar

> **Note:** Temporary add-ons in Firefox are removed when the browser is closed. For a persistent install, the extension must be signed via [addons.mozilla.org](https://addons.mozilla.org/developers/) or you can enable unsigned extensions in Firefox Developer Edition / Nightly via `about:config` → `xpinstall.signatures.required = false`.

### 3. Configure your location

1. Click the extension icon to open the popup
2. Either:
   - Click **⊙ Detect** to auto-detect your country from your browser location, or
   - Select your country manually from the dropdown
3. Click **Save & Check Now**

The extension will immediately check for active alerts and then re-check every 15 minutes. You'll receive a browser notification for each new alert.

---

## Supported Countries

Austria, Belgium, Bosnia Herzegovina, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland, Ireland, Israel, Italy, Kosovo, Latvia, Lithuania, Luxembourg, Malta, Moldova, Montenegro, Netherlands, North Macedonia, Norway, Poland, Portugal, Romania, Serbia, Slovakia, Slovenia, Spain, Sweden, Switzerland, Turkey, United Kingdom.

---

## Permissions Used

| Permission | Reason |
|---|---|
| `alarms` | Schedule the 15-minute polling interval |
| `notifications` | Show browser notifications for new alerts |
| `storage` | Save your country and seen alert IDs locally |
| `geolocation` | Auto-detect your country (only when you click Detect) |

---

## Data Source

Weather alerts are sourced from **MeteoAlarm** (`feeds.meteoalarm.org`), the official European severe weather alert service operated by EUMETNET. Country auto-detection uses **Nominatim** (OpenStreetMap) for reverse geocoding.
