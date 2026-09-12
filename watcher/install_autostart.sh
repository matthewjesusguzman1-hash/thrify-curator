#!/bin/bash
# Thrifty Curator Watcher - Background Service Install
# Runs the watcher invisibly — no terminal window, no admin password needed.

WATCHER_DIR="$HOME/Desktop/watcher"
PLIST_NAME="com.thriftycurator.watcher.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "Setting up Thrifty Curator Watcher..."

# Check watcher exists
if [ ! -f "$WATCHER_DIR/anydesk_session_watcher.py" ]; then
    echo "ERROR: Watcher not found at $WATCHER_DIR/anydesk_session_watcher.py"
    exit 1
fi

# Create LaunchAgents directory if needed
mkdir -p "$HOME/Library/LaunchAgents"

# Stop old watcher if running
launchctl unload "$PLIST_DEST" 2>/dev/null

# Create the plist
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

echo ""
echo "Done! Watcher is running in the background — no terminal window."
echo "It will start automatically when this user logs in."
echo ""
echo "You can close Terminal now."
echo ""
echo "Commands:"
echo "  Status:  launchctl list | grep thriftycurator"
echo "  Stop:    launchctl unload $PLIST_DEST"
echo "  Restart: launchctl unload $PLIST_DEST && launchctl load $PLIST_DEST"
echo "  Logs:    tail -f $WATCHER_DIR/watcher.log"
