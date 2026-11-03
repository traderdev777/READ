import Link from "next/link";
import { notFound } from "next/navigation";
import { cfg } from "@/lib/config";
import { db } from "@/lib/db";

export const metadata = { title: "Blog" };
export default async function Blog() {
  if (!cfg.features.blog) notFound();
  const posts = await db.post.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } });
  return <section><div className="wrap"><h1>Blog</h1>{posts.length ? <div className="grid">{posts.map((p) => <Link key={p.id} href={`/blog/${p.slug}`} className="card item">{p.cover && <div className="ph"><img src={p.cover} alt="" /></div>}<div className="pad"><h3>{p.title}</h3><p className="muted small">{p.excerpt}</p></div></Link>)}</div> : <div className="empty">No posts yet.</div>}</div></section>;
}
