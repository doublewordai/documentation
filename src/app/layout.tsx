import type { Metadata } from "next";

// Fonts via fontsource (self-hosted, full character sets)
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource-variable/geist-mono";

import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ConfigProvider } from "@/components/ConfigProvider";
import PageEnhancer from "@/components/PageEnhancer";

export const metadata: Metadata = {
  title: "Doubleword Documentation",
  description: "Documentation for Doubleword Control Layer, Inference Stack, and Batched API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
            `,
          }}
        />
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
      </body>
    </html>
  );
}
