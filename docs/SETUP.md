# Genetics Map: Setup Guide

Technical setup for GCP, the Google Sheet, and GitHub Actions. Phase 1 is complete when Google Sheets API and Geocoding API are enabled, the sheet has the two-tab structure, and the Sync and Deploy workflow runs successfully.

---

## Part 1: Google Cloud & Sheet

### Completed (typically)

- Google Sheets API, Geocoding API, Drive API enabled
- Service account: `genetics-map-automation@global-genetics-directory.iam.gserviceaccount.com`
- Service account key: `.gcp-credentials/genetics-map-sa-key.json`
- Geocoding API key: `.gcp-credentials/geocoding-api-key.txt`

### Manual step: Create the Google Sheet

The service account cannot create new files (GCP default). Create the sheet with your Google account:

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new blank spreadsheet**.
2. **Share** the spreadsheet with `genetics-map-automation@global-genetics-directory.iam.gserviceaccount.com` as **Editor**.
3. Copy the **Sheet ID** from the URL: `https://docs.google.com/spreadsheets/d/1abc...xyz/edit` → the `1abc...xyz` part.
4. Add Working Copy and Production tabs: run `node scripts/configure-existing-sheet.js SHEET_ID` locally once.
5. Add `SHEET_ID` to GitHub Secrets (Settings → Secrets → Actions).

**Alternative:** If the service account can't create files, use `gcloud auth application-default login` and `USE_ADC=1 node scripts/setup-google-sheet.js`.

---

## Part 2: GitHub Actions

Two workflows use the Sheet as the sole source (no local Node or CSV):

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **Promote Only** | Manual only | Geocode, promote, clean, backup. Updates Production tab without deploying. |
| **Sync and Deploy** | Every 4h (cron) + manual | Same steps plus encrypt, build, deploy. Publishes to live site. |

### Required secrets

Set these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `GCP_SA_KEY` | **Base64-encoded** contents of `.gcp-credentials/genetics-map-sa-key.json` |
| `SHEET_ID` | Google Sheet ID from the sheet URL |
| `REACT_APP_SECRET_KEY` | From `.secret_env` (value after `=`) |
| `BACKUP_FOLDER_ID` | Optional. Drive folder ID for backups. Share folder with service account as Editor. |
| `GEOCODING_API_KEY` | Optional. When set, geocodes new rows before promote |
| `SMTP_USERNAME` | Optional. Gmail for failure notifications |
| `SMTP_PASSWORD` | Optional. Gmail App Password (requires 2FA) |

### Base64-encode the GCP key

```bash
base64 -w0 .gcp-credentials/genetics-map-sa-key.json   # Linux
base64 -w0 .gcp-credentials/genetics-map-sa-key.json | pbcopy   # Mac (copies to clipboard)
```

### GitHub Pages

- **Settings → Pages** → Source: Deploy from branch → Branch: `gh-pages` / folder: `/ (root)`
- The workflow deploys to `gh-pages`; Pages serves from it.

### Backup folder (optional)

Create 3 blank sheets in a Drive folder: "Genetics Map Backup (2 days ago)", "Genetics Map Backup (1 week ago)", "Genetics Map Backup (3 weeks ago)". Share the folder with the service account as Editor. Put the folder ID in `BACKUP_FOLDER_ID`.

---

## Verify

1. **Actions** → **Promote Only** or **Sync and Deploy** → **Run workflow**
2. Watch the run. Common failures:

   | Failing step | Likely cause |
   |--------------|--------------|
   | Create GCP credentials | `GCP_SA_KEY` missing or invalid base64 |
   | Promote Working Copy → Production | `SHEET_ID` wrong, or sheet not shared with service account |
   | Clean and validate | Empty Production tab, or Sheets API permission |
   | Encrypt data | `REACT_APP_SECRET_KEY` missing |
   | Deploy | `Settings → Pages` not set to `gh-pages` branch |

3. On success: site updates at your GitHub Pages URL.

---

## Schedule

**Sync and Deploy** runs at 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC (every 4 hours). Both workflows support manual trigger via `workflow_dispatch`.
