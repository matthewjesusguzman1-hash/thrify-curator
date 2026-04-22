/**
 * storageManager.js — Client-side helpers for making device photo storage
 * durable and reminding inspectors to export their records.
 *
 * Why this exists:
 * - Browsers may auto-evict IndexedDB under storage pressure. Calling
 *   `navigator.storage.persist()` asks the browser to mark our data as
 *   "persistent" so the user must explicitly clear it.
 * - Safari purges data for sites not visited in 7 days UNLESS the app is
 *   installed as a PWA (Home Screen). We detect this and nudge the user.
 * - Agencies typically have retention requirements (e.g., 90-day export).
 *   We track the last export and nudge when it's overdue.
 */

const LAST_EXPORT_KEY = "inspnav_last_export_at";
const EXPORT_NUDGE_DAYS = 14; // Nudge every 14 days by default
const PWA_DISMISS_KEY = "inspnav_pwa_nudge_dismissed_at";
const PERSIST_CHECKED_KEY = "inspnav_persist_requested";

/**
 * Request persistent storage once per device. Returns true if persistent.
 * Safe to call on every app load; the browser rate-limits the prompt internally.
 */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return { supported: false, persisted: false };
    const already = await navigator.storage.persisted?.();
    if (already) {
      return { supported: true, persisted: true };
    }
    // Flag so the UI can show whether we've already asked.
    localStorage.setItem(PERSIST_CHECKED_KEY, "1");
    const persisted = await navigator.storage.persist();
    return { supported: true, persisted };
  } catch {
    return { supported: false, persisted: false };
  }
}

/** Get current persistent-storage status without prompting. */
export async function getPersistentStatus() {
  try {
    if (!navigator.storage?.persisted) return { supported: false, persisted: false };
    const p = await navigator.storage.persisted();
    return { supported: true, persisted: !!p };
  } catch {
    return { supported: false, persisted: false };
  }
}

/** Best-effort storage usage estimate. */
export async function getStorageEstimate() {
  try {
    if (!navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    return { usage: est.usage || 0, quota: est.quota || 0 };
  } catch { return null; }
}

/**
 * Detect whether the app is running as an installed PWA (Home Screen / standalone).
 * Works across Chrome (display-mode) and iOS Safari (navigator.standalone).
 */
export function isRunningAsPWA() {
  try {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.navigator.standalone === true) return true;
    if (document.referrer.startsWith("android-app://")) return true;
  } catch { /* ignore */ }
  return false;
}

/** True iff we're on an iOS Safari browser (needs manual install instructions). */
export function isIOSSafari() {
  const ua = navigator.userAgent || "";
  const iOS = /iPhone|iPad|iPod/.test(ua) && !window.MSStream;
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit;
}

/** Should we nudge about installing as PWA? */
export function shouldNudgePWAInstall() {
  if (isRunningAsPWA()) return false;
  const dismissed = parseInt(localStorage.getItem(PWA_DISMISS_KEY) || "0");
  const now = Date.now();
  // Re-nudge every 30 days after dismissal
  if (dismissed && now - dismissed < 30 * 24 * 60 * 60 * 1000) return false;
  return true;
}

export function dismissPWANudge() {
  localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
}

/** Record that the inspector just exported / shared a report. */
export function markInspectionExported() {
  localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
}

/** Get days since last export (null if never exported). */
export function daysSinceLastExport() {
  const raw = parseInt(localStorage.getItem(LAST_EXPORT_KEY) || "0");
  if (!raw) return null;
  const days = (Date.now() - raw) / (24 * 60 * 60 * 1000);
  return Math.floor(days);
}

/** Should we show the export reminder? */
export function shouldNudgeExport() {
  const days = daysSinceLastExport();
  // Never exported → nudge after EXPORT_NUDGE_DAYS of usage (treat now as start)
  if (days === null) {
    const firstLoginKey = "inspnav_first_seen_at";
    let first = parseInt(localStorage.getItem(firstLoginKey) || "0");
    if (!first) {
      first = Date.now();
      localStorage.setItem(firstLoginKey, String(first));
    }
    const daysSinceFirst = (Date.now() - first) / (24 * 60 * 60 * 1000);
    return daysSinceFirst >= EXPORT_NUDGE_DAYS;
  }
  return days >= EXPORT_NUDGE_DAYS;
}

export const EXPORT_NUDGE_INTERVAL_DAYS = EXPORT_NUDGE_DAYS;
