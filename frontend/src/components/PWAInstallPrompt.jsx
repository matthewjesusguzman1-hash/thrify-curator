import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a delay (don't be too aggressive)
      const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen');
      if (!hasSeenPrompt) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    // For iOS, check if user hasn't dismissed the prompt recently
    if (isIOSDevice) {
      const lastDismissed = localStorage.getItem('pwa-ios-dismissed');
      if (!lastDismissed || Date.now() - parseInt(lastDismissed) > 7 * 24 * 60 * 60 * 1000) {
        // Show iOS instructions after 3 seconds
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-seen', 'true');
    if (isIOS) {
      localStorage.setItem('pwa-ios-dismissed', Date.now().toString());
    }
  };

  // Don't show anything if already installed
  if (isInstalled) return null;

  // Don't show if no prompt available (and not iOS)
  if (!deferredPrompt && !isIOS && !showPrompt) return null;

  return (
    <>
      {/* Install Banner */}
      <AnimatePresence>
        {showPrompt && !showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
          >
            <div className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl shadow-xl border border-white/10 overflow-hidden">
              {/* Header bar */}
              <div className="h-1 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
              
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm">Install Thrifty Curator</h3>
                    <p className="text-white/60 text-xs mt-1">
                      Add to home screen for the best mileage tracking experience
                    </p>
                  </div>
                  
                  <button
                    onClick={handleDismiss}
                    className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Benefits */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <CheckCircle className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Better GPS tracking performance</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <CheckCircle className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Works offline</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <CheckCircle className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Quick access from home screen</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    className="flex-1 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Not Now
                  </Button>
                  <Button
                    onClick={handleInstall}
                    className="flex-1 bg-gradient-to-r from-[#FF1493] to-[#E91E8C] hover:from-[#E91E8C] hover:to-[#C91E7C] text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowIOSInstructions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
              
              <div className="p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-xl font-bold text-center text-[#1A1A2E] mb-2">
                  Install on iPhone
                </h2>
                <p className="text-[#666] text-center text-sm mb-6">
                  Follow these steps to add Thrifty Curator to your home screen:
                </p>

                {/* Steps */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A2E]">Tap the Share button</p>
                      <p className="text-xs text-[#666]">
                        The square with an arrow pointing up at the bottom of Safari
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A2E]">Scroll down and tap</p>
                      <p className="text-xs text-[#666]">
                        "Add to Home Screen"
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A2E]">Tap "Add"</p>
                      <p className="text-xs text-[#666]">
                        In the top right corner
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setShowIOSInstructions(false);
                    setShowPrompt(false);
                    localStorage.setItem('pwa-ios-dismissed', Date.now().toString());
                  }}
                  className="w-full mt-6 bg-gradient-to-r from-[#FF1493] to-[#E91E8C] hover:from-[#E91E8C] hover:to-[#C91E7C] text-white"
                >
                  Got it!
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
