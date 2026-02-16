# Genetics Map: Migration Plan

**Last Updated:** February 16, 2026  
**Status:** Phase 1 complete. Google Sheet is the primary source of truth. Working Copy → Production promotion every 4 hours via GitHub Actions.

---

## Scope of Work (Contract)

**This section contains the contractual language against which delivery and payment will be evaluated.**

Consultant will migrate the Genetics Map provider data management system from manual Excel-based workflows to an automated Google Sheets pipeline with GitHub Actions deployment.

**Final Deliverables:**
- Functional automated data pipeline with geocoding integration
- GitHub Actions deployment system (manual trigger + optional scheduling)
- Automated backup and email notification systems
- Administrator operations guide with screenshots and quick-reference materials
- Troubleshooting documentation and error recovery procedures
- System architecture documentation
- Cost transfer documentation (Squarespace, domain, GCP billing)
- Two-week post-launch monitoring with email support

**Additional Work (Bugs / Notes):**
- People named "nan nan" showing up on map
- Name search should not expose full list of names (don't auto-fill names)
- Fix NYC geocoding: "New York City" is rendering as "NY"
- Country field has weird value: "Mexico# Test comment"
- UI: scrolling inside vs. outside map area; possible to lose navigation bar
- Make it obvious how to get to the map after account creation

---

## What We're Building

A system where a **non-technical administrator can safely update provider data** in a Google Sheet, and the website automatically updates twice daily—no manual downloads, spreadsheet processing, or code changes required.

---

## Current vs. Future State

### Today (Manual Process - Takes ~2 Hours)

1. Someone sends an Excel file with provider updates
2. Developer runs data cleaning scripts locally
3. Developer uploads to Google Sheets
4. Developer runs geocoding script (adds map coordinates)
5. Developer downloads results
6. Developer commits to GitHub
7. Website rebuilds and deploys

**Problems:**
- Requires a developer for every update
- Prone to mistakes
- Slow turnaround (hours to days)

### Future (Automated - Takes Minutes)

1. Administrator edits Google Sheet directly
2. System automatically cleans, validates, and geocodes data (twice daily)
3. Website updates automatically

**Benefits:**
- No developer needed for routine updates
- Faster updates (minutes, not days)
- Built-in validation catches errors before they go live
- Change history preserved automatically

---

## Key Requirements (February 2026)

### 1. Multi-Language Support
- **Squarespace (wrapper) site:** Can use a paid service to make the wrapper more multi-lingual.
- **Node map app:** Will support multiple languages for interface elements (filters, buttons, error messages).
- **Survey data / map datapoints:** No translation. Provider names, credentials, and other survey-derived content are displayed in the language they were entered—we do not translate this data.

### 2. Safe Data Entry
Non-technical staff must be able to add providers without breaking the site:
- Use a **two-tab workflow**: "Working Copy" for edits, "Production" for live data
- Admins edit freely in Working Copy, then copy to Production when ready to publish
- Manual deployment trigger via GitHub Actions (with training for Monisha)
- Required fields enforced with sheet validation

### 3. Credential Documents
Need a place to store proof of each provider's credentials:
- Create a private Google Drive folder for credential PDFs
- Add a column in the sheet linking to each provider's credential document
- These links are admin-only (never shown publicly)

### 4. Cost Ownership Transfer
Transfer all operational costs to **Einstein Montefiore Hospital** or **Monisha**:
- Squarespace hosting
- Domain names
- Any API costs
- Document who owns logins, payment methods, and receives invoices

---

## Migration Plan: 6 Simple Phases

### Phase 1: Set Up Google Cloud (Week 1) ✅ COMPLETE
**What:** Connect our system to Google's services  
**Tasks:**
- Create Google Cloud account ✅
- Enable Google Sheets API (for reading data) ✅
- Enable Geocoding API (for adding map coordinates) ✅
- Set up two-tab structure: "Working Copy" and "Production" ✅
- Share the production Google Sheet with our automation account ✅

**Primary source of truth:** The Google Sheet is now the sole source. The `data/` folder seed data is deprecated—used only for one-time backfill. All live data flows: Working Copy (admin edits) → Production (via promote) → website (via scheduled sync).

### Phase 2: Automate Data Processing (Weeks 2-3)
**What:** Replace manual Excel/Jupyter workflow with automated scripts  
**Tasks:**
- Build script to read from Production tab in Google Sheets
- Build script to clean and validate data automatically
- Build script to geocode new addresses automatically
- Add sheet validation rules (required fields, email/URL formats)
- Test with real data locally

### Phase 3: Set Up GitHub Actions (Week 4)
**What:** Make the system run automatically AND on-demand  
**Tasks:**
- Configure GitHub Actions for manual triggering (button in GitHub)
- Configure scheduled runs (6am and 6pm UTC, optional)
- Set up email notifications for success/failure
- Create automatic backups before each update
- Test the full automated pipeline

### Phase 4: Train Monisha on Manual Deployment (Week 5)
**What:** Enable Monisha to trigger deployments herself  
**Tasks:**
- Walk through GitHub login and navigation
- Show how to trigger manual deployment (click "Run workflow")
- Explain how to read deployment status and error messages
- Practice with test data
- Create quick-reference guide with screenshots

### Phase 5: Testing & Refinement (Week 6)
**What:** Make sure everything works reliably  
**Tasks:**
- Test two-tab workflow (Working Copy → Production)
- Test various scenarios (new providers, edits, deletions)
- Verify error handling (what happens if bad data is submitted)
- Confirm email notifications work
- Document common troubleshooting scenarios

### Phase 6: Go Live & Cost Transfer (Weeks 7-8)
**What:** Switch to the new system and finalize handoff  
**Tasks:**
- Enable scheduled automation (if desired) or keep manual-only
- Create comprehensive admin guide
- Monitor closely for first 2 weeks
- Transfer Squarespace and domain costs to Einstein/Monisha
- Final handoff meeting with Monisha

**Total Timeline:** 8 weeks

---

## How Administrators Will Use the New System

### The Two-Tab Workflow

**Working Copy Tab** = Your drafts and edits (safe zone)  
**Production Tab** = Live data that gets deployed to the website

### Adding or Editing Providers

1. Open the Google Sheet
2. Go to the **Working Copy** tab
3. Make your changes:
   - Add new rows for new providers
   - Edit existing rows to update information
   - Delete rows if needed
4. Review your changes (check for typos, required fields)
5. **Promote to Production:**
   - **Option A (Sheet Macro):** Extensions → Apps Script → Run `promoteWorkingCopyToProduction`, or use the custom menu "Genetics Map" → "Promote to Production"
   - **Option B (Local):** Run `npm run promote` (requires Node + GCP credentials)
6. **Website update:** Happens automatically every 4 hours via GitHub Actions. Manual trigger: GitHub → Actions → "Sync and Deploy" → Run workflow.
7. Website updates within ~10 minutes after the sync runs

### Data Entry Tips

**Phone numbers with a plus sign (+)**  
Google Sheets treats `+` at the start of a cell as a formula. To enter a phone like `+91 9502409815` or `+1-404-616-7537` and have it display exactly as typed:

1. Type an **apostrophe first**: `'`
2. Then type the full number: `+91 9502409815`
3. The cell will show `+91 9502409815`; the apostrophe keeps it as plain text (no math)

**Example:** For `+91-044-28296490`, type: `'+91-044-28296490`

The system stores and displays all phone values as plain text—no calculations, no formatting changes. What you enter is what appears on the map.

### Why This Is Safe

- Changes in Working Copy don't affect the live site
- You can make multiple edits and review before publishing
- If something breaks, just restore Production from a backup
- Sheet validation prevents common errors (bad emails, missing required fields)

### What Happens If Something Goes Wrong

- System sends email notification with error details
- Bad data is NOT deployed (fails safely)
- Previous good version stays live
- Developer can restore from automatic backup if needed

---

## Cost Summary

### Current Costs
- **GitHub Pages** (App Hosting): **Free**
- **GitHub Actions** (Automated Deployment): **Free** (under 2,000 min/month)
- **Google Sheets + Google AppScript** (Manual Geocoding): **Free, but manual**

### New Costs (After Automation)
- **Google Cloud Platform** (Geocoding API): **~$0.05-$0.25/month** (only ~10-20 new addresses/month at $0.005 per lookup)
- **Google Sheets API** (Data Reading): **Free**
- **GitHub Actions** (Automated Deployment): **Free** (under 2,000 min/month)
- Everything else: **Free**

### Costs to Transfer to Einstein/Monisha
- **Squarespace** (Web Presence/Domain): Need to identify current plan/cost
- **Domain Registration** (if separate): If applicable
- **Google Cloud Platform** (Geocoding API): ~$0.05-$0.25/month
- Any email services (if applicable)

**Total ongoing cost: Less than $1/month** (mostly negligible GCP charges)

---

## Security & Privacy Notes

- Provider data is **encrypted** before deploying to the website
- Only people with the secret key can view the data
- Credential documents stored in **private Google Drive** (admin access only)
- System validates data before publishing (catches email/URL errors)
- Automatic backups before every update
- Easy rollback if bad data is published

---

## Automated Sync (Every 4 Hours)

GitHub Action `sync-and-deploy` runs every 4 hours (0:00, 4:00, 8:00, 12:00, 16:00, 20:00 UTC):

1. Promote Working Copy → Production (in the sheet, with name/phone cleanup)
2. **Backup Production** to time-staggered safeguard sheets (max 3 copies)
3. Export Production tab to CSV
4. Encrypt and build the React app
5. Deploy to GitHub Pages

## Backup Safeguard (Max 3 Copies)

The sync workflow keeps **at most 3 backup sheets** with data-types preserved:

| Sheet | Updated every | Represents |
|-------|---------------|------------|
| **Backup (2 days ago)** | 2 days | Production state from ~2 days ago |
| **Backup (1 week ago)** | 7 days | Production state from ~1 week ago |
| **Backup (3 weeks ago)** | 21 days | Production state from ~3 weeks ago |

- Uses `valueInputOption: RAW` to preserve numbers, strings, etc.
- Metadata stored in hidden sheet `_Backup_Metadata`
- Any extra backup sheets are removed automatically
- Run manually: `npm run backup:production`

**Required GitHub secrets:** See `docs/GITHUB_ACTIONS_SETUP.md` for full setup.
- `GCP_SA_KEY` – **Base64-encoded** JSON of `genetics-map-sa-key.json` (`base64 -w0 genetics-map-sa-key.json`)
- `SHEET_ID` – Google Sheet ID (from sheet URL or `sheet-id.txt`)
- `REACT_APP_SECRET_KEY` – Encryption key from `.secret_env`

## Sheet Macro: Promote to Production

A Google Apps Script macro lives in the sheet (Extensions → Apps Script). It performs the same promote logic as `npm run promote`:
- Copies Working Copy → Production
- Applies name cleanup (title-case, Dr. normalization, nan → Anonymous Contributor)
- Fixes corrupted phone cells using Production as fallback
- Sanitizes formula-dangerous characters (=, +, -, @)

**To add the macro:** Copy `scripts/promote.gs` into the sheet's Apps Script editor, save, and run `onOpen` once to install the custom menu.

---

## Next Steps

1. **Phase 2:** Geocoding automation (run `geocode_working_copy.py` on new rows)
2. **Action:** Identify all services to transfer to Einstein/Monisha
3. **Schedule:** Plan Monisha's training session (Week 5)

**End of Document**
