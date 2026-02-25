import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f87e31a4-f19a-4a3f-9c26-c5ad57e131e1/artifacts/vh1p37dl_IMG_0092.png";

export default function SplashScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if we should show splash (only on mobile or first visit)
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    
    if (hasSeenSplash) {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    // Show splash for 3 seconds (reduced from 4)
    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('hasSeenSplash', 'true');
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460]"
          data-testid="splash-screen"
        >
          {/* Simple gradient background - no blur for better mobile performance */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Cyan glow - smaller on mobile */}
            <div 
              className="absolute top-1/4 left-1/4 w-32 h-32 sm:w-48 sm:h-48 bg-[#00D4FF]/30 rounded-full"
              style={{ filter: 'blur(40px)' }}
            />
            
            {/* Pink glow - smaller on mobile */}
            <div 
              className="absolute bottom-1/4 right-1/4 w-32 h-32 sm:w-48 sm:h-48 bg-[#FF1493]/30 rounded-full"
              style={{ filter: 'blur(40px)' }}
            />
            
            {/* Purple glow in center - smaller on mobile */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-40 sm:h-40 bg-[#8B5CF6]/25 rounded-full"
              style={{ filter: 'blur(30px)' }}
            />
          </div>

          {/* Logo and text */}
          <div className="relative z-10 flex flex-col items-center px-4">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/20 mb-6"
            >
              <img 
                src={LOGO_URL} 
                alt="Thrifty Curator" 
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Brand name */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center"
            >
              Thrifty Curator
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-white/60 text-xs sm:text-sm tracking-widest uppercase"
            >
              Curated Resale Finds
            </motion.p>

            {/* Simple loading dots - CSS only, no framer motion animation */}
            <div className="mt-8 flex gap-1.5">
              <div className="w-2 h-2 bg-[#00D4FF] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-[#FF1493] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
