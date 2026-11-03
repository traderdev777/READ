import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "READ — Reverse Engineering Anything and Develop",
  description: "Paste a link to get a teardown of its stack, design and features, then develop a similar product with your changes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
