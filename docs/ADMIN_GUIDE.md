# Genetics Map: Administrator Guide

**For Monisha and other administrators.**  
No technical experience needed. Edit the Google Sheet; the map normally refreshes automatically within four hours.

---

## Quick Start (3 Steps)

1. **Edit** the Google Sheet → Working Copy tab
2. **Wait** up to four hours for **Refresh Map Data**
3. **Publish sooner (optional)** → GitHub → Actions → **Refresh Map Data** → Run workflow

---

## What This Is

The Genetics Map shows genetic counselors and specialists around the world. You manage the list in a Google Sheet. When ready, you run a workflow and the live map updates.

**Two places you'll use:**
- **Google Sheet** — add, edit, remove providers
- **GitHub Actions** — run **Promote Only** (stage changes) or **Refresh Map Data** (publish Sheet edits now)

---

## Step 1: Edit the Google Sheet

1. Open the Genetics Map spreadsheet (link from your team)
2. Click the **Working Copy** tab
3. Add, edit, or delete rows
4. **Phone numbers with +** (e.g. +91 9502409815): the `phone_work` column is Plain text, so type the `+` number directly. If a copied sheet loses Plain text formatting, run `npm run format:phones`.

---

## Step 2: Promote Working Copy to Production

Promoting updates the Production tab (geocoded, cleaned) to match what would appear on the live app.

**Option A (in the Sheet):** Extensions → Apps Script → Run `promoteWorkingCopyToProduction`, or menu **Genetics Map** → **Promote to Production** — updates Production only; no geocoding.

**Option B (GitHub Actions — recommended):** Run **Promote Only** — Geocode, promote, clean, backup. Updates Production without publishing. Use to stage and review before going live.

**Option C:** Run **Refresh Map Data** (Step 3) — does the same as Promote Only, then encrypts, builds, and publishes the live data.

---

## Step 3: Publish to the Live Map

The map normally refreshes automatically every four hours. To publish sooner:

1. Go to **GitHub.com** → Genetics Map repository
2. Click the **Actions** tab
3. Select **Refresh Map Data** in the left sidebar
4. Click **Run workflow**
5. Wait 2–5 minutes. Green check = success; red X = failure
6. Map updates in ~5–10 minutes

| Workflow | What it does |
|----------|--------------|
| **Promote Only** | Geocode, promote, clean, backup. Updates Production tab; no website change. |
| **Refresh Map Data** | Same steps plus encrypt, build, deploy. Publishes Sheet edits using the application version already live. |
| **Sync and Deploy** | Releases tested application code after a production approval. Administrators do not need this for ordinary Sheet edits. |

---

## Column Reference

| Column | What to put |
|--------|-------------|
| name_first | First name |
| name_last | Last name |
| email | Email address |
| phone_work | Work phone as plain text (international `+` numbers are OK) |
| work_website | Website URL (include https://) |
| work_institution | Hospital, clinic, or practice name |
| hide_workinstitution | TRUE/FALSE value; TRUE hides only the institution name |
| job_title | Free-text job title or role when available. It is required in survey collection, but blank values do not block promotion or deploy. |
| work_address | Full street address |
| hide_institution_address | TRUE/FALSE value; TRUE hides institution and address details |
| language_spoken | Languages (e.g., English, Spanish) |
| uses_interpreters | TRUE or FALSE |
| specialties | Areas of focus |
| signed_up_for_newsletter | Working Copy only; TRUE/FALSE value; TRUE if they opted into news/updates/future research contact |
| Latitude, Longitude, City, Country | *Usually blank—the system fills these in* |

---

## If Something Fails

### Workflow (Promote Only or Refresh Map Data)

| Symptom | Fix |
|---------|-----|
| Red X on workflow | Click run → read error. Common: wrong SHEET_ID, sheet not shared with service account |
| Promote fails | Working Copy has data; sheet shared with genetics-map-automation@... as Editor |
| Clean fails | Run promote first (Production empty) |
| Encrypt/Build fails (Refresh Map Data only) | `REACT_APP_SECRET_KEY` missing in GitHub Secrets |
| Edits not on map after four hours | Check the latest Refresh Map Data run; an address may be missing or unable to geocode |

### Data issues

| Symptom | Fix |
|---------|-----|
| Phone shows #ERROR! in sheet | Run `npm run format:phones`, then re-enter the phone as plain text and re-promote |
| Placeholder names (nan, n/a) on map | Fix in Working Copy or leave blank; re-run Refresh Map Data |
| City shows "NY" not "New York City" | Re-run Refresh Map Data (pipeline now fixes this) |
| Country has "Mexico# comment" | Re-run Refresh Map Data (pipeline strips #) or edit cell |

### Rollback

If bad data was published: Restore Production from one of the 3 backup sheets in Drive (2d / 1w / 3w), or fix in Working Copy, promote, and run Sync and Deploy.

---

## Quick Reference

| Action | How |
|--------|-----|
| Edit | Working Copy tab only |
| Promote (stage) | Genetics Map → Promote, or GitHub → Actions → **Promote Only** → Run workflow |
| Publish Sheet edits now | GitHub → Actions → **Refresh Map Data** → Run workflow |
| Phone with + | Type `'` first |
