import JSZip from "jszip";
import { getSite } from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const site = getSite(id);
  if (!site) return new Response("Not found (previews expire when the server restarts)", { status: 404 });
  const zip = new JSZip();
  const root = (site.name ?? site.model?.brand ?? "site").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "site";
  for (const [path, content] of Object.entries(site.files)) zip.file(`${root}/${path}`, content);
  if (site.html) zip.file(`${root}/preview.html`, site.html);
  const buf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new Response(buf as unknown as BodyInit, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${root}-nextjs.zip"` } });
}
