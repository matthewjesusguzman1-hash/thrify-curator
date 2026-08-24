import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2, CheckCircle, AlertCircle, Smartphone, Vibrate } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Vibration preference key for localStorage
const VIBRATION_ENABLED_KEY = 'thrifty_curator_vibration_enabled';

// Helper to check if vibration is enabled
export function isVibrationEnabled() {
  const stored = localStorage.getItem(VIBRATION_ENABLED_KEY);
  // Default to true if not set
  return stored === null ? true : stored === 'true';
}

// Helper to trigger vibration if enabled
export function triggerVibration(pattern = [200, 100, 200]) {
  if (isVibrationEnabled() && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// Convert base64 URL-safe string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function WebPushSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Load vibration preference from localStorage
  useEffect(() => {
    setVibrationEnabled(isVibrationEnabled());
  }, []);

  // Toggle vibration preference
  const toggleVibration = () => {
    const newValue = !vibrationEnabled;
    setVibrationEnabled(newValue);
    localStorage.setItem(VIBRATION_ENABLED_KEY, newValue.toString());
    
    // Give haptic feedback when turning on
    if (newValue && navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  // Check if running as installed PWA and if push is supported
  useEffect(() => {
    // Check if running in standalone mode (added to home screen)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
    setIsStandalone(standalone);
    
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 
                      'PushManager' in window &&
                      'Notification' in window;
    setIsSupported(supported);
    
    // Get current subscription status
    if (supported) {
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (err) {
      console.error('Error checking subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const enableNotifications = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Must be triggered by user gesture
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setError('Notification permission was denied. Please enable notifications in your device settings.');
        setActionLoading(false);
        return;
      }

      // Get VAPID public key from backend
      const keyResponse = await fetch(`${API}/api/web-push/vapid-public-key`);
      if (!keyResponse.ok) throw new Error('Failed to get VAPID key');
      const { publicKey } = await keyResponse.json();

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to backend
      const token = localStorage.getItem('token');
      const subResponse = await fetch(`${API}/api/web-push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pushSubscription.toJSON())
      });

      if (!subResponse.ok) throw new Error('Failed to register subscription');

      setSubscription(pushSubscription);
      setSuccess('Push notifications enabled! You will now receive alerts on this device.');
      
    } catch (err) {
      console.error('Error enabling notifications:', err);
      setError(err.message || 'Failed to enable notifications');
    } finally {
      setActionLoading(false);
    }
  };

  const disableNotifications = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from backend
        const token = localStorage.getItem('token');
        await fetch(`${API}/api/web-push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      setSubscription(null);
      setSuccess('Push notifications disabled.');
      
    } catch (err) {
      console.error('Error disabling notifications:', err);
      setError(err.message || 'Failed to disable notifications');
    } finally {
      setActionLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/web-push/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Test Notification',
          body: 'Push notifications are working!'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send test');
      }

      // Check if there were errors in the response
      if (data.errors && data.errors.length > 0) {
        setError(`Push failed: ${data.errors.join(', ')}`);
      } else if (data.sent === 0) {
        setError('No notifications were sent. Try disabling and re-enabling notifications.');
      } else {
        setSuccess(`Test sent! ${data.message || 'Check your notifications.'}`);
      }
      
    } catch (err) {
      console.error('Error sending test:', err);
      setError(err.message || 'Failed to send test notification');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Show instructions if not running as PWA
  if (!isStandalone && isSupported) {
    return (
      <div style={{ 
        background: 'linear-gradient(to right, rgba(0,212,255,0.1), rgba(139,92,246,0.1))',
        borderRadius: '8px',
        padding: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone style={{ width: '16px', height: '16px', color: '#00D4FF', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', margin: 0, flex: 1 }}>
            <span style={{ fontWeight: 600, color: '#1f2937' }}>Push Notifications</span>
            <span style={{ color: '#6b7280', marginLeft: '6px' }}>• Add to Home Screen first</span>
          </p>
        </div>
      </div>
    );
  }

  // Not supported message
  if (!isSupported) {
    return (
      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs">Push not supported on this device</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'linear-gradient(to right, rgba(0,212,255,0.1), rgba(139,92,246,0.1))',
      borderRadius: '8px',
      padding: '8px',
      border: '1px solid #e5e7eb'
    }}>
      {error && (
        <div style={{ 
          background: '#fee2e2', 
          borderRadius: '4px', 
          padding: '6px 8px', 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px'
        }}>
          <AlertCircle style={{ width: '12px', height: '12px', color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ color: '#b91c1c', fontSize: '12px', margin: 0, lineHeight: '1.3' }}>{error}</p>
        </div>
      )}
      
      {success && (
        <div style={{ 
          background: '#dcfce7', 
          borderRadius: '4px', 
          padding: '6px 8px', 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle style={{ width: '12px', height: '12px', color: '#16a34a', flexShrink: 0 }} />
          <p style={{ color: '#15803d', fontSize: '12px', margin: 0 }}>{success}</p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <Bell style={{ width: '16px', height: '16px', color: '#00D4FF', flexShrink: 0 }} />
          <span style={{ color: '#1f2937', fontWeight: 600, fontSize: '12px' }}>
            {subscription ? "Push On" : "Push"}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {subscription ? (
            <>
              <button
                onClick={disableNotifications}
                disabled={actionLoading}
                style={{ 
                  height: '24px', 
                  padding: '0 8px', 
                  fontSize: '12px', 
                  borderRadius: '4px',
                  background: '#f3f4f6',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#374151',
                  WebkitTextFillColor: '#374151'
                }}
              >
                {actionLoading ? <Loader2 style={{ width: '12px', height: '12px', color: '#374151' }} className="animate-spin" /> : "Off"}
              </button>
              <button
                onClick={sendTestNotification}
                disabled={actionLoading}
                style={{ 
                  height: '24px', 
                  padding: '0 8px', 
                  fontSize: '12px', 
                  borderRadius: '4px',
                  background: 'linear-gradient(to right, #00D4FF, #8B5CF6)',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff'
                }}
              >
                {actionLoading ? <Loader2 style={{ width: '12px', height: '12px', color: '#ffffff' }} className="animate-spin" /> : "Test"}
              </button>
            </>
          ) : (
            <button
              onClick={enableNotifications}
              disabled={actionLoading}
              style={{ 
                height: '24px', 
                padding: '0 8px', 
                fontSize: '12px', 
                borderRadius: '4px',
                background: 'linear-gradient(to right, #00D4FF, #8B5CF6)',
                border: 'none',
                cursor: 'pointer',
                color: '#ffffff',
                WebkitTextFillColor: '#ffffff'
              }}
            >
              {actionLoading ? <Loader2 style={{ width: '12px', height: '12px', color: '#ffffff' }} className="animate-spin" /> : "Enable"}
            </button>
          )}
        </div>
      </div>
      
      {/* Vibration Toggle - only show if notifications are enabled */}
      {subscription && navigator.vibrate && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Vibrate style={{ width: '16px', height: '16px', color: vibrationEnabled ? '#8B5CF6' : '#9ca3af', flexShrink: 0 }} />
            <span style={{ color: '#1f2937', fontWeight: 600, fontSize: '12px' }}>
              Vibration
            </span>
          </div>
          <button
            onClick={toggleVibration}
            style={{ 
              height: '24px', 
              padding: '0 12px', 
              fontSize: '12px', 
              borderRadius: '4px',
              background: vibrationEnabled ? 'linear-gradient(to right, #8B5CF6, #a855f7)' : '#f3f4f6',
              border: 'none',
              cursor: 'pointer',
              color: vibrationEnabled ? '#ffffff' : '#374151',
              WebkitTextFillColor: vibrationEnabled ? '#ffffff' : '#374151',
              transition: 'all 0.2s'
            }}
          >
            {vibrationEnabled ? "On" : "Off"}
          </button>
        </div>
      )}
    </div>
  );
}
