'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n/LanguageProvider'

export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useI18n()

  const navItems = [
    { href: '/dashboard',     icon: '🏠', label: t('nav.dashboard') },
    { href: '/customers',     icon: '👥', label: t('nav.customers') },
    { href: '/entries',       icon: '📝', label: t('nav.entries') },
    { href: '/billing',       icon: '💰', label: t('nav.billing') },
    { href: '/settings',      icon: '⚙️', label: t('nav.settings') },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none pb-safe">
      <div className="p-3">
        <nav className="bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-lg rounded-[28px] pointer-events-auto">
          <div className="flex items-center justify-around py-2 px-1">
            {navItems.map(item => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center 
                    gap-0.5 px-3 py-1.5 rounded-[20px] 
                    touch-manipulation min-w-[60px]
                    transition-all duration-300
                    ${isActive 
                      ? 'bg-teal-50 text-teal-600 scale-105' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <span className="text-xl leading-none">
                    {item.icon}
                  </span>
                  <span className={`text-[10px] font-bold mt-1 truncate max-w-[60px] text-center
                    ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
