# Genetics Map App

A React + TypeScript app for displaying genetic professionals worldwide.

## 🔒 Secure Data by Default
- Sensitive data is encrypted and only accessible with the correct secret key.
- The secret key is never stored in the repo or code.
- Data encryption is automated on build and commit.

## 🚀 Quick Start

```bash
npm install
npm run prepare # sets up Husky hooks
cp .env.example .env # and set your REACT_APP_SECRET_KEY
npm start
```

## 🛠️ Build & Deploy

```bash
npm run build
```
- This will automatically encrypt your data (if needed) and build the app.
- Deploy the `build` directory as a static site (e.g., GitHub Pages).

## 🧪 Development
- Place your `data.csv` in the project root (it is gitignored).
- The app will use the encrypted data blob and only show data to users with the correct key in the URL (`?key=YOURSECRET`).

## 🤖 Automation
- Husky pre-commit/pre-push hooks ensure data is always encrypted and code is linted/tested.
- No loose scripts—everything is automated.

## 📝 Environment Variables
- Copy `.env.example` to `.env` and set your `REACT_APP_SECRET_KEY`.

## 🧩 Tech Stack
- React
- TypeScript
- CryptoJS
- Husky

## 📦 Scripts
- `npm start` – Start dev server
- `npm run build` – Encrypt data and build app
- `npm run prepare` – Set up Husky hooks

---

MIT License
