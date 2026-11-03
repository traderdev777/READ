import Link from "next/link";
import { notFound } from "next/navigation";
import { cfg } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deletePost } from "@/app/actions";
import { PostForm } from "@/components/Forms";

export default async function Posts() {
  if (!cfg.features.blog) notFound();
  await requireAdmin();
  const posts = await db.post.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <section><div className="wrap">
      <p><Link className="link" href="/admin">← Admin</Link></p>
      <h1>Blog posts</h1>
      <table><tbody>{posts.map((p) => <tr key={p.id}><td><Link className="link" href={`/blog/${p.slug}`}>{p.title}</Link></td><td>{p.published ? "Published" : "Draft"}</td><td className="row gap"><Link className="btn ghost sm" href={`/admin/posts/${p.id}`}>Edit</Link><form action={deletePost}><input type="hidden" name="id" value={p.id} /><button className="btn danger sm">Delete</button></form></td></tr>)}</tbody></table>
      <h2 style={{ marginTop: 32 }}>New post</h2>
      <PostForm />
    </div></section>
  );
}
