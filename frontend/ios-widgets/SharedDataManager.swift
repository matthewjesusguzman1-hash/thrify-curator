import Foundation

/// Manages shared data between the main app and widgets via App Groups
struct SharedDataManager {
    static let appGroupIdentifier = "group.com.thriftycurator.shared"
    
    static var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupIdentifier)
    }
    
    // MARK: - Employee Data (for Live Activity)
    
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
    
    // MARK: - Admin Data (for Lock Screen Widget)
    
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
