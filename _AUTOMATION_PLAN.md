# Google Sheets Automation Plan

**Status:** Planning Phase  
**Target Start:** TBD (tomorrow or next week)  
**Last Updated:** October 31, 2025

---

## Executive Summary

Transform the manual Excel → Jupyter → Google Docs → App workflow into a fully automated pipeline where an administrator edits a production Google Sheet, and GitHub Actions automatically cleans, geocodes, and deploys data twice daily.

---

## Current System Architecture

### Data Flow (Manual Process)

```
1. Administrator provides Excel file (data_YYYY-MM-DD.xlsx)
   ↓
2. Manual: Run process_excel_data.ipynb locally
   ↓ Outputs: data_for_geocoding.csv
3. Manual: Upload to Google Sheets
   ↓
4. Manual: Run scripts/geocoding.gs in Google Apps Script
   ↓ Adds columns: Latitude, Longitude, City, Country
5. Manual: Download as data.csv
   ↓
6. Manual: Git commit triggers pre-commit hook
   ↓ Hook runs: node scripts/process-data.js
   ↓ Generates: src/secureDataBlob.ts (AES encrypted)
7. Manual: Git push triggers pre-push hook
   ↓ Hook runs: node scripts/sync-secrets.js
   ↓ Syncs REACT_APP_SECRET_KEY to GitHub Secrets
8. GitHub Actions (.github/workflows/deploy.yml)
   ↓ Generates SECRET_HASH from REACT_APP_SECRET_KEY
   ↓ Updates App.tsx with hash
   ↓ Builds React app
   ↓ Deploys to GitHub Pages
```

### Current Encryption Mechanism

**Purpose:** Protect genetic counselor data from unauthorized access

**Components:**

1. **Secret Key** (`REACT_APP_SECRET_KEY`)
   - Stored in `.secret_env` file (gitignored)
   - Automatically synced to GitHub Secrets via pre-push hook
   - Used for both encryption and authentication

2. **Data Encryption** (Build-time)
   - Script: `scripts/process-data.js`
   - Input: `data.csv` (gitignored, contains geocoded data)
   - Process:
     - Parse CSV with PapaParse
     - Filter rows with valid Latitude/Longitude
     - Clean data (handle NaN, anonymous contributors)
     - Encrypt JSON string with CryptoJS AES
   - Output: `src/secureDataBlob.ts` containing `ENCRYPTED_SPECIALISTS_DATA`
   - This encrypted blob is committed to git and deployed

3. **Authentication Hash** (Build-time)
   - Script: `hash-secret.js` + `scripts/update-app-hash.js`
   - Process:
     - SHA-256 hash of `REACT_APP_SECRET_KEY`
     - Injected into `src/App.tsx` as `SECRET_HASH` constant
   - Purpose: Verify URL key without exposing the secret

4. **Client-Side Flow** (Runtime)
   - User accesses: `https://boscacci.github.io/genetics-map-app?key=YOUR_SECRET_KEY`
   - App hashes the URL key parameter with SHA-256
   - Compares hash to hardcoded `SECRET_HASH` in `App.tsx`
   - If match → uses original key to decrypt `ENCRYPTED_SPECIALISTS_DATA`
   - If no match → shows error, no data loaded

**Security Model:**
- Encrypted data blob is public (in deployed app)
- Hash of secret is public (in deployed app)
- Original secret key is private (never in git or deployed code)
- Only users with correct key can decrypt data
- Key passed via URL parameter (could use localStorage for persistence)

### Current File Structure

```
genetics-map/
├── .secret_env                     # Secret key (gitignored)
├── data.csv                        # Geocoded data (gitignored)
├── process_excel_data.ipynb        # Data cleaning notebook
├── data_*.xlsx                    # Source Excel files (gitignored)
├── hash-secret.js                  # Generate SHA-256 hash
├── scripts/
│   ├── process-data.js            # Encrypt CSV → secureDataBlob.ts
│   ├── geocoding.gs               # Google Apps Script for geocoding
│   ├── setup-git-hooks.sh         # Install pre-commit/pre-push hooks
│   ├── sync-secrets.js            # Sync .secret_env to GitHub Secrets
│   ├── update-app-hash.js         # Inject hash into App.tsx
│   └── verify-sync.js             # Check system consistency
├── src/
│   ├── App.tsx                     # Main app (contains SECRET_HASH)
│   ├── secureDataBlob.ts          # Encrypted data (auto-generated)
│   ├── secureData.ts              # Decryption loader
│   └── utils.ts                    # CryptoJS decrypt + SHA-256 functions
└── .github/workflows/
    └── deploy.yml                  # Deploy to GitHub Pages
```

