"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  HomeIcon,
  UserGroupIcon,
  DocumentChartBarIcon,
  BanknotesIcon,
  CubeIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ShoppingCartIcon,
  WalletIcon,
  ClipboardDocumentListIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { useSubscription } from "@/lib/useSubscription";

const customerNavigation = [
  { key: "nav.dashboard", href: "/dashboard", icon: HomeIcon },
  { key: "nav.customers", href: "/customers", icon: UserGroupIcon },
  { key: "nav.entries", href: "/entries", icon: ClipboardDocumentListIcon },
  { key: "nav.analytics", href: "/analytics", icon: DocumentChartBarIcon },
  { key: "nav.advances", href: "/advances", icon: WalletIcon },
  { key: "nav.billing", href: "/billing", icon: BanknotesIcon },
];

const supplierNavigation = [
  { key: "nav.suppliers", href: "/suppliers", icon: UserGroupIcon },
  { key: "nav.supplierEntries", href: "/supplier-entries", icon: DocumentChartBarIcon },
  { key: "nav.supplierAdvances", href: "/supplier-advances", icon: WalletIcon },
  { key: "nav.supplierBilling", href: "/supplier-billing", icon: BanknotesIcon },
];

const bottomNavigation = [
  { key: "nav.retail", href: "/retail", icon: ShoppingCartIcon },
  { key: "nav.products", href: "/products", icon: CubeIcon },
  { key: "nav.subscription", href: "/subscription", icon: BanknotesIcon },
  { key: "nav.settings", href: "/settings", icon: Cog6ToothIcon },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onNavigate?: () => void;
};

const Sidebar = ({ mobileOpen = false, onNavigate }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [signingOut, setSigningOut] = useState(false);
  const { isActive, planName, daysRemaining, loading } = useSubscription();

  const isLocked = !loading && !isActive;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const renderNavItem = (item: { key: string; href: string; icon: any }) => {
    const disabled = isLocked && item.href !== "/subscription";

    return (
      <Link
        key={item.key}
        href={disabled ? "#" : item.href}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          onNavigate?.();
        }}
        className={`group flex min-h-[44px] items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300 touch-manipulation relative overflow-hidden ${
          disabled
            ? "opacity-40 cursor-not-allowed text-slate-400"
            : pathname.startsWith(item.href)
            ? "bg-primary/10 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] ring-1 ring-primary/20"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        {pathname.startsWith(item.href) && !disabled && (
          <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-r-full shadow-[0_0_10px_rgba(5,150,105,0.4)]" />
        )}
        <item.icon className={`mr-3 h-5 w-5 shrink-0 transition-transform duration-300 ${disabled ? "text-slate-400 opacity-60" : pathname.startsWith(item.href) ? "text-primary opacity-100 scale-110" : "opacity-70 group-hover:scale-110 group-hover:text-primary"}`} />
        <span className="relative z-10">{t(item.key)}</span>
        {disabled && (
          <LockClosedIcon className="ml-auto h-4 w-4 text-slate-400 opacity-60" />
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`
        z-50 flex flex-shrink-0 flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl border border-slate-200/60 bg-white/80 text-foreground
        fixed inset-y-0 left-0 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        md:sticky md:top-4 md:m-4 md:h-[calc(100vh-2rem)] md:w-64 md:rounded-3xl md:translate-x-0
        ${mobileOpen ? "translate-x-0 w-[min(18rem,85vw)] h-screen bg-white" : "-translate-x-full md:translate-x-0 w-[min(18rem,85vw)] md:w-64"}
      `}
    >
      <div className="h-20 flex items-center justify-center border-b border-slate-100 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-t-3xl md:block hidden pointer-events-none" />
        <Link
          href={isLocked ? "/subscription" : "/dashboard"}
          onClick={() => onNavigate?.()}
          className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent z-10 drop-shadow-sm"
        >
          DairyPro
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 overflow-y-auto overflow-x-hidden space-y-1.5">
        {customerNavigation.map(renderNavItem)}

        {/* Suppliers / Buyers Section */}
        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("nav.suppliers")}
          </p>
        </div>
        {supplierNavigation.map(renderNavItem)}

        {/* Bottom: Retail, Products, Settings */}
        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("nav.settings")}
          </p>
        </div>
        {bottomNavigation.map(renderNavItem)}
      </nav>
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 md:rounded-b-3xl">
        {!loading && (
          <div className="mb-4 px-3 py-2.5 rounded-2xl border border-slate-200/50 bg-white text-xs space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Plan Status</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${isActive ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-rose-100 text-rose-800 border border-rose-200"}`}>
                {planName ? planName.replace("_", " ") : "No Plan"}
              </span>
            </div>
            <div className="flex items-center justify-between font-bold text-slate-700 pt-0.5">
              <span>Remaining:</span>
              <span className={daysRemaining > 0 ? "text-primary" : "text-rose-600"}>
                {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
              </span>
            </div>
          </div>
        )}
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold px-2 mb-3">
          Atif Azmi
        </p>
        <Button
          variant="outline"
          className="min-h-[44px] w-full touch-manipulation justify-center border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 shadow-sm"
          onClick={signOut}
          disabled={signingOut}
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
          {t("common.signOut")}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
