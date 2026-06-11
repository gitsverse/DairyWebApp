"use client";

import Image from "next/image";
import Link from "next/link";
import { Cog6ToothIcon, ChartBarIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@/components/i18n/LanguageProvider";

export default function LandingPageClient() {
  const { t } = useI18n();

  return (
    <div className="relative overflow-hidden">
      <header className="container max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <span className="text-xl font-bold text-primary tracking-tight">DairyPro</span>
        <Link
          href="/login"
          className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-card"
        >
          {t("public.signIn")}
        </Link>
      </header>

      <section className="container max-w-6xl mx-auto px-4 pt-4 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 animate-fadeUp">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">
            Shaibya Solutions
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            {t("public.heroTitleA")}{" "}
            <span className="text-primary">{t("public.heroTitleB")}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">{t("public.heroBody")}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all shadow-lift hover:-translate-y-0.5"
            >
              {t("public.openApp")}
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-border bg-white/60 font-medium text-foreground hover:bg-white transition-colors"
            >
              {t("public.exploreFeatures")}
            </a>
          </div>
        </div>

        <div className="relative h-[320px] lg:h-[420px] rounded-2xl overflow-hidden shadow-lift border border-border animate-float">
          <Image
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&q=80"
            alt="Cattle on a green pasture"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
          <p className="absolute bottom-4 left-4 right-4 text-white text-sm font-medium drop-shadow-md">
            Farm-first design — natural greens, cream tones, and trustworthy typography.
          </p>
        </div>
      </section>

      <section id="features" className="bg-white/50 border-y border-border py-16 scroll-mt-20">
        <div className="container max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-foreground mb-10">
            {t("public.featuresTitle")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: UsersIcon,
                title: t("public.featureCustomersTitle"),
                body: t("public.featureCustomersBody"),
              },
              {
                icon: ChartBarIcon,
                title: t("public.featureAnalyticsTitle"),
                body: t("public.featureAnalyticsBody"),
              },
              {
                icon: Cog6ToothIcon,
                title: t("public.featureBillingTitle"),
                body: t("public.featureBillingBody"),
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-cream-50/80 p-6 shadow-card transition-transform hover:-translate-y-1 hover:shadow-lift"
              >
                <Icon className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div className="relative h-64 rounded-xl overflow-hidden shadow-card border border-border">
          <Image
            src="https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800&q=80"
            alt="Dairy products and milk"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">{t("public.builtByTitle")}</h2>
          <p className="text-muted-foreground mb-4">{t("public.builtByBodyA")}</p>
          <p className="text-sm text-muted-foreground">{t("public.builtByBodyB")}</p>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()}{" "}
        <a 
          href="https://www.shaibyasolutions.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors font-medium"
        >
          Shaibya Solutions
        </a>{" "}
        · Dairy Management Pro
      </footer>
    </div>
  );
}

