import type { Metadata } from "next";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "Principal AI/ML Competency Matrix",
  description: "Track skills across machine learning, software systems, research, and Principal leadership, with topic-linked Jupyter notebooks.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        <ThemeProvider>
          {children}
          <KeyboardShortcuts />
        </ThemeProvider>
      </body>
    </html>
  );
}
