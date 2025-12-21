import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Toast Types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, type, message, duration };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => {
    addToast('success', message, duration);
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    addToast('error', message, duration);
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    addToast('warning', message, duration);
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    addToast('info', message, duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Container
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none max-w-md mx-auto">
      <AnimatePresence mode="sync">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual Toast Item
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const config = getToastConfig(toast.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`w-full pointer-events-auto rounded-xl shadow-lg border ${config.containerClass} backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className={`flex-shrink-0 ${config.iconClass}`}>
          {config.icon}
        </div>
        <p className={`flex-1 text-sm font-medium ${config.textClass}`}>
          {toast.message}
        </p>
        <button
          onClick={() => onRemove(toast.id)}
          className={`flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors ${config.closeClass}`}
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
};

// Toast Configuration
function getToastConfig(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        icon: <CheckCircle size={18} />,
        containerClass: 'bg-emerald-50/95 border-emerald-200',
        iconClass: 'text-emerald-600',
        textClass: 'text-emerald-800',
        closeClass: 'text-emerald-600 hover:bg-emerald-100'
      };
    case 'error':
      return {
        icon: <AlertCircle size={18} />,
        containerClass: 'bg-rose-50/95 border-rose-200',
        iconClass: 'text-rose-600',
        textClass: 'text-rose-800',
        closeClass: 'text-rose-600 hover:bg-rose-100'
      };
    case 'warning':
      return {
        icon: <AlertTriangle size={18} />,
        containerClass: 'bg-amber-50/95 border-amber-200',
        iconClass: 'text-amber-600',
        textClass: 'text-amber-800',
        closeClass: 'text-amber-600 hover:bg-amber-100'
      };
    case 'info':
    default:
      return {
        icon: <Info size={18} />,
        containerClass: 'bg-blue-50/95 border-blue-200',
        iconClass: 'text-blue-600',
        textClass: 'text-blue-800',
        closeClass: 'text-blue-600 hover:bg-blue-100'
      };
  }
}

export default ToastProvider;
