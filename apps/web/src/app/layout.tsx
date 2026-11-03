import type { Metadata, Viewport } from "next";
import { Michroma, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { site } from "@/lib/brand";

const michroma = Michroma({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-michroma",
  display: "swap",
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "RED · Paste a link. See how it's built.", template: "%s · RED" },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "RED",
    title: "RED · Paste a link. See how it's built.",
    description: site.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "RED · Paste a link. See how it's built.",
    description: site.description,
  },
};

export const viewport: Viewport = { themeColor: "#05060A", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${michroma.variable} ${interTight.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
