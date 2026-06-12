'use client';
import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const webkit = !!ua.match(/WebKit/i);
    const isIOSDevice = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
    const isSafari = isIOSDevice && webkit && !ua.match(/CriOS/i);

    if (isSafari) {
      setIsIOS(true);
      setShowBanner(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    // Dismiss for the current session only (no localStorage)
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-4 sm:left-auto sm:right-4 sm:w-80 bg-white border-t sm:border sm:rounded-2xl border-gray-200 shadow-2xl z-50 p-4 flex flex-col gap-3 pb-safe">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-white text-xl shrink-0">
          🥛
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">Install Dairy App</p>
          <p className="text-xs text-gray-500 truncate">
            Add to home screen for quick access
          </p>
        </div>
      </div>

      {isIOS ? (
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2">
          <p className="text-xs text-gray-600 text-center">
            Tap <span className="font-bold">Share</span>, then{' '}
            <span className="font-bold">Add to Home Screen</span>
          </p>
          <div className="flex justify-center mt-3">
            <button
              onClick={handleDismiss}
              className="text-gray-400 text-xs px-4 py-2 rounded-lg hover:bg-gray-100 w-full"
            >
              Maybe Later
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 w-full mt-2">
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-3 rounded-[20px] hover:bg-gray-200 transition"
          >
            Maybe Later
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 bg-teal-500 text-white text-xs font-bold py-3 rounded-[20px] hover:bg-teal-400 transition shadow-sm"
          >
            Install
          </button>
        </div>
      )}
    </div>
  );
}
