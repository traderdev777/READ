import { NextResponse } from "next/server";
import { scanPage } from "@/lib/scan/page";


export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (typeof url !== "string" || !url.trim()) return NextResponse.json({ error: "Paste a link to scan" }, { status: 400 });
    const result = await scanPage(url);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Scan failed";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