---

## Proposed Automated System

### New Data Flow (Automated)

```
1. Administrator edits Google Sheet directly (production data)
   ↓
2. GitHub Actions (scheduled: 6am & 6pm UTC)
   ↓ Downloads data via Google Sheets API
   ↓
3. Python: scripts/clean_data.py
   ↓ Applies all cleaning logic from Jupyter notebook
   ↓ Outputs: temp_cleaned.csv
   ↓
4. Python: scripts/geocode_data.py
   ↓ Geocodes via Google Geocoding API
   ↓ Outputs: data.csv
   ↓
5. Node: scripts/process-data.js (existing)
   ↓ Encrypts to src/secureDataBlob.ts
   ↓
6. Git: Auto-commit to backup branch (history preservation)
   ↓
7. Git: Auto-commit to main branch
   ↓
8. GitHub Actions: Build and deploy (existing workflow)
   ↓
9. Email notifications sent on success/failure
```

### Architecture Components

#### 1. Google Sheet Setup
- **Owner:** Project owner
- **Editor:** Administrator(s)
- **Structure:** Same columns as current Excel + geocoded columns
- **Access:** Service account email added as viewer
- **Sheet ID:** Stored in GitHub Secrets as `GOOGLE_SHEETS_ID`

#### 2. Data Cleaning Script (`scripts/clean_data.py`)

Port all logic from `process_excel_data.ipynb`:

**Inputs:**
- Google Sheet ID (from environment variable)
- Service account credentials (from GitHub Secret)

**Processing:**
- Connect to Google Sheets API via `gspread` library
- Download sheet data as DataFrame
- Apply column mapping (verbose names → snake_case)
- Clean emails (validate, take first valid)
- Clean websites (normalize URLs, handle edge cases)
- Clean phone numbers (remove invalid entries)
- Clean languages (normalize separators, detect interpreters)
- Add `uses_interpreters` boolean column
- Validate and report issues

**Output:**
- `temp_cleaned.csv` in workspace
- Validation report (logged + included in notifications)

**Key Functions:**
```python
def clean_email(val): ...
def clean_website_stats(val): ...
def clean_phone(val): ...
def uses_interpreters_func(val): ...
def clean_languages(val): ...
```

#### 3. Geocoding Script (`scripts/geocode_data.py`)

Port logic from `scripts/geocoding.gs`:

**Inputs:**
- `temp_cleaned.csv` from cleaning step
- Google Geocoding API key (from GitHub Secret)

**Processing:**
- Use `googlemaps` Python library
- Smart geocoding with multiple attempts:
  1. Full address (institution + work_address)
  2. Work address only
  3. Institution name only
- Extract: Latitude, Longitude, City, Country
- Skip rows already geocoded (incremental updates)
- Rate limiting (respect API quotas)
- City extraction fallback from address field
- Comprehensive logging

**Output:**
- `data.csv` with added columns: Latitude, Longitude, City, Country
- Geocoding report (success/failure counts)

**Key Functions:**
```python
def smart_geocode(geocoder, institution, address): ...
def extract_city_from_address(address): ...
def is_valid_city(city): ...
```

#### 4. GitHub Actions Workflow (`.github/workflows/scheduled-update.yml`)

**Triggers:**
- Schedule: `cron: "0 6,18 * * *"` (6am & 6pm UTC = 2am & 2pm EDT/1am & 1pm EST)
- Manual: `workflow_dispatch` for testing

**Jobs:**

