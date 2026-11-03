import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { cfg, siteUrl } from "@/lib/config";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${cfg.name}${cfg.tagline ? ` — ${cfg.tagline}` : ""}`, template: `%s | ${cfg.name}` },
  description: cfg.description || cfg.tagline,
  openGraph: { type: "website", siteName: cfg.name, title: cfg.name, description: cfg.description || cfg.tagline },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: cfg.design.primary };

const vars = { "--primary": cfg.design.primary, "--radius": cfg.design.radius, "--font": `"${cfg.design.font}", system-ui, -apple-system, Segoe UI, Roboto, sans-serif` } as React.CSSProperties;
const themeBoot = `try{var t=localStorage.getItem("theme");document.documentElement.dataset.theme=t||"${cfg.design.dark ? "dark" : "light"}"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const wa = cfg.features.whatsapp && cfg.whatsappNumber ? cfg.whatsappNumber.replace(/\D/g, "") : null;
  return (
    <html lang="en" data-theme={cfg.design.dark ? "dark" : "light"} style={vars} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(cfg.design.font)}:wght@400;500;600;700;800&display=swap`} />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        {wa && <a className="wa" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">WhatsApp</a>}
        {cfg.features.analytics === "plausible" && process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && <Script defer data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.js" strategy="lazyOnload" />}
        {cfg.features.analytics === "ga" && process.env.NEXT_PUBLIC_GA_ID && <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} strategy="lazyOnload" />
          <Script id="ga" strategy="lazyOnload">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`}</Script>
        </>}
      </body>
    </html>
  );
}
