import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes (shared definition)

struct EmployeeShiftAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var elapsedTime: TimeInterval
        var isActive: Bool
        var statusMessage: String?  // Optional message like "Clocked out by admin"
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
                        Image(systemName: context.state.isActive ? "clock.fill" : "checkmark.circle.fill")
                            .foregroundColor(context.state.isActive ? .green : .orange)
                        Text(context.state.isActive ? "Working" : "Ended")
                            .font(.caption)
                            .foregroundColor(context.state.isActive ? .green : .orange)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.isActive ? "Active" : "Clocked Out")
                        .font(.caption)
                        .foregroundColor(context.state.isActive ? .green : .orange)
                }
                
                DynamicIslandExpandedRegion(.center) {
                    VStack {
                        Text(context.attributes.employeeName)
                            .font(.headline)
                            .fontWeight(.bold)
                        
                        if context.state.isActive {
                            // Live updating timer
                            Text(context.attributes.clockInTime, style: .timer)
                                .font(.system(.title, design: .monospaced))
                                .fontWeight(.bold)
                                .foregroundColor(.cyan)
                        } else {
                            // Final time
                            let hours = Int(context.state.elapsedTime) / 3600
                            let minutes = (Int(context.state.elapsedTime) % 3600) / 60
                            Text(String(format: "%d:%02d", hours, minutes))
                                .font(.system(.title, design: .monospaced))
                                .fontWeight(.bold)
                                .foregroundColor(.orange)
                            
                            if let message = context.state.statusMessage {
                                Text(message)
                                    .font(.caption)
                                    .foregroundColor(.orange)
                            }
                        }
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
                Image(systemName: context.state.isActive ? "clock.fill" : "checkmark.circle.fill")
                    .foregroundColor(context.state.isActive ? .green : .orange)
            } compactTrailing: {
                // Compact right side
                if context.state.isActive {
                    Text(context.attributes.clockInTime, style: .timer)
                        .font(.system(.caption, design: .monospaced))
                        .fontWeight(.bold)
                        .foregroundColor(.cyan)
                        .frame(minWidth: 50)
                } else {
                    Text("OUT")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                }
            } minimal: {
                // Minimal view (when other activities present)
                Image(systemName: context.state.isActive ? "clock.fill" : "checkmark.circle.fill")
                    .foregroundColor(context.state.isActive ? .green : .orange)
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
                Image(systemName: context.state.isActive ? "clock.fill" : "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(context.state.isActive ? .green : .orange)
                Text(context.state.isActive ? "IN" : "OUT")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(context.state.isActive ? .green : .orange)
            }
            .frame(width: 50)
            
            // Main content
            VStack(alignment: .leading, spacing: 4) {
                Text(context.attributes.employeeName)
                    .font(.headline)
                    .foregroundColor(.white)
                
                if let message = context.state.statusMessage, !context.state.isActive {
                    // Show status message when clocked out
                    Text(message)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                } else {
                    HStack {
                        Text("Since")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(context.attributes.clockInTime.formatted(date: .omitted, time: .shortened))
                            .font(.caption)
                            .foregroundColor(.cyan)
                    }
                }
            }
            
            Spacer()
            
            // Timer or final time
            VStack(alignment: .trailing) {
                if context.state.isActive {
                    // Live timer when active
                    Text(context.attributes.clockInTime, style: .timer)
                        .font(.system(.title2, design: .monospaced))
                        .fontWeight(.bold)
                        .foregroundColor(.cyan)
                    Text("worked")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                } else {
                    // Final elapsed time when clocked out
                    let hours = Int(context.state.elapsedTime) / 3600
                    let minutes = (Int(context.state.elapsedTime) % 3600) / 60
                    Text(String(format: "%d:%02d", hours, minutes))
                        .font(.system(.title2, design: .monospaced))
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                    Text("total")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
    }
}
