import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes (shared definition)

struct EmployeeShiftAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var elapsedTime: TimeInterval
        var isActive: Bool
    }
    
    var employeeName: String
    var clockInTime: Date
}

// MARK: - Live Activity Widget

@available(iOS 16.2, *)
struct EmployeeLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: EmployeeShiftAttributes.self) { context in
            // Lock Screen / Banner UI
            LockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.8))
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "clock.fill")
                            .foregroundColor(.green)
                        Text("Working")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.isActive ? "Active" : "Ended")
                        .font(.caption)
                        .foregroundColor(context.state.isActive ? .green : .gray)
                }
                
                DynamicIslandExpandedRegion(.center) {
                    VStack {
                        Text(context.attributes.employeeName)
                            .font(.headline)
                            .fontWeight(.bold)
                        
                        // Live updating timer using Date
                        Text(context.attributes.clockInTime, style: .timer)
                            .font(.system(.title, design: .monospaced))
                            .fontWeight(.bold)
                            .foregroundColor(.cyan)
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: "briefcase.fill")
                            .foregroundColor(.cyan)
                        Text("Started: \(context.attributes.clockInTime.formatted(date: .omitted, time: .shortened))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            } compactLeading: {
                // Compact left side
                Image(systemName: "clock.fill")
                    .foregroundColor(.green)
            } compactTrailing: {
                // Compact right side - live timer
                Text(context.attributes.clockInTime, style: .timer)
                    .font(.system(.caption, design: .monospaced))
                    .fontWeight(.bold)
                    .foregroundColor(.cyan)
                    .frame(minWidth: 50)
            } minimal: {
                // Minimal view (when other activities present)
                Image(systemName: "clock.fill")
                    .foregroundColor(.green)
            }
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct LockScreenView: View {
    let context: ActivityViewContext<EmployeeShiftAttributes>
    
    var body: some View {
        HStack(spacing: 16) {
            // Status indicator
            VStack {
                Image(systemName: "clock.fill")
                    .font(.title2)
                    .foregroundColor(.green)
                Text("IN")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
            }
            .frame(width: 50)
            
            // Main content
            VStack(alignment: .leading, spacing: 4) {
                Text(context.attributes.employeeName)
                    .font(.headline)
                    .foregroundColor(.white)
                
                HStack {
                    Text("Since")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(context.attributes.clockInTime.formatted(date: .omitted, time: .shortened))
                        .font(.caption)
                        .foregroundColor(.cyan)
                }
            }
            
            Spacer()
            
            // Live timer
            VStack(alignment: .trailing) {
                Text(context.attributes.clockInTime, style: .timer)
                    .font(.system(.title2, design: .monospaced))
                    .fontWeight(.bold)
                    .foregroundColor(.cyan)
                Text("worked")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
    }
}
