import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { systemPageEnabled } from "@/lib/env";
import { SystemGallery } from "./gallery";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

export default function SystemPage() {
  if (!systemPageEnabled()) notFound();
  return <SystemGallery />;
}
