import { useState, useEffect, useCallback } from 'react';

// Check if running in Capacitor native app
const isNative = () => {
  return window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative;
};

// Dynamically import the biometric plugin only in native context
let NativeBiometric = null;

const loadBiometricPlugin = async () => {
  if (isNative() && !NativeBiometric) {
    try {
      const module = await import('@capgo/capacitor-native-biometric');
      NativeBiometric = module.NativeBiometric;
      return true;
    } catch (error) {
      console.log('Biometric plugin not available:', error);
      return false;
    }
  }
  return !!NativeBiometric;
};

export const useBiometricAuth = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!isNative()) {
        setIsLoading(false);
        return;
      }

      const loaded = await loadBiometricPlugin();
      if (!loaded || !NativeBiometric) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await NativeBiometric.isAvailable();
        setIsAvailable(result.isAvailable);
        setBiometryType(result.biometryType); // 'faceId', 'touchId', 'fingerprint', etc.
      } catch (error) {
        console.log('Biometric check error:', error);
        setIsAvailable(false);
      }
      setIsLoading(false);
    };

    checkAvailability();
  }, []);

  // Verify identity with Face ID / Touch ID
  const verifyIdentity = useCallback(async (options = {}) => {
    if (!isAvailable || !NativeBiometric) {
      return { success: false, error: 'Biometrics not available' };
    }

    try {
      await NativeBiometric.verifyIdentity({
        reason: options.reason || 'Verify your identity',
        title: options.title || 'Biometric Login',
        subtitle: options.subtitle || '',
        description: options.description || 'Use Face ID or Touch ID to login',
        useFallback: options.useFallback ?? true,
        fallbackTitle: options.fallbackTitle || 'Use Password',
        maxAttempts: options.maxAttempts || 3,
      });
      return { success: true };
    } catch (error) {
      console.log('Biometric verification failed:', error);
      return { 
        success: false, 
        error: error.message || 'Verification failed',
        cancelled: error.code === 'BIOMETRIC_DISMISSED' || error.message?.includes('cancel')
      };
    }
  }, [isAvailable]);

  // Store credentials securely
  const setCredentials = useCallback(async (server, username, password) => {
    if (!isNative() || !NativeBiometric) {
      // Fallback to localStorage for web (less secure but functional)
      try {
        localStorage.setItem(`bio_cred_${server}`, JSON.stringify({ username, password }));
        localStorage.setItem(`bio_has_cred_${server}`, 'true'); // Flag for checking
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }

    try {
      await NativeBiometric.setCredentials({
        server,
        username,
        password,
      });
      // Set flag so we know credentials exist without needing to verify
      localStorage.setItem(`bio_has_cred_${server}`, 'true');
      return { success: true };
    } catch (error) {
      console.log('Failed to store credentials:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get stored credentials
  const getCredentials = useCallback(async (server) => {
    if (!isNative() || !NativeBiometric) {
      // Fallback to localStorage for web
      try {
        const stored = localStorage.getItem(`bio_cred_${server}`);
        if (stored) {
          return { success: true, credentials: JSON.parse(stored) };
        }
        return { success: false, error: 'No credentials stored' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }

    try {
      const credentials = await NativeBiometric.getCredentials({ server });
      return { success: true, credentials };
    } catch (error) {
      console.log('Failed to get credentials:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Delete stored credentials
  const deleteCredentials = useCallback(async (server) => {
    // Always remove the flag
    localStorage.removeItem(`bio_has_cred_${server}`);
    
    if (!isNative() || !NativeBiometric) {
      localStorage.removeItem(`bio_cred_${server}`);
      return { success: true };
    }

    try {
      await NativeBiometric.deleteCredentials({ server });
      return { success: true };
    } catch (error) {
      console.log('Failed to delete credentials:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Check if credentials exist without triggering biometric prompt
  const hasStoredCredentials = useCallback(async (server) => {
    if (!isNative() || !NativeBiometric) {
      // Check localStorage for web fallback
      const stored = localStorage.getItem(`bio_cred_${server}`);
      return !!stored;
    }
    
    // For native, check the flag we set when credentials are stored
    // If flag doesn't exist but user might have old credentials, return true to allow attempt
    const hasCredFlag = localStorage.getItem(`bio_has_cred_${server}`);
    // If we have no flag set, we need to check if this is first time or migrating user
    // Return true to allow the biometric attempt - it will fail gracefully if no creds
    if (hasCredFlag === null) {
      return true; // Allow attempt for migration/backwards compatibility
    }
    return hasCredFlag === 'true';
  }, []);

  // Perform biometric login - verify identity then get stored credentials
  const biometricLogin = useCallback(async (server, options = {}) => {
    // Check if we should even attempt biometric
    // For native: we need isAvailable to be true
    if (!isAvailable || !NativeBiometric) {
      return { success: false, error: 'Biometrics not available', needsPassword: true };
    }
    
    // Check if credentials might exist
    const mightHaveCredentials = await hasStoredCredentials(server);
    if (!mightHaveCredentials) {
      return { success: false, error: 'No saved credentials', needsPassword: true };
    }
    
    // Verify identity first (this triggers Face ID/Touch ID prompt)
    const verifyResult = await verifyIdentity(options);
    if (!verifyResult.success) {
      return verifyResult;
    }

    // Then get stored credentials
    const credResult = await getCredentials(server);
    if (!credResult.success) {
      // No credentials found - mark it so we don't prompt again
      localStorage.setItem(`bio_has_cred_${server}`, 'false');
      return { success: false, error: 'No saved credentials', needsPassword: true };
    }

    // Success - ensure flag is set
    localStorage.setItem(`bio_has_cred_${server}`, 'true');
    
    return { 
      success: true, 
      credentials: credResult.credentials 
    };
  }, [verifyIdentity, getCredentials, hasStoredCredentials, isAvailable]);

  return {
    isNative: isNative(),
    isAvailable,
    biometryType,
    isLoading,
    verifyIdentity,
    setCredentials,
    getCredentials,
    deleteCredentials,
    biometricLogin,
    hasStoredCredentials,
  };
};

export default useBiometricAuth;
