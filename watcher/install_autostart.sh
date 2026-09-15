#!/bin/bash
# Thrifty Curator Watcher - Background Service Install
# Runs the watcher invisibly — no terminal window, no admin password needed.

WATCHER_DIR="$HOME/Desktop/watcher"
PLIST_NAME="com.thriftycurator.watcher.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "Setting up Thrifty Curator Watcher..."
echo ""

# Check watcher exists
if [ ! -f "$WATCHER_DIR/anydesk_session_watcher.py" ]; then
    echo "ERROR: Watcher not found at $WATCHER_DIR/anydesk_session_watcher.py"
    echo "Make sure the watcher folder is on your Desktop."
    exit 1
fi

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 not found. Install from https://www.python.org/downloads/macos/"
    exit 1
fi

# Install dependencies
echo "Installing Python dependencies..."
python3 -m pip install --quiet watchdog requests 2>/dev/null || pip3 install --quiet watchdog requests

# Check config
if [ ! -f "$WATCHER_DIR/watcher_config.json" ]; then
    echo "ERROR: watcher_config.json not found in $WATCHER_DIR"
    exit 1
fi

# Verify watcher_key is not placeholder
WATCHER_KEY=$(python3 -c "import json; print(json.load(open('$WATCHER_DIR/watcher_config.json')).get('watcher_key',''))" 2>/dev/null)
if [ "$WATCHER_KEY" = "PASTE_ANYDESK_WATCHER_KEY_FROM_BACKEND_ENV" ] || [ -z "$WATCHER_KEY" ]; then
    echo "ERROR: watcher_config.json still has the placeholder watcher_key."
    echo "Edit $WATCHER_DIR/watcher_config.json and paste the real key."
    exit 1
fi

# Create LaunchAgents directory if needed
mkdir -p "$HOME/Library/LaunchAgents"

# Stop old watcher if running
launchctl unload "$PLIST_DEST" 2>/dev/null

# Create the plist with ThrottleInterval to prevent macOS from throttling restarts
cat > "$PLIST_DEST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.thriftycurator.watcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$WATCHER_DIR/anydesk_session_watcher.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$WATCHER_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>5</integer>
    <key>ProcessType</key>
    <string>Background</string>
    <key>LowPriorityIO</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$WATCHER_DIR/watcher.log</string>
    <key>StandardErrorPath</key>
    <string>$WATCHER_DIR/watcher_error.log</string>
</dict>
</plist>
EOF

# Load it
launchctl load "$PLIST_DEST"

# Quick verify
sleep 2
if launchctl list | grep -q thriftycurator; then
    echo "Watcher is running!"
else
    echo "Warning: watcher may not have started. Check watcher.log and watcher_error.log"
fi

echo ""
echo "Done! Watcher is running in the background."
echo "It will start automatically when this user logs in."
echo "If the watcher crashes, macOS will restart it automatically within 5 seconds."
echo ""
echo "You can close Terminal now."
echo ""
echo "Commands:"
echo "  Status:  launchctl list | grep thriftycurator"
echo "  Stop:    launchctl unload $PLIST_DEST"
echo "  Restart: launchctl unload $PLIST_DEST && launchctl load $PLIST_DEST"
echo "  Logs:    tail -f $WATCHER_DIR/watcher.log"
echo "  Errors:  tail -f $WATCHER_DIR/watcher_error.log"
