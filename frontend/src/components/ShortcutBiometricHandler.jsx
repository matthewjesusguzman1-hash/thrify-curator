/**
 * ShortcutBiometricHandler Component
 * 
 * Handles iOS Quick Actions (long-press shortcuts) with automatic Face ID authentication.
 * When a shortcut is detected, it:
 * 1. Prompts Face ID
 * 2. Logs in the stored user
 * 3. Routes to the appropriate page based on user role and action
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import useBiometricAuth from '@/hooks/useBiometricAuth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Server keys for stored credentials
const CREDENTIAL_SERVERS = {
  employee: 'employee_portal',
  consignor: 'consignment_portal'
};

export default function ShortcutBiometricHandler() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const { isNative, isAvailable, isLoading, biometricLogin, getCredentials } = useBiometricAuth();

  // Try to authenticate with stored credentials
  const attemptBiometricAuth = useCallback(async (action) => {
    console.log('[ShortcutAuth] Attempting biometric auth for action:', action);
    
    // Try employee credentials first (most common for these shortcuts)
    let result = await biometricLogin(CREDENTIAL_SERVERS.employee, {
      reason: 'Verify your identity to continue',
      title: 'Quick Action Login',
      description: `Authenticate to ${getActionDescription(action)}`
    });
    
    let userType = 'employee';
    
    // If no employee credentials, try consignor (less likely for these actions)
    if (!result.success && result.needsPassword) {
      console.log('[ShortcutAuth] No employee credentials, trying consignor...');
      result = await biometricLogin(CREDENTIAL_SERVERS.consignor, {
        reason: 'Verify your identity to continue',
        title: 'Quick Action Login',
        description: `Authenticate to ${getActionDescription(action)}`
      });
      userType = 'consignor';
    }
    
    return { ...result, userType };
  }, [biometricLogin]);

  // Login with the retrieved credentials
  const loginWithCredentials = useCallback(async (credentials, userType) => {
    console.log('[ShortcutAuth] Logging in with credentials, userType:', userType);
    
    try {
      let payload;
      
      if (userType === 'consignor') {
        // Consignor login
        payload = { email: credentials.username, password: credentials.password };
        const response = await axios.post(`${API}/forms/consignor/login`, payload);
        
        localStorage.setItem('consignorEmail', credentials.username);
        localStorage.setItem('consignorAuthenticated', 'true');
        
        return { 
          success: true, 
          userType: 'consignor',
          user: { email: credentials.username }
        };
      } else {
        // Employee/Admin login
        if (credentials.password === 'EMAIL_ONLY_LOGIN') {
          // Passwordless employee
          payload = { email: credentials.username };
        } else if (credentials.password && credentials.password.length === 4 && /^\d+$/.test(credentials.password)) {
          // Admin code (4 digits)
          payload = { email: credentials.username, admin_code: credentials.password };
        } else {
          // Password login
          payload = { email: credentials.username, password: credentials.password };
        }
        
        const response = await axios.post(`${API}/auth/login`, payload);
        const { access_token, user } = response.data;
        
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('sessionStart', Date.now().toString());
        
        return { success: true, userType: user.role, user };
      }
    } catch (error) {
      console.error('[ShortcutAuth] Login failed:', error);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  }, []);

  // Route to the appropriate page based on user type and action
  const routeToAction = useCallback((userType, action, user) => {
    console.log('[ShortcutAuth] Routing:', { userType, action, user });
    
    // Clear the pending action - we're handling it now
    localStorage.removeItem('pendingShortcutAction');
    
    if (userType === 'admin') {
      // Admin actions
      switch (action) {
        case 'StartTrip':
          localStorage.setItem('pendingShortcutAction', 'StartTrip');
          navigate('/admin');
          toast.success('Starting GPS trip...');
          break;
        case 'LogMiles':
          localStorage.setItem('pendingShortcutAction', 'LogMiles');
          navigate('/admin');
          toast.success('Opening manual trip entry...');
          break;
        case 'ClockIn':
          // Admins don't clock in, but we can show hours section
          localStorage.setItem('pendingShortcutAction', 'ClockIn');
          navigate('/admin');
          toast.info('Opening employee hours...');
          break;
        default:
          navigate('/admin');
      }
    } else if (userType === 'employee') {
      // Employee actions
      switch (action) {
        case 'ClockIn':
          // Navigate to employee dashboard and auto-clock-in
          localStorage.setItem('pendingShortcutAction', 'ClockIn');
          navigate('/dashboard');
          toast.success('Opening clock in...');
          break;
        case 'StartTrip':
        case 'LogMiles':
          // Employees can't do GPS tracking, just go to dashboard
          navigate('/dashboard');
          toast.info('GPS tracking is admin-only');
          break;
        default:
          navigate('/dashboard');
      }
    } else if (userType === 'consignor') {
      // Consignors can't use these shortcuts
      navigate('/consignment-agreement');
      toast.info('Shortcuts are for employees and admins');
    } else {
      // Unknown user type, go to login
      navigate('/login');
    }
  }, [navigate]);

  // Main handler for processing shortcuts
  const processShortcut = useCallback(async (action) => {
    if (isProcessing || isLoading) return;
    
    setIsProcessing(true);
    console.log('[ShortcutAuth] Processing shortcut:', action);
    
    try {
      // Check if already logged in
      const existingToken = localStorage.getItem('token');
      const existingUser = localStorage.getItem('user');
      
      if (existingToken && existingUser) {
        // Already logged in - verify token is still valid
        try {
          await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${existingToken}` }
          });
          
          const user = JSON.parse(existingUser);
          console.log('[ShortcutAuth] Already logged in as:', user.role);
          routeToAction(user.role, action, user);
          return;
        } catch (error) {
          // Token invalid, clear and continue with biometric
          console.log('[ShortcutAuth] Token invalid, need to re-authenticate');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      // Not logged in - try biometric auth
      if (!isAvailable || !isNative) {
        console.log('[ShortcutAuth] Biometric not available');
        localStorage.setItem('pendingShortcutAction', action);
        navigate('/login');
        toast.info('Please log in to continue');
        return;
      }
      
      // Attempt biometric authentication
      const authResult = await attemptBiometricAuth(action);
      
      if (!authResult.success) {
        console.log('[ShortcutAuth] Biometric auth failed:', authResult);
        if (authResult.cancelled) {
          toast.info('Authentication cancelled');
        } else if (authResult.needsPassword) {
          toast.info('Please log in first to enable Face ID');
        } else {
          toast.error('Authentication failed');
        }
        localStorage.setItem('pendingShortcutAction', action);
        navigate('/login');
        return;
      }
      
      // Biometric succeeded - now login with credentials
      const loginResult = await loginWithCredentials(authResult.credentials, authResult.userType);
      
      if (!loginResult.success) {
        toast.error(loginResult.error || 'Login failed');
        navigate('/login');
        return;
      }
      
      // Login successful - route to action
      toast.success(`Welcome back!`);
      routeToAction(loginResult.userType, action, loginResult.user);
      
    } catch (error) {
      console.error('[ShortcutAuth] Error processing shortcut:', error);
      toast.error('Something went wrong');
      navigate('/login');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isLoading, isAvailable, isNative, attemptBiometricAuth, loginWithCredentials, routeToAction, navigate]);

  // Check for pending shortcut on mount
  useEffect(() => {
    if (isLoading) return;
    
    const checkPendingShortcut = () => {
      const pendingAction = localStorage.getItem('pendingShortcutAction');
      const currentPath = window.location.pathname;
      
      // Only process if we're not already on a destination page
      // and we haven't already started processing
      if (pendingAction && !isProcessing) {
        // Check if we're on the login page or root - these should trigger biometric
        if (currentPath === '/login' || currentPath === '/') {
          console.log('[ShortcutAuth] Found pending action on login page:', pendingAction);
          processShortcut(pendingAction);
        }
        // If on admin or dashboard, let those pages handle it
      }
    };
    
    // Small delay to ensure everything is ready
    const timer = setTimeout(checkPendingShortcut, 300);
    
    // Also listen for the custom event
    const handleShortcutEvent = (event) => {
      const { action } = event.detail;
      console.log('[ShortcutAuth] Received shortcut event:', action);
      processShortcut(action);
    };
    
    window.addEventListener('shortcutAction', handleShortcutEvent);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('shortcutAction', handleShortcutEvent);
    };
  }, [isLoading, isProcessing, processShortcut]);

  // This component doesn't render anything - it just handles the logic
  return null;
}

// Helper function to get user-friendly action descriptions
function getActionDescription(action) {
  switch (action) {
    case 'StartTrip':
      return 'start GPS tracking';
    case 'LogMiles':
      return 'log a trip';
    case 'ClockIn':
      return 'clock in';
    default:
      return 'continue';
  }
}
