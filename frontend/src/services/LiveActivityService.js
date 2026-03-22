import { registerPlugin } from '@capacitor/core';

// Define the plugin interface
const LiveActivity = registerPlugin('LiveActivity');

/**
 * Live Activity service for iOS
 * Manages employee shift timers on Lock Screen & Dynamic Island
 */
export const LiveActivityService = {
  /**
   * Check if Live Activities are supported on this device
   * @returns {Promise<boolean>}
   */
  isSupported: async () => {
    try {
      // Only available on native iOS
      if (!window.Capacitor?.isNativePlatform?.()) {
        return false;
      }
      
      const result = await LiveActivity.isSupported();
      return result.supported;
    } catch (error) {
      console.log('Live Activities not supported:', error);
      return false;
    }
  },

  /**
   * Start a Live Activity when employee clocks in
   * Shows real-time timer on Lock Screen and Dynamic Island
   * @param {Object} params
   * @param {string} params.employeeName - Employee's display name
   * @param {Date|string} params.clockInTime - Clock in timestamp
   * @returns {Promise<{activityId: string}>}
   */
  startEmployeeActivity: async ({ employeeName, clockInTime }) => {
    try {
      const supported = await LiveActivityService.isSupported();
      if (!supported) {
        console.log('Live Activities not supported, skipping');
        return null;
      }

      // Convert Date to ISO string if needed
      const clockInTimeString = clockInTime instanceof Date 
        ? clockInTime.toISOString() 
        : clockInTime;

      const result = await LiveActivity.startEmployeeActivity({
        employeeName,
        clockInTime: clockInTimeString
      });
      
      console.log('Live Activity started:', result.activityId);
      return result;
    } catch (error) {
      console.error('Failed to start Live Activity:', error);
      return null;
    }
  },

  /**
   * End the Live Activity when employee clocks out
   * @returns {Promise<void>}
   */
  endEmployeeActivity: async () => {
    try {
      const supported = await LiveActivityService.isSupported();
      if (!supported) {
        return;
      }

      await LiveActivity.endEmployeeActivity();
      console.log('Live Activity ended');
    } catch (error) {
      console.error('Failed to end Live Activity:', error);
    }
  },

  /**
   * Update admin widget with current clocked-in employees
   * Call this whenever the clocked-in employee list changes
   * @param {Array<{name: string, clockInTime: Date|string}>} employees
   * @returns {Promise<void>}
   */
  updateAdminWidget: async (employees) => {
    try {
      // Only works on native iOS
      if (!window.Capacitor?.isNativePlatform?.()) {
        return;
      }

      // Format employees for native code
      const formattedEmployees = employees.map(emp => ({
        name: emp.name,
        clockInTime: emp.clockInTime instanceof Date 
          ? emp.clockInTime.toISOString() 
          : emp.clockInTime
      }));

      await LiveActivity.updateAdminData({
        employees: formattedEmployees
      });
      
      console.log('Admin widget updated with', employees.length, 'employees');
    } catch (error) {
      console.error('Failed to update admin widget:', error);
    }
  }
};

export default LiveActivityService;
