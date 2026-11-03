// Full teardown in one call: quick fetch scan + real-browser scan + sitemap + scored report + "what it does".
import { NextResponse } from "next/server";
import { scanPage } from "@/lib/scan/page";
import { deepScan } from "@/lib/scan/browser";
import { discoverSitemap } from "@/lib/scan/sitemap";
import { buildReport } from "@/lib/report";
import { insight } from "@/lib/insight";
import { saveAnalysis } from "@/lib/store";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (typeof url !== "string" || !url.trim()) return NextResponse.json({ error: "Paste a link to scan" }, { status: 400 });
    const quick = await scanPage(url);
    const [deep, sitemap] = await Promise.all([
      deepScan(quick.finalUrl).then((d) => ({ ok: d, err: null as string | null })).catch((e) => ({ ok: null, err: e instanceof Error ? e.message.split("\n")[0] : String(e) })),
      discoverSitemap(quick.finalUrl, quick.structure.navLinks.map((l) => l.href)).catch(() => null),
    ]);
    const report = await buildReport(quick, deep.ok, sitemap);
    const about = insight(quick, deep.ok, sitemap);
    const body = { quick, deep: deep.ok, deepError: deep.err, sitemap, report, about };
    const id = saveAnalysis(body);
    return NextResponse.json({ id, ...body });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message.split("\n")[0] : "Analysis failed" }, { status: 422 });
  }
}
