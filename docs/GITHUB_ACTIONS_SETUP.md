# GitHub Actions Setup: Sync and Deploy

The **Sync and Deploy** workflow runs every 4 hours (cron) and on manual trigger. It promotes Working Copy → Production, backs up, exports, encrypts, builds, and deploys to GitHub Pages.

## Required Secrets

Set these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `REACT_APP_SECRET_KEY` | Encryption key from `.secret_env` (likely already set for deploy) |
| `GCP_SA_KEY` | **Base64-encoded** contents of `.gcp-credentials/genetics-map-sa-key.json` |
| `SHEET_ID` | Google Sheet ID from the sheet URL or `sheet-id.txt` |

## One-Time Setup

### 1. Base64-encode the GCP service account key

```bash
# From repo root
base64 -w0 .gcp-credentials/genetics-map-sa-key.json   # Linux: prints to stdout (copy output)
base64 -w0 .gcp-credentials/genetics-map-sa-key.json | pbcopy   # Mac: copies to clipboard

# If -w0 not supported:
base64 .gcp-credentials/genetics-map-sa-key.json | tr -d '\n'
```

### 2. Add GitHub secrets

1. Go to **GitHub repo → Settings → Secrets and variables → Actions**
2. **New repository secret** for each:

   - **Name:** `GCP_SA_KEY`  
     **Value:** Paste the base64 string from step 1

   - **Name:** `SHEET_ID`  
     **Value:** The Sheet ID (e.g. from `cat .gcp-credentials/sheet-id.txt`)

   - **Name:** `REACT_APP_SECRET_KEY`  
     **Value:** From `.secret_env` (e.g. `REACT_APP_SECRET_KEY=yourkey` — use just the value after `=`)

### 3. Ensure GitHub Pages is enabled

- **Settings → Pages** → Source: Deploy from a branch
- Branch: `gh-pages` / folder: `/ (root)`
- The workflow deploys to `gh-pages`; Pages serves from it.

### 4. Ensure the Sheet is shared

The service account `genetics-map-automation@...` must have **Editor** access to the Google Sheet.

## Manual Test

After adding secrets:

1. **Actions** tab → **Sync and Deploy**
2. **Run workflow** (dropdown) → **Run workflow**
3. Watch the run; it should promote, backup, export, encrypt, build, and deploy.

## Cron Schedule

Runs at **00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC** (every 4 hours).

Scheduled runs can be delayed during high load; `workflow_dispatch` runs immediately.
