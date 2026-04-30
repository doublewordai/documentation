import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";

// Fonts via fontsource (self-hosted, full character sets)
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource-variable/geist-mono";

import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ConfigProvider } from "@/components/ConfigProvider";
import PageEnhancer from "@/components/PageEnhancer";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Doubleword Documentation",
  description: "Documentation for Doubleword Control Layer, Inference Stack, and Inference API",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
         * Theme bootstrap. Lives in /public/theme-init.js and runs before
         * paint so the correct data-theme/.dark class is on <html> at first
         * render, avoiding the dark-mode flash. Render-blocking <script src>
         * is required here (next/script's beforeInteractive does not reliably
         * work for this case on Vercel); no-sync-scripts is intentional.
         */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ConfigProvider>
              {children}
              <PageEnhancer />
            </ConfigProvider>
          </AuthProvider>
        </ThemeProvider>
        {(await draftMode()).isEnabled && <VisualEditing />}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
