// Build Studio final step: generate the full-stack project from the user's answers.
import { NextResponse } from "next/server";
import type { ScanResult } from "@/lib/scan/page";
import type { DeepScan } from "@/lib/scan/browser";
import type { Insight } from "@/lib/insight";
import { getAnalysis, saveSite } from "@/lib/store";
import { blueprint, compare, type Spec } from "@/lib/studio/blueprint";
import { buildProject, cleanSpec } from "@/lib/studio/fullstack";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { id, spec } = (await req.json()) as { id: string; spec: Spec };
    const a = getAnalysis<{ quick: ScanResult; deep: DeepScan | null; about: Insight }>(id);
    if (!a) return NextResponse.json({ error: "This scan expired (server restarted). Run the analysis again." }, { status: 404 });
    const bp = blueprint(a.quick, a.deep, a.about);
    const clean = cleanSpec({ ...spec, referenceUrl: a.quick.finalUrl, referenceTitle: a.quick.title ?? undefined });
    const files = await buildProject(clean, bp.capabilities);
    const name = clean.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "platform";
    const zipId = saveSite({ html: "", files, name });
    return NextResponse.json({
      zipId, name, fileCount: Object.keys(files).length, fileList: Object.keys(files).sort(),
      comparison: compare(bp.capabilities, clean), spec: clean,
      readme: files["README.md"], schema: files["prisma/schema.prisma"], config: files["src/config.json"], env: files[".env.example"],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Generation failed" }, { status: 422 });
  }
}
