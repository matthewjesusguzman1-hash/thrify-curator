# iOS Live Activities Setup Guide

## Prerequisites
- Xcode 15 or later
- iOS 16.1+ deployment target
- Apple Developer Account

---

## Step 1: Add Widget Extension to Your Project

1. Open your iOS project in Xcode:
   ```bash
   cd /app/frontend/ios/App
   open App.xcworkspace
   ```

2. In Xcode:
   - Select **File → New → Target**
   - Choose **Widget Extension**
   - Name it: `ThriftyCuratorWidgets`
   - Language: **Swift**
   - Check: **Include Live Activity** ✅
   - Click **Finish**

3. When prompted "Activate scheme?", click **Activate**

---

## Step 2: Configure Info.plist

Add these to your **main app's Info.plist** (App/App/Info.plist):

```xml
<key>NSSupportsLiveActivities</key>
<true/>
<key>NSSupportsLiveActivitiesFrequentUpdates</key>
<true/>
```

---

## Step 3: Create the Live Activity Attributes

In your widget extension folder, create/replace `ThriftyCuratorAttributes.swift`:

```swift
import ActivityKit
import SwiftUI

// MARK: - Shift Timer Activity
struct ShiftTimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var employeeName: String
        var hourlyRate: Double
        var estimatedEarnings: Double
        var isComplete: Bool
        var totalHours: Double?
    }
    
    var clockInTime: Date
}

// MARK: - Admin Alerts Activity  
struct AdminAlertsAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var clockedInCount: Int
        var employeeNames: [String]
    }
    
    var businessName: String = "Thrifty Curator"
}
```

---

## Step 4: Create the Live Activity Views

Replace your widget's main Swift file with:

```swift
import WidgetKit
import SwiftUI
import ActivityKit

// MARK: - Shift Timer Live Activity Widget
struct ShiftTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ShiftTimerAttributes.self) { context in
            // Lock Screen / Banner view
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "building.2.fill")
                        .foregroundColor(.cyan)
                    Text("Thrifty Curator")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Spacer()
                    if context.state.isComplete {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }
                }
                
                if context.state.isComplete {
                    Text("Shift Complete!")
                        .font(.title3)
                        .fontWeight(.bold)
                    Text("\\(context.state.totalHours ?? 0, specifier: "%.2f") hours worked")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                } else {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(context.state.employeeName)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Text(context.attributes.clockInTime, style: .timer)
                                .font(.system(size: 32, weight: .bold, design: .monospaced))
                                .foregroundColor(.cyan)
                        }
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text("Est. Earnings")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("$\\(context.state.estimatedEarnings, specifier: "%.2f")")
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundColor(.green)
                        }
                    }
                }
                
                Text("💰 $\\(context.state.hourlyRate, specifier: "%.2f")/hr")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .activityBackgroundTint(.black.opacity(0.8))
            .activitySystemActionForegroundColor(.white)
            
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded view
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "clock.fill")
                        .foregroundColor(.cyan)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("$\\(context.state.estimatedEarnings, specifier: "%.2f")")
                        .font(.headline)
                        .foregroundColor(.green)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.employeeName)
                        .font(.caption)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.clockInTime, style: .timer)
                        .font(.system(size: 28, weight: .bold, design: .monospaced))
                        .foregroundColor(.cyan)
                }
            } compactLeading: {
                Image(systemName: "clock.fill")
                    .foregroundColor(.cyan)
            } compactTrailing: {
                Text(context.attributes.clockInTime, style: .timer)
                    .font(.system(.body, design: .monospaced))
                    .foregroundColor(.cyan)
            } minimal: {
                Image(systemName: "clock.fill")
                    .foregroundColor(.cyan)
            }
        }
    }
}

// MARK: - Admin Alerts Live Activity Widget
struct AdminAlertsLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AdminAlertsAttributes.self) { context in
            // Lock Screen view
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "building.2.fill")
                        .foregroundColor(.purple)
                    Text("Thrifty Curator Admin")
                        .font(.headline)
                }
                
                HStack {
                    Image(systemName: "person.2.fill")
                        .foregroundColor(context.state.clockedInCount > 0 ? .green : .gray)
                    Text("\\(context.state.clockedInCount) Employee\\(context.state.clockedInCount != 1 ? "s" : "") Working")
                        .font(.title3)
                        .fontWeight(.semibold)
                }
                
                if !context.state.employeeNames.isEmpty {
                    Text(context.state.employeeNames.prefix(3).joined(separator: ", "))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if context.state.employeeNames.count > 3 {
                        Text("+\\(context.state.employeeNames.count - 3) more")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                } else {
                    Text("All shifts complete")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .activityBackgroundTint(.black.opacity(0.8))
            
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "person.2.fill")
                        .foregroundColor(.green)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\\(context.state.clockedInCount)")
                        .font(.title)
                        .fontWeight(.bold)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text("Employees Working")
                        .font(.caption)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if !context.state.employeeNames.isEmpty {
                        Text(context.state.employeeNames.prefix(2).joined(separator: ", "))
                            .font(.caption)
                    }
                }
            } compactLeading: {
                Image(systemName: "person.2.fill")
                    .foregroundColor(.green)
            } compactTrailing: {
                Text("\\(context.state.clockedInCount)")
                    .font(.system(.body, design: .rounded))
                    .fontWeight(.bold)
            } minimal: {
                Text("\\(context.state.clockedInCount)")
                    .font(.system(.caption, design: .rounded))
                    .fontWeight(.bold)
            }
        }
    }
}

// MARK: - Widget Bundle
@main
struct ThriftyCuratorWidgetsBundle: WidgetBundle {
    var body: some Widget {
        ShiftTimerLiveActivity()
        AdminAlertsLiveActivity()
    }
}
```

---

## Step 5: Configure App Groups (Required for Data Sharing)

1. In Xcode, select your **main app target**
2. Go to **Signing & Capabilities**
3. Click **+ Capability** → Add **App Groups**
4. Create a new group: `group.com.thriftycurator.app`

5. Repeat for your **widget extension target**

---

## Step 6: Build and Test

1. Select an iPhone 14 Pro or later simulator (for Dynamic Island)
2. Build and run your app
3. Clock in as an employee
4. Check your lock screen and Dynamic Island!

---

## Troubleshooting

### Live Activity not showing?
- Ensure iOS 16.1+ 
- Check that `NSSupportsLiveActivities` is in Info.plist
- Verify the widget extension is included in your build

### Dynamic Island not appearing?
- Only available on iPhone 14 Pro and later
- Use the correct simulator

### Timer not counting?
- The `style: .timer` automatically counts from the given Date
- No manual updates needed for the timer itself

---

## Testing Without a Device

You can preview Live Activities in Xcode's canvas preview by adding:

```swift
#Preview("Shift Timer", as: .content, using: ShiftTimerAttributes(clockInTime: Date())) {
    ShiftTimerLiveActivity()
} contentStates: {
    ShiftTimerAttributes.ContentState(
        employeeName: "John Doe",
        hourlyRate: 15.00,
        estimatedEarnings: 45.50,
        isComplete: false
    )
}
```

---

## Need Help?

If you encounter issues:
1. Clean build folder (Cmd + Shift + K)
2. Delete derived data
3. Restart Xcode
4. Ensure all targets have the same team/signing
