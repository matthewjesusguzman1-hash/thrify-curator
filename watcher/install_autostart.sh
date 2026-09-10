#!/bin/bash
# Thrifty Curator Watcher - System-Wide Auto-Start Setup
# Runs at boot regardless of which user profile is active.
# Requires sudo (admin password).

WATCHER_DIR="$HOME/Desktop/watcher"
PLIST_NAME="com.thriftycurator.watcher.plist"
PLIST_DEST="/Library/LaunchDaemons/$PLIST_NAME"
CURRENT_USER=$(whoami)

echo "Setting up Thrifty Curator Watcher (system-wide)..."

# Check watcher exists
if [ ! -f "$WATCHER_DIR/anydesk_session_watcher.py" ]; then
    echo "ERROR: Watcher not found at $WATCHER_DIR/anydesk_session_watcher.py"
    exit 1
fi

# Remove old user-level LaunchAgent if it exists
OLD_AGENT="$HOME/Library/LaunchAgents/$PLIST_NAME"
if [ -f "$OLD_AGENT" ]; then
    echo "Removing old user-level watcher..."
    launchctl unload "$OLD_AGENT" 2>/dev/null
    rm "$OLD_AGENT"
fi

# Create the system-wide plist
sudo tee "$PLIST_DEST" > /dev/null << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.thriftycurator.watcher</string>
    <key>UserName</key>
    <string>$CURRENT_USER</string>
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
    <key>StandardOutPath</key>
    <string>$WATCHER_DIR/watcher.log</string>
    <key>StandardErrorPath</key>
    <string>$WATCHER_DIR/watcher_error.log</string>
</dict>
</plist>
EOF

# Set correct permissions (required for LaunchDaemons)
sudo chown root:wheel "$PLIST_DEST"
sudo chmod 644 "$PLIST_DEST"

# Load it
sudo launchctl unload "$PLIST_DEST" 2>/dev/null
sudo launchctl load "$PLIST_DEST"

echo ""
echo "Done! Watcher will now start at boot for any user profile."
echo "Logs: $WATCHER_DIR/watcher.log"
echo ""
echo "Useful commands:"
echo "  Check status:  sudo launchctl list | grep thriftycurator"
echo "  Stop watcher:  sudo launchctl unload $PLIST_DEST"
echo "  Start watcher: sudo launchctl load $PLIST_DEST"
echo "  View logs:     tail -f $WATCHER_DIR/watcher.log"
