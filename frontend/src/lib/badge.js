import { Capacitor } from '@capacitor/core';
import { Badge } from '@capawesome/capacitor-badge';

/**
 * App Badge utility for iOS/Android
 * Shows a number badge on the app icon (like unread email count)
 */

const isNative = Capacitor.isNativePlatform();

/**
 * Check if badge is supported on this device
 */
export const isSupported = async () => {
  if (!isNative) return false;
  try {
    const result = await Badge.isSupported();
    return result.isSupported;
  } catch (e) {
    return false;
  }
};

/**
 * Request permission for badge (required on some devices)
 */
export const requestPermission = async () => {
  if (!isNative) return false;
  try {
    const result = await Badge.requestPermissions();
    return result.display === 'granted';
  } catch (e) {
    console.log('Badge permission error:', e);
    return false;
  }
};

/**
 * Set the app badge number
 * @param count - Number to display on app icon
 */
export const setBadge = async (count) => {
  if (!isNative) return;
  
  try {
    await Badge.set({ count });
    console.log(`Badge set to ${count}`);
  } catch (e) {
    console.log('Set badge error:', e);
  }
};

/**
 * Increase badge count by 1
 */
export const increaseBadge = async () => {
  if (!isNative) return;
  
  try {
    await Badge.increase();
  } catch (e) {
    console.log('Increase badge error:', e);
  }
};

/**
 * Decrease badge count by 1
 */
export const decreaseBadge = async () => {
  if (!isNative) return;
  
  try {
    await Badge.decrease();
  } catch (e) {
    console.log('Decrease badge error:', e);
  }
};

/**
 * Get current badge count
 */
export const getBadge = async () => {
  if (!isNative) return 0;
  
  try {
    const result = await Badge.get();
    return result.count;
  } catch (e) {
    console.log('Get badge error:', e);
    return 0;
  }
};

/**
 * Clear the app badge (set to 0)
 */
export const clearBadge = async () => {
  if (!isNative) return;
  
  try {
    await Badge.clear();
    console.log('Badge cleared');
  } catch (e) {
    console.log('Clear badge error:', e);
  }
};

const badge = {
  isSupported,
  requestPermission,
  set: setBadge,
  increase: increaseBadge,
  decrease: decreaseBadge,
  get: getBadge,
  clear: clearBadge,
  isNative
};

export default badge;
