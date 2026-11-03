// Live preview of a generated site.
import { getSite } from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const site = getSite(id);
  if (!site) return new Response("Preview not found. Previews expire when the server restarts.", { status: 404 });
  return new Response(site.html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
