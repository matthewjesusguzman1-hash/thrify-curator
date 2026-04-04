/**
 * ShortcutBiometricHandler Component
 * 
 * Handles iOS Quick Actions with automatic Face ID authentication.
 * Shows a full-screen overlay while authenticating, then navigates directly to destination.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import useBiometricAuth from '@/hooks/useBiometricAuth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_f87e31a4-f19a-4a3f-9c26-c5ad57e131e1/artifacts/vh1p37dl_IMG_0092.png";

export default function ShortcutBiometricHandler() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const hasProcessed = useRef(false);
  const { isNative, isAvailable, biometricLogin } = useBiometricAuth();

  // Process the shortcut with Face ID
  const processShortcut = useCallback(async (action) => {
    if (hasProcessed.current || isProcessing) return;
    hasProcessed.current = true;
    setIsProcessing(true);
    
    console.log('[ShortcutHandler] Processing:', action);
    setStatusMessage('Verifying identity...');

    try {
      // First check if already logged in with valid token
      const existingToken = localStorage.getItem('token');
      const existingUser = localStorage.getItem('user');
      
      if (existingToken && existingUser) {
        try {
          await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${existingToken}` }
          });
          
          // Token valid - go straight to destination
          const user = JSON.parse(existingUser);
          console.log('[ShortcutHandler] Already logged in:', user.role);
          setStatusMessage('Welcome back!');
          localStorage.removeItem('pendingShortcutAction');
          
          await new Promise(r => setTimeout(r, 300));
          routeToDestination(user.role, action);
          return;
        } catch (error) {
          console.log('[ShortcutHandler] Token expired, need re-auth');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }

      // Need biometric authentication
      if (!isAvailable || !isNative) {
        console.log('[ShortcutHandler] Biometric not available');
        setStatusMessage('Please log in');
        await new Promise(r => setTimeout(r, 1000));
        setIsProcessing(false);
        navigate('/login');
        return;
      }

      setStatusMessage('Scan Face ID...');
      
      // Try employee credentials
      let result = await biometricLogin('employee_portal', {
        reason: 'Verify your identity',
        title: 'Quick Action',
        description: getActionLabel(action)
      });
      
      if (!result.success && result.needsPassword) {
        // No employee credentials saved - try consignor (unlikely)
        console.log('[ShortcutHandler] No employee creds, need login');
        setStatusMessage('Please log in first');
        await new Promise(r => setTimeout(r, 1000));
        localStorage.removeItem('pendingShortcutAction');
        setIsProcessing(false);
        navigate('/login');
        return;
      }
      
      if (!result.success) {
        console.log('[ShortcutHandler] Biometric failed:', result);
        if (result.cancelled) {
          setStatusMessage('Cancelled');
        } else {
          setStatusMessage('Authentication failed');
        }
        await new Promise(r => setTimeout(r, 1000));
        localStorage.removeItem('pendingShortcutAction');
        setIsProcessing(false);
        navigate('/login');
        return;
      }

      // Biometric success - now login
      setStatusMessage('Logging in...');
      
      const { username, password } = result.credentials;
      let payload;
      
      if (password === 'EMAIL_ONLY_LOGIN') {
        payload = { email: username };
      } else if (password && password.length === 4 && /^\d+$/.test(password)) {
        payload = { email: username, admin_code: password };
      } else {
        payload = { email: username, password };
      }
      
      const response = await axios.post(`${API}/auth/login`, payload);
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('sessionStart', Date.now().toString());
      localStorage.removeItem('pendingShortcutAction');
      
      setStatusMessage('Success!');
      await new Promise(r => setTimeout(r, 300));
      
      routeToDestination(user.role, action);
      
    } catch (error) {
      console.error('[ShortcutHandler] Error:', error);
      setStatusMessage('Error occurred');
      await new Promise(r => setTimeout(r, 1000));
      localStorage.removeItem('pendingShortcutAction');
      setIsProcessing(false);
      navigate('/login');
    }
  }, [isProcessing, isAvailable, isNative, biometricLogin, navigate]);

  // Route to the appropriate destination
  const routeToDestination = useCallback((role, action) => {
    console.log('[ShortcutHandler] Routing:', { role, action });
    
    if (role === 'admin') {
      // Set the action for AdminDashboard to pick up
      localStorage.setItem('pendingShortcutAction', action);
      setIsProcessing(false);
      navigate('/admin');
      
      // Show appropriate toast
      switch (action) {
        case 'StartTrip':
          toast.success('Starting GPS trip...', { duration: 2000 });
          break;
        case 'LogMiles':
          toast.success('Opening trip entry...', { duration: 2000 });
          break;
        case 'ClockIn':
          toast.info('Opening hours section...', { duration: 2000 });
          break;
      }
    } else if (role === 'employee') {
      localStorage.setItem('pendingShortcutAction', action);
      setIsProcessing(false);
      navigate('/dashboard');
      
      if (action === 'ClockIn') {
        toast.success('Clocking you in...', { duration: 2000 });
      }
    } else {
      // Unknown role
      setIsProcessing(false);
      navigate('/login');
    }
  }, [navigate]);

  // Check for pending shortcut on mount
  useEffect(() => {
    const pendingAction = localStorage.getItem('pendingShortcutAction');
    
    if (pendingAction && !hasProcessed.current) {
      console.log('[ShortcutHandler] Found pending action:', pendingAction);
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        processShortcut(pendingAction);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [processShortcut]);

  // Listen for shortcut events (when app is already open)
  useEffect(() => {
    const handleShortcutEvent = (event) => {
      const { action } = event.detail;
      console.log('[ShortcutHandler] Event received:', action);
      hasProcessed.current = false; // Reset for new action
      processShortcut(action);
    };
    
    window.addEventListener('shortcutAction', handleShortcutEvent);
    return () => window.removeEventListener('shortcutAction', handleShortcutEvent);
  }, [processShortcut]);

  // Full-screen overlay while processing
  if (!isProcessing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460]"
      >
        <div className="flex flex-col items-center">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20 mb-6"
          >
            <img 
              src={LOGO_URL} 
              alt="Thrifty Curator" 
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Status message */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white text-lg font-medium mb-4"
          >
            {statusMessage}
          </motion.p>

          {/* Loading dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-cyan-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function getActionLabel(action) {
  switch (action) {
    case 'StartTrip': return 'Start GPS Trip';
    case 'LogMiles': return 'Log Miles';
    case 'ClockIn': return 'Clock In';
    default: return 'Continue';
  }
}
