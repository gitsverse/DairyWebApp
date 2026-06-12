"use client";

import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex justify-center items-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[32px] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 text-foreground relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* iOS Drag Handle */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

        <div className="flex justify-between items-center mb-5">
          <h2 id="modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none px-1"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
