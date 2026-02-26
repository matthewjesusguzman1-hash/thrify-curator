import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format decimal hours to h:m:s format
 * @param {number} decimalHours - Hours in decimal format (e.g., 1.5 = 1 hour 30 minutes)
 * @param {object} options - Formatting options
 * @param {boolean} options.showSeconds - Whether to show seconds (default: true)
 * @param {boolean} options.compact - Use compact format like "1h 30m" vs "1 hr 30 min" (default: true)
 * @returns {string} Formatted time string
 */
export function formatHoursToHMS(decimalHours, options = {}) {
  const { showSeconds = true, compact = true } = options;
  
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) {
    return compact ? "0h 0m" : "0 hr 0 min";
  }
  
  const totalSeconds = Math.round(decimalHours * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (compact) {
    if (showSeconds && seconds > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${hours}h ${minutes}m`;
  } else {
    if (showSeconds && seconds > 0) {
      return `${hours} hr ${minutes} min ${seconds} sec`;
    }
    return `${hours} hr ${minutes} min`;
  }
}
