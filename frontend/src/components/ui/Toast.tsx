import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    addToast: (type: ToastType, message: string, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, message, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string, duration?: number) => addToast('success', message, duration), [addToast]);
    const error = useCallback((message: string, duration?: number) => addToast('error', message, duration), [addToast]);
    const warning = useCallback((message: string, duration?: number) => addToast('warning', message, duration), [addToast]);
    const info = useCallback((message: string, duration?: number) => addToast('info', message, duration), [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cn(
                            "pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all animate-in slide-in-from-right-full duration-300",
                            toast.type === 'success' && "bg-green-50 border-green-200 text-green-800",
                            toast.type === 'error' && "bg-red-50 border-red-200 text-red-800",
                            toast.type === 'warning' && "bg-amber-50 border-amber-200 text-amber-800",
                            toast.type === 'info' && "bg-blue-50 border-blue-200 text-blue-800"
                        )}
                    >
                        <div className="shrink-0 mt-0.5">
                            {toast.type === 'success' && <CheckCircle size={18} />}
                            {toast.type === 'error' && <AlertCircle size={18} />}
                            {toast.type === 'warning' && <AlertTriangle size={18} />}
                            {toast.type === 'info' && <Info size={18} />}
                        </div>
                        <div className="flex-1 text-sm font-medium leading-relaxed">
                            {toast.message.split('\n').map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
