/**
 * Per-user UI preferences stored in localStorage, keyed by badge.
 * Currently supports:
 *  - defaultInterstate: whether the Bridge Chart should open in Interstate mode (true, default)
 *    or Non-interstate mode (false) for this user.
 */
export const PREF_KEY = (badge) => `inspnav_prefs_${badge || "anon"}`;

export function loadPrefs(badge) {
  try {
    const raw = localStorage.getItem(PREF_KEY(badge));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePrefs(badge, patch) {
  try {
    const current = loadPrefs(badge);
    const next = { ...current, ...patch };
    localStorage.setItem(PREF_KEY(badge), JSON.stringify(next));
    return next;
  } catch {
    return {};
  }
}

export function getDefaultInterstate(badge) {
  const prefs = loadPrefs(badge);
  return prefs.defaultInterstate !== undefined ? !!prefs.defaultInterstate : true;
}
