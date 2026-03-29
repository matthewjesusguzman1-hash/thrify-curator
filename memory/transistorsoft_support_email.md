# Support Email Template for Transistorsoft

**To:** support@transistorsoft.com
**Subject:** "BackgroundGeolocation" plugin is not implemented on iOS - Capacitor 8 + CocoaPods + v9.0.2

---

Hi Transistorsoft Support,

I purchased a commercial license (Order #[YOUR_ORDER_NUMBER]) and am experiencing a critical issue where the plugin fails to register at runtime on iOS.

## Environment
- **Node.js:** v22
- **Capacitor:** 8.3.0
- **@transistorsoft/capacitor-background-geolocation:** 9.0.2
- **@transistorsoft/capacitor-background-fetch:** 8.0.1
- **Xcode:** [YOUR_XCODE_VERSION]
- **iOS Deployment Target:** 15.0
- **Package Manager:** CocoaPods (explicitly set, NOT SPM)

## Steps Taken
1. Upgraded from Capacitor 5 to Capacitor 8 (required for v9 license)
2. Upgraded Node.js to v22
3. Deleted the iOS folder and regenerated with: `npx cap add ios --packagemanager Cocoapods`
4. Ran `npx cap sync ios`
5. Ran `pod install` in ios/App - pods installed successfully (see output below)
6. Added `TSLocationManagerLicense` key to Info.plist with my license key
7. Added `TSBackgroundFetch.sharedInstance().didFinishLaunching()` to AppDelegate.swift
8. Configured UIBackgroundModes and privacy strings in Info.plist

## The Problem
When running the app (both Debug and Release builds), the Capacitor console throws:
```
Error: "BackgroundGeolocation" plugin is not implemented on ios
```

## Pod Install Output (Success)
```
Installing TransistorsoftCapacitorBackgroundGeolocation (9.0.2)
Installing TSBackgroundFetch (8.0.0)
Installing TSLocationManager (...)
```
All pods install without errors.

## What I've Verified
- Info.plist contains TSLocationManagerLicense key
- AppDelegate.swift has TSBackgroundFetch initialization
- UIBackgroundModes includes: location, fetch, audio
- Privacy strings are all present
- Pods directory exists with plugin source files

## Specific Questions
1. Does Capacitor 8 with CocoaPods (forced via `--packagemanager Cocoapods`) require any manual plugin registration in `CapacitorApp.swift` or `capacitor.config.json`?
2. Is there a known issue with Capacitor 8's native bridge not auto-discovering plugins when SPM is bypassed for CocoaPods?
3. Should I be seeing the plugin listed in the Xcode Capacitor bridge output during build?

Thank you for your help!

---

## Attachments to Include
1. Full package.json
2. capacitor.config.json
3. ios/App/Podfile
4. ios/App/Podfile.lock (relevant sections)
5. ios/App/App/Info.plist (with license key redacted)
6. ios/App/App/AppDelegate.swift
7. Xcode console output showing the error
