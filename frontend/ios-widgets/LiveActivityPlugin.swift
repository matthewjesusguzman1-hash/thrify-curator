import Foundation
import Capacitor
import ActivityKit
import WidgetKit
import UserNotifications

// Define EmployeeShiftAttributes here so it's available in the App target
struct EmployeeShiftAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var elapsedTime: TimeInterval
        var isActive: Bool
    }
    
    var employeeName: String
    var clockInTime: Date
}

// Define AdminShiftAttributes for admin monitoring
struct AdminShiftAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var employeeCount: Int
        var employeeNames: [String]
        var lastUpdated: Double  // Unix timestamp for easier decoding from push
    }
    
    var adminName: String
    var startedAt: Date
}

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startEmployeeActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateEmployeeActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endEmployeeActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startAdminActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateAdminActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endAdminActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateAdminData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDevicePushToken", returnType: CAPPluginReturnPromise)
    ]
    
    private var currentEmployeeActivity: Activity<EmployeeShiftAttributes>?
    private var currentAdminActivity: Activity<AdminShiftAttributes>?
    private static var cachedDeviceToken: String?
    
    // MARK: - Device Push Token Methods
    
    // Static method to cache the device token from AppDelegate
    public static func cacheDeviceToken(_ token: Data) {
        let tokenParts = token.map { data in String(format: "%02.2hhx", data) }
        cachedDeviceToken = tokenParts.joined()
        print("LiveActivityPlugin: Cached device push token: \(cachedDeviceToken ?? "nil")")
        
        // Also store in UserDefaults for persistence
        UserDefaults.standard.set(cachedDeviceToken, forKey: "cachedDevicePushToken")
    }
    
    // Method to get the device push token
    @objc func getDevicePushToken(_ call: CAPPluginCall) {
        // First check memory cache
        if let token = LiveActivityPlugin.cachedDeviceToken {
            print("Returning cached device push token from memory")
            call.resolve(["token": token])
            return
        }
        
        // Then check UserDefaults
        if let storedToken = UserDefaults.standard.string(forKey: "cachedDevicePushToken") {
            LiveActivityPlugin.cachedDeviceToken = storedToken
            print("Returning cached device push token from UserDefaults")
            call.resolve(["token": storedToken])
            return
        }
        
        // No cached token - need to register for notifications
        print("No cached device push token found, requesting registration...")
        
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                
                // Wait briefly for token to be cached
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    if let token = LiveActivityPlugin.cachedDeviceToken {
                        call.resolve(["token": token])
                    } else if let storedToken = UserDefaults.standard.string(forKey: "cachedDevicePushToken") {
                        call.resolve(["token": storedToken])
                    } else {
                        call.resolve(["token": ""])
                    }
                }
            } else {
                call.resolve(["token": "", "error": error?.localizedDescription ?? "Permission denied"])
            }
        }
    }
    
    // Check if Live Activities are supported
    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            let supported = ActivityAuthorizationInfo().areActivitiesEnabled
            call.resolve(["supported": supported])
        } else {
            call.resolve(["supported": false])
        }
    }
    
    // MARK: - Employee Activity Methods
    
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
        
        let clockInTime: Date
        if let clockInTimeString = call.getString("clockInTime"),
           let parsedDate = ISO8601DateFormatter().date(from: clockInTimeString) {
            clockInTime = parsedDate
        } else {
            clockInTime = Date()
        }
        
        Task {
            await self.endAllEmployeeActivities()
            
            let attributes = EmployeeShiftAttributes(
                employeeName: employeeName,
                clockInTime: clockInTime
            )
            
            let initialState = EmployeeShiftAttributes.ContentState(
                elapsedTime: Date().timeIntervalSince(clockInTime),
                isActive: true
            )
            
            let content = ActivityContent(state: initialState, staleDate: nil)
            
            do {
                // Request activity WITH push token for remote end support
                let activity = try Activity.request(
                    attributes: attributes,
                    content: content,
                    pushType: .token  // Enable push updates so admin can end remotely!
                )
                self.currentEmployeeActivity = activity
                
                let shiftData = SharedDataManager.EmployeeShiftData(
                    employeeName: employeeName,
                    clockInTime: clockInTime,
                    isActive: true
                )
                SharedDataManager.saveEmployeeShift(shiftData)
                
                // Get the push token for this Live Activity
                var pushTokenString: String? = nil
                
                // Observe push token updates - token will be sent via listener
                Task {
                    for await pushToken in activity.pushTokenUpdates {
                        let tokenParts = pushToken.map { data in String(format: "%02.2hhx", data) }
                        pushTokenString = tokenParts.joined()
                        print("Employee Live Activity push token: \(pushTokenString ?? "nil")")
                        
                        // Notify JS about the token so it can be registered with backend
                        self.notifyListeners("employeePushTokenReceived", data: [
                            "pushToken": pushTokenString ?? ""
                        ])
                    }
                }
                
                // Wait briefly for token (same as admin which works)
                try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                
                print("Returning employee activity with pushToken: \(pushTokenString ?? "nil")")
                
                call.resolve([
                    "activityId": activity.id,
                    "pushToken": pushTokenString ?? ""
                ])
            } catch {
                call.reject("Failed to start Live Activity: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func updateEmployeeActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        
        guard let activity = currentEmployeeActivity else {
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
    
    @objc func endEmployeeActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        
        Task {
            await self.endAllEmployeeActivities()
            SharedDataManager.clearEmployeeShift()
            call.resolve()
        }
    }
    
    // MARK: - Admin Activity Methods (with Push Token for real-time updates)
    
    @objc func startAdminActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are disabled")
            return
        }
        
        let adminName = call.getString("adminName") ?? "Admin"
        let employeeCount = call.getInt("employeeCount") ?? 0
        let employeeNames = call.getArray("employeeNames", String.self) ?? []
        
        Task {
            await self.endAllAdminActivities()
            
            let attributes = AdminShiftAttributes(
                adminName: adminName,
                startedAt: Date()
            )
            
            let initialState = AdminShiftAttributes.ContentState(
                employeeCount: employeeCount,
                employeeNames: employeeNames,
                lastUpdated: Date().timeIntervalSince1970
            )
            
            let content = ActivityContent(state: initialState, staleDate: nil)
            
            do {
                // Request activity WITH push token for remote updates
                let activity = try Activity.request(
                    attributes: attributes,
                    content: content,
                    pushType: .token  // Enable push updates!
                )
                self.currentAdminActivity = activity
                
                // Get the push token and return it
                var pushTokenString: String? = nil
                
                // Observe push token updates
                Task {
                    for await pushToken in activity.pushTokenUpdates {
                        let tokenParts = pushToken.map { data in String(format: "%02.2hhx", data) }
                        pushTokenString = tokenParts.joined()
                        print("Admin Live Activity push token: \(pushTokenString ?? "nil")")
                        
                        // Notify JS about the token
                        self.notifyListeners("adminPushTokenReceived", data: [
                            "pushToken": pushTokenString ?? ""
                        ])
                    }
                }
                
                // Wait briefly for token
                try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                
                call.resolve([
                    "activityId": activity.id,
                    "pushToken": pushTokenString ?? ""
                ])
            } catch {
                call.reject("Failed to start Admin Live Activity: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func updateAdminActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        
        let employeeCount = call.getInt("employeeCount") ?? 0
        let employeeNames = call.getArray("employeeNames", String.self) ?? []
        
        Task {
            if let activity = self.currentAdminActivity {
                let newState = AdminShiftAttributes.ContentState(
                    employeeCount: employeeCount,
                    employeeNames: employeeNames,
                    lastUpdated: Date().timeIntervalSince1970
                )
                await activity.update(using: newState)
                call.resolve()
            } else {
                for activity in Activity<AdminShiftAttributes>.activities {
                    let newState = AdminShiftAttributes.ContentState(
                        employeeCount: employeeCount,
                        employeeNames: employeeNames,
                        lastUpdated: Date().timeIntervalSince1970
                    )
                    await activity.update(using: newState)
                    self.currentAdminActivity = activity
                    call.resolve()
                    return
                }
                call.reject("No active Admin Live Activity")
            }
        }
    }
    
    @objc func endAdminActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        
        Task {
            await self.endAllAdminActivities()
            call.resolve()
        }
    }
    
    // Update admin widget data (for static widget)
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
        WidgetCenter.shared.reloadTimelines(ofKind: "AdminClockedInWidget")
        
        call.resolve()
    }
    
    // MARK: - Helper Methods
    
    @available(iOS 16.2, *)
    private func endAllEmployeeActivities() async {
        for activity in Activity<EmployeeShiftAttributes>.activities {
            let finalState = EmployeeShiftAttributes.ContentState(
                elapsedTime: 0,
                isActive: false
            )
            await activity.end(using: finalState, dismissalPolicy: .immediate)
        }
        currentEmployeeActivity = nil
    }
    
    @available(iOS 16.2, *)
    private func endAllAdminActivities() async {
        for activity in Activity<AdminShiftAttributes>.activities {
            let finalState = AdminShiftAttributes.ContentState(
                employeeCount: 0,
                employeeNames: [],
                lastUpdated: Date().timeIntervalSince1970
            )
            await activity.end(using: finalState, dismissalPolicy: .immediate)
        }
        currentAdminActivity = nil
    }
}

// SharedDataManager for App target
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
