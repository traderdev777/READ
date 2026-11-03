/**
 * Hex mirror of tokens.css for contexts that can't read CSS variables
 * (next/og images, SVG favicons). Values must match styles/tokens.css exactly.
 */
export const brand = {
  ink950: "#05060A",
  ink900: "#0B0D13",
  ink800: "#141821",
  line: "#232936",
  red500: "#FF1F1F",
  chrome100: "#F2F5FA",
  chrome300: "#C9D0DC",
  chrome500: "#8A93A6",
  detected: "#3DDC97",
  inferred: "#FFB020",
} as const;

export const site = {
  name: "RED",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://red.dev",
  description:
    "Paste a link. See how it's built. RED collects real evidence from any public site, labels what is detected vs inferred, then turns it into code and build prompts.",
} as const;
