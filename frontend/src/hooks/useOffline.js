import { useState, useEffect, useCallback } from 'react';
import cache from '@/lib/offlineCache';

/**
 * Hook to detect online/offline status
 * Returns { isOnline, isOffline }
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline, isOffline: !isOnline };
};

/**
 * Hook for fetching data with offline cache support
 * 
 * Usage:
 * const { data, loading, error, isFromCache, refresh } = useOfflineData(
 *   'employee_shifts',
 *   async () => await axios.get('/api/time/entries'),
 *   { expiryMs: 3600000 } // 1 hour
 * );
 */
export const useOfflineData = (cacheKey, fetchFn, options = {}) => {
  const { expiryMs = 24 * 60 * 60 * 1000, autoFetch = true } = options;
  const { isOnline } = useOnlineStatus();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    // Try to get cached data first
    const cachedMeta = cache.getWithMeta(cacheKey);
    
    // If offline, use cache (even if expired)
    if (!isOnline) {
      if (cachedMeta) {
        setData(cachedMeta.data);
        setIsFromCache(true);
        setLastUpdated(new Date(cachedMeta.timestamp));
        setLoading(false);
        return;
      } else {
        setError('No cached data available offline');
        setLoading(false);
        return;
      }
    }
    
    // If online and we have valid cache (not forcing refresh)
    if (!forceRefresh && cachedMeta && !cachedMeta.isExpired) {
      setData(cachedMeta.data);
      setIsFromCache(true);
      setLastUpdated(new Date(cachedMeta.timestamp));
      setLoading(false);
      
      // Still fetch in background to update cache
      try {
        const response = await fetchFn();
        const newData = response.data || response;
        cache.set(cacheKey, newData, expiryMs);
        setData(newData);
        setIsFromCache(false);
        setLastUpdated(new Date());
      } catch (e) {
        // Silent fail - we already have cached data
        console.log('Background refresh failed:', e);
      }
      return;
    }
    
    // Fetch fresh data
    try {
      const response = await fetchFn();
      const newData = response.data || response;
      
      // Cache the data
      cache.set(cacheKey, newData, expiryMs);
      
      setData(newData);
      setIsFromCache(false);
      setLastUpdated(new Date());
    } catch (e) {
      // On error, try to use expired cache
      if (cachedMeta) {
        setData(cachedMeta.data);
        setIsFromCache(true);
        setLastUpdated(new Date(cachedMeta.timestamp));
        setError('Using cached data (fetch failed)');
      } else {
        setError(e.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFn, expiryMs, isOnline]);
  
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch]); // Only run on mount, not on fetchData change
  
  const refresh = () => fetchData(true);
  
  return {
    data,
    loading,
    error,
    isFromCache,
    isOnline,
    lastUpdated,
    refresh
  };
};

/**
 * Hook for caching form data (survives app restart)
 * Useful for partially completed forms
 */
export const useCachedForm = (formKey, initialData = {}) => {
  const [formData, setFormData] = useState(() => {
    const cached = cache.get(`form_${formKey}`, true); // Ignore expiry for forms
    return cached || initialData;
  });
  
  const updateFormData = useCallback((updates) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      cache.set(`form_${formKey}`, newData, 7 * 24 * 60 * 60 * 1000); // 7 days
      return newData;
    });
  }, [formKey]);
  
  const clearFormCache = useCallback(() => {
    cache.remove(`form_${formKey}`);
    setFormData(initialData);
  }, [formKey, initialData]);
  
  return {
    formData,
    updateFormData,
    clearFormCache
  };
};

export default {
  useOnlineStatus,
  useOfflineData,
  useCachedForm
};
