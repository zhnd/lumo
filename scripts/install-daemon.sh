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

echo -e "${GREEN}=== Lumo Daemon Installation ===${NC}"
echo ""

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo -e "${RED}Error: This script only works on macOS${NC}"
    exit 1
fi

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Project root: $PROJECT_ROOT"
echo ""

# Step 1: Build daemon in release mode
echo -e "${YELLOW}[1/6]${NC} Building daemon..."
cd "$PROJECT_ROOT"
cargo build --release -p lumo-daemon

if [ ! -f "target/release/$DAEMON_NAME" ]; then
    echo -e "${RED}Error: Build failed - binary not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Build complete"
echo ""

# Step 2: Copy binary to ~/.lumo/bin
echo -e "${YELLOW}[2/6]${NC} Installing binary to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cp "target/release/$DAEMON_NAME" "$INSTALL_DIR/$DAEMON_NAME"
chmod +x "$INSTALL_DIR/$DAEMON_NAME"
echo -e "${GREEN}✓${NC} Binary installed: $INSTALL_DIR/$DAEMON_NAME"
echo ""

# Step 3: Create log directory
echo -e "${YELLOW}[3/6]${NC} Creating log directory..."
mkdir -p "$LOG_DIR"
echo -e "${GREEN}✓${NC} Log directory created: $LOG_DIR"
echo ""

# Step 4: Create LaunchAgents directory if it doesn't exist
echo -e "${YELLOW}[4/6]${NC} Creating LaunchAgents directory..."
mkdir -p "$LAUNCHAGENTS_DIR"
echo -e "${GREEN}✓${NC} LaunchAgents directory ready"
echo ""

# Step 5: Generate plist from template
echo -e "${YELLOW}[5/6]${NC} Generating launchd plist..."
sed -e "s|{{DAEMON_PATH}}|$INSTALL_DIR/$DAEMON_NAME|g" \
    -e "s|{{LOG_DIR}}|$LOG_DIR|g" \
    -e "s|{{HOME}}|$HOME|g" \
    "$PROJECT_ROOT/src-tauri/resources/com.lumo.daemon.plist.template" > "$LAUNCHAGENTS_DIR/$PLIST_NAME"

echo -e "${GREEN}✓${NC} Plist generated: $LAUNCHAGENTS_DIR/$PLIST_NAME"
echo ""

# Step 6: Load the service
echo -e "${YELLOW}[6/6]${NC} Starting daemon..."

# Unload existing service if running
if launchctl list | grep -q com.lumo.daemon 2>/dev/null; then
    echo "Stopping existing daemon..."
    launchctl unload "$LAUNCHAGENTS_DIR/$PLIST_NAME" 2>/dev/null || true
    sleep 1
fi

# Load the service
launchctl load "$LAUNCHAGENTS_DIR/$PLIST_NAME"

# Wait a moment for it to start
sleep 2

# Verify it's running
if launchctl list | grep -q com.lumo.daemon; then
    echo -e "${GREEN}✓${NC} Daemon started successfully"
else
    echo -e "${RED}✗${NC} Failed to start daemon"
    echo "Check logs at: $LOG_DIR"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo "Daemon Details:"
echo "  Binary:   $INSTALL_DIR/$DAEMON_NAME"
echo "  Plist:    $LAUNCHAGENTS_DIR/$PLIST_NAME"
echo "  Logs:     $LOG_DIR"
echo "  Endpoint: http://localhost:4318/v1/traces"
echo "  Health:   http://localhost:4318/health"
echo ""
echo "Useful commands:"
echo "  Check status:  launchctl list | grep com.lumo.daemon"
echo "  View logs:     tail -f $LOG_DIR/stdout.log"
echo "  Stop daemon:   launchctl unload $LAUNCHAGENTS_DIR/$PLIST_NAME"
echo "  Start daemon:  launchctl load $LAUNCHAGENTS_DIR/$PLIST_NAME"
echo "  Uninstall:     ./scripts/uninstall-daemon.sh"
echo ""
echo "Test the daemon:"
echo "  curl http://localhost:4318/health"
echo ""
