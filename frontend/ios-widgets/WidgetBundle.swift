import WidgetKit
import SwiftUI

@main
struct ThriftyCuratorWidgetsBundle: WidgetBundle {
    var body: some Widget {
        // Employee Live Activity (real-time timer)
        EmployeeLiveActivity()
        
        // Admin Live Activity (real-time employee tracking)
        AdminLiveActivity()
        
        // Admin Lock Screen Widget (static, refreshes periodically)
        AdminClockedInWidget()
    }
}
