# Transistorsoft v5.4.2 + Capacitor 5 - Complete iOS Setup Checklist

Based on the **v5.4.2 tag** documentation (NOT the master branch which is for v9).

## Required Versions
```
@capacitor/core: ^5.0.0
@capacitor/ios: ^5.0.0  
@transistorsoft/capacitor-background-geolocation: 5.4.2
@transistorsoft/capacitor-background-fetch: 5.2.5
```

---

## Step 1: Install Packages
```bash
yarn add @transistorsoft/capacitor-background-geolocation@5.4.2
yarn add @transistorsoft/capacitor-background-fetch@5.2.5
npx cap sync
```

---

## Step 2: Configure Background Capabilities (Xcode)
1. Open project in Xcode: `npx cap open ios`
2. Select root project → **Signing & Capabilities** tab
3. Click **+ Capability** → Add **Background Modes**
4. Enable:
   - [x] Location updates
   - [x] Background fetch
   - [x] Background processing (iOS 13+, required for scheduleTask)
   - [x] Audio (optional - for debug sound effects)

---

## Step 3: Configure Info.plist

### 3a. Privacy Strings (REQUIRED)
Add these keys:
| Key | Value |
|-----|-------|
| `NSLocationAlwaysAndWhenInUseUsageDescription` | "Location required to track mileage in background for IRS deductions" |
| `NSLocationWhenInUseUsageDescription` | "Location required to track mileage" |
| `NSMotionUsageDescription` | "Motion detection helps conserve battery" |

### 3b. Permitted Background Task Identifiers (REQUIRED for iOS 13+)
Add key: **"Permitted background task scheduler identifiers"** (`BGTaskSchedulerPermittedIdentifiers`)
Add value: `com.transistorsoft.fetch`

```xml
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
    <string>com.transistorsoft.fetch</string>
</array>
```

### 3c. Privacy Manifest (REQUIRED for App Store)
Create `ios/App/PrivacyInfo.xcprivacy` with:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
                <string>1C8F.1</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>C617.1</string>
                <string>0A2A.1</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>E174.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

---

## Step 4: Configure AppDelegate.swift (CRITICAL - OFTEN MISSED!)

This is the **most commonly missed step**. Edit `ios/App/App/AppDelegate.swift`:

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
    
    // ... rest of your AppDelegate methods
}
```

---

## Step 5: License Configuration

### For iOS (v5.4.2):
- **DEBUG builds**: No license needed - plugin works fully for testing
- **RELEASE builds**: License validation happens automatically via the native SDK
- **NO `TSLocationManagerLicense` key in Info.plist** for v5.x (this is only for v9+)

### For Android:
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data 
    android:name="com.transistorsoft.locationmanager.license" 
    android:value="YOUR_LICENSE_KEY" />
```

---

## Step 6: Clean Build
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
npx cap sync ios
```

Then in Xcode:
- **Product → Clean Build Folder** (Cmd+Shift+K)
- **Build** (Cmd+B)

---

## Verification Checklist

Before running, verify:
- [ ] `Podfile.lock` contains `TransistorsoftCapacitorBackgroundGeolocation (5.4.x)`
- [ ] `Podfile.lock` contains `TSBackgroundFetch`
- [ ] `AppDelegate.swift` has `import TSBackgroundFetch`
- [ ] `AppDelegate.swift` has `TSBackgroundFetch.sharedInstance()?.didFinishLaunching()`
- [ ] `AppDelegate.swift` has `performFetchWithCompletionHandler` method
- [ ] `Info.plist` has `BGTaskSchedulerPermittedIdentifiers` with `com.transistorsoft.fetch`
- [ ] Background Modes are enabled in Xcode capabilities

---

## Common Causes of "Plugin not implemented on iOS"

1. **Missing `import TSBackgroundFetch`** in AppDelegate.swift
2. **Missing `didFinishLaunching()` call** in AppDelegate  
3. **Missing `performFetchWithCompletionHandler` method** in AppDelegate
4. **Missing `BGTaskSchedulerPermittedIdentifiers`** in Info.plist
5. **Pods not properly installed** - run `pod deintegrate && pod install`
6. **Using wrong version docs** - v9 docs are different from v5 docs!
