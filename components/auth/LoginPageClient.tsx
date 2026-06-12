"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { useState } from "react";

export default function LoginPageClient() {
  const sp = useSearchParams();
  const { t } = useI18n();

  const error = sp.get("error");
  const next = sp.get("next") || "/dashboard";
  const email = sp.get("email") || "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[32px] bg-white border border-slate-200/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-8 animate-fadeUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-primary/10 text-primary font-black text-2xl mb-3">
            DP
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">DairyPro</h1>
          <p className="text-sm text-slate-500 mt-1">{t("auth.loginHelp")}</p>
        </div>

        <form 
          action="/api/auth/login" 
          method="post" 
          className="space-y-4"
          onSubmit={() => setIsSubmitting(true)}
        >
          <input type="hidden" name="next" value={next} />
          <Input
            label={t("auth.email")}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={email}
            required
          />

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
              {t("auth.password")}
              <span className="text-destructive ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="flex h-11 w-full rounded-2xl border border-slate-200/40 bg-slate-100/60 px-4 py-2 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-400 hover:text-slate-700 tracking-widest uppercase transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-3 py-2 text-center font-medium">
              {error.startsWith("auth.") ? t(error) : error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-white text-sm font-bold shadow-[0_2px_8px_rgba(45,122,58,0.15)] hover:shadow-[0_4px_12px_rgba(45,122,58,0.25)] hover:bg-primary/95 active:scale-95 disabled:opacity-70 disabled:pointer-events-none transition-all mt-2"
          >
            {isSubmitting ? t("auth.signingIn") : t("public.signIn")}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link href="/" className="hover:text-primary">
            ← {t("auth.backHome")}
          </Link>
        </p>

        <div className="text-center mt-6 border-t border-border/40 pt-4">
          <Link 
            href="/admin/login" 
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Admin Access
          </Link>
        </div>
      </div>
    </div>
  );
}

