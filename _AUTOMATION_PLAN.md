# Genetics Map: Migration Plan

**Last Updated:** February 3, 2026  
**Status:** Planning Phase

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
The website interface should support multiple languages (filters, buttons, error messages).

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

### Phase 1: Set Up Google Cloud (Week 1)
**What:** Connect our system to Google's services  
**Tasks:**
- Create Google Cloud account
- Enable Google Sheets API (for reading data)
- Enable Geocoding API (for adding map coordinates)
- Set up two-tab structure: "Working Copy" and "Production"
- Share the production Google Sheet with our automation account

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
5. When satisfied, **select all rows in Working Copy**
6. Copy and paste to **Production** tab (overwrite the old data)
7. Trigger deployment:
   - **Option A (Manual):** Go to GitHub Actions → Click "Run workflow"
   - **Option B (Scheduled):** Wait for next scheduled run (6am or 6pm UTC)
8. Website updates within ~10 minutes

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

## Next Steps

1. **Decision:** Approve this 8-week migration plan
2. **Action:** Set up Google Cloud account (Week 1)
3. **Action:** Identify all services to transfer to Einstein/Monisha
4. **Action:** Set up two-tab structure in Google Sheet (Working Copy + Production)
5. **Schedule:** Plan Monisha's training session (Week 5)

**End of Document**
