import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cfg } from "@/lib/config";
import { db } from "@/lib/db";

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await db.post.findUnique({ where: { slug: (await params).slug } });
  return p ? { title: p.title, description: p.excerpt, openGraph: { type: "article", images: p.cover ? [p.cover] : undefined } } : { title: "Not found" };
}
export default async function Post({ params }: P) {
  if (!cfg.features.blog) notFound();
  const p = await db.post.findUnique({ where: { slug: (await params).slug } });
  if (!p || !p.published) notFound();
  return <section><article className="wrap prose"><h1>{p.title}</h1><p className="muted small">{p.createdAt.toLocaleDateString("en-IN")}</p>{p.cover && <img src={p.cover} alt="" />}{p.body.split(/\n\s*\n/).map((x, i) => <p key={i}>{x}</p>)}</article></section>;
}
