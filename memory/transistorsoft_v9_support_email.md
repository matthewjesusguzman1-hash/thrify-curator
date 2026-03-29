# Follow-Up Support Email for Transistorsoft

**To:** support@transistorsoft.com (or reply to existing thread)
**Subject:** RE: Still Getting "Plugin not implemented on iOS" - v9.0.2 + Capacitor 8

---

Hi,

Thank you for the guidance on version compatibility. I've now upgraded to the correct versions:

**Current Setup:**
- **Node.js:** v22
- **Capacitor:** 8.x
- **@transistorsoft/capacitor-background-geolocation:** 9.0.2
- **@transistorsoft/capacitor-background-fetch:** 8.0.1
- **Xcode:** 16.x
- **iOS Device:** Running iOS 18
- **Bundle ID:** com.thriftycurator.app
- **Order #:** 15845

**The Problem:**
After upgrading everything to v9/Capacitor 8, I'm still getting the same runtime error:
```
Error: "BackgroundGeolocation" plugin is not implemented on ios
```

**What I've Done:**

1. **Fresh iOS project with CocoaPods:**
   ```bash
   rm -rf ios
   npx cap add ios --packagemanager Cocoapods
   npx cap sync ios
   ```
   (I used `--packagemanager Cocoapods` because I read that Transistorsoft doesn't support SPM)

2. **Pod install succeeds:**
   ```
   Installing TransistorsoftCapacitorBackgroundGeolocation (9.0.2)
   Installing TSBackgroundFetch (8.0.0)
   Installing TSLocationManager (...)
   ```

3. **Configured Info.plist per v9 docs:**
   - Added `TSLocationManagerLicense` key with my license from the customer dashboard
   - Added all privacy strings (NSLocationAlwaysAndWhenInUseUsageDescription, etc.)
   - Added UIBackgroundModes: location, fetch, audio

4. **Configured AppDelegate.swift:**
   - Added `TSBackgroundFetch.sharedInstance().didFinishLaunching()` in didFinishLaunchingWithOptions

5. **Xcode builds successfully** - no compile errors

6. **License dashboard still shows 0 of 1 usage**

**Specific Questions:**

1. When using Capacitor 8 with `--packagemanager Cocoapods` (to bypass SPM), does the plugin require any additional manual registration that wouldn't be needed with the default SPM setup?

2. Should I see the BackgroundGeolocation plugin listed somewhere in the Capacitor bridge logs during startup? Currently, I don't see any indication that the native plugin is being registered.

3. Is there any known issue with Capacitor 8.3.0 specifically? The plugin appears in `npx cap sync` output but fails at runtime.

4. For v9 on iOS, is the AppDelegate configuration the same as v5 (with the `performFetchWithCompletionHandler` delegate method), or has that changed?

**Files I Can Provide:**
- package.json
- capacitor.config.json  
- ios/App/Podfile
- ios/App/Podfile.lock
- ios/App/App/Info.plist (license key redacted)
- ios/App/App/AppDelegate.swift
- Full Xcode console output

Please let me know what additional information would help diagnose this. I'm happy to set up a screen share if that would be faster.

Thank you,
Matthew

---

**Attachments to include:**
1. Screenshot of the runtime error in Xcode console
2. Screenshot of `npx cap sync ios` output showing the plugin is detected
3. Screenshot of Pods folder showing the plugin files exist
