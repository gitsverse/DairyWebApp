import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import "../styles/globals.css";
import ClientI18nProvider from "@/components/i18n/ClientI18nProvider";
import { ToastProvider } from "@/components/ui/toast";
import InstallPrompt from "@/components/InstallPrompt";
import RefreshNotificationPopup from "@/components/RefreshNotificationPopup";
import GlobalSplashScreen from "@/components/GlobalSplashScreen";

const outfit = Outfit({ 
  subsets: ["latin", "latin-ext"], 
  variable: "--font-outfit",
  display: "swap",
  weight: ["100", "300", "400", "500", "700", "900"],
  preload: false,
});

import type { Viewport } from "next";

export const metadata = {
  title: "Dairy Management Pro — Atif Azmi",
  description: "Modern dairy management system",
  manifest: "/manifest.json",
  themeColor: "#14b8a6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dairy App",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable}`}>
      <head>
        <link rel="preload" href="/icons/icon-512x512.png" as="image" />
      </head>
      <body suppressHydrationWarning className="min-h-screen antialiased bg-page text-foreground font-sans">
        <ClientI18nProvider>
          <ToastProvider>
            <GlobalSplashScreen />
            <InstallPrompt />
            <RefreshNotificationPopup />
            {children}
          </ToastProvider>
        </ClientI18nProvider>
      </body>
    </html>
  );
}
