/**
 * iOS Quick Actions (Long-Press Shortcuts) Handler
 * 
 * Handles shortcuts defined in Info.plist:
 * - StartTrip: Begin GPS mileage tracking
 * - LogMiles: Open manual trip entry form
 * - ClockIn: Navigate to clock in/out
 */

// Store callbacks for different shortcut actions
let shortcutCallbacks = {
  StartTrip: null,
  LogMiles: null,
  ClockIn: null
};

// Track initialization state
let isInitialized = false;

/**
 * Check if we're running on a native platform
 */
const isNativePlatform = () => {
  try {
    return window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative || false;
  } catch {
    return false;
  }
};

/**
 * Initialize the shortcut handler
 * Call this once when the app starts (in App.js or main component)
 */
export const initShortcutHandler = async () => {
  if (isInitialized) {
    console.log('[Shortcuts] Already initialized');
    return;
  }
  
  if (!isNativePlatform()) {
    console.log('[Shortcuts] Not on native platform, skipping initialization');
    isInitialized = true;
    return;
  }

  try {
    // Dynamic import to avoid build errors when Capacitor isn't available
    const { App } = await import('@capacitor/app');
    
    // Listen for app state changes to check for pending shortcuts
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        checkPendingShortcut();
      }
    });

    // Listen for app URL open (backup method)
    App.addListener('appUrlOpen', ({ url }) => {
      console.log('[Shortcuts] App opened with URL:', url);
      if (url.includes('shortcut')) {
        try {
          const action = new URL(url).searchParams.get('action');
          if (action) {
            handleShortcutAction(action);
          }
        } catch (e) {
          console.error('[Shortcuts] Error parsing URL:', e);
        }
      }
    });

    // Check immediately in case app was launched via shortcut
    setTimeout(() => {
      checkPendingShortcut();
    }, 500);

    console.log('[Shortcuts] Handler initialized');
  } catch (error) {
    console.log('[Shortcuts] Capacitor App plugin not available:', error.message);
  }
  
  isInitialized = true;
};

/**
 * Check for pending shortcut action stored in localStorage
 */
const checkPendingShortcut = () => {
  try {
    const pendingAction = localStorage.getItem('pendingShortcutAction');
    if (pendingAction) {
      console.log('[Shortcuts] Found pending action:', pendingAction);
      localStorage.removeItem('pendingShortcutAction');
      handleShortcutAction(pendingAction);
    }
  } catch (error) {
    console.error('[Shortcuts] Error checking pending shortcut:', error);
  }
};

/**
 * Handle the shortcut action
 */
const handleShortcutAction = (action) => {
  console.log('[Shortcuts] Handling action:', action);
  
  const callback = shortcutCallbacks[action];
  if (callback && typeof callback === 'function') {
    callback();
  } else {
    console.warn('[Shortcuts] No callback registered for action:', action);
    // Fallback: dispatch custom event that components can listen to
    window.dispatchEvent(new CustomEvent('shortcutAction', { 
      detail: { action } 
    }));
  }
};

/**
 * Register a callback for a specific shortcut action
 * 
 * @param {string} action - The shortcut type (StartTrip, LogMiles, ClockIn)
 * @param {function} callback - Function to call when shortcut is triggered
 */
export const registerShortcutCallback = (action, callback) => {
  if (Object.prototype.hasOwnProperty.call(shortcutCallbacks, action)) {
    shortcutCallbacks[action] = callback;
    console.log('[Shortcuts] Registered callback for:', action);
  } else {
    console.warn('[Shortcuts] Unknown shortcut action:', action);
  }
};

/**
 * Unregister a callback for a specific shortcut action
 * 
 * @param {string} action - The shortcut type to unregister
 */
export const unregisterShortcutCallback = (action) => {
  if (Object.prototype.hasOwnProperty.call(shortcutCallbacks, action)) {
    shortcutCallbacks[action] = null;
    console.log('[Shortcuts] Unregistered callback for:', action);
  }
};

/**
 * Hook for React components to handle shortcuts
 * Usage: useShortcut('StartTrip', () => { startGpsTracking() });
 */
export const useShortcut = (action, callback) => {
  // This is a simple implementation - for React, you'd use useEffect
  registerShortcutCallback(action, callback);
  
  // Return cleanup function
  return () => unregisterShortcutCallback(action);
};

export default {
  initShortcutHandler,
  registerShortcutCallback,
  unregisterShortcutCallback,
  useShortcut
};
