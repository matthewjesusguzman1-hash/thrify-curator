import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Haptics utility for native app feedback
 * Only triggers on native platforms (iOS/Android), silently skips on web
 */

const isNative = Capacitor.isNativePlatform();

/**
 * Light haptic feedback - for subtle interactions
 * Use for: toggles, small buttons, selections
 */
export const hapticLight = async () => {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    console.log('Haptic not available');
  }
};

/**
 * Medium haptic feedback - for standard interactions
 * Use for: button presses, form submissions, navigation
 */
export const hapticMedium = async () => {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    console.log('Haptic not available');
  }
};

/**
 * Heavy haptic feedback - for significant actions
 * Use for: clock in/out, important confirmations, completing tasks
 */
export const hapticHeavy = async () => {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (e) {
    console.log('Haptic not available');
  }
};

/**
 * Success haptic feedback - for successful actions
 * Use for: form submission success, payment complete, login success
 */
export const hapticSuccess = async () => {
  if (!isNative) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (e) {
    console.log('Haptic not available');
  }
};

/**
 * Warning haptic feedback - for warnings
 * Use for: validation warnings, attention needed
 */
export const hapticWarning = async () => {
  if (!isNative) return;
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (e) {
    console.log('Haptic not available');
  }
};

/**
 * Error haptic feedback - for errors
 * Use for: form errors, failed actions, denied access
 */
export const hapticError = async () => {
  if (!isNative) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch (e) {
    console.log('Haptic not available');
  }
};

/**
 * Selection changed haptic - for picker/selection changes
 * Use for: dropdown selection, date picker, scroll selection
 */
export const hapticSelection = async () => {
  if (!isNative) return;
  try {
    await Haptics.selectionChanged();
  } catch (e) {
    console.log('Haptic not available');
  }
};

/**
 * Vibrate pattern - for custom vibration
 * Use for: alerts, notifications, custom patterns
 * @param duration - Duration in milliseconds (default 300ms)
 */
export const hapticVibrate = async (duration = 300) => {
  if (!isNative) return;
  try {
    await Haptics.vibrate({ duration });
  } catch (e) {
    console.log('Haptic not available');
  }
};

// Default export with all haptic functions
const haptics = {
  light: hapticLight,
  medium: hapticMedium,
  heavy: hapticHeavy,
  success: hapticSuccess,
  warning: hapticWarning,
  error: hapticError,
  selection: hapticSelection,
  vibrate: hapticVibrate,
  isNative
};

export default haptics;
