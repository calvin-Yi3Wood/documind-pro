import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

// 🆕 全局Toast事件系统 - 允许从任何地方触发Toast
type ToastEventHandler = (message: string, type: ToastType, options?: { duration?: number }) => void;
let globalToastHandler: ToastEventHandler | null = null;

export const setGlobalToastHandler = (handler: ToastEventHandler) => {
  globalToastHandler = handler;
};

// 🆕 全局Toast API - 可以从任何组件调用
export const globalToast = {
  success: (message: string, options?: { duration?: number }) => {
    if (globalToastHandler) globalToastHandler(message, 'success', options);
    else console.log('✅', message);
  },
  error: (message: string, options?: { duration?: number }) => {
    if (globalToastHandler) globalToastHandler(message, 'error', options);
    else console.error('❌', message);
  },
  warning: (message: string, options?: { duration?: number }) => {
    if (globalToastHandler) globalToastHandler(message, 'warning', options);
    else console.warn('⚠️', message);
  },
  info: (message: string, options?: { duration?: number }) => {
    if (globalToastHandler) globalToastHandler(message, 'info', options);
    else console.info('ℹ️', message);
  }
};

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  action
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const typeStyles = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200',
      icon: 'fa-check-circle',
      iconColor: 'text-emerald-500',
      text: 'text-emerald-800'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: 'fa-exclamation-circle',
      iconColor: 'text-red-500',
      text: 'text-red-800'
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      icon: 'fa-exclamation-triangle',
      iconColor: 'text-amber-500',
      text: 'text-amber-800'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: 'fa-info-circle',
      iconColor: 'text-blue-500',
      text: 'text-blue-800'
    }
  };

  const styles = typeStyles[type];

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[9999]
        flex items-center gap-3 px-4 py-3 rounded-card border shadow-card
        ${styles.bg}
        transition-all duration-300 ease-out
        ${isLeaving ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
        animate-in slide-in-from-top-2 fade-in
      `}
      style={{ maxWidth: '90vw', minWidth: '280px' }}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${styles.iconColor}`}>
        <i className={`fas ${styles.icon} text-lg`}></i>
      </div>

      {/* Message */}
      <p className={`flex-1 text-sm font-medium ${styles.text}`}>
        {message}
      </p>

      {/* Action Button */}
      {action && (
        <button
          onClick={() => {
            action.onClick();
            handleClose();
          }}
          className={`
            flex-shrink-0 px-3 py-1 rounded-btn text-xs font-bold shadow-btn
            ${type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
            ${type === 'error' ? 'bg-red-500 hover:bg-red-600' : ''}
            ${type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : ''}
            ${type === 'info' ? 'bg-bronze-600 hover:bg-bronze-700' : ''}
            text-white transition-colors
          `}
        >
          {action.label}
        </button>
      )}

      {/* Close Button */}
      <button
        onClick={handleClose}
        className={`flex-shrink-0 p-1 rounded-btn hover:bg-black/5 transition-colors ${styles.text} opacity-60 hover:opacity-100`}
      >
        <i className="fas fa-times text-sm"></i>
      </button>
    </div>
  );
};

// Toast Container for managing multiple toasts
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col items-center gap-2 pt-4">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{ transform: `translateY(${index * 8}px)` }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            {...(toast.duration !== undefined ? { duration: toast.duration } : {})}
            {...(toast.action !== undefined ? { action: toast.action } : {})}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

// Hook for using toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (
    message: string,
    type: ToastType = 'info',
    options?: { duration?: number; action?: { label: string; onClick: () => void } }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type, ...options }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const success = (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) =>
    showToast(message, 'success', options);

  const error = (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) =>
    showToast(message, 'error', options);

  const warning = (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) =>
    showToast(message, 'warning', options);

  const info = (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) =>
    showToast(message, 'info', options);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
    ToastContainer: () => <ToastContainer toasts={toasts} onRemove={removeToast} />
  };
};

export default Toast;
