import { Capacitor } from '@capacitor/core';
import { LiveActivities } from 'capacitor-live-activities';

/**
 * Live Activities Service for Thrifty Curator
 * Manages iOS Lock Screen and Dynamic Island widgets
 * 
 * Features:
 * 1. Employee Shift Timer - Shows elapsed time while clocked in
 * 2. Admin Alerts - Shows count of employees currently working
 */

const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === 'ios';

// Activity IDs for tracking
const ACTIVITY_IDS = {
  SHIFT_TIMER: 'shift-timer',
  ADMIN_ALERTS: 'admin-alerts'
};

/**
 * Check if Live Activities are supported on this device
 */
export const isLiveActivitiesSupported = async () => {
  if (!isNative || !isIOS) return false;
  
  try {
    const result = await LiveActivities.areActivitiesEnabled();
    return result.enabled;
  } catch (e) {
    console.log('Live Activities not supported:', e);
    return false;
  }
};

/**
 * ============================================
 * EMPLOYEE SHIFT TIMER
 * Shows clock-in time counting up on lock screen
 * ============================================
 */

/**
 * Start the shift timer Live Activity when employee clocks in
 * @param employeeName - Name of the employee
 * @param clockInTime - ISO string of clock-in time
 * @param hourlyRate - Employee's hourly rate for earnings estimate
 */
export const startShiftTimer = async (employeeName, clockInTime, hourlyRate = 15.00) => {
  if (!isNative || !isIOS) {
    console.log('Live Activities only available on iOS');
    return null;
  }
  
  try {
    const clockInDate = new Date(clockInTime);
    
    // Create the Live Activity with timer
    const result = await LiveActivities.startActivity({
      activityId: ACTIVITY_IDS.SHIFT_TIMER,
      
      // Dynamic Island - Compact view (minimal)
      dynamic: {
        compactLeading: {
          type: 'text',
          value: '⏱️'
        },
        compactTrailing: {
          type: 'timer',
          value: clockInDate.toISOString()
        },
        
        // Dynamic Island - Expanded view (when held)
        expanded: {
          center: {
            type: 'text',
            value: `${employeeName}'s Shift`
          },
          bottom: {
            type: 'timer',
            value: clockInDate.toISOString()
          }
        },
        
        // Minimal view (very small Dynamic Island)
        minimal: {
          type: 'timer',
          value: clockInDate.toISOString()
        }
      },
      
      // Lock Screen widget content
      static: {
        // Title row
        title: {
          type: 'text',
          value: '🏪 Thrifty Curator'
        },
        
        // Main content - shift timer
        content: [
          {
            type: 'text',
            value: `${employeeName} - Clocked In`
          },
          {
            type: 'timer',
            value: clockInDate.toISOString(),
            style: 'timer' // Counts up from the start time
          }
        ],
        
        // Bottom row - hourly rate info
        footer: {
          type: 'text',
          value: `💰 $${hourlyRate.toFixed(2)}/hr`
        }
      }
    });
    
    console.log('Shift timer Live Activity started:', result);
    return result.activityId;
    
  } catch (e) {
    console.error('Failed to start shift timer:', e);
    return null;
  }
};

/**
 * Update the shift timer (e.g., to show updated earnings estimate)
 * @param currentEarnings - Current estimated earnings
 */
export const updateShiftTimer = async (currentEarnings) => {
  if (!isNative || !isIOS) return;
  
  try {
    await LiveActivities.updateActivity({
      activityId: ACTIVITY_IDS.SHIFT_TIMER,
      static: {
        footer: {
          type: 'text',
          value: `💰 Est: $${currentEarnings.toFixed(2)}`
        }
      }
    });
  } catch (e) {
    console.log('Failed to update shift timer:', e);
  }
};

/**
 * End the shift timer when employee clocks out
 * @param totalHours - Total hours worked
 * @param totalEarnings - Total earnings for the shift
 */
export const endShiftTimer = async (totalHours, totalEarnings) => {
  if (!isNative || !isIOS) return;
  
  try {
    // Update with final info before ending
    await LiveActivities.updateActivity({
      activityId: ACTIVITY_IDS.SHIFT_TIMER,
      static: {
        content: [
          {
            type: 'text',
            value: '✅ Shift Complete!'
          },
          {
            type: 'text',
            value: `${totalHours.toFixed(2)} hours worked`
          }
        ],
        footer: {
          type: 'text',
          value: `💰 Earned: $${totalEarnings.toFixed(2)}`
        }
      }
    });
    
    // End the activity after a short delay so user sees the final state
    setTimeout(async () => {
      try {
        await LiveActivities.endActivity({
          activityId: ACTIVITY_IDS.SHIFT_TIMER
        });
        console.log('Shift timer ended');
      } catch (e) {
        console.log('Failed to end shift timer:', e);
      }
    }, 3000);
    
  } catch (e) {
    console.error('Failed to end shift timer:', e);
  }
};

