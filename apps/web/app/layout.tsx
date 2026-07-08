import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";
import { ThemeProvider } from "./theme-provider";

export const metadata: Metadata = {
  title: "Dashboardy",
  description: "Dashboardy",
};

const themeBootstrap = `(function(){try{var k='dashboardy-theme';var s=localStorage.getItem(k);var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='dark'||s==='light'?s:(m?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      {/* impeccable-live-start */}
{process.env.NODE_ENV === "development" ? (
  <Script src="http://localhost:8400/live.js" strategy="afterInteractive" />
) : null}
{/* impeccable-live-end */}
</body>
    </html>
  );
}
