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
   * Get the device push token from the native LiveActivity plugin
   * This is more reliable than the Capacitor PushNotifications plugin
   * @returns {Promise<string|null>}
   */
  getDevicePushToken: async () => {
    try {
      if (!window.Capacitor?.isNativePlatform?.()) {
        console.log('Not native platform');
        return null;
      }
      
      const result = await LiveActivity.getDevicePushToken();
      if (result?.token) {
        console.log('Got device push token from LiveActivity plugin:', result.token.substring(0, 20) + '...');
        return result.token;
      }
      return null;
    } catch (error) {
      console.log('Failed to get device push token:', error);
      return null;
    }
  },

  /**
   * Register for regular push notifications and store the device token
   * This is needed for clock-out alerts, messages, etc.
   * @param {string} userId - User's ID
   * @param {string} userType - User type: "admin", "employee", or "consignor"
   */
  registerForPushNotifications: async (userId, userType = "admin") => {
    try {
      if (!window.Capacitor?.isNativePlatform?.()) {
        console.log('[LiveActivity] Not native platform, skipping push registration');
        return null;
      }

      console.log(`[LiveActivity] Starting push registration for ${userType}: ${userId}`);

      // First try to get token from our LiveActivity plugin (more reliable for iOS)
      try {
        const nativeToken = await LiveActivityService.getDevicePushToken();
        if (nativeToken && userId) {
          console.log(`[LiveActivity] Got token from native plugin, registering...`);
          await axios.post(`${API}/api/live-activity/register-device-token-typed`, {
            user_id: userId,
            device_token: nativeToken,
            user_type: userType
          });
          console.log(`[LiveActivity] Device push token registered successfully for ${userType}!`);
          localStorage.setItem('devicePushToken', nativeToken);
          return nativeToken;
        }
      } catch (nativeErr) {
        console.log('[LiveActivity] Native plugin not available, using Capacitor fallback');
      }

      // Check for cached token first - iOS only fires registration event once
      const cachedToken = localStorage.getItem('devicePushToken');
      if (cachedToken && userId) {
        console.log(`[LiveActivity] Using cached token for ${userType}`);
        try {
          await axios.post(`${API}/api/live-activity/register-device-token-typed`, {
            user_id: userId,
            device_token: cachedToken,
            user_type: userType
          });
          console.log(`[LiveActivity] Cached token registered successfully for ${userType}!`);
          return cachedToken;
        } catch (cacheErr) {
          console.error('[LiveActivity] Failed to register cached token:', cacheErr);
        }
      }

      // Fallback to Capacitor PushNotifications
      const currentStatus = await PushNotifications.checkPermissions();
      console.log('[LiveActivity] Permission status:', currentStatus);
      
      if (currentStatus.receive === 'denied') {
        console.log('[LiveActivity] Push notification permission was denied');
        return null;
      }
      
      if (currentStatus.receive !== 'granted') {
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive !== 'granted') {
          console.log('[LiveActivity] Push notification permission denied');
          return null;
        }
      }

      // Return a promise that resolves when we get the token
      return new Promise((resolve) => {
        // Longer timeout for iOS registration
        const timeout = setTimeout(() => {
          console.log('[LiveActivity] Registration timeout - using cached token if available');
          alert('Push Registration TIMEOUT after 15 seconds - no token received from iOS');
          const fallbackToken = localStorage.getItem('devicePushToken');
          if (fallbackToken && userId) {
            // Try to register the cached token
            axios.post(`${API}/api/live-activity/register-device-token-typed`, {
              user_id: userId,
              device_token: fallbackToken,
              user_type: userType
            }).then(() => {
              console.log('[LiveActivity] Fallback token registered');
              resolve(fallbackToken);
            }).catch(() => {
              resolve(null);
            });
          } else {
            resolve(null);
          }
        }, 15000); // 15 second timeout

        // Helper function to send token to backend
        const sendTokenToBackend = async (tokenValue) => {
          clearTimeout(timeout);
          console.log('[LiveActivity] Device push token received:', tokenValue?.substring(0, 30) + '...');
          
          // Always cache the token
          localStorage.setItem('devicePushToken', tokenValue);
          
          try {
            await axios.post(`${API}/api/live-activity/register-device-token-typed`, {
              user_id: userId,
              device_token: tokenValue,
              user_type: userType
            });
            console.log(`[LiveActivity] Device push token registered with backend for ${userType}`);
            resolve(tokenValue);
          } catch (error) {
            console.error('[LiveActivity] Failed to register device token:', error);
            resolve(null);
          }
        };

        // Remove any existing listeners first to avoid duplicates
        PushNotifications.removeAllListeners();

        // Set up listeners BEFORE registering
        console.log('[LiveActivity] Setting up registration listener...');
        PushNotifications.addListener('registration', (token) => {
          console.log('[LiveActivity] *** REGISTRATION EVENT FIRED ***');
          console.log('[LiveActivity] Token object:', JSON.stringify(token));
          // Show visible alert for debugging
          alert('Push Token Received! Token: ' + (token?.value ? token.value.substring(0, 20) + '...' : 'EMPTY'));
          if (token?.value) {
            sendTokenToBackend(token.value);
          } else {
            console.log('[LiveActivity] Registration event received but no token value');
            resolve(null);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.log('[LiveActivity] *** REGISTRATION ERROR EVENT ***');
          console.log('[LiveActivity] Error:', JSON.stringify(error));
          // Show visible alert for debugging
          alert('Push Registration ERROR: ' + JSON.stringify(error));
          clearTimeout(timeout);
          console.error('[LiveActivity] Push registration error:', error);
          resolve(null);
        });

        // Register with APNs - this should trigger 'registration' event
        console.log('[LiveActivity] Calling PushNotifications.register()...');
        PushNotifications.register().then(() => {
          console.log('[LiveActivity] PushNotifications.register() completed - waiting for registration event...');
        }).catch((regErr) => {
          console.error('[LiveActivity] PushNotifications.register() FAILED:', regErr);
          clearTimeout(timeout);
          resolve(null);
        });
      });
    } catch (error) {
      console.error('[LiveActivity] Failed to register for push notifications:', error);
      return null;
    }
  },

  // ============ EMPLOYEE METHODS ============

  /**
   * Start a Live Activity when employee clocks in
   * Registers push token with backend so admin can end it remotely
   * @param {Object} params
   * @param {string} params.employeeName - Employee's display name
   * @param {string} params.userId - Employee's user ID for token registration
   * @param {Date|string} params.clockInTime - Clock in timestamp
   * @returns {Promise<{activityId: string, pushToken: string}>}
   */
  startEmployeeActivity: async ({ employeeName, userId, clockInTime }) => {
    try {
      const supported = await LiveActivityService.isSupported();
      if (!supported) {
        console.log('Live Activities not supported, skipping');
        return null;
      }

      const clockInTimeString = clockInTime instanceof Date 
        ? clockInTime.toISOString() 
        : clockInTime;

      console.log('Starting Employee Live Activity...');
      
      // Start the activity
      const result = await LiveActivity.startEmployeeActivity({
        employeeName,
        clockInTime: clockInTimeString
      });
      
      console.log('Employee Live Activity started:', result.activityId, 'pushToken:', result.pushToken ? 'received' : 'none');
      
      // Try to register push token with backend
      let tokenRegistered = false;
      
      // Method 1: Use token from initial response
      if (result.pushToken && userId) {
        try {
          console.log('Registering employee Live Activity token from initial response...');
          await axios.post(`${API}/api/live-activity/register-token`, {
            user_id: userId,
            push_token: result.pushToken,
            activity_type: 'employee'
          });
          console.log('Employee Live Activity push token registered from initial response!');
          tokenRegistered = true;
        } catch (regError) {
          console.error('Failed to register employee Live Activity push token:', regError);
        }
      }
      
      // Method 2: If no token yet, wait and try to fetch it directly
      if (!tokenRegistered && userId) {
        console.log('No token in initial response, waiting and fetching...');
        
        // Wait 2 seconds for the token to be available
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const tokenResult = await LiveActivity.getEmployeeActivityPushToken();
          if (tokenResult.pushToken) {
            console.log('Got employee Live Activity token via direct fetch');
            await axios.post(`${API}/api/live-activity/register-token`, {
              user_id: userId,
              push_token: tokenResult.pushToken,
              activity_type: 'employee'
            });
            console.log('Employee Live Activity push token registered via direct fetch!');
            tokenRegistered = true;
          }
        } catch (fetchError) {
          console.log('Failed to fetch employee Live Activity token:', fetchError);
        }
      }
      
      // Method 3: Set up listener for late-arriving token
      if (!tokenRegistered) {
        console.log('Setting up listener for late-arriving token...');
        LiveActivity.addListener('employeePushTokenReceived', async (data) => {
          console.log('Received employeePushTokenReceived event:', data.pushToken ? 'has token' : 'no token');
          if (data.pushToken && userId) {
            try {
              console.log('Registering employee Live Activity token via listener...');
              await axios.post(`${API}/api/live-activity/register-token`, {
                user_id: userId,
                push_token: data.pushToken,
                activity_type: 'employee'
              });
              console.log('Employee Live Activity push token registered via listener!');
            } catch (regError) {
              console.error('Failed to register employee Live Activity push token:', regError);
            }
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to start Employee Live Activity:', error);
      return null;
    }
  },

  /**
   * End the Live Activity when employee clocks out
   * @param {string} userId - Employee's user ID for token unregistration
   * @returns {Promise<void>}
   */
  endEmployeeActivity: async (userId) => {
    try {
      const supported = await LiveActivityService.isSupported();
      if (!supported) return;

      await LiveActivity.endEmployeeActivity();
      console.log('Employee Live Activity ended');
      
      // Unregister push token from backend
      if (userId) {
        try {
          await axios.post(`${API}/api/live-activity/unregister-token`, null, {
            params: { user_id: userId, activity_type: 'employee' }
          });
          console.log('Employee Live Activity push token unregistered');
        } catch (unregError) {
          console.error('Failed to unregister employee Live Activity push token:', unregError);
        }
      }
    } catch (error) {
      console.error('Failed to end Employee Live Activity:', error);
    }
  },

  /**
   * Mark the employee's Live Activity as clocked out by admin
   * Updates the widget to show "Clocked out by admin" message without fully ending it
   * @param {number} totalHours - Total hours worked
   * @param {string} message - Message to display (default: "Clocked out by admin")
   * @returns {Promise<void>}
   */
  markClockedOutByAdmin: async (totalHours = 0, message = "Clocked out by admin") => {
    try {
      const supported = await LiveActivityService.isSupported();
      if (!supported) return;

      await LiveActivity.markEmployeeClockedOutByAdmin({
        totalHours: totalHours,
        message: message
      });
      console.log('Employee Live Activity marked as clocked out by admin');
    } catch (error) {
      console.error('Failed to mark employee clocked out by admin:', error);
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
