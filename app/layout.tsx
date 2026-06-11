import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import "../styles/globals.css";
import ClientI18nProvider from "@/components/i18n/ClientI18nProvider";
import { ToastProvider } from "@/components/ui/toast";

const outfit = Outfit({ 
  subsets: ["latin", "latin-ext"], 
  variable: "--font-outfit",
  display: "swap",
  weight: ["100", "300", "400", "500", "700", "900"],
  preload: false,
});

import type { Viewport } from "next";

export const metadata = {
  title: "Dairy Management Pro — Shaibya Solutions",
  description: "Modern dairy management system",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable}`}>
      <body suppressHydrationWarning className="min-h-screen antialiased bg-page text-foreground font-sans">
        <ClientI18nProvider>
          <ToastProvider>{children}</ToastProvider>
        </ClientI18nProvider>
      </body>
    </html>
  );
}