/**
 * ============================================
 * ADMIN ALERTS
 * Shows count of employees currently clocked in
 * ============================================
 */

/**
 * Start or update the admin alerts Live Activity
 * @param clockedInCount - Number of employees currently clocked in
 * @param employeeNames - Array of clocked-in employee names (max 3 shown)
 */
export const updateAdminAlerts = async (clockedInCount, employeeNames = []) => {
  if (!isNative || !isIOS) {
    console.log('Live Activities only available on iOS');
    return null;
  }
  
  try {
    // Check if activity already exists
    const activities = await LiveActivities.getActivities();
    const existingActivity = activities.activities?.find(
      a => a.activityId === ACTIVITY_IDS.ADMIN_ALERTS
    );
    
    const namesDisplay = employeeNames.slice(0, 3).join(', ');
    const moreCount = employeeNames.length > 3 ? ` +${employeeNames.length - 3} more` : '';
    
    const activityData = {
      activityId: ACTIVITY_IDS.ADMIN_ALERTS,
      
      // Dynamic Island
      dynamic: {
        compactLeading: {
          type: 'text',
          value: '👥'
        },
        compactTrailing: {
          type: 'text',
          value: `${clockedInCount}`
        },
        expanded: {
          center: {
            type: 'text',
            value: 'Employees Working'
          },
          bottom: {
            type: 'text',
            value: clockedInCount > 0 ? `${namesDisplay}${moreCount}` : 'No one clocked in'
          }
        },
        minimal: {
          type: 'text',
          value: `${clockedInCount}`
        }
      },
      
      // Lock Screen
      static: {
        title: {
          type: 'text',
          value: '🏪 Thrifty Curator Admin'
        },
        content: [
          {
            type: 'text',
            value: clockedInCount > 0 
              ? `👥 ${clockedInCount} Employee${clockedInCount !== 1 ? 's' : ''} Working`
              : '😴 No Employees Clocked In'
          },
          {
            type: 'text',
            value: clockedInCount > 0 ? `${namesDisplay}${moreCount}` : 'All shifts complete'
          }
        ]
      }
    };
    
    if (existingActivity) {
      // Update existing activity
      await LiveActivities.updateActivity(activityData);
      console.log('Admin alerts updated');
    } else {
      // Start new activity
      await LiveActivities.startActivity(activityData);
      console.log('Admin alerts started');
    }
    
    return ACTIVITY_IDS.ADMIN_ALERTS;
    
  } catch (e) {
    console.error('Failed to update admin alerts:', e);
    return null;
  }
};

/**
 * End the admin alerts Live Activity
 */
export const endAdminAlerts = async () => {
  if (!isNative || !isIOS) return;
  
  try {
    await LiveActivities.endActivity({
      activityId: ACTIVITY_IDS.ADMIN_ALERTS
    });
    console.log('Admin alerts ended');
  } catch (e) {
    console.log('Failed to end admin alerts:', e);
  }
};

/**
 * ============================================
 * UTILITY FUNCTIONS
 * ============================================
 */

/**
 * Get all active Live Activities
 */
export const getActiveActivities = async () => {
  if (!isNative || !isIOS) return [];
  
  try {
    const result = await LiveActivities.getActivities();
    return result.activities || [];
  } catch (e) {
    console.log('Failed to get activities:', e);
    return [];
  }
};

/**
 * End all Live Activities
 */
export const endAllActivities = async () => {
  if (!isNative || !isIOS) return;
  
  try {
    await LiveActivities.endAllActivities();
    console.log('All Live Activities ended');
  } catch (e) {
    console.log('Failed to end all activities:', e);
  }
};

/**
 * Listen for Live Activity events (e.g., when user taps on it)
 */
export const addActivityListener = (callback) => {
  if (!isNative || !isIOS) return () => {};
  
  try {
    const listener = LiveActivities.addListener('activityUpdate', callback);
    return () => listener.remove();
  } catch (e) {
    console.log('Failed to add listener:', e);
    return () => {};
  }
};

// Export all functions as default object
const liveActivities = {
  isSupported: isLiveActivitiesSupported,
  
  // Shift Timer
  startShiftTimer,
  updateShiftTimer,
  endShiftTimer,
  
  // Admin Alerts
  updateAdminAlerts,
  endAdminAlerts,
  
  // Utilities
  getActiveActivities,
  endAllActivities,
  addActivityListener,
  
  // Constants
  ACTIVITY_IDS,
  isNative,
  isIOS
};

export default liveActivities;
