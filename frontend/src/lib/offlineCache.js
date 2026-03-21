/**
 * Offline Data Cache for Thrifty Curator
 * Caches important data locally so the app works without internet
 */

const CACHE_PREFIX = 'tc_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Save data to local cache
 * @param key - Cache key (e.g., 'employee_shifts', 'consignor_payments')
 * @param data - Data to cache
 * @param expiryMs - Optional custom expiry time in milliseconds
 */
export const setCache = (key, data, expiryMs = CACHE_EXPIRY) => {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + expiryMs
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
    return true;
  } catch (e) {
    console.log('Cache set error:', e);
    return false;
  }
};

/**
 * Get data from local cache
 * @param key - Cache key
 * @param ignoreExpiry - If true, returns data even if expired
 * @returns Cached data or null if not found/expired
 */
export const getCache = (key, ignoreExpiry = false) => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const cacheItem = JSON.parse(cached);
    
    // Check if expired
    if (!ignoreExpiry && Date.now() > cacheItem.expiry) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    
    return cacheItem.data;
  } catch (e) {
    console.log('Cache get error:', e);
    return null;
  }
};

/**
 * Get cache with metadata (includes timestamp, expiry info)
 */
export const getCacheWithMeta = (key) => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const cacheItem = JSON.parse(cached);
    return {
      data: cacheItem.data,
      timestamp: cacheItem.timestamp,
      expiry: cacheItem.expiry,
      isExpired: Date.now() > cacheItem.expiry,
      age: Date.now() - cacheItem.timestamp
    };
  } catch (e) {
    return null;
  }
};

/**
 * Remove specific cache entry
 */
export const removeCache = (key) => {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Clear all cached data
 */
export const clearAllCache = () => {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Get all cache keys
 */
export const getCacheKeys = () => {
  return Object.keys(localStorage)
    .filter(k => k.startsWith(CACHE_PREFIX))
    .map(k => k.replace(CACHE_PREFIX, ''));
};

// Cache keys used in the app
export const CACHE_KEYS = {
  // Employee data
  EMPLOYEE_PROFILE: 'employee_profile',
  EMPLOYEE_SHIFTS: 'employee_shifts',
  EMPLOYEE_SUMMARY: 'employee_summary',
  
  // Consignor data
  CONSIGNOR_AGREEMENT: 'consignor_agreement',
  CONSIGNOR_PAYMENTS: 'consignor_payments',
  CONSIGNOR_SUBMISSIONS: 'consignor_submissions',
  
  // Admin data
  ADMIN_EMPLOYEES: 'admin_employees',
  ADMIN_SUBMISSIONS: 'admin_submissions',
  ADMIN_PAYROLL: 'admin_payroll'
};

const cache = {
  set: setCache,
  get: getCache,
  getWithMeta: getCacheWithMeta,
  remove: removeCache,
  clearAll: clearAllCache,
  getKeys: getCacheKeys,
  KEYS: CACHE_KEYS
};

export default cache;
