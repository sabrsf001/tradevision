/**
 * Push Notifications Service
 * Handles browser push notifications for price alerts
 */

// Check if browser supports notifications
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

// Get current permission status
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) {
    console.warn('Push notifications are not supported in this browser');
    return 'unsupported';
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

// Send a push notification
interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  data?: Record<string, unknown>;
  onClick?: () => void;
}

export const sendNotification = (options: PushNotificationOptions): Notification | null => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }
  
  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icons/icon-192x192.png',
      tag: options.tag,
      requireInteraction: options.requireInteraction ?? false,
      data: options.data,
    });
    
    if (options.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }
    
    // Auto-close after 10 seconds if not require interaction
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 10000);
    }
    
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
};

// Send price alert notification
export const sendPriceAlertNotification = (
  symbol: string,
  targetPrice: number,
  currentPrice: number,
  condition: 'above' | 'below'
): Notification | null => {
  const direction = condition === 'above' ? '📈 crossed above' : '📉 crossed below';
  
  return sendNotification({
    title: `🔔 Price Alert: ${symbol}`,
    body: `${symbol} ${direction} $${targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}!\nCurrent: $${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    tag: `price-alert-${symbol}`,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: { symbol, targetPrice, currentPrice, condition },
    onClick: () => {
      // Focus on the window when notification is clicked
      window.focus();
    }
  });
};

// Hook to manage notification state
import { useState, useEffect, useCallback } from 'react';

export interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
  sendAlert: (symbol: string, targetPrice: number, currentPrice: number, condition: 'above' | 'below') => void;
}

export const useNotifications = (): NotificationState => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSupported, setIsSupported] = useState(false);
  
  useEffect(() => {
    setIsSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
  }, []);
  
  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  }, []);
  
  const sendAlert = useCallback((
    symbol: string,
    targetPrice: number,
    currentPrice: number,
    condition: 'above' | 'below'
  ) => {
    sendPriceAlertNotification(symbol, targetPrice, currentPrice, condition);
  }, []);
  
  return {
    isSupported,
    permission,
    requestPermission,
    sendAlert
  };
};

// Check if we should prompt for notifications
export const shouldPromptForNotifications = (): boolean => {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'default') return false;
  
  // Check if user has dismissed the prompt recently
  const lastDismissed = localStorage.getItem('tv_notification_prompt_dismissed');
  if (lastDismissed) {
    const dismissedTime = parseInt(lastDismissed, 10);
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - dismissedTime < oneWeek) {
      return false;
    }
  }
  
  return true;
};

// Dismiss notification prompt for a week
export const dismissNotificationPrompt = (): void => {
  localStorage.setItem('tv_notification_prompt_dismissed', Date.now().toString());
};
