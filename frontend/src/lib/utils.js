import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Round decimal hours UP to the next whole minute and return as decimal hours
 * This ensures employees are always paid for the full minute worked
 * Example: 1.333 hours (1h 20m) with 1 extra second = 1.35 hours (1h 21m)
 * @param {number} decimalHours - Hours in decimal format
 * @returns {number} Hours rounded UP to next minute as decimal
 */
export function roundHoursToMinute(decimalHours) {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours) || decimalHours <= 0) {
    return 0;
  }
  // Round to 6 decimal places first to handle floating-point precision issues
  // Then apply ceiling to get next whole minute
  const minutesRaw = Math.round(decimalHours * 60 * 1000000) / 1000000;
  const totalMinutes = Math.ceil(minutesRaw);
  return totalMinutes / 60;
}

/**
 * Format decimal hours to h:m format (rounded UP to next whole minute)
 * This ensures displayed time always rounds in the employee's favor
 * @param {number} decimalHours - Hours in decimal format (e.g., 1.5 = 1 hour 30 minutes)
 * @returns {string} Formatted time string (e.g., "1h 30m")
 */
export function formatHoursToHMS(decimalHours) {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours) || decimalHours <= 0) {
    return "0h 0m";
  }
  
  // Round to 6 decimal places first to handle floating-point precision issues
  // Then apply ceiling to get next whole minute
  const minutesRaw = Math.round(decimalHours * 60 * 1000000) / 1000000;
  const totalMinutes = Math.ceil(minutesRaw);
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
