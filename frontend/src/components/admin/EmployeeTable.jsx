import { Clock, User } from "lucide-react";

export default function EmployeeTable({ employees, summary, onEmployeeClick }) {
  const formatHours = (hours) => {
    return typeof hours === 'number' ? hours.toFixed(2) : '0.00';
  };

  // Get hours by employee from summary
  const getEmployeeHours = (employeeId) => {
    const empData = summary.by_employee?.find(e => e.user_id === employeeId);
    return empData ? empData.total_hours : 0;
  };

  const getEmployeeShifts = (employeeId) => {
    const empData = summary.by_employee?.find(e => e.user_id === employeeId);
    return empData ? empData.shift_count : 0;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]" />
      <div className="p-6">
        <h2 className="font-poppins text-xl font-semibold text-[#1A1A2E] mb-4">Hours by Employee</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="employee-hours-table">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">EMPLOYEE</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">TOTAL HOURS</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">SHIFTS</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">HOURLY RATE</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr 
                  key={emp.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onEmployeeClick?.(emp)}
                  data-testid={`employee-row-${emp.id}`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-[#8B5CF6]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A2E] hover:text-[#00D4FF] transition-colors">
                          {emp.name}
                        </p>
                        <p className="text-sm text-gray-500">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#00D4FF]/10 rounded-full text-sm font-medium text-[#0891B2]">
                      <Clock className="w-3 h-3" />
                      {formatHours(getEmployeeHours(emp.id))} hrs
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gray-600 font-medium">
                      {getEmployeeShifts(emp.id)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gray-600 font-medium">
                      ${emp.hourly_rate?.toFixed(2) || '(default)'}
                    </span>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-gray-500">
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
