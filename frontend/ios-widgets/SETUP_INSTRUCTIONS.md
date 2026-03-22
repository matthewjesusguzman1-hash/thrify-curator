# iOS Widgets Setup Instructions

Follow these steps in Xcode to add Live Activities (Employee Timer) and Lock Screen Widget (Admin Dashboard).

---

## Prerequisites
- Xcode 15 or later
- iOS 16.2+ device (Live Activities don't work in Simulator)
- Apple Developer account

---

## Step 1: Create the Widget Extension

1. Open your project in Xcode: `npx cap open ios`
2. In Xcode menu: **File → New → Target**
3. Search for "Widget Extension"
4. Click **Next**
5. Configure:
   - **Product Name**: `ThriftyCuratorWidgets`
   - **Team**: Your Apple Developer Team
   - **Include Live Activity**: ✅ **CHECK THIS BOX**
   - **Include Configuration App Intent**: Leave unchecked
6. Click **Finish**
7. When prompted "Activate ThriftyCuratorWidgets scheme?", click **Cancel** (stay on App scheme)

---

## Step 2: Set Up App Groups

### In Apple Developer Portal:
1. Go to https://developer.apple.com/account/resources/identifiers
2. Click **Identifiers** → **App Groups** → **+**
3. Register a new App Group:
   - **Description**: Thrifty Curator Shared
   - **Identifier**: `group.com.thriftycurator.shared`
4. Click **Continue** → **Register**

### In Xcode (Main App Target):
1. Select your project in the navigator
2. Select the **App** target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Search for and add **App Groups**
6. Check the box for `group.com.thriftycurator.shared`

### In Xcode (Widget Target):
1. Select the **ThriftyCuratorWidgets** target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability** → Add **App Groups**
4. Check the same `group.com.thriftycurator.shared`

---

## Step 3: Enable Live Activities in Info.plist

### Main App Info.plist:
1. Open `ios/App/App/Info.plist`
2. Add this key (right-click → Add Row):
   - **Key**: `NSSupportsLiveActivities`
   - **Type**: Boolean
   - **Value**: YES

---

## Step 4: Replace Widget Extension Files

Delete all the auto-generated files in the `ThriftyCuratorWidgets` folder and replace with the files I've provided:

1. Delete these auto-generated files:
   - `ThriftyCuratorWidgets.swift`
   - `ThriftyCuratorWidgetsBundle.swift`
   - `ThriftyCuratorWidgetsLiveActivity.swift`

2. Copy these files into the `ThriftyCuratorWidgets` folder:
   - `WidgetBundle.swift` (from ios-widgets folder)
   - `EmployeeLiveActivity.swift` (from ios-widgets folder)
   - `AdminWidget.swift` (from ios-widgets folder)
   - `SharedDataManager.swift` (from ios-widgets folder)

---

## Step 5: Add the Capacitor Plugin

1. Copy `LiveActivityPlugin.swift` to `ios/App/App/Plugins/`
2. Create the `Plugins` folder if it doesn't exist

---

## Step 6: Register the Plugin

Open `ios/App/App/AppDelegate.swift` and add this import and registration:

```swift
import Capacitor

// Add this inside the application(_:didFinishLaunchingWithOptions:) method:
// The plugin auto-registers, no manual step needed
```

---

## Step 7: Update Podfile (if needed)

If you get build errors, add this to `ios/App/Podfile`:

```ruby
target 'ThriftyCuratorWidgets' do
  use_frameworks!
  # Widgets don't need pods typically
end
```

Then run:
```bash
cd ios/App
pod install
```

---

## Step 8: Build and Test

1. Select your physical iPhone (not Simulator)
2. Select the **App** scheme (not the widget scheme)
3. Click **Run** (▶️)
4. Test clock in - you should see the Live Activity appear!

---

## Troubleshooting

### "No such module" errors
- Make sure the widget target has the same iOS deployment target as the main app
- Clean build folder: **Product → Clean Build Folder**

### Live Activity doesn't appear
- Must test on physical device (iPhone 14 Pro+ for Dynamic Island)
- Check that `NSSupportsLiveActivities` is in Info.plist
- Make sure App Groups are configured on both targets

### Widget shows placeholder data
- Verify App Groups identifier matches exactly
- Check that data is being written to UserDefaults with the App Group

---

## How It Works

1. **When employee clocks in**: JS calls `LiveActivityPlugin.startActivity()` → Swift starts Live Activity
2. **Timer updates**: Live Activity uses `Date` + relative formatting (no polling needed!)
3. **When employee clocks out**: JS calls `LiveActivityPlugin.endActivity()` → Swift ends Live Activity
4. **Admin widget**: Reads from shared UserDefaults, refreshes every 15 min

