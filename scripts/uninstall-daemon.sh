#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DAEMON_NAME="lumo-daemon"
PLIST_NAME="com.lumo.daemon.plist"
INSTALL_DIR="$HOME/.lumo/bin"
LAUNCHAGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/com.lumo.daemon"

echo -e "${YELLOW}=== Lumo Daemon Uninstallation ===${NC}"
echo ""

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo -e "${RED}Error: This script only works on macOS${NC}"
    exit 1
fi

# Step 1: Unload service
if [ -f "$LAUNCHAGENTS_DIR/$PLIST_NAME" ]; then
    echo -e "${YELLOW}[1/3]${NC} Stopping daemon..."
    launchctl unload "$LAUNCHAGENTS_DIR/$PLIST_NAME" 2>/dev/null || true
    sleep 1

    # Verify it's stopped
    if launchctl list | grep -q com.lumo.daemon 2>/dev/null; then
        echo -e "${RED}Warning: Daemon may still be running${NC}"
    else
        echo -e "${GREEN}✓${NC} Daemon stopped"
    fi

    # Remove plist
    rm "$LAUNCHAGENTS_DIR/$PLIST_NAME"
    echo -e "${GREEN}✓${NC} Plist removed"
else
    echo -e "${YELLOW}[1/3]${NC} Plist not found (skipping)"
fi
echo ""

# Step 2: Remove binary
if [ -f "$INSTALL_DIR/$DAEMON_NAME" ]; then
    echo -e "${YELLOW}[2/3]${NC} Removing binary..."
    rm "$INSTALL_DIR/$DAEMON_NAME"
    echo -e "${GREEN}✓${NC} Binary removed"
else
    echo -e "${YELLOW}[2/3]${NC} Binary not found (skipping)"
fi
echo ""

# Step 3: Ask about logs
echo -e "${YELLOW}[3/3]${NC} Logs and data:"
if [ -d "$LOG_DIR" ]; then
    echo "Log directory exists: $LOG_DIR"
    read -p "Remove logs? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$LOG_DIR"
        echo -e "${GREEN}✓${NC} Logs removed"
    else
        echo -e "${YELLOW}ℹ${NC} Logs preserved at: $LOG_DIR"
    fi
else
    echo -e "${YELLOW}ℹ${NC} No logs found"
fi
echo ""

echo -e "${GREEN}=== Uninstallation Complete ===${NC}"
echo ""
echo "The daemon has been removed. To reinstall:"
echo "  ./scripts/install-daemon.sh"
echo ""
