import type { MetadataRoute } from "next";
import { cfg } from "@/lib/config";
export default function manifest(): MetadataRoute.Manifest {
  return { name: cfg.name, short_name: cfg.name.slice(0, 12), description: cfg.tagline, start_url: "/", display: "standalone", background_color: cfg.design.dark ? "#0b0f19" : "#ffffff", theme_color: cfg.design.primary, icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] };
}
