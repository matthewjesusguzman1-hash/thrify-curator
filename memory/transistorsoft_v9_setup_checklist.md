# Transistorsoft v9.0.2 + Capacitor 8 - Complete iOS Setup Checklist

## Required Versions (Now Installed)
```
@capacitor/core: ^8.3.0
@capacitor/ios: ^8.3.0  
@capacitor/cli: ^8.3.0
@transistorsoft/capacitor-background-geolocation: 9.0.2
@transistorsoft/capacitor-background-fetch: 8.0.1
Node.js: >=22.0.0 (required for Capacitor 8)
```

---

## Step 1: Regenerate iOS Project (Recommended for Major Upgrade)

Since we upgraded from Capacitor 5 to 8, it's best to regenerate the iOS project:

```bash
# On your local machine with Node 22+
cd frontend

# Remove old iOS project
rm -rf ios

# Add fresh iOS project (use CocoaPods - Transistorsoft doesn't support SPM)
npx cap add ios --packagemanager Cocoapods

# Sync
npx cap sync ios
```

---

## Step 2: Configure AppDelegate.swift

Edit `ios/App/App/AppDelegate.swift`:

```swift
import UIKit
import Capacitor
import TSBackgroundFetch  // <-- ADD THIS IMPORT

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // [capacitor-background-fetch] - ADD THIS BLOCK
        let fetchManager = TSBackgroundFetch.sharedInstance()
        fetchManager?.didFinishLaunching()
        
        return true
    }

    // [capacitor-background-fetch] - ADD THIS ENTIRE METHOD
    func application(_ application: UIApplication, performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        print("BackgroundFetchPlugin AppDelegate received fetch event")
        let fetchManager = TSBackgroundFetch.sharedInstance()
        fetchManager?.perform(completionHandler: completionHandler, applicationState: application.applicationState)
    }
    
    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
```

---

## Step 3: Configure Info.plist

Edit `ios/App/App/Info.plist` and add these keys:

### 3a. License Key (REQUIRED for v9)
```xml
<key>TSLocationManagerLicense</key>
<string>YOUR_LICENSE_KEY_FROM_DASHBOARD</string>
```

### 3b. Privacy Strings (REQUIRED)
```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Location is required to track mileage in the background for IRS tax deductions</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Location is required to track mileage for tax deductions</string>

<key>NSMotionUsageDescription</key>
<string>Motion detection helps conserve battery while tracking mileage</string>
```

### 3c. Background Task Identifiers (REQUIRED)
```xml
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
    <string>com.transistorsoft.fetch</string>
</array>

<key>UIBackgroundModes</key>
<array>
    <string>location</string>
    <string>fetch</string>
    <string>processing</string>
</array>
```

### 3d. Camera Permission (if needed for App Store)
```xml
<key>NSCameraUsageDescription</key>
<string>Camera is used to take photos of receipts and W-9 forms</string>
```

---

## Step 4: Configure Background Modes in Xcode

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the **App** target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability** → Add **Background Modes**
5. Enable:
   - [x] Location updates
   - [x] Background fetch
   - [x] Background processing

---

## Step 5: Get Your License Key

1. Go to: https://www.transistorsoft.com/shop/customers
2. Log in with Order #15845
3. Generate/copy your license key
4. Add it to Info.plist under `TSLocationManagerLicense`

---

## Step 6: Clean Build

```bash
cd ios/App
rm -rf Pods Podfile.lock
pod install --repo-update
cd ../..
npx cap sync ios
```

Then in Xcode:
- **Product → Clean Build Folder** (Cmd+Shift+K)
- **Build** (Cmd+B)

---

## Step 7: Verify Installation

After building, check the Xcode console for:
```
[TSBackgroundFetch] didFinishLaunching
```

If you see `"Plugin not implemented on iOS"` error, verify:
1. AppDelegate has `import TSBackgroundFetch`
2. AppDelegate has `didFinishLaunching()` call
3. Podfile.lock contains `TSBackgroundFetch` and `TSLocationManager`

---

## Verification Checklist

Before running, verify:
- [ ] Node.js >= 22.0.0 on local machine
- [ ] `Podfile.lock` contains `TransistorsoftCapacitorBackgroundGeolocation (9.x)`
- [ ] `Podfile.lock` contains `TSBackgroundFetch (8.x)`
- [ ] `AppDelegate.swift` has `import TSBackgroundFetch`
- [ ] `AppDelegate.swift` has `didFinishLaunching()` call
- [ ] `AppDelegate.swift` has `performFetchWithCompletionHandler` method
- [ ] `Info.plist` has `TSLocationManagerLicense` with your key
- [ ] `Info.plist` has `BGTaskSchedulerPermittedIdentifiers`
- [ ] Background Modes enabled in Xcode

---

## Common Errors

| Error | Solution |
|-------|----------|
| "Plugin not implemented on iOS" | Missing AppDelegate configuration |
| "License validation failed" | Check license key in Info.plist |
| "Node version incompatible" | Upgrade to Node 22+ |
| Build errors after upgrade | Delete ios folder, re-run `npx cap add ios` |
