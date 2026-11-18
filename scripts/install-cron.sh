#!/usr/bin/env bash
# Install a daily 07:30 render job via cron.
# Usage: bash scripts/install-cron.sh [install|remove|show]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE="$(command -v node)"
LINE="30 7 * * * cd $ROOT && $NODE src/cli.js daily >> $ROOT/out/cron.log 2>&1"
MARK="# nobody-teaches-you-reels"

case "${1:-install}" in
  install)
    ( crontab -l 2>/dev/null | grep -v "$MARK"; echo "$LINE $MARK" ) | crontab -
    echo "Installed:"
    echo "  $LINE"
    echo
    echo "Note: this only runs if the machine is awake at 07:30."
    echo "Test it now with:  npm run daily"
    ;;
  remove)
    ( crontab -l 2>/dev/null | grep -v "$MARK" ) | crontab -
    echo "Removed daily render job."
    ;;
  show)
    crontab -l 2>/dev/null | grep "$MARK" || echo "No job installed."
    ;;
  *)
    echo "Usage: bash scripts/install-cron.sh [install|remove|show]"
    exit 1
    ;;
esac
