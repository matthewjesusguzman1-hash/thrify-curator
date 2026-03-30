# App Store Submission Fix - Privacy Keys

## Issue: App Rejected - Missing Camera Privacy Description

The app crashed because it tried to access the camera without explaining why to the user.

## Required Fix

Add these keys to `ios/App/App/Info.plist`:

### In Xcode (GUI):
1. Open `ios/App/App/Info.plist`
2. Add row: **Privacy - Camera Usage Description**
   - Value: `Take photos of items for consignment listings`
3. Add row: **Privacy - Photo Library Usage Description**
   - Value: `Select photos from your library for item listings`

### Raw XML (if editing directly):
```xml
<key>NSCameraUsageDescription</key>
<string>Take photos of items for consignment listings</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Select photos from your library for item listings</string>
```

## All Required Privacy Keys for Thrifty Curator

| Key | Value | Purpose |
|-----|-------|---------|
| `NSCameraUsageDescription` | Take photos of items for consignment listings | Camera access |
| `NSPhotoLibraryUsageDescription` | Select photos from your library for item listings | Photo library |
| `NSLocationWhenInUseUsageDescription` | Track mileage for IRS deductions | Location (foreground) |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Track mileage in background for IRS deductions | Location (background) |
| `NSMotionUsageDescription` | Motion detection helps conserve battery during tracking | Motion sensors |
| `BGTaskSchedulerPermittedIdentifiers` | Array with `com.transistorsoft.fetch` | Background tasks |

## After Adding Keys

1. Clean build: `Cmd+Shift+K`
2. Archive: `Product → Archive`
3. Distribute: `App Store Connect`
4. Resubmit for review

## GPS Feature Flag (Currently Disabled)

GPS is hidden until Transistorsoft plugin issue is resolved. To re-enable:
- `AdminDashboard.jsx` line ~2880: Change `{false &&` to `{true &&`
- `AdminDashboard.jsx` line ~3395: Change `{false &&` to `{true &&`
