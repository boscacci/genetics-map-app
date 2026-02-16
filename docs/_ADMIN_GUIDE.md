# Genetics Map: Administrator Guide

**For people who manage the provider list.**  
No technical experience needed. If you can use Google Sheets and click buttons on a website, you can do this.

---

## What This Is

The Genetics Map is a website that shows genetic counselors and specialists around the world. You manage the list of providers in a Google Sheet (like Excel, but online). When you're ready, you click a button and the live map updates with your changes.

**Two places you'll use:**
1. **A Google Sheet** — where you add, edit, and remove providers
2. **A publishing website** — where you click one button to update the live map

---

## The Two Tabs (Very Important)

Your Google Sheet has two tabs at the bottom. Think of them like two drafts:

| Tab | What it is |
|-----|------------|
| **Working Copy** | Your scratch pad. Edit here freely. Nothing you do here affects the live map. |
| **Production** | The final version. When you publish, *this* is what goes to the live map. |

**Rule:** Always edit in Working Copy. Never edit Production directly. A technical person runs a step that copies Working Copy → Production before you publish.

---

## How to Add or Edit a Provider

### Step 1: Open the Google Sheet

Open the Genetics Map spreadsheet (you'll get the link from your team). Make sure you're on the **Working Copy** tab.

### Step 2: Make Your Changes

- **Add someone new:** Click a cell in the first empty row and fill in the columns (name, email, phone, etc.).
- **Edit someone:** Click the cell you want to change and type the new information.
- **Remove someone:** Delete the entire row (right-click the row number → Delete row).

### Step 3: Check Your Work

Before moving on:
- No obvious typos?
- Email addresses look right?
- Phone numbers complete?

### Step 4: Tell Your Technical Contact to "Promote"

When you're done editing the Working Copy, tell your technical person: *"I've updated the Working Copy, please promote to Production."* They will run a quick step that copies your edits into the Production tab and cleans up names and phones.

### Step 5: Publish to the Live Map

After the promote step is done, you (or your technical contact) go to the publishing website and click the button to update the live map. The map usually updates within about 10 minutes.

---

## Phone Numbers with a Plus Sign (+)

Many international phone numbers start with a plus sign, like `+91 9502409815` or `+1-404-616-7537`.

**Google Sheets treats a plus sign as math.** If you type `+91 9502409815` alone, the spreadsheet will try to calculate something and show an error instead of your number.

**Fix:** Type an **apostrophe** first, then the number.

| Type this | You'll see |
|-----------|------------|
| `'+91 9502409815` | +91 9502409815 |
| `'+1-404-616-7537` | +1-404-616-7537 |
| `'+91-044-28296490` | +91-044-28296490 |

The apostrophe tells the sheet: *"This is text, not a formula."* The apostrophe won't show on the map—only the number will.

**Remember:** The system displays phone numbers exactly as you enter them. No formatting, no math. What you type is what appears.

---

## Publishing Your Changes (Clicking the Update Button)

When your technical person says the promote step is done, you can publish.

**What you need:**
- The web address for the publishing page (ask your team)
- A login for that site (usually the same as your GitHub account, if you have one)

**What you do:**
1. Open the publishing page in your web browser.
2. Log in if prompted.
3. Click the **Actions** tab (or similar—your team will point it out).
4. Find the workflow that says something like "Deploy" or "Update map."
5. Click **Run workflow** (or the green "Run" button).
6. Wait a few minutes. The page will show whether it succeeded or failed.
7. Check the live map in about 10 minutes to confirm your changes are there.

**If you don't have access:** Your technical contact can do this step for you. Just tell them: *"Promotion is done, please publish."*

---

## What Each Column Means

| Column | What to put |
|--------|-------------|
| name_first | First name |
| name_last | Last name |
| email | Email address |
| phone_work | Work phone (use apostrophe + number for international: `'+91 1234567890`) |
| work_website | Website URL (include https://) |
| work_institution | Hospital, clinic, or practice name |
| work_address | Full street address |
| language_spoken | Languages offered (e.g., English, Spanish) |
| uses_interpreters | TRUE or FALSE |
| specialties | Areas of focus |
| Latitude | *Usually blank—the system fills this in* |
| Longitude | *Usually blank—the system fills this in* |
| City | City name |
| Country | Country name |

---

## If Something Goes Wrong

- **Your edits aren't on the live map yet.** Make sure the promote step ran, then the publish step. Both need to happen.
- **A phone number shows as an error.** You may have typed it without the leading apostrophe. Edit the cell, add `'` before the number, and ask your technical person to promote again.
- **You're not sure if your change published.** Check the live map. If you don't see your update, ask your technical contact to run the publish step again or check for error messages.

---

## Quick Reference

1. Edit in **Working Copy** only.
2. Phone with + ? Type **`'`** first (e.g., `'+91 9502409815`).
3. When done, ask technical contact to **promote**.
4. After promote, **publish** (click the button on the publishing website).
5. Wait ~10 minutes and check the live map.

---

*Questions? Contact your technical team. This guide is for Genetics Map administrators.*
