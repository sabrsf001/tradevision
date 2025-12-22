import React, { useEffect } from 'react';
import { BellRing, X, Check } from './Icons';

interface ToastProps {
  message: string;
  type: 'success' | 'alert' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgClass = type === 'alert' ? 'bg-[#ef5350]' : type === 'success' ? 'bg-[#26a69a]' : 'bg-[#2962ff]';

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 p-4 rounded-lg shadow-2xl text-white ${bgClass} animate-fade-in min-w-[300px]`}>
      <div className="bg-white/20 p-2 rounded-full">
        {type === 'alert' ? <BellRing className="h-5 w-5" /> : <Check className="h-5 w-5" />}
      </div>
      <div className="flex-grow">
        <h4 className="font-bold text-sm uppercase tracking-wide">{type === 'alert' ? 'Price Alert' : 'Notification'}</h4>
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button onClick={onClose} className="text-white/70 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;