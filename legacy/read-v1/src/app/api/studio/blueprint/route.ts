// Build Studio step 0: the blueprint (prefilled spec, capability comparison, tech choices, questions) for a stored analysis.
import { NextResponse } from "next/server";
import type { ScanResult } from "@/lib/scan/page";
import type { DeepScan } from "@/lib/scan/browser";
import type { Insight } from "@/lib/insight";
import { getAnalysis } from "@/lib/store";
import { blueprint } from "@/lib/studio/blueprint";

export async function POST(req: Request) {
  const { id } = await req.json();
  const a = getAnalysis<{ quick: ScanResult; deep: DeepScan | null; about: Insight }>(id);
  if (!a) return NextResponse.json({ error: "This scan expired (server restarted). Run the analysis again." }, { status: 404 });
  return NextResponse.json(blueprint(a.quick, a.deep, a.about));
}
