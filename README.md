# Genetics Map App

A React + TypeScript app for displaying genetic professionals worldwide.

## 🌍 What is this?
This app provides an interactive map and directory of genetic professionals from around the world. You can browse, search, and explore the data in a user-friendly interface.

## ✨ Features
- Interactive world map of genetic professionals
- Search and filter by region or specialty
- Simple CSV-based data import
- Clean, approachable interface

## 🧩 Tech Stack
- React
- TypeScript
- PapaParse (for CSV parsing)

## 🔐 Secret Management

This project uses a secure approach to manage the secret passphrase:

### Automatic Secret Updates
When you push changes to the main branch, the GitHub Action workflow automatically updates the `REACT_APP_SECRET_KEY` secret in your GitHub repository from the local `.secret_env` file.

### Manual Secret Updates
You can also manually update the GitHub secret by running:
```bash
npm run update-secret
```

This requires:
1. GitHub CLI (`gh`) to be installed
2. Authentication with GitHub CLI (`gh auth login`)

### Local Development
The `.secret_env` file contains your local secret and is ignored by git for security. The secret is used to encrypt/decrypt data and generate authentication hashes.

---

This project was created in Cursor as a way to learn React and TypeScript from scratch. While it may not be perfect, it represents a genuine effort to make genetic professional data more accessible and visually engaging.