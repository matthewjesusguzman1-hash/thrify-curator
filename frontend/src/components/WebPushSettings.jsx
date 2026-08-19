import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2, CheckCircle, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const API = process.env.REACT_APP_BACKEND_URL;

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
      <div className="bg-gradient-to-r from-[#00D4FF]/10 to-[#8B5CF6]/10 rounded-lg p-3 border border-gray-200">
        <div className="flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-[#00D4FF] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[#1A1A2E] font-medium text-sm">Enable Push Notifications</p>
            <p className="text-gray-500 text-xs mt-0.5">Add to Home Screen first (Share → Add to Home Screen)</p>
          </div>
        </div>
      </div>
    );
  }

  // Not supported message
  if (!isSupported) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs">Push notifications not supported on this device.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#00D4FF]/10 to-[#8B5CF6]/10 rounded-lg p-3 border border-gray-200">
      {error && (
        <div className="bg-red-100 rounded p-2 mb-2 flex items-center gap-2">
          <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-xs">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 rounded p-2 mb-2 flex items-center gap-2">
          <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
          <p className="text-green-700 text-xs">{success}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="w-4 h-4 text-[#00D4FF] flex-shrink-0" />
          <span className="text-[#1A1A2E] font-medium text-sm truncate">
            {subscription ? "Push Enabled" : "Push Notifications"}
          </span>
        </div>
        
        <div className="flex gap-2 flex-shrink-0">
          {subscription ? (
            <>
              <Button
                onClick={disableNotifications}
                disabled={actionLoading}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-gray-600 hover:bg-gray-100"
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Disable"}
              </Button>
              <Button
                onClick={sendTestNotification}
                disabled={actionLoading}
                size="sm"
                className="h-7 px-2 text-xs bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white hover:opacity-90"
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Test"}
              </Button>
            </>
          ) : (
            <Button
              onClick={enableNotifications}
              disabled={actionLoading}
              size="sm"
              className="h-7 px-3 text-xs bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white hover:opacity-90"
            >
              {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Enable"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
