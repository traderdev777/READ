// Take an action on a section or the whole site of a stored analysis.
import { NextResponse } from "next/server";
import JSZip from "jszip";
import type { ScanResult } from "@/lib/scan/page";
import type { DeepScan } from "@/lib/scan/browser";
import type { Report } from "@/lib/report";
import { getAnalysis, saveSite } from "@/lib/store";
import { rebuildSection, improveSection, fixAll, custom, type ActionResult } from "@/lib/actions";
import { buildModel, renderHtml, nextProject, type GenerateInput } from "@/lib/generate";

export const maxDuration = 120;
type A = { quick: ScanResult; deep: DeepScan | null; report: Report };
type Body = { id: string; scope: "site" | "section"; index?: number; action: "rebuild" | "improve" | "fix" | "generate" | "custom"; instruction?: string; input?: GenerateInput; exact?: boolean; ownsSite?: boolean };

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Body;
    const a = getAnalysis<A>(b.id);
    if (!a) return NextResponse.json({ error: "This scan expired (server restarted). Run the analysis again." }, { status: 404 });
    const exact = !!(b.exact && b.ownsSite);
    let r: ActionResult & { previewId?: string; zipId?: string; fileList?: string[] };

    if (b.scope === "section") {
      const blk = a.deep?.blocks[b.index ?? -1];
      if (!a.deep || !blk) return NextResponse.json({ error: "Section not found" }, { status: 400 });
      if (b.action === "rebuild") r = rebuildSection(a.deep, blk, { exact, primary: b.input?.primary });
      else if (b.action === "improve") r = improveSection(a.deep, blk);
      else r = await custom(b.instruction ?? "", `Section #${blk.index + 1} (${blk.kind})`, { block: { ...blk, shot: undefined }, design: a.deep.design });
    } else {
      if (b.action === "generate") {
        const input: GenerateInput = { brand: b.input?.brand || "Your Brand", tagline: b.input?.tagline, primary: b.input?.primary, changes: b.input?.changes, dark: b.input?.dark, mode: exact ? "exact" : "inspired", ownsSite: exact };
        const deep = a.deep ? { ...a.deep, screenshots: undefined as never } : null;
        const { model, ai, aiError } = await buildModel(a.quick, deep, input);
        const html = renderHtml(model); const files = nextProject(model);
        const id = saveSite({ model, html, files });
        return NextResponse.json({ title: `Generated: ${model.brand}`, summary: `A Next.js site with ${Object.keys(files).length} files, modelled on the scanned site's structure${exact ? " and copy" : " with fresh copy"}.`, files: [{ path: "src/content/site.json", lang: "json", code: files["src/content/site.json"] }, { path: "src/components/Sections.tsx", lang: "tsx", code: files["src/components/Sections.tsx"] }], fileList: Object.keys(files), previewId: id, zipId: id, ai, aiError, steps: ["Open the preview.", "Download the zip, then: npm install && npm run dev", "Edit src/content/site.json to change any text."] });
      }
      if (b.action === "fix") r = fixAll(a.quick, a.deep, a.report);
      else r = await custom(b.instruction ?? "", "Whole site", { quick: a.quick, deep: a.deep ? { ...a.deep, screenshots: undefined, blocks: a.deep.blocks.map((x) => ({ ...x, shot: undefined, html: x.html.slice(0, 800) })) } : null, report: { scores: a.report.scores, findings: a.report.findings } });
    }

    // Every action's code can be previewed (when it renders) and downloaded as a zip.
    if (r.previewHtml) r.previewId = saveSite({ html: r.previewHtml, files: {}, name: "section" });
    if (r.files.length) {
      const files = Object.fromEntries(r.files.map((f) => [f.path.replace(/[^\w./-]+/g, "_"), f.code]));
      r.zipId = saveSite({ html: r.previewHtml ?? "", files, name: r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) });
    }
    void JSZip;
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Action failed" }, { status: 422 });
  }
}
