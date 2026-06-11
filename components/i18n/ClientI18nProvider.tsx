"use client";

import React from "react";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";

export default function ClientI18nProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

