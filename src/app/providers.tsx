"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";

/** Bungkus seluruh app dengan context (auth + store mock + tema). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StoreProvider>{children}</StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
