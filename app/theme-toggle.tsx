"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useHydrated } from "@/lib/progress";

const ORDER = ["system", "light", "dark"] as const;
type Choice = (typeof ORDER)[number];

const LABELS: Record<Choice, string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

const ICONS: Record<Choice, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };

/** Compact cycling control for the header; /settings has the explicit one. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const ready = useHydrated();
  // Before hydration the stored choice is unknown, so render the neutral icon.
  const current: Choice = ready && ORDER.includes(theme as Choice) ? (theme as Choice) : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICONS[current];

  return <button
    type="button"
    className="theme-toggle"
    onClick={() => setTheme(next)}
    aria-label={`Theme: ${LABELS[current]}. Switch to ${LABELS[next]}.`}
    title={`Theme: ${LABELS[current]}`}
  >
    <Icon size={16} aria-hidden="true" />
  </button>;
}
