import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Admin Activity Attributes

struct AdminShiftAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var employeeCount: Int
        var employeeNames: [String]  // Format: "Name|StartTime|Timestamp"
        var lastUpdated: Double
    }
    
    var adminName: String
    var startedAt: Date
}

// Helper to parse employee data
struct EmployeeData {
    let name: String
    let startTime: String
    let clockInDate: Date?
    
    init(from string: String) {
        let parts = string.split(separator: "|").map { String($0) }
        self.name = parts.count > 0 ? parts[0] : "Unknown"
        self.startTime = parts.count > 1 ? parts[1] : "--"
        if parts.count > 2, let timestamp = Double(parts[2]), timestamp > 0 {
            self.clockInDate = Date(timeIntervalSince1970: timestamp)
        } else {
            self.clockInDate = nil
        }
    }
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
                    VStack(spacing: 4) {
                        Text("\(context.state.employeeCount)")
                            .font(.system(.title, design: .rounded))
                            .fontWeight(.bold)
                            .foregroundColor(.cyan)
                        Text("Clocked In")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    if let firstEmployee = context.state.employeeNames.first {
                        let data = EmployeeData(from: firstEmployee)
                        HStack {
                            Text(data.name)
                                .font(.caption)
                                .foregroundColor(.white)
                            if let clockIn = data.clockInDate {
                                Text(clockIn, style: .timer)
                                    .font(.caption)
                                    .foregroundColor(.cyan)
                            }
                        }
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
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "person.2.fill")
                    .font(.title3)
                    .foregroundColor(.blue)
                Text("\(context.state.employeeCount) Clocked In")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                Spacer()
            }
            
            // Employee list with live timers
            if context.state.employeeCount == 0 {
                Text("No employees working")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                ForEach(context.state.employeeNames.prefix(3), id: \.self) { employeeString in
                    let data = EmployeeData(from: employeeString)
                    HStack {
                        // Employee name
                        Text(data.name)
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        // Start time
                        Text(data.startTime)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        // Live timer
                        if let clockIn = data.clockInDate {
                            Text(clockIn, style: .timer)
                                .font(.system(.subheadline, design: .monospaced))
                                .fontWeight(.semibold)
                                .foregroundColor(.cyan)
                                .frame(minWidth: 60, alignment: .trailing)
                        }
                    }
                }
                
                // Show +X more if there are more employees
                if context.state.employeeCount > 3 {
                    Text("+\(context.state.employeeCount - 3) more")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
    }
}
