import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PullToRefresh({ onRefresh, children, className = '' }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const THRESHOLD = 80; // Pull distance needed to trigger refresh

  const handleTouchStart = useCallback((e) => {
    // Only enable pull-to-refresh when scrolled to top
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop <= 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    if (diff > 0) {
      // Apply resistance - the further you pull, the harder it gets
      const resistance = Math.min(diff * 0.4, THRESHOLD + 20);
      setPullDistance(resistance);
    }
  }, [isPulling, startY, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD); // Keep showing the indicator
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
      
      setRefreshing(false);
    }
    
    setPullDistance(0);
  }, [isPulling, pullDistance, refreshing, onRefresh]);

  return (
    <div 
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{ top: -50 }}
        animate={{ 
          y: pullDistance,
          opacity: pullDistance > 20 ? 1 : 0 
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      >
        <motion.div
          className="bg-gray-800 rounded-full p-2 shadow-lg"
          animate={{ 
            rotate: refreshing ? 360 : (pullDistance / THRESHOLD) * 180 
          }}
          transition={refreshing ? { 
            repeat: Infinity, 
            duration: 1, 
            ease: 'linear' 
          } : { 
            type: 'spring' 
          }}
        >
          <RefreshCw className={`w-5 h-5 ${pullDistance >= THRESHOLD || refreshing ? 'text-[#10B981]' : 'text-gray-400'}`} />
        </motion.div>
      </motion.div>
      
      {/* Content with pull effect */}
      <motion.div
        animate={{ y: isPulling || refreshing ? pullDistance * 0.5 : 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
