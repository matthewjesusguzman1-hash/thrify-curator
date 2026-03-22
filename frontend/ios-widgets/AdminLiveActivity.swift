import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Admin Activity Attributes

struct AdminShiftAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var employeeCount: Int
        var employeeNames: [String]
        var lastUpdated: Date
    }
    
    var adminName: String
    var startedAt: Date
}

// MARK: - Admin Live Activity Widget

@available(iOS 16.2, *)
struct AdminLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AdminShiftAttributes.self) { context in
            // Lock Screen / Banner UI
            AdminLockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.8))
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "person.2.fill")
                            .foregroundColor(.blue)
                        Text("Staff")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.employeeCount) working")
                        .font(.caption)
                        .foregroundColor(.green)
                }
                
                DynamicIslandExpandedRegion(.center) {
                    VStack {
                        Text("\(context.state.employeeCount)")
                            .font(.system(.largeTitle, design: .rounded))
                            .fontWeight(.bold)
                            .foregroundColor(.cyan)
                        Text("Employees Clocked In")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.employeeNames.isEmpty {
                        Text("No employees currently working")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        Text(context.state.employeeNames.prefix(3).joined(separator: ", "))
                            .font(.caption)
                            .foregroundColor(.white)
                            .lineLimit(1)
                    }
                }
            } compactLeading: {
                Image(systemName: "person.2.fill")
                    .foregroundColor(.blue)
            } compactTrailing: {
                Text("\(context.state.employeeCount)")
                    .font(.system(.body, design: .rounded))
                    .fontWeight(.bold)
                    .foregroundColor(.cyan)
            } minimal: {
                Image(systemName: "person.2.fill")
                    .foregroundColor(.blue)
            }
        }
    }
}

// MARK: - Admin Lock Screen View

@available(iOS 16.2, *)
struct AdminLockScreenView: View {
    let context: ActivityViewContext<AdminShiftAttributes>
    
    var body: some View {
        HStack(spacing: 16) {
            // Icon
            VStack {
                Image(systemName: "person.2.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
            }
            .frame(width: 50)
            
            // Main content
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("\(context.state.employeeCount)")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.cyan)
                    Text("Clocked In")
                        .font(.headline)
                        .foregroundColor(.white)
                }
                
                if context.state.employeeNames.isEmpty {
                    Text("No employees working")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else {
                    Text(formatNames(context.state.employeeNames))
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
        }
        .padding()
    }
    
    private func formatNames(_ names: [String]) -> String {
        if names.count <= 2 {
            return names.joined(separator: ", ")
        }
        return "\(names.prefix(2).joined(separator: ", ")) +\(names.count - 2) more"
    }
}
