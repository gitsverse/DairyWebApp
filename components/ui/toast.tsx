"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[300] space-y-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-slide-in ${
              toast.type === "success"
                ? "bg-emerald-50/95 text-emerald-800 border-emerald-200/60"
                : toast.type === "error"
                ? "bg-red-50/95 text-red-800 border-red-200/60"
                : "bg-slate-50/95 text-slate-800 border-slate-200/60"
            }`}
            role="alert"
          >
            {toast.type === "success" && (
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            {toast.type === "error" && (
              <XCircleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            {toast.type === "info" && (
              <ExclamationTriangleIcon className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 text-sm font-semibold pr-2 leading-snug">{toast.message}</div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              aria-label="Close notification"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
