import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2, CheckCircle, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to send test');
      }

      setSuccess('Test notification sent! Check your notifications.');
      
    } catch (err) {
      console.error('Error sending test:', err);
      setError(err.message || 'Failed to send test notification');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Show instructions if not running as PWA
  if (!isStandalone && isSupported) {
    return (
      <Card className="bg-gradient-to-br from-[#00D4FF]/10 to-[#8B5CF6]/10 border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#1A1A2E] flex items-center gap-2 text-base">
            <Smartphone className="w-5 h-5 text-[#00D4FF]" />
            Enable Push Notifications
          </CardTitle>
          <CardDescription className="text-gray-600">
            Add this app to your home screen to receive push notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="text-[#1A1A2E] font-medium mb-2 text-sm">How to add to Home Screen:</h4>
            <ol className="text-gray-700 text-sm space-y-2 list-decimal list-inside">
              <li>Tap the <strong>Share</strong> button in Safari</li>
              <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
              <li>Tap <strong>&quot;Add&quot;</strong> to confirm</li>
              <li>Open the app from your home screen</li>
              <li>Return here to enable notifications</li>
            </ol>
          </div>
          <p className="text-gray-500 text-xs">
            Push notifications only work when the app is added to your home screen (iOS 16.4+)
          </p>
        </CardContent>
      </Card>
    );
  }

  // Not supported message
  if (!isSupported) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-gray-600">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">Push notifications are not supported on this device/browser.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#00D4FF]/10 to-[#8B5CF6]/10 border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#1A1A2E] flex items-center gap-2 text-base">
          <Bell className="w-5 h-5 text-[#00D4FF]" />
          Push Notifications
        </CardTitle>
        <CardDescription className="text-gray-600">
          {subscription 
            ? "You'll receive push notifications for important updates"
            : "Enable push notifications to stay updated"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {subscription ? (
            <>
              <Button
                onClick={disableNotifications}
                disabled={actionLoading}
                variant="outline"
                className="flex-1 bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BellOff className="w-4 h-4 mr-2" />
                )}
                Disable Notifications
              </Button>
              <Button
                onClick={sendTestNotification}
                disabled={actionLoading}
                className="flex-1 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white hover:opacity-90"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Send Test
              </Button>
            </>
          ) : (
            <Button
              onClick={enableNotifications}
              disabled={actionLoading}
              className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white hover:opacity-90"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              Enable Push Notifications
            </Button>
          )}
        </div>

        <p className="text-gray-500 text-xs text-center">
          Notifications include: employee clock in/out, form submissions, messages, and test completions
        </p>
      </CardContent>
    </Card>
  );
}
