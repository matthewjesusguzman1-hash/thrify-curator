import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import useBiometricAuth from '@/hooks/useBiometricAuth';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f87e31a4-f19a-4a3f-9c26-c5ad57e131e1/artifacts/vh1p37dl_IMG_0092.png";
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SplashScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const navigate = useNavigate();
  const hasProcessedShortcut = useRef(false);
  
  const { isNative, isAvailable, biometricLogin } = useBiometricAuth();

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    sessionStorage.setItem('hasSeenSplash', 'true');
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  // Process shortcut with Face ID
  const processShortcutWithBiometric = useCallback(async (action) => {
    if (hasProcessedShortcut.current) return false;
    hasProcessedShortcut.current = true;
    
    console.log('[Splash] Processing shortcut with biometric:', action);
    setStatusMessage('Verifying identity...');
    
    // Check if already logged in with valid token
    const existingToken = localStorage.getItem('token');
    const existingUser = localStorage.getItem('user');
    
    if (existingToken && existingUser) {
      try {
        await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${existingToken}` }
        });
        
        // Token valid - go straight to destination
        const user = JSON.parse(existingUser);
        console.log('[Splash] Already logged in as:', user.role);
        setStatusMessage('Welcome back!');
        
        // Clear the action since we're handling it
        localStorage.removeItem('pendingShortcutAction');
        
        // Navigate based on role and action
        setTimeout(() => {
          if (user.role === 'admin') {
            localStorage.setItem('pendingShortcutAction', action);
            navigate('/admin');
          } else if (user.role === 'employee') {
            localStorage.setItem('pendingShortcutAction', action);
            navigate('/dashboard');
          }
          handleComplete();
        }, 500);
        
        return true;
      } catch (error) {
        console.log('[Splash] Token invalid, need biometric auth');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    // Need to authenticate
    if (!isAvailable || !isNative) {
      console.log('[Splash] Biometric not available');
      return false;
    }
    
    setStatusMessage('Scan Face ID to continue...');
    
    // Try employee credentials first
    let result = await biometricLogin('employee_portal', {
      reason: 'Verify your identity',
      title: 'Quick Action',
      description: getActionDescription(action)
    });
    
    let userType = 'employee';
    
    // If no employee credentials, try consignor (unlikely for these shortcuts)
    if (!result.success && result.needsPassword) {
      result = await biometricLogin('consignment_portal', {
        reason: 'Verify your identity',
        title: 'Quick Action',
        description: getActionDescription(action)
      });
      userType = 'consignor';
    }
    
    if (!result.success) {
      console.log('[Splash] Biometric failed:', result);
      return false;
    }
    
    // Login with credentials
    setStatusMessage('Logging in...');
    
    try {
      const { username, password } = result.credentials;
      let payload;
      
      if (password === 'EMAIL_ONLY_LOGIN') {
        payload = { email: username };
      } else if (password && password.length === 4 && /^\d+$/.test(password)) {
        payload = { email: username, admin_code: password };
      } else {
        payload = { email: username, password: password };
      }
      
      const response = await axios.post(`${API}/auth/login`, payload);
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('sessionStart', Date.now().toString());
      
      // Clear the pending action
      localStorage.removeItem('pendingShortcutAction');
      
      setStatusMessage('Success!');
      
      // Navigate to destination
      setTimeout(() => {
        if (user.role === 'admin') {
          localStorage.setItem('pendingShortcutAction', action);
          navigate('/admin');
        } else {
          localStorage.setItem('pendingShortcutAction', action);
          navigate('/dashboard');
        }
        handleComplete();
      }, 300);
      
      return true;
    } catch (error) {
      console.error('[Splash] Login failed:', error);
      setStatusMessage('Login failed');
      return false;
    }
  }, [isAvailable, isNative, biometricLogin, navigate, handleComplete]);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    
    // Check for pending shortcut action FIRST
    const pendingAction = localStorage.getItem('pendingShortcutAction');
    
    if (pendingAction && !hasProcessedShortcut.current) {
      console.log('[Splash] Found pending shortcut:', pendingAction);
      
      // Process the shortcut with biometric
      processShortcutWithBiometric(pendingAction).then(success => {
        if (!success) {
          // Biometric failed or not available - continue normal flow
          console.log('[Splash] Biometric flow failed, continuing normal splash');
          const timer = setTimeout(() => {
            handleComplete();
          }, 2000);
          return () => clearTimeout(timer);
        }
      });
      
      return;
    }
    
    // No shortcut - normal splash flow
    if (hasSeenSplash) {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
      return;
    }

    const timer = setTimeout(() => {
      handleComplete();
    }, 3000);

    const fallbackTimer = setTimeout(() => {
      handleComplete();
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [onComplete, handleComplete, processShortcutWithBiometric]);

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
          <div className="absolute inset-0 overflow-hidden" style={{ willChange: 'transform' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0, 0.4, 0.3, 0.4], 
                scale: [0.8, 1.1, 1, 1.05],
                x: [-50, 30, 0, 20],
                y: [0, -20, 10, -5]
              }}
              transition={{ 
                duration: 6, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="absolute top-1/4 left-1/4 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full"
              style={{ 
                background: '#00D4FF',
                filter: 'blur(60px)',
                transform: 'translateZ(0)',
                willChange: 'transform, opacity'
              }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0, 0.4, 0.3, 0.4], 
                scale: [0.8, 1.15, 0.95, 1.1],
                x: [50, -30, 15, -15],
                y: [0, 30, -15, 20]
              }}
              transition={{ 
                duration: 7, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.3
              }}
              className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full"
              style={{ 
                background: '#FF1493',
                filter: 'blur(60px)',
                transform: 'translateZ(0)',
                willChange: 'transform, opacity'
              }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ 
                opacity: [0, 0.35, 0.25, 0.35], 
                scale: [0.6, 1.2, 1, 1.15]
              }}
              transition={{ 
                duration: 8, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.5
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] sm:w-[350px] sm:h-[350px] rounded-full"
              style={{ 
                background: '#8B5CF6',
                filter: 'blur(50px)',
                transform: 'translateZ(0)',
                willChange: 'transform, opacity'
              }}
            />
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.5, 0.25, 0.5],
                scale: [0.9, 1.3, 1, 1.2],
                x: [0, 50, -25, 40],
                y: [0, -40, 25, -20]
              }}
              transition={{ 
                duration: 5, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="absolute top-1/3 right-1/3 w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] rounded-full"
              style={{ 
                background: '#00D4FF',
                filter: 'blur(40px)',
                transform: 'translateZ(0)',
                willChange: 'transform, opacity'
              }}
            />
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.45, 0.2, 0.45],
                scale: [0.85, 1.25, 0.95, 1.15],
                x: [0, -45, 30, -25],
                y: [0, 35, -20, 25]
              }}
              transition={{ 
                duration: 5.5, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.8
              }}
              className="absolute bottom-1/3 left-1/3 w-[160px] h-[160px] sm:w-[220px] sm:h-[220px] rounded-full"
              style={{ 
                background: '#FF1493',
                filter: 'blur(45px)',
                transform: 'translateZ(0)',
                willChange: 'transform, opacity'
              }}
            />
          </div>

          {/* Logo and text */}
          <div className="relative z-10 flex flex-col items-center">
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

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="font-poppins text-3xl sm:text-4xl font-bold text-white mb-2 text-center"
            >
              Thrifty Curator
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              className="text-white/60 text-sm sm:text-base tracking-widest uppercase"
            >
              {statusMessage || 'Curated Resale Finds'}
            </motion.p>

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

function getActionDescription(action) {
  switch (action) {
    case 'StartTrip':
      return 'Start GPS tracking';
    case 'LogMiles':
      return 'Log a trip';
    case 'ClockIn':
      return 'Clock in';
    default:
      return 'Continue';
  }
}
