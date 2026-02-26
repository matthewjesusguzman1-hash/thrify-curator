import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Round decimal hours to nearest minute and return as decimal hours
 * Used for pay calculations to match displayed time
 * @param {number} decimalHours - Hours in decimal format
 * @returns {number} Hours rounded to nearest minute as decimal
 */
export function roundHoursToMinute(decimalHours) {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) {
    return 0;
  }
  const totalMinutes = Math.round(decimalHours * 60);
  return totalMinutes / 60;
}

/**
 * Format decimal hours to h:m format (rounded to nearest minute)
 * Used for all reporting, tracking, and viewing displays
 * @param {number} decimalHours - Hours in decimal format (e.g., 1.5 = 1 hour 30 minutes)
 * @returns {string} Formatted time string (e.g., "1h 30m")
 */
export function formatHoursToHMS(decimalHours) {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) {
    return "0h 0m";
  }
  
  // Round to nearest minute
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}h ${minutes}m`;
}

/**
 * Format seconds to h:m:s format for live clock-in timer
 * Shows real-time with seconds precision
 * @param {number} totalSeconds - Total seconds elapsed
 * @returns {string} Formatted time string (e.g., "1h 30m 45s")
 */
export function formatTimerHMS(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds) || totalSeconds < 0) {
    return "0h 0m 0s";
  }
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  return `${hours}h ${minutes}m ${seconds}s`;
}
