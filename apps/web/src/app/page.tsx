import { notFound, redirect } from "next/navigation";
import { systemPageEnabled } from "@/lib/env";

/* No product pages yet. In development the root opens the design system. */
export default function Root() {
  if (systemPageEnabled()) redirect("/system");
  notFound();
}
