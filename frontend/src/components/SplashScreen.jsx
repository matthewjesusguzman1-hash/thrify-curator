import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f87e31a4-f19a-4a3f-9c26-c5ad57e131e1/artifacts/vh1p37dl_IMG_0092.png";

export default function SplashScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    sessionStorage.setItem('hasSeenSplash', 'true');
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    // Check if we should show splash (only on mobile or first visit)
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    
    if (hasSeenSplash) {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
      return;
    }

    // Show splash for 3 seconds
    const timer = setTimeout(() => {
      handleComplete();
    }, 3000);

    // Fallback: ensure splash dismisses even if timer fails
    const fallbackTimer = setTimeout(() => {
      handleComplete();
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [onComplete, handleComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
            backfaceVisibility: 'hidden'
          }}
          data-testid="splash-screen"
        >
          {/* Optimized background blobs - using CSS animations for GPU acceleration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Blob 1 - Cyan */}
            <div 
              className="absolute top-1/4 left-1/4 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] rounded-full animate-blob-1"
              style={{ 
                background: 'radial-gradient(circle, rgba(0,212,255,0.4) 0%, rgba(0,212,255,0) 70%)',
                transform: 'translate3d(0,0,0)'
              }}
            />
            
            {/* Blob 2 - Pink */}
            <div 
              className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] rounded-full animate-blob-2"
              style={{ 
                background: 'radial-gradient(circle, rgba(255,20,147,0.4) 0%, rgba(255,20,147,0) 70%)',
                transform: 'translate3d(0,0,0)'
              }}
            />
            
            {/* Blob 3 - Purple (center) */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] sm:w-[280px] sm:h-[280px] rounded-full animate-blob-3"
              style={{ 
                background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0) 70%)',
                transform: 'translate3d(-50%,-50%,0)'
              }}
            />
          </div>

          {/* Logo and text */}
          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/20 mb-8"
              style={{ transform: 'translate3d(0,0,0)' }}
            >
              <img 
                src={LOGO_URL} 
                alt="Thrifty Curator" 
                className="w-full h-full object-cover"
                loading="eager"
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="font-poppins text-3xl sm:text-4xl font-bold text-white mb-2 text-center"
            >
              Thrifty Curator
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-white/60 text-sm sm:text-base tracking-widest uppercase"
            >
              Curated Resale Finds
            </motion.p>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-10"
            >
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full animate-pulse-dot"
                    style={{ 
                      animationDelay: `${i * 0.15}s`,
                      transform: 'translate3d(0,0,0)'
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* CSS Animations - GPU accelerated */}
          <style>{`
            @keyframes blob-1 {
              0%, 100% { 
                transform: translate3d(0, 0, 0) scale(1); 
                opacity: 0.4;
              }
              50% { 
                transform: translate3d(30px, -20px, 0) scale(1.1); 
                opacity: 0.3;
              }
            }
            
            @keyframes blob-2 {
              0%, 100% { 
                transform: translate3d(0, 0, 0) scale(1); 
                opacity: 0.4;
              }
              50% { 
                transform: translate3d(-25px, 25px, 0) scale(1.15); 
                opacity: 0.3;
              }
            }
            
            @keyframes blob-3 {
              0%, 100% { 
                transform: translate3d(-50%, -50%, 0) scale(1); 
                opacity: 0.35;
              }
              50% { 
                transform: translate3d(-50%, -50%, 0) scale(1.2); 
                opacity: 0.25;
              }
            }
            
            @keyframes pulse-dot {
              0%, 100% { 
                transform: translate3d(0, 0, 0) scale(1); 
                opacity: 0.5;
              }
              50% { 
                transform: translate3d(0, 0, 0) scale(1.4); 
                opacity: 1;
              }
            }
            
            .animate-blob-1 {
              animation: blob-1 4s ease-in-out infinite;
            }
            
            .animate-blob-2 {
              animation: blob-2 5s ease-in-out infinite;
              animation-delay: 0.5s;
            }
            
            .animate-blob-3 {
              animation: blob-3 6s ease-in-out infinite;
              animation-delay: 1s;
            }
            
            .animate-pulse-dot {
              animation: pulse-dot 1s ease-in-out infinite;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
