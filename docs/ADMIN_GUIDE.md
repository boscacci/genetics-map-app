# Genetics Map: Administrator Guide

**For Monisha and other administrators.**  
No technical experience needed. Edit the Google Sheet, then click one button to publish.

---

## Quick Start (3 Steps)

1. **Edit** the Google Sheet → Working Copy tab
2. **Promote** (Sheet macro, **Promote Only** workflow, or **Sync and Deploy**)
3. **Publish** → GitHub → Actions → **Sync and Deploy** → Run workflow (when ready to go live)

---

## What This Is

The Genetics Map shows genetic counselors and specialists around the world. You manage the list in a Google Sheet. When ready, you run a workflow and the live map updates.

**Two places you'll use:**
- **Google Sheet** — add, edit, remove providers
- **GitHub Actions** — run **Promote Only** (stage changes) or **Sync and Deploy** (publish to live site)

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

**Option C:** Run **Sync and Deploy** (Step 3) — does the same as Promote Only, then encrypts, builds, and deploys to the live site.

---

## Step 3: Publish to the Live Map

When Production looks good and you want to go live:

1. Go to **GitHub.com** → Genetics Map repository
2. Click the **Actions** tab
3. Select **Sync and Deploy** in the left sidebar
4. Click **Run workflow**
5. Wait 2–5 minutes. Green check = success; red X = failure
6. Map updates in ~5–10 minutes

| Workflow | What it does |
|----------|--------------|
| **Promote Only** | Geocode, promote, clean, backup. Updates Production tab; no website change. |
| **Sync and Deploy** | Same steps plus encrypt, build, deploy. Publishes to live site. |

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
| hide_workinstitution | Boolean checkbox/TRUE hides only the institution name |
| job_title | Free-text job title or role when available. It is required in survey collection, but blank values do not block promotion or deploy. |
| work_address | Full street address |
| hide_institution_address | TRUE hides institution and address details |
| language_spoken | Languages (e.g., English, Spanish) |
| uses_interpreters | TRUE or FALSE |
| specialties | Areas of focus |
| signed_up_for_newsletter | Working Copy only; boolean checkbox/TRUE if they opted into news/updates/future research contact |
| Latitude, Longitude, City, Country | *Usually blank—the system fills these in* |

---

## If Something Fails

### Workflow (Promote Only or Sync and Deploy)

| Symptom | Fix |
|---------|-----|
| Red X on workflow | Click run → read error. Common: wrong SHEET_ID, sheet not shared with service account |
| Promote fails | Working Copy has data; sheet shared with genetics-map-automation@... as Editor |
| Clean fails | Run promote first (Production empty) |
| Encrypt/Build fails (Sync and Deploy only) | `REACT_APP_SECRET_KEY` missing in GitHub Secrets |
| Edits not on map | Promote ran? Publish (Sync and Deploy) ran? Both needed |

### Data issues

| Symptom | Fix |
|---------|-----|
| Phone shows #ERROR! in sheet | Run `npm run format:phones`, then re-enter the phone as plain text and re-promote |
| Placeholder names (nan, n/a) on map | Fix in Working Copy or leave blank; re-run Sync and Deploy |
| City shows "NY" not "New York City" | Re-run Sync and Deploy (pipeline now fixes this) |
| Country has "Mexico# comment" | Re-run Sync and Deploy (pipeline strips #) or edit cell |

### Rollback

If bad data was published: Restore Production from one of the 3 backup sheets in Drive (2d / 1w / 3w), or fix in Working Copy, promote, and run Sync and Deploy.

---

## Quick Reference

| Action | How |
|--------|-----|
| Edit | Working Copy tab only |
| Promote (stage) | Genetics Map → Promote, or GitHub → Actions → **Promote Only** → Run workflow |
| Publish (go live) | GitHub → Actions → **Sync and Deploy** → Run workflow |
| Phone with + | Type `'` first |
