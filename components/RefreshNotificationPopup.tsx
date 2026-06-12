'use client';

import { useEffect, useState } from 'react';

export default function RefreshNotificationPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay to ensure entry animation is smooth
    const showTimer = setTimeout(() => {
      setVisible(true);
    }, 300);

    // Auto-dismiss after 5 seconds (+ delay)
    const dismissTimer = setTimeout(() => {
      setVisible(false);
    }, 5300);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
      <div
        className="w-full max-w-sm bg-white border-l-4 border-primary rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-3 pointer-events-auto transition-all duration-500 ease-out opacity-100"
        style={{
          animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800">
              Good morning!
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Today's milk entries are pending.
            </span>
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-slate-50 shrink-0 touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label="Close message"
        >
          <span className="text-xl font-bold leading-none">&times;</span>
        </button>
      </div>
      <style jsx global>{`
        @keyframes slideDown {
          0% {
            transform: translate3d(0, -24px, 0) scale(0.97);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
