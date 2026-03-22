import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct AdminWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> AdminWidgetEntry {
        AdminWidgetEntry(
            date: Date(),
            employeeCount: 2,
            employeeNames: ["Loading..."],
            lastUpdated: Date()
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (AdminWidgetEntry) -> Void) {
        let entry = getEntry()
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<AdminWidgetEntry>) -> Void) {
        let entry = getEntry()
        
        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func getEntry() -> AdminWidgetEntry {
        if let data = SharedDataManager.getAdminData() {
            return AdminWidgetEntry(
                date: Date(),
                employeeCount: data.clockedInEmployees.count,
                employeeNames: data.clockedInEmployees.map { $0.name },
                lastUpdated: data.lastUpdated
            )
        }
        
        return AdminWidgetEntry(
            date: Date(),
            employeeCount: 0,
            employeeNames: [],
            lastUpdated: Date()
        )
    }
}

// MARK: - Timeline Entry

struct AdminWidgetEntry: TimelineEntry {
    let date: Date
    let employeeCount: Int
    let employeeNames: [String]
    let lastUpdated: Date
}

// MARK: - Widget Views

struct AdminWidgetEntryView: View {
    var entry: AdminWidgetProvider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .accessoryCircular:
            CircularView(entry: entry)
        case .accessoryRectangular:
            RectangularView(entry: entry)
        case .accessoryInline:
            InlineView(entry: entry)
        default:
            RectangularView(entry: entry)
        }
    }
}

// Circular Lock Screen Widget
struct CircularView: View {
    let entry: AdminWidgetEntry
    
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 2) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 16))
                    .widgetAccentable()
                Text("\(entry.employeeCount)")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
            }
        }
    }
}

// Rectangular Lock Screen Widget
struct RectangularView: View {
    let entry: AdminWidgetEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "person.2.fill")
                    .widgetAccentable()
                Text("\(entry.employeeCount) Clocked In")
                    .font(.headline)
                    .fontWeight(.semibold)
            }
            
            if entry.employeeCount > 0 {
                Text(formatNames(entry.employeeNames))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            } else {
                Text("No employees working")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private func formatNames(_ names: [String]) -> String {
        if names.isEmpty { return "" }
        if names.count <= 2 {
            return names.joined(separator: ", ")
        }
        let firstTwo = names.prefix(2).joined(separator: ", ")
        return "\(firstTwo) +\(names.count - 2) more"
    }
}

// Inline Lock Screen Widget
struct InlineView: View {
    let entry: AdminWidgetEntry
    
    var body: some View {
        HStack {
            Image(systemName: "person.2.fill")
            Text("\(entry.employeeCount) employees clocked in")
        }
    }
}

// MARK: - Widget Configuration

struct AdminClockedInWidget: Widget {
    let kind: String = "AdminClockedInWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AdminWidgetProvider()) { entry in
            AdminWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Employees Working")
        .description("See who's currently clocked in")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

// MARK: - Previews

#Preview("Circular", as: .accessoryCircular) {
    AdminClockedInWidget()
} timeline: {
    AdminWidgetEntry(date: Date(), employeeCount: 3, employeeNames: ["Sarah", "Mike", "John"], lastUpdated: Date())
}

#Preview("Rectangular", as: .accessoryRectangular) {
    AdminClockedInWidget()
} timeline: {
    AdminWidgetEntry(date: Date(), employeeCount: 2, employeeNames: ["Sarah Johnson", "Mike Smith"], lastUpdated: Date())
}

#Preview("Inline", as: .accessoryInline) {
    AdminClockedInWidget()
} timeline: {
    AdminWidgetEntry(date: Date(), employeeCount: 2, employeeNames: ["Sarah", "Mike"], lastUpdated: Date())
}
