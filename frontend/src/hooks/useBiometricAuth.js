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
    console.log('setCredentials called:', { server, username, isNative: isNative(), hasPlugin: !!NativeBiometric });
    
    if (!isNative() || !NativeBiometric) {
      // Fallback to localStorage for web (less secure but functional)
      try {
        localStorage.setItem(`bio_cred_${server}`, JSON.stringify({ username, password }));
        console.log('Credentials saved to localStorage');
        return { success: true };
      } catch (error) {
        console.log('Failed to save to localStorage:', error);
        return { success: false, error: error.message };
      }
    }

    try {
      await NativeBiometric.setCredentials({
        server,
        username,
        password,
      });
      console.log('Credentials saved to native keychain');
      return { success: true };
    } catch (error) {
      console.log('Failed to store credentials in keychain:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get stored credentials (checks if credentials exist, doesn't require biometric yet)
  const getCredentials = useCallback(async (server) => {
    console.log('getCredentials called:', { server, isNative: isNative(), hasPlugin: !!NativeBiometric });
    
    if (!isNative() || !NativeBiometric) {
      // Fallback to localStorage for web
      try {
        const stored = localStorage.getItem(`bio_cred_${server}`);
        console.log('localStorage check:', { hasStored: !!stored });
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
      console.log('Native keychain credentials found');
      return { success: true, credentials };
    } catch (error) {
      console.log('Failed to get credentials from keychain:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Delete stored credentials
  const deleteCredentials = useCallback(async (server) => {
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

  // Perform biometric login - check for credentials first, then verify identity
  const biometricLogin = useCallback(async (server, options = {}) => {
    console.log('biometricLogin called:', { server, isAvailable, isNative: isNative() });
    
    // FIRST check if we have stored credentials
    const credResult = await getCredentials(server);
    console.log('Credential check result:', credResult);
    
    if (!credResult.success) {
      // No credentials stored - user needs to login with password first
      console.log('No stored credentials found');
      return { success: false, error: 'No saved credentials', needsPassword: true };
    }

    // We have credentials - now verify identity with Face ID/Touch ID
    console.log('Credentials found, verifying identity...');
    const verifyResult = await verifyIdentity(options);
    console.log('Verify identity result:', verifyResult);
    
    if (!verifyResult.success) {
      return verifyResult;
    }

    // Both checks passed - return the credentials
    console.log('Biometric login successful');
    return { 
      success: true, 
      credentials: credResult.credentials 
    };
  }, [isAvailable, verifyIdentity, getCredentials]);

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
  };
};

export default useBiometricAuth;
