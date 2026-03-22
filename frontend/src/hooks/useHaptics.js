import { useCallback } from 'react';

// Check if running in Capacitor native app
const isNative = () => {
  return window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative || false;
};

// Dynamically import the haptics plugin
let Haptics = null;
let ImpactStyle = null;
let NotificationType = null;

const loadHapticsPlugin = async () => {
  if (isNative() && !Haptics) {
    try {
      const module = await import('@capacitor/haptics');
      Haptics = module.Haptics;
      ImpactStyle = module.ImpactStyle;
      NotificationType = module.NotificationType;
      return true;
    } catch (error) {
      console.log('Haptics plugin not available:', error);
      return false;
    }
  }
  return !!Haptics;
};

// Initialize on module load
loadHapticsPlugin();

/**
 * Haptic feedback utility hook
 * 
 * Impact styles (for button presses):
 * - light: Subtle feedback for navigation, toggles, selections
 * - medium: Standard feedback for most button presses
 * - heavy: Strong feedback for important actions (clock in/out, submit, confirm)
 * 
 * Notification types (for action results):
 * - success: Positive outcome (payment processed, form submitted)
 * - warning: Caution needed (leaving area, low balance)
 * - error: Something went wrong (validation failed, error occurred)
 */
export const useHaptics = () => {
  
  // Impact feedback - for button presses
  const impact = useCallback(async (style = 'medium') => {
    if (!isNative()) return;
    
    await loadHapticsPlugin();
    if (!Haptics || !ImpactStyle) return;
    
    try {
      const styleMap = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: styleMap[style] || ImpactStyle.Medium });
    } catch (error) {
      console.log('Haptic impact failed:', error);
    }
  }, []);
  
  // Notification feedback - for action results
  const notification = useCallback(async (type = 'success') => {
    if (!isNative()) return;
    
    await loadHapticsPlugin();
    if (!Haptics || !NotificationType) return;
    
    try {
      const typeMap = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      };
      await Haptics.notification({ type: typeMap[type] || NotificationType.Success });
    } catch (error) {
      console.log('Haptic notification failed:', error);
    }
  }, []);
  
  // Selection feedback - very light, for UI selections
  const selection = useCallback(async () => {
    if (!isNative()) return;
    
    await loadHapticsPlugin();
    if (!Haptics) return;
    
    try {
      await Haptics.selectionStart();
      await Haptics.selectionEnd();
    } catch (error) {
      console.log('Haptic selection failed:', error);
    }
  }, []);
  
  // Vibrate - for longer attention-grabbing feedback
  const vibrate = useCallback(async (duration = 300) => {
    if (!isNative()) return;
    
    await loadHapticsPlugin();
    if (!Haptics) return;
    
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.log('Haptic vibrate failed:', error);
    }
  }, []);
  
  // Convenience methods for common actions
  const buttonPress = useCallback(() => impact('medium'), [impact]);
  const lightTap = useCallback(() => impact('light'), [impact]);
  const heavyPress = useCallback(() => impact('heavy'), [impact]);
  const successFeedback = useCallback(() => notification('success'), [notification]);
  const warningFeedback = useCallback(() => notification('warning'), [notification]);
  const errorFeedback = useCallback(() => notification('error'), [notification]);
  
  return {
    // Core methods
    impact,
    notification,
    selection,
    vibrate,
    // Convenience methods
    buttonPress,      // Standard button press
    lightTap,         // Navigation, toggles, selections
    heavyPress,       // Important actions (clock in/out, submit)
    successFeedback,  // Action succeeded
    warningFeedback,  // Caution/warning
    errorFeedback,    // Error occurred
  };
};

// Standalone functions for use outside React components
export const hapticImpact = async (style = 'medium') => {
  if (!isNative()) return;
  await loadHapticsPlugin();
  if (!Haptics || !ImpactStyle) return;
  
  const styleMap = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  };
  
  try {
    await Haptics.impact({ style: styleMap[style] || ImpactStyle.Medium });
  } catch (error) {
    console.log('Haptic impact failed:', error);
  }
};

export const hapticNotification = async (type = 'success') => {
  if (!isNative()) return;
  await loadHapticsPlugin();
  if (!Haptics || !NotificationType) return;
  
  const typeMap = {
    success: NotificationType.Success,
    warning: NotificationType.Warning,
    error: NotificationType.Error,
  };
  
  try {
    await Haptics.notification({ type: typeMap[type] || NotificationType.Success });
  } catch (error) {
    console.log('Haptic notification failed:', error);
  }
};

export default useHaptics;
