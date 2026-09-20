"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";

/**
 * Writes the reader's choice to `data-theme` on <html>. The palette in
 * globals.css keys its dark overrides off that attribute and off the system
 * preference, so an explicit choice wins in both directions.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <NextThemes attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
    {children}
  </NextThemes>;
}
