# Phase 1 Setup Guide

Phase 1 is complete when both **Google Sheets API** and **Geocoding API** are enabled, tested, and the sheet has the two-tab structure.

## Completed (Automated)

- ✅ Google Sheets API enabled
- ✅ Geocoding API enabled  
- ✅ Drive API enabled
- ✅ Service account: `genetics-map-automation@global-genetics-directory.iam.gserviceaccount.com`
- ✅ Service account key: `.gcp-credentials/genetics-map-sa-key.json`
- ✅ Geocoding API key: `.gcp-credentials/geocoding-api-key.txt`
- ✅ **Geocoding API tested and working**

## Manual Step: Create the Google Sheet

The service account cannot create new files (GCP default). Create the sheet with your Google account:

### Option A: Create and configure (recommended)

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new blank spreadsheet**.
2. **Share** the spreadsheet:
   - Click **Share**
   - Add: `genetics-map-automation@global-genetics-directory.iam.gserviceaccount.com`
   - Role: **Editor**
   - Uncheck "Notify people"
3. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/1abc...xyz/edit
                                        ^^^^^^^^^^^
   ```
4. Run:
   ```bash
   node scripts/configure-existing-sheet.js YOUR_SHEET_ID
   ```
5. Test:
   ```bash
   node scripts/test-gcp-apis.js
   ```

### Option B: Use your own credentials to create

If you prefer the script to create the sheet for you:

1. Run (browser will open for auth):
   ```bash
   gcloud auth application-default login --scopes=https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive
   ```
2. Run:
   ```bash
   USE_ADC=1 node scripts/setup-google-sheet.js
   ```
3. Test:
   ```bash
   node scripts/test-gcp-apis.js
   ```

## Verify

```bash
node scripts/test-gcp-apis.js
```

Expected output:
```
1. Geocoding API:
   ✅ OK - Sample address geocoded to 37.42 -122.08

2. Google Sheets API:
   ✅ OK - Read N rows from Production tab
```

## Next: Phase 2

Once both tests pass, proceed to Phase 2: Automate Data Processing.
