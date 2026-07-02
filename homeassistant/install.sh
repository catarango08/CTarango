#!/bin/bash
# Run this script on Brittany's MacBook Pro to install Home Assistant Core.
# Usage: bash install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
USERNAME=$(whoami)
PLIST_SRC="$SCRIPT_DIR/homeassistant.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.tarango.homeassistant.plist"

echo "==> Installing Home Assistant Core on $USERNAME's Mac"
echo "    Config dir: $SCRIPT_DIR/config"
echo ""

# ── 1. Homebrew ──────────────────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  echo "==> Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "==> Homebrew already installed"
fi

# ── 2. Python 3.12 ───────────────────────────────────────────────────────────
if ! command -v python3.12 &>/dev/null; then
  echo "==> Installing Python 3.12..."
  brew install python@3.12
else
  echo "==> Python 3.12 already installed"
fi

# ── 3. Virtual environment ───────────────────────────────────────────────────
if [ ! -d "$SCRIPT_DIR/venv" ]; then
  echo "==> Creating virtual environment..."
  python3.12 -m venv "$SCRIPT_DIR/venv"
else
  echo "==> Virtual environment already exists"
fi

# ── 4. Install Home Assistant ─────────────────────────────────────────────────
echo "==> Installing Home Assistant Core (this takes a few minutes)..."
"$SCRIPT_DIR/venv/bin/pip" install --upgrade pip wheel
"$SCRIPT_DIR/venv/bin/pip" install homeassistant

# ── 5. Create logs directory ─────────────────────────────────────────────────
mkdir -p "$SCRIPT_DIR/logs"

# ── 6. Install launchd plist with correct username ───────────────────────────
echo "==> Installing launchd service..."
sed "s|/Users/brittany|$HOME|g" "$PLIST_SRC" > "$PLIST_DST"

# Unload existing service if running
launchctl unload "$PLIST_DST" 2>/dev/null || true

# Load and start
launchctl load "$PLIST_DST"

echo ""
echo "✓ Home Assistant installed and started!"
echo ""
echo "  Open in browser: http://$(hostname).local:8123"
echo "  Logs:            $SCRIPT_DIR/logs/homeassistant.log"
echo ""
echo "  To follow logs:"
echo "  tail -f \"$SCRIPT_DIR/logs/homeassistant.log\""
