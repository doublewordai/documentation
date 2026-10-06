import type { Metadata } from "next";
import { draftMode, headers } from "next/headers";
import Script from "next/script";
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
  // CSP nonce set by middleware.ts. The anti-FOUC theme script below is a
  // hand-authored inline <script>, so it must carry the nonce explicitly —
  // Next.js only stamps the nonce onto the scripts it renders itself.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
        >
          {`
              (function() {
                function getTheme() {
                  const stored = localStorage.getItem('theme');
                  if (stored) return stored;
                  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }

                const theme = getTheme();
                document.documentElement.setAttribute('data-theme', theme);
                // Also set .dark class for Tailwind utilities
                document.documentElement.classList.toggle('dark', theme === 'dark');
              })();
            `}
        </script>
        {/* Google Analytics (gtag.js) — CON-70. Nonce required by the strict CSP;
            allowed hosts are added in middleware.ts. */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-6ZH94Q0N57"
          nonce={nonce}
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          nonce={nonce}
          strategy="afterInteractive"
        >
          {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-6ZH94Q0N57');
            `}
        </Script>
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
