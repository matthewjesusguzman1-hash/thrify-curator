import { registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Define the plugin interface
const LiveActivity = registerPlugin('LiveActivity');

/**
 * Live Activity service for iOS
 * Manages employee shift timers and admin monitoring on Lock Screen & Dynamic Island
 */
export const LiveActivityService = {
  /**
   * Check if Live Activities are supported on this device
   * @returns {Promise<boolean>}
   */
  isSupported: async () => {
    try {
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
   * Register for regular push notifications and store the device token
   * This is needed for clock-out alerts
   */
  registerForPushNotifications: async (userId) => {
    try {
      if (!window.Capacitor?.isNativePlatform?.()) {
        console.log('Not native platform, skipping push registration');
        return null;
      }

      // Request permission
      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      // Check if we already have a delivery token (from previous registration)
      try {
        const deliveryStatus = await PushNotifications.getDeliveredNotifications();
        console.log('Push delivery status check:', deliveryStatus);
      } catch (e) {
        // Ignore - just for debugging
      }

      // Return a promise that resolves when we get the token
      return new Promise((resolve) => {
        // Set a timeout in case token never arrives
        const timeout = setTimeout(() => {
          console.log('Push token registration timed out - trying fallback');
          resolve(null);
        }, 5000); // 5 second timeout

        // Helper function to send token to backend
        const sendTokenToBackend = async (tokenValue) => {
          clearTimeout(timeout);
          console.log('Device push token received:', tokenValue);
          
          try {
            await axios.post(`${API}/api/live-activity/register-device-token`, {
              user_id: userId,
              device_token: tokenValue
            });
            console.log('Device push token registered with backend');
            resolve(true);
          } catch (error) {
            console.error('Failed to register device token:', error);
            resolve(false);
          }
        };

        // Remove any existing listeners first to avoid duplicates
        PushNotifications.removeAllListeners();

        // Set up listeners BEFORE registering
        PushNotifications.addListener('registration', (token) => {
          sendTokenToBackend(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          clearTimeout(timeout);
          console.error('Push registration error:', error);
          resolve(false);
        });

        // Listen for incoming notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
        });

        // Register with APNs - this should trigger 'registration' event
        // Even if already registered, calling register() should return the cached token
        PushNotifications.register().then(() => {
          console.log('PushNotifications.register() completed');
        }).catch(err => {
          console.error('PushNotifications.register() error:', err);
        });
      });
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  },

  // ============ EMPLOYEE METHODS ============

  /**
   * Start a Live Activity when employee clocks in
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

      const clockInTimeString = clockInTime instanceof Date 
        ? clockInTime.toISOString() 
        : clockInTime;

      const result = await LiveActivity.startEmployeeActivity({
        employeeName,
        clockInTime: clockInTimeString
      });
      
      console.log('Employee Live Activity started:', result.activityId);
      return result;
    } catch (error) {
      console.error('Failed to start Employee Live Activity:', error);
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
      if (!supported) return;

      await LiveActivity.endEmployeeActivity();
      console.log('Employee Live Activity ended');
    } catch (error) {
      console.error('Failed to end Employee Live Activity:', error);
    }
  },

  // ============ ADMIN METHODS ============

  /**
   * Start admin monitoring Live Activity with push support
   * Shows real-time count of clocked-in employees
   * Registers push token with backend for remote updates
   * @param {Object} params
   * @param {string} params.adminName - Admin's display name
   * @param {string} params.userId - Admin's user ID for token registration
   * @param {number} params.employeeCount - Current count of clocked-in employees
   * @param {string[]} params.employeeNames - Names of clocked-in employees
   * @returns {Promise<{activityId: string, pushToken: string}>}
   */
  startAdminActivity: async ({ adminName, userId, employeeCount, employeeNames }) => {
    try {
      const supported = await LiveActivityService.isSupported();
      if (!supported) {
        console.log('Live Activities not supported, skipping');
        return null;
      }

      const result = await LiveActivity.startAdminActivity({
        adminName: adminName || 'Admin',
        employeeCount: employeeCount || 0,
        employeeNames: employeeNames || []
      });
      
      console.log('Admin Live Activity started:', result.activityId);
      
      // Register push token with backend for remote updates
      if (result.pushToken && userId) {
        try {
          await axios.post(`${API}/api/live-activity/register-token`, {
            user_id: userId,
            push_token: result.pushToken,
            activity_type: 'admin'
          });
          console.log('Admin push token registered with backend');
        } catch (regError) {
          console.error('Failed to register push token:', regError);
        }
      }
      
      // Listen for push token updates (token might come later)
      LiveActivity.addListener('adminPushTokenReceived', async (data) => {
        if (data.pushToken && userId) {
          try {
            await axios.post(`${API}/api/live-activity/register-token`, {
              user_id: userId,
              push_token: data.pushToken,
              activity_type: 'admin'
            });
            console.log('Admin push token updated with backend');
          } catch (regError) {
            console.error('Failed to update push token:', regError);
          }
        }
      });
      
      return result;
    } catch (error) {
      console.error('Failed to start Admin Live Activity:', error);
      return null;
    }
  },

  /**
   * Update admin Live Activity with new employee data (local update)
   * Call this whenever employees clock in/out and app is open
   * @param {Object} params
   * @param {number} params.employeeCount - Current count of clocked-in employees
   * @param {string[]} params.employeeNames - Names of clocked-in employees
   * @returns {Promise<void>}
   */
  updateAdminActivity: async ({ employeeCount, employeeNames }) => {
    try {
      const supported = await LiveActivityService.isSupported();
      if (!supported) return;

      await LiveActivity.updateAdminActivity({
        employeeCount: employeeCount || 0,
        employeeNames: employeeNames || []
      });
      
      console.log('Admin Live Activity updated:', employeeCount, 'employees');
    } catch (error) {
      console.error('Failed to update Admin Live Activity:', error);
    }
  },

  /**
   * End admin monitoring Live Activity
   * @param {string} userId - Admin's user ID for token unregistration
   * @returns {Promise<void>}
   */
  endAdminActivity: async (userId) => {
    try {
      const supported = await LiveActivityService.isSupported();
      if (!supported) return;

      await LiveActivity.endAdminActivity();
      console.log('Admin Live Activity ended');
      
      // Unregister push token
      if (userId) {
        try {
          await axios.post(`${API}/api/live-activity/unregister-token`, null, {
            params: { user_id: userId, activity_type: 'admin' }
          });
          console.log('Admin push token unregistered');
        } catch (unregError) {
          console.error('Failed to unregister push token:', unregError);
        }
      }
    } catch (error) {
      console.error('Failed to end Admin Live Activity:', error);
    }
  },

  // ============ WIDGET METHODS ============

  /**
   * Update admin widget with current clocked-in employees (for static widget)
   * @param {Array<{name: string, clockInTime: Date|string}>} employees
   * @returns {Promise<void>}
   */
  updateAdminWidget: async (employees) => {
    try {
      if (!window.Capacitor?.isNativePlatform?.()) {
        return;
      }

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