```yaml
jobs:
  update-data:
    runs-on: ubuntu-latest
    steps:
      - Checkout repo
      - Set up Python 3.11
      - Install Python dependencies (requirements.txt)
      - Set up Node.js 20
      - Install Node dependencies (package.json)
      
      # Backup current data
      - Create backup branch: data-backup-YYYY-MM-DD-HHMMSS
      - Commit current data.csv and secureDataBlob.ts to backup branch
      
      # Run data pipeline
      - Run: python scripts/clean_data.py
      - Run: python scripts/geocode_data.py
      - Run: node scripts/process-data.js (encrypt)
      - Run: node hash-secret.js (hash secret)
      - Run: node scripts/update-app-hash.js (update App.tsx)
      
      # Check for changes
      - If no changes: Exit (send success email, no deployment)
      - If changes detected:
          - Commit data.csv and src/secureDataBlob.ts to main
          - Push to main
          - Trigger deploy workflow
      
      # Notifications
      - On success: Email summary (rows processed, changes made)
      - On failure: Email error details + logs
```

**Environment Variables:**
```yaml
env:
  GOOGLE_SHEETS_ID: ${{ secrets.GOOGLE_SHEETS_ID }}
  GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}
  GOOGLE_GEOCODING_API_KEY: ${{ secrets.GOOGLE_GEOCODING_API_KEY }}
  REACT_APP_SECRET_KEY: ${{ secrets.REACT_APP_SECRET_KEY }}
  NOTIFICATION_EMAIL_TO: ${{ secrets.NOTIFICATION_EMAIL_TO }}
```

#### 5. Email Notifications

**Implementation:** GitHub Actions built-in email action

**Notification Types:**

1. **Success Email**
   - Subject: `✅ Genetics Map: Data updated successfully`
   - Body: Timestamp, rows processed, rows geocoded, link to commit

2. **Failure Email**
   - Subject: `❌ Genetics Map: Data update failed`
   - Body: Timestamp, error message, link to GitHub Actions logs

---

## Implementation Steps

### Phase 0: Preparation (Before Starting)

- [ ] Fetch latest `geocoding.gs` from Google Apps Script editor
- [ ] Save to repo for reference
- [ ] Review current Google Sheet structure (column names, data format)

### Phase 1: Google Cloud Setup

- [ ] Create Google Cloud project: `genetics-map-automation`
- [ ] Enable APIs:
  - [ ] Google Sheets API
  - [ ] Google Geocoding API
- [ ] Create service account: `genetics-map-bot@...`
- [ ] Generate JSON key for service account
- [ ] Grant permissions:
  - [ ] Sheets API: Read access
  - [ ] Geocoding API: Usage enabled
- [ ] Share production Google Sheet with service account email (viewer access)
- [ ] Test API access locally

### Phase 2: Python Scripts Development

- [ ] Create `scripts/clean_data.py`
  - [ ] Port email cleaning logic
  - [ ] Port website cleaning logic
  - [ ] Port phone cleaning logic
  - [ ] Port language cleaning logic
  - [ ] Add Google Sheets API integration
  - [ ] Add validation reporting
  - [ ] Test with real data locally

- [ ] Create `scripts/geocode_data.py`
  - [ ] Port smart geocoding logic
  - [ ] Add Google Geocoding API integration
  - [ ] Implement rate limiting
  - [ ] Add incremental update logic (skip existing)
  - [ ] Add progress logging
  - [ ] Test with sample data locally

- [ ] Create `requirements.txt`
  ```txt
  pandas>=2.0.0
  googlemaps>=4.10.0
  gspread>=5.0.0
  google-auth>=2.0.0
  validators>=0.20.0
  openpyxl>=3.0.0  # For Excel support (if needed)
  ```

### Phase 3: GitHub Actions Configuration

- [ ] Create `.github/workflows/scheduled-update.yml`
  - [ ] Set up Python environment
  - [ ] Set up Node.js environment
  - [ ] Add backup branch creation logic
  - [ ] Add data pipeline steps
  - [ ] Add commit and push logic
  - [ ] Add change detection
  - [ ] Add email notification steps

