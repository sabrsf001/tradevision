/**
 * Notification Permission Banner
 * Prompts users to enable push notifications
 */

import React from 'react';
import { Bell, X } from './Icons';

interface NotificationBannerProps {
  isVisible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  isVisible,
  onEnable,
  onDismiss
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl p-4 flex items-center gap-4 max-w-md mx-4">
        <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1">
          <h4 className="text-white font-semibold text-sm">Enable Push Notifications</h4>
          <p className="text-white/80 text-xs mt-0.5">
            Get instant alerts when your price targets are hit
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onEnable}
            className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Enable
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;
