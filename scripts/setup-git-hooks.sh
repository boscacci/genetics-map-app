#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT_DIR/.git/hooks"
PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"

mkdir -p "$HOOKS_DIR"

cat > "$PRE_PUSH_HOOK" <<'HOOK'
#!/bin/sh

echo "[pre-push] Syncing GitHub secrets from .secret_env and data.csv via scripts/sync-secrets.js"

node scripts/sync-secrets.js
status=$?
if [ $status -ne 0 ]; then
  echo "[pre-push] Secret sync failed (exit $status); aborting push."
  exit $status
fi

exit 0
HOOK

chmod +x "$PRE_PUSH_HOOK"

echo "Installed pre-push hook at $PRE_PUSH_HOOK"


