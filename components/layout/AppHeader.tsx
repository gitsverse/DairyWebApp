"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bars3Icon, UserCircleIcon } from "@heroicons/react/24/outline";
import { supabaseClient } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/LanguageProvider";

type AppHeaderProps = {
  onOpenMobileNav?: () => void;
};

export default function AppHeader({ onOpenMobileNav }: AppHeaderProps) {
  const [email, setEmail] = useState<string | null>(null);
  const { lang, setLang, t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setEmail(user?.email ?? null);
    });
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 min-h-[3.5rem] shrink-0 items-center justify-between gap-3 border-b border-border bg-white/95 px-3 backdrop-blur sm:px-4 md:px-8">
      <div className="flex min-w-0 flex-1 items-center md:hidden">
        {onOpenMobileNav ? (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-lg text-foreground hover:bg-secondary/80 touch-manipulation"
            aria-label={t("header.menu") ?? "Open menu"}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as "en" | "hi")}
        className="h-9 rounded-md border border-border bg-white px-2 text-sm"
        aria-label={t("header.language")}
      >
        <option value="en">{t("lang.english")}</option>
        <option value="hi">{t("lang.hindi")}</option>
      </select>
      <Link
        href="/settings"
        className="flex max-w-[min(100%,12rem)] sm:max-w-xs items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-secondary/70 touch-manipulation min-h-[44px]"
      >
        <UserCircleIcon className="h-8 w-8 shrink-0 text-primary" aria-hidden />
        <span className="truncate">{email ?? t("common.profile")}</span>
      </Link>
      </div>
    </header>
  );
}
