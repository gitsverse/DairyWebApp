'use client';
import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Register Service Worker client-side
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered successfully:', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const webkit = !/CriOS/i.test(ua) && /WebKit/i.test(ua);
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
    const isSafari = isIOSDevice && webkit;

    if (isSafari) {
      setIsIOS(true);
      // For iOS Safari, trigger the prompt after 6 seconds unconditionally
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 6000);
      return () => clearTimeout(timer);
    }

    // For Android/Chrome/Desktop, wait until beforeinstallprompt fires to set deferredPrompt
    let timer: NodeJS.Timeout;
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Stagger display by 6 seconds once prompt is natively ready
      timer = setTimeout(() => {
        setShowBanner(true);
      }, 6000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
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
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
      <div 
        className="w-full max-w-sm bg-white border border-slate-200/80 rounded-3xl shadow-lift p-5 flex flex-col gap-4 pointer-events-auto"
        style={{
          animation: 'slideDownPrompt 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black text-lg shrink-0">
            DP
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm">Install DairyPro</p>
            <p className="text-xs text-gray-500 truncate font-medium">
              Add to home screen for quick access
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-3">
            <p className="text-xs text-slate-600 text-center leading-relaxed font-semibold">
              Tap <span className="font-bold text-primary">Share</span>, then{' '}
              <span className="font-bold text-primary">Add to Home Screen</span>
            </p>
            <div className="flex justify-center">
              <button
                onClick={handleDismiss}
                className="text-slate-400 text-xs px-4 py-2 rounded-xl hover:bg-slate-100 w-full font-bold transition duration-200"
              >
                Close Guide
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 w-full">
            <button
              onClick={handleDismiss}
              className="flex-1 bg-slate-100 text-slate-700 text-xs font-bold py-2.5 rounded-2xl hover:bg-slate-200 transition active:scale-95 duration-200"
            >
              Maybe Later
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 bg-primary text-white text-xs font-bold py-2.5 rounded-2xl hover:brightness-110 active:scale-95 transition shadow-sm duration-200"
            >
              Install
            </button>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes slideDownPrompt {
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
