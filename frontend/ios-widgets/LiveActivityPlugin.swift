import Foundation
import Capacitor
import ActivityKit

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startEmployeeActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateEmployeeActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endEmployeeActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateAdminData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise)
    ]
    
    private var currentActivity: Activity<EmployeeShiftAttributes>?
    
    // Check if Live Activities are supported
    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            let supported = ActivityAuthorizationInfo().areActivitiesEnabled
            call.resolve(["supported": supported])
        } else {
            call.resolve(["supported": false])
        }
    }
    
    // Start Live Activity when employee clocks in
    @objc func startEmployeeActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are disabled")
            return
        }
        
        guard let employeeName = call.getString("employeeName") else {
            call.reject("employeeName is required")
            return
        }
        
        // Parse clock in time or use current time
        let clockInTime: Date
        if let clockInTimeString = call.getString("clockInTime"),
           let parsedDate = ISO8601DateFormatter().date(from: clockInTimeString) {
            clockInTime = parsedDate
        } else {
            clockInTime = Date()
        }
        
        // End any existing activity first
        Task {
            await endAllExistingActivities()
            
            // Create attributes
            let attributes = EmployeeShiftAttributes(
                employeeName: employeeName,
                clockInTime: clockInTime
            )
            
            let initialState = EmployeeShiftAttributes.ContentState(
                elapsedTime: Date().timeIntervalSince(clockInTime),
                isActive: true
            )
            
            let content = ActivityContent(
                state: initialState,
                staleDate: nil
            )
            
            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: content,
                    pushType: nil
                )
                
                self.currentActivity = activity
                
                // Save to shared data for widget access
                let shiftData = SharedDataManager.EmployeeShiftData(
                    employeeName: employeeName,
                    clockInTime: clockInTime,
                    isActive: true
                )
                SharedDataManager.saveEmployeeShift(shiftData)
                
                call.resolve(["activityId": activity.id])
            } catch {
                call.reject("Failed to start Live Activity: \(error.localizedDescription)")
            }
        }
    }
    
    // Update the Live Activity (optional - for manual updates)
    @objc func updateEmployeeActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        
        guard let activity = currentActivity else {
            call.reject("No active Live Activity")
            return
        }
        
        let elapsedTime = call.getDouble("elapsedTime") ?? 0
        
        Task {
            let newState = EmployeeShiftAttributes.ContentState(
                elapsedTime: elapsedTime,
                isActive: true
            )
            
            await activity.update(using: newState)
            call.resolve()
        }
    }
    
    // End Live Activity when employee clocks out
    @objc func endEmployeeActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        
        Task {
            await endAllExistingActivities()
            
            // Clear shared data
            SharedDataManager.clearEmployeeShift()
            
            call.resolve()
        }
    }
    
    // Update admin widget data (list of clocked in employees)
    @objc func updateAdminData(_ call: CAPPluginCall) {
        guard let employeesArray = call.getArray("employees") as? [[String: Any]] else {
            call.reject("employees array is required")
            return
        }
        
        var clockedInEmployees: [SharedDataManager.ClockedInEmployee] = []
        
        for employeeDict in employeesArray {
            if let name = employeeDict["name"] as? String {
                let clockInTime: Date
                if let clockInTimeString = employeeDict["clockInTime"] as? String,
                   let parsedDate = ISO8601DateFormatter().date(from: clockInTimeString) {
                    clockInTime = parsedDate
                } else {
                    clockInTime = Date()
                }
                
                clockedInEmployees.append(SharedDataManager.ClockedInEmployee(
                    name: name,
                    clockInTime: clockInTime
                ))
            }
        }
        
        let adminData = SharedDataManager.AdminDashboardData(
            clockedInEmployees: clockedInEmployees,
            lastUpdated: Date()
        )
        
        SharedDataManager.saveAdminData(adminData)
        
        // Reload widget timeline
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "AdminClockedInWidget")
        }
        
        call.resolve()
    }
    
    @available(iOS 16.2, *)
    private func endAllExistingActivities() async {
        for activity in Activity<EmployeeShiftAttributes>.activities {
            let finalState = EmployeeShiftAttributes.ContentState(
                elapsedTime: 0,
                isActive: false
            )
            await activity.end(using: finalState, dismissalPolicy: .immediate)
        }
        currentActivity = nil
    }
}

// Also need to add SharedDataManager to the main app target
// This is a copy - make sure it matches the widget extension version
struct SharedDataManager {
    static let appGroupIdentifier = "group.com.thriftycurator.shared"
    
    static var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupIdentifier)
    }
    
    struct EmployeeShiftData: Codable {
        let employeeName: String
        let clockInTime: Date
        let isActive: Bool
    }
    
    static func saveEmployeeShift(_ data: EmployeeShiftData) {
        guard let defaults = sharedDefaults else { return }
        if let encoded = try? JSONEncoder().encode(data) {
            defaults.set(encoded, forKey: "currentEmployeeShift")
        }
    }
    
    static func getEmployeeShift() -> EmployeeShiftData? {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: "currentEmployeeShift"),
              let shift = try? JSONDecoder().decode(EmployeeShiftData.self, from: data) else {
            return nil
        }
        return shift
    }
    
    static func clearEmployeeShift() {
        sharedDefaults?.removeObject(forKey: "currentEmployeeShift")
    }
    
    struct ClockedInEmployee: Codable {
        let name: String
        let clockInTime: Date
    }
    
    struct AdminDashboardData: Codable {
        let clockedInEmployees: [ClockedInEmployee]
        let lastUpdated: Date
    }
    
    static func saveAdminData(_ data: AdminDashboardData) {
        guard let defaults = sharedDefaults else { return }
        if let encoded = try? JSONEncoder().encode(data) {
            defaults.set(encoded, forKey: "adminDashboardData")
        }
    }
    
    static func getAdminData() -> AdminDashboardData? {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: "adminDashboardData"),
              let adminData = try? JSONDecoder().decode(AdminDashboardData.self, from: data) else {
            return nil
        }
        return adminData
    }
}