- [ ] Add GitHub Secrets (Settings → Secrets and variables → Actions):
  - [ ] `GOOGLE_SHEETS_ID` - The Google Sheet ID
  - [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` - JSON key (entire file content)
  - [ ] `GOOGLE_GEOCODING_API_KEY` - API key for geocoding
  - [ ] `REACT_APP_SECRET_KEY` - Existing secret (already set)
  - [ ] `NOTIFICATION_EMAIL_TO` - Comma-separated list of administrator emails

### Phase 4: Testing

- [ ] Test cleaning script locally:
  ```bash
  python scripts/clean_data.py
  ```

- [ ] Test geocoding script locally:
  ```bash
  python scripts/geocode_data.py
  ```

- [ ] Test full pipeline locally:
  ```bash
  python scripts/clean_data.py && \
  python scripts/geocode_data.py && \
  npm run encrypt-data
  ```

- [ ] Test GitHub Actions workflow (manual trigger)
- [ ] Verify backup branch created
- [ ] Verify email notifications work
- [ ] Verify deployed site updates correctly

### Phase 5: Full Deployment

- [ ] Enable scheduled workflow (6am & 6pm UTC)
- [ ] Document new workflow for administrators
- [ ] Update README.md
- [ ] Monitor API usage closely (must stay under $5/month)

---

## Required GitHub Secrets

| Secret Name | Description | Where to Get It |
|------------|-------------|-----------------|
| `GOOGLE_SHEETS_ID` | Google Sheet ID from URL | `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit` |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Service account JSON key | Google Cloud Console → IAM & Admin → Service Accounts |
| `GOOGLE_GEOCODING_API_KEY` | Geocoding API key | Google Cloud Console → APIs & Services → Credentials |
| `REACT_APP_SECRET_KEY` | Encryption/auth secret | Existing `.secret_env` file (already synced) |
| `NOTIFICATION_EMAIL_TO` | Email recipients | Comma-separated administrator emails |

---

## Risk Management

### Potential Issues & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **API quota exceeded** | Geocoding fails | Monitor usage, implement exponential backoff, use caching |
| **Invalid data format** | Pipeline fails | Validation checks, detailed error emails, easy rollback via git |
| **Service account auth fails** | Cannot read Sheet | Alerts via email, fallback to manual process |
| **GitHub Actions down** | No updates | Manual workflow still available, system continues working |
| **Bad data deployed** | App shows errors | Backup branches allow quick rollback, validation before deploy |
| **Email notifications fail** | Unaware of failures | Always check GitHub Actions logs, consider Slack webhook |
| **Geocoding API costs** | Unexpected charges | Set billing alerts in Google Cloud, monitor usage dashboard |

### Rollback Procedures

**Scenario 1: Bad data deployed**
```bash
# Find last good commit
git log --oneline -- src/secureDataBlob.ts

# Revert to previous version
git revert <commit-hash>
git push origin main

# Or restore from backup branch
git checkout data-backup-YYYY-MM-DD-HHMMSS -- data.csv src/secureDataBlob.ts
git commit -m "Restore from backup"
git push origin main
```

**Scenario 2: Pipeline completely broken**
```bash
# Temporarily disable scheduled workflow
# Go to: .github/workflows/scheduled-update.yml
# Comment out the schedule trigger
# Fall back to manual process until fixed
```

**Scenario 3: Geocoding API issues**
```python
# Modify geocode_data.py to skip geocoding
# Just copy existing lat/lng from previous data
# Deploy without new geocoding until API restored
```

---

## Cost Estimates

### Google Cloud (Monthly)

- **Google Sheets API:** Free (within generous quotas)
- **Google Geocoding API:**
  - Cost: $5 per 1,000 requests
  - **CRITICAL:** Must implement incremental geocoding (skip rows with valid lat/lng)
  - With incremental updates: Only geocode new/changed addresses
  - Target: < 1,000 requests/month = **< $5/month**
  - **Strategy:** Cache existing geocoded data, only process new entries

### GitHub Actions (Monthly)
- Free tier: 2,000 minutes/month
- Estimated usage: ~10 min/run × 60 runs = 600 min/month
- Cost: **$0/month**

### Total Target Cost: **< $5/month**

**End of Document**

