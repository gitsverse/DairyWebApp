'use client';

import { useEffect, useState } from 'react';

export default function GlobalSplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    setMounted(true);
    
    // Determine greeting based on current local hour
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) {
      setGreeting("Good morning");
    } else if (hour >= 12 && hour < 16) {
      setGreeting("Good afternoon");
    } else if (hour >= 16 && hour < 21) {
      setGreeting("Good evening");
    } else {
      setGreeting("Good night");
    }

    // Begin fade-out at 1.8s
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1800);

    // Completely unmount splash at 2.3s
    const destroyTimer = setTimeout(() => {
      setMounted(false);
    }, 2300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(destroyTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-[#fafaf7] py-16 px-6 transition-all duration-500 ease-out ${
        fadeOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Top spacing */}
      <div />

      {/* Center content */}
      <div className="flex flex-col items-center gap-6">
        {/* Pulsing logo wrapper */}
        <div className="relative w-28 h-28 rounded-[28px] bg-white shadow-lift flex items-center justify-center overflow-hidden animate-pulse">
          <img
            src="/icons/dairy_app_icon.png"
            alt="Dairy App Logo"
            className="w-[112px] h-[112px] object-cover rounded-[28px]"
          />
        </div>

        {/* Text descriptions */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-sans">
            Dairy App
          </h1>
          <p className="text-sm font-bold text-primary/80 uppercase tracking-wider">
            {greeting}
          </p>
        </div>

        {/* Loading bar container */}
        <div className="w-40 h-1 bg-slate-200/80 rounded-full overflow-hidden relative mt-2">
          <div className="absolute inset-y-0 left-0 bg-primary w-1/2 rounded-full animate-loaderLine" />
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="text-center">
        <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">
          Dairy Pro Management
        </p>
      </div>
    </div>
  );
}
