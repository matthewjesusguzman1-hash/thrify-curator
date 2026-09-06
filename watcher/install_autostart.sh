#!/bin/bash
# Thrifty Curator Watcher - Auto-Start Setup
# Run this ONCE on your Mac to make the watcher start automatically on boot.

WATCHER_DIR="$HOME/Desktop/watcher"
PLIST_NAME="com.thriftycurator.watcher.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "Setting up Thrifty Curator Watcher auto-start..."

# Check watcher exists
if [ ! -f "$WATCHER_DIR/anydesk_session_watcher.py" ]; then
    echo "ERROR: Watcher not found at $WATCHER_DIR/anydesk_session_watcher.py"
    exit 1
fi

# Create LaunchAgents folder if needed
mkdir -p "$HOME/Library/LaunchAgents"

# Create the plist with correct paths
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
        <string>anydesk_session_watcher.py</string>
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

# Load it now
launchctl unload "$PLIST_DEST" 2>/dev/null
launchctl load "$PLIST_DEST"

echo ""
echo "Done! Watcher is now running and will auto-start on boot."
echo "Logs: $WATCHER_DIR/watcher.log"
echo ""
echo "Useful commands:"
echo "  Check status:  launchctl list | grep thriftycurator"
echo "  Stop watcher:  launchctl unload $PLIST_DEST"
echo "  Start watcher: launchctl load $PLIST_DEST"
echo "  View logs:     tail -f $WATCHER_DIR/watcher.log"
