import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Hide the "reconnected" message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-500 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-lg safe-area-top"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          <WifiOff className="w-5 h-5" />
          <span className="font-medium">No internet connection</span>
        </motion.div>
      )}
      
      {isOnline && showReconnected && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-green-500 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-lg safe-area-top"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          <Wifi className="w-5 h-5" />
          <span className="font-medium">Back online</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
