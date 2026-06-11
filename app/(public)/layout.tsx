import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 via-white to-sky-50/40 text-foreground">
      {children}
    </div>
  );
}
