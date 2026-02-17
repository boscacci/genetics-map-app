# Genetics Map: Administrator Guide

**For Monisha and other administrators.**  
No technical experience needed. Edit the Google Sheet, then click one button to publish.

---

## Quick Start (3 Steps)

1. **Edit** the Google Sheet → Working Copy tab
2. **Promote** (Sheet macro: Genetics Map → Promote to Production, or trigger Sync and Deploy)
3. **Publish** → GitHub → Actions → Sync and Deploy → Run workflow

---

## What This Is

The Genetics Map shows genetic counselors and specialists around the world. You manage the list in a Google Sheet. When ready, you run a workflow and the live map updates.

**Two places you'll use:**
- **Google Sheet** — add, edit, remove providers
- **GitHub Actions** — click Run workflow to publish

---

## Step 1: Edit the Google Sheet

1. Open the Genetics Map spreadsheet (link from your team)
2. Click the **Working Copy** tab
3. Add, edit, or delete rows
4. **Phone numbers with +** (e.g. +91 9502409815): Type an apostrophe first: `'+91 9502409815` — otherwise Sheets treats it as a formula and shows an error

---

## Step 2: Promote Working Copy to Production

**Option A (in the Sheet):** Extensions → Apps Script → Run `promoteWorkingCopyToProduction`, or menu **Genetics Map** → **Promote to Production**

**Option B:** Run Sync and Deploy (Step 3) — it promotes automatically.

---

## Step 3: Publish to the Live Map

1. Go to **GitHub.com** → Genetics Map repository
2. Click the **Actions** tab
3. Select **Sync and Deploy** in the left sidebar
4. Click **Run workflow**
5. Wait 2–5 minutes. Green check = success; red X = failure
6. Map updates in ~5–10 minutes

---

## Column Reference

| Column | What to put |
|--------|-------------|
| name_first | First name |
| name_last | Last name |
| email | Email address |
| phone_work | Work phone (use `'+91 1234567890` for international) |
| work_website | Website URL (include https://) |
| work_institution | Hospital, clinic, or practice name |
| work_address | Full street address |
| language_spoken | Languages (e.g., English, Spanish) |
| uses_interpreters | TRUE or FALSE |
| specialties | Areas of focus |
| Latitude, Longitude, City, Country | *Usually blank—the system fills these in* |

---

## If Something Fails

### Workflow (Sync and Deploy)

| Symptom | Fix |
|---------|-----|
| Red X on workflow | Click run → read error. Common: wrong SHEET_ID, sheet not shared with service account |
| Promote fails | Working Copy has data; sheet shared with genetics-map-automation@... as Editor |
| Clean fails | Run promote first (Production empty) |
| Encrypt/Build fails | `REACT_APP_SECRET_KEY` missing in GitHub Secrets |
| Edits not on map | Promote ran? Publish ran? Both needed |

### Data issues

| Symptom | Fix |
|---------|-----|
| Phone shows #ERROR! in sheet | Add `'` before number: `'+91 9502409815`. Re-promote |
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
| Promote | Genetics Map → Promote, or run Sync and Deploy |
| Publish | GitHub → Actions → Sync and Deploy → Run workflow |
| Phone with + | Type `'` first |
