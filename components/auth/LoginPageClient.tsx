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
      <div className="w-full max-w-md rounded-3xl bg-white/90 backdrop-blur shadow-lift border border-border p-8 animate-fadeUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary font-black text-2xl mb-3 animate-float">
            DP
          </div>
          <h1 className="text-2xl font-bold text-primary">DairyPro</h1>
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
            <label htmlFor="password" className="block text-sm font-medium text-foreground/80 mb-1">
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
                className="flex h-10 w-full rounded-md border border-border bg-white/80 px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
                aria-label="Toggle password visibility"
              >
                👁
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error.startsWith("auth.") ? t(error) : error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
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

