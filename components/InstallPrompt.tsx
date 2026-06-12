'use client';
import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if user dismissed it in this session to prevent repeated popups
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Delay showing the banner for 6 seconds to prevent overlapping with the welcome popup
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 6000);

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const webkit = !/CriOS/i.test(ua) && /WebKit/i.test(ua);
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
    const isSafari = isIOSDevice && webkit;

    if (isSafari) {
      setIsIOS(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      alert("PWA installation is not supported by your browser or the app is already installed. You can install it via your browser's menu (e.g. click the three dots/share icon and select 'Install' or 'Add to Home Screen').");
      setShowBanner(false);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    // Dismiss for the current session to prevent annoying the user
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 animate-slide-in">
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-lift p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-2xl shrink-0">
            🥛
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm">Install DairyPro</p>
            <p className="text-xs text-gray-500 truncate font-medium">
              Add to home screen for quick access
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-600 text-center leading-relaxed font-semibold">
              Tap <span className="font-bold text-primary">Share</span>, then{' '}
              <span className="font-bold text-primary">Add to Home Screen</span>
            </p>
            <div className="flex justify-center mt-3">
              <button
                onClick={handleDismiss}
                className="text-slate-400 text-xs px-4 py-2 rounded-xl hover:bg-slate-100 w-full font-bold transition duration-200"
              >
                Maybe Later
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
    </div>
  );
}
