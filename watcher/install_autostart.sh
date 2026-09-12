#!/bin/bash
# Thrifty Curator Watcher - Silent Background Install
# Installs to a hidden directory and runs as an invisible system daemon.
# No terminal window, no Desktop files, no visible process.
# Requires sudo (admin password).

HIDDEN_DIR="$HOME/.thriftycurator"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_NAME="com.thriftycurator.watcher.plist"
PLIST_DEST="/Library/LaunchDaemons/$PLIST_NAME"
CURRENT_USER=$(whoami)

echo "Installing Thrifty Curator Watcher (silent background mode)..."

# Check source exists
if [ ! -f "$SOURCE_DIR/anydesk_session_watcher.py" ]; then
    echo "ERROR: anydesk_session_watcher.py not found in $SOURCE_DIR"
    exit 1
fi

if [ ! -f "$SOURCE_DIR/watcher_config.json" ]; then
    echo "ERROR: watcher_config.json not found in $SOURCE_DIR"
    exit 1
fi

# Create hidden directory
mkdir -p "$HIDDEN_DIR"

# Copy files to hidden location
cp "$SOURCE_DIR/anydesk_session_watcher.py" "$HIDDEN_DIR/"
cp "$SOURCE_DIR/watcher_config.json" "$HIDDEN_DIR/"
chmod 600 "$HIDDEN_DIR/watcher_config.json"
chmod 700 "$HIDDEN_DIR/anydesk_session_watcher.py"

# Compile to bytecode (harder to casually read)
python3 -m compileall -b "$HIDDEN_DIR/anydesk_session_watcher.py" 2>/dev/null

# Remove old user-level LaunchAgent if it exists
OLD_AGENT="$HOME/Library/LaunchAgents/$PLIST_NAME"
if [ -f "$OLD_AGENT" ]; then
    launchctl unload "$OLD_AGENT" 2>/dev/null
    rm "$OLD_AGENT"
fi

# Stop old daemon if running
sudo launchctl unload "$PLIST_DEST" 2>/dev/null

# Create the system daemon plist (runs invisible, no terminal)
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
        <string>$HIDDEN_DIR/anydesk_session_watcher.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$HIDDEN_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ProcessType</key>
    <string>Background</string>
    <key>LowPriorityIO</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HIDDEN_DIR/watcher.log</string>
    <key>StandardErrorPath</key>
    <string>$HIDDEN_DIR/watcher_error.log</string>
</dict>
</plist>
EOF

# Set correct permissions
sudo chown root:wheel "$PLIST_DEST"
sudo chmod 644 "$PLIST_DEST"

# Load daemon
sudo launchctl load "$PLIST_DEST"

# Clean up Desktop copy if it exists
if [ -d "$HOME/Desktop/watcher" ] && [ "$SOURCE_DIR" = "$HOME/Desktop/watcher" ]; then
    echo ""
    read -p "Remove old Desktop/watcher folder? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$HOME/Desktop/watcher"
        echo "Removed Desktop/watcher folder."
    fi
fi

echo ""
echo "✓ Watcher installed silently to ~/.thriftycurator/"
echo "  - Runs at boot, invisible, no terminal window"
echo "  - Logs: ~/.thriftycurator/watcher.log"
echo ""
echo "Commands:"
echo "  Status:  sudo launchctl list | grep thriftycurator"
echo "  Stop:    sudo launchctl unload $PLIST_DEST"
echo "  Start:   sudo launchctl load $PLIST_DEST"
echo "  Logs:    tail -f ~/.thriftycurator/watcher.log"
