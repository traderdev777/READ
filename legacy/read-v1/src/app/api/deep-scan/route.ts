import { NextResponse } from "next/server";
import { deepScan } from "@/lib/scan/browser";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (typeof url !== "string" || !url.trim()) return NextResponse.json({ error: "Paste a link to scan" }, { status: 400 });
    return NextResponse.json(await deepScan(url));
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : "Deep scan failed";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
