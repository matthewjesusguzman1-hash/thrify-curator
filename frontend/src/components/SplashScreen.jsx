import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_edb9dab3-e34c-4a6a-897b-0e7ff5eb33f3/artifacts/tariw3lj_IMG_0042.jpg";

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

    // Show splash for 4 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('hasSeenSplash', 'true');
      onComplete?.();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460]"
          data-testid="splash-screen"
        >
          {/* Animated smoke/cloud background elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Large cyan smoke - moves and pulses */}
            <motion.div
              initial={{ opacity: 0, scale: 0, x: -100 }}
              animate={{ 
                opacity: [0, 0.5, 0.4, 0.5], 
                scale: [0.5, 1.2, 1, 1.1],
                x: [-100, 50, 0, 30],
                y: [0, -30, 20, -10]
              }}
              transition={{ 
                duration: 4, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#00D4FF] rounded-full blur-[100px]"
            />
            
            {/* Large pink/magenta smoke - moves and pulses */}
            <motion.div
              initial={{ opacity: 0, scale: 0, x: 100 }}
              animate={{ 
                opacity: [0, 0.5, 0.35, 0.5], 
                scale: [0.5, 1.3, 0.9, 1.2],
                x: [100, -40, 20, -20],
                y: [0, 40, -20, 30]
              }}
              transition={{ 
                duration: 5, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.3
              }}
              className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#FF1493] rounded-full blur-[100px]"
            />
            
            {/* Purple smoke in center - pulses dramatically */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 0.45, 0.3, 0.45], 
                scale: [0.3, 1.4, 1, 1.3],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 6, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.5
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#8B5CF6] rounded-full blur-[80px]"
            />
            
            {/* Additional small cyan accent */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.6, 0.3, 0.6],
                scale: [0.8, 1.5, 1, 1.3],
                x: [0, 80, -40, 60],
                y: [0, -60, 40, -30]
              }}
              transition={{ 
                duration: 3.5, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="absolute top-1/3 right-1/3 w-[250px] h-[250px] bg-[#00D4FF] rounded-full blur-[60px]"
            />
            
            {/* Additional small pink accent */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.55, 0.25, 0.55],
                scale: [0.7, 1.4, 0.9, 1.2],
                x: [0, -70, 50, -40],
                y: [0, 50, -30, 40]
              }}
              transition={{ 
                duration: 4, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.8
              }}
              className="absolute bottom-1/3 left-1/3 w-[280px] h-[280px] bg-[#FF1493] rounded-full blur-[70px]"
            />
            
            {/* Gold/warm accent for depth */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.3, 0.15, 0.3],
                scale: [0.5, 1.2, 0.8, 1.1]
              }}
              transition={{ 
                duration: 5, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
                delay: 1
              }}
              className="absolute top-2/3 right-1/4 w-[200px] h-[200px] bg-[#C5A065] rounded-full blur-[50px]"
            />
          </div>

          {/* Logo and text */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/20 mb-8"
            >
              <img 
                src={LOGO_URL} 
                alt="Thrifty Curator" 
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Brand name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="font-poppins text-3xl sm:text-4xl font-bold text-white mb-2 text-center"
            >
              Thrifty Curator
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              className="text-white/60 text-sm sm:text-base tracking-widest uppercase"
            >
              Curated Resale Finds
            </motion.p>

            {/* Loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-10"
            >
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
