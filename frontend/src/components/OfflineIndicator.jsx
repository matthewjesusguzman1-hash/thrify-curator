import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, Clock } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOffline';

/**
 * Offline Banner - Shows when app is offline
 * Place at top of app layout
 */
export const OfflineBanner = () => {
  const { isOffline } = useOnlineStatus();
  
  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2"
        >
          <WifiOff className="w-4 h-4" />
          <span>You're offline. Showing cached data.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Connection Status Indicator - Small icon showing online/offline
 */
export const ConnectionStatus = ({ className = '' }) => {
  const { isOnline, isOffline } = useOnlineStatus();
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-600">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-amber-600">Offline</span>
        </>
      )}
    </div>
  );
};

/**
 * Cache Status Badge - Shows if data is from cache
 */
export const CacheStatusBadge = ({ isFromCache, lastUpdated, onRefresh, loading }) => {
  if (!isFromCache && !lastUpdated) return null;
  
  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };
  
  return (
    <div className="flex items-center gap-2 text-xs">
      {isFromCache && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
          <Clock className="w-3 h-3" />
          Cached
        </span>
      )}
      {lastUpdated && (
        <span className="text-gray-500">
          Updated {formatTime(lastUpdated)}
        </span>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw className={`w-3 h-3 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};

/**
 * Offline Notice - Shows in place of content when offline with no cache
 */
export const OfflineNotice = ({ message = "This content isn't available offline" }) => {
  const { isOffline } = useOnlineStatus();
  
  if (!isOffline) return null;
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <WifiOff className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-700 mb-2">You're Offline</h3>
      <p className="text-gray-500 text-sm max-w-xs">{message}</p>
    </div>
  );
};

export default {
  OfflineBanner,
  ConnectionStatus,
  CacheStatusBadge,
  OfflineNotice
};
