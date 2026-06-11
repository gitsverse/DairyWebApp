'use client'
import { useEffect, useState } from 'react'

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener(
      'beforeinstallprompt', handler
    )
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  if (!showBanner) return null

  return (
    // Bottom banner on mobile, top-right on desktop
    <div className="fixed bottom-0 left-0 right-0 
                    sm:bottom-auto sm:top-4 sm:left-auto 
                    sm:right-4 sm:w-80
                    bg-white border-t sm:border sm:rounded-2xl 
                    border-gray-200 shadow-2xl z-50 p-4
                    flex items-center gap-3">
      <div className="w-12 h-12 bg-teal-500 rounded-xl 
                      flex items-center justify-center 
                      text-white text-xl shrink-0">
        🥛
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 text-sm">
          Install DairyWeb App
        </p>
        <p className="text-xs text-gray-500 truncate">
          Add to home screen for quick access
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setShowBanner(false)}
          className="text-gray-400 text-xs px-2 py-1 
                     rounded-lg hover:bg-gray-100"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="bg-teal-500 text-white text-xs font-bold 
                     px-3 py-2 rounded-xl hover:bg-teal-400 
                     transition whitespace-nowrap"
        >
          Install
        </button>
      </div>
    </div>
  )
}
