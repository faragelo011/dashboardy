import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";

const jakartaDisplay = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const jakartaBody = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Dashboardy",
  description: "Dashboardy",
};

// No-FOUC theme bootstrap. Runs before paint to set data-theme from
// localStorage (or prefers-color-scheme) so the first render is already themed.
// Keep this inline and free of any imports — it executes in <head>.
const themeBootstrap = `(function(){try{var k='dashboardy-theme';var s=localStorage.getItem(k);var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='dark'||s==='light'?s:(m?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakartaDisplay.variable} ${jakartaBody.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
