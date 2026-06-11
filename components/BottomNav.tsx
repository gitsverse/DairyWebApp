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
    <nav className="fixed bottom-0 left-0 right-0 
                    bg-white border-t border-gray-200 
                    z-40 md:hidden
                    pb-safe">
      <div className="flex items-center justify-around py-2">
        {navItems.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center 
                gap-0.5 px-3 py-1 rounded-xl 
                touch-manipulation min-w-[60px]
                transition-colors
                ${isActive 
                  ? 'text-teal-600' 
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <span className="text-xl leading-none">
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium mt-1 truncate max-w-[60px] text-center
                ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 bg-teal-500 
                                rounded-full mt-0.5" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
