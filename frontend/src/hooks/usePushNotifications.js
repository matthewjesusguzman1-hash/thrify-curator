import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);

  // Check if running on native platform
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    setIsSupported(platform === 'ios' || platform === 'android');
  }, []);

  // Initialize push notifications
  const initialize = useCallback(async () => {
    if (!isSupported) {
      console.log('Push notifications not supported on this platform');
      return false;
    }

    try {
      // Request permission
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        const newStatus = await PushNotifications.requestPermissions();
        if (newStatus.receive !== 'granted') {
          setError('Push notification permission denied');
          return false;
        }
      } else if (permStatus.receive !== 'granted') {
        setError('Push notification permission not granted');
        return false;
      }

      // Register with APNS/FCM
      await PushNotifications.register();

      // Listen for registration success
      PushNotifications.addListener('registration', async (tokenData) => {
        console.log('Push registration success:', tokenData.value);
        setToken(tokenData.value);
        
        // Send token to backend
        const authToken = localStorage.getItem('token');
        if (authToken) {
          try {
            await axios.post(`${API}/push/register`, {
              token: tokenData.value,
              platform: Capacitor.getPlatform(),
              device_name: navigator.userAgent
            }, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
            setIsRegistered(true);
            console.log('Token registered with backend');
          } catch (err) {
            console.error('Failed to register token with backend:', err);
          }
        }
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration error:', err);
        setError(err.error);
      });

      // Listen for push notifications received
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
        
        // Show local notification if app is in foreground
        LocalNotifications.schedule({
          notifications: [{
            title: notification.title || 'Thrifty Curator',
            body: notification.body || '',
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) },
            extra: notification.data
          }]
        });
      });

      // Listen for notification action (tap)
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push notification action:', action);
        
        // Handle navigation based on notification type
        const data = action.notification.data;
        if (data?.type) {
          handleNotificationTap(data.type, data);
        }
      });

      return true;
    } catch (err) {
      console.error('Failed to initialize push notifications:', err);
      setError(err.message);
      return false;
    }
  }, [isSupported]);

  // Handle notification tap navigation
  const handleNotificationTap = (type, data) => {
    // Navigate based on notification type
    switch (type) {
      case 'clock_in':
      case 'clock_out':
        window.location.href = '/admin#hours';
        break;
      case 'w9_submission':
        window.location.href = '/admin#employees';
        break;
      case 'job_application':
      case 'consignment_inquiry':
      case 'consignment_agreement':
      case 'payment_method_change':
      case 'consignment_items_added':
        window.location.href = '/admin#forms';
        break;
      case 'new_message':
        window.location.href = '/admin#messages';
        break;
      default:
        window.location.href = '/admin';
    }
  };

  // Unregister push notifications
  const unregister = useCallback(async () => {
    if (!token) return;

    try {
      const authToken = localStorage.getItem('token');
      if (authToken) {
        await axios.delete(`${API}/push/unregister?token=${token}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }
      
      await PushNotifications.removeAllListeners();
      setIsRegistered(false);
      setToken(null);
    } catch (err) {
      console.error('Failed to unregister push notifications:', err);
    }
  }, [token]);

  return {
    isSupported,
    isRegistered,
    token,
    error,
    initialize,
    unregister
  };
}

export default usePushNotifications;
