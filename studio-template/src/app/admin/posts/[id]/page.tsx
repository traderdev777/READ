import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PostForm } from "@/components/Forms";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const post = await db.post.findUnique({ where: { id: (await params).id } });
  if (!post) notFound();
  return <section><div className="wrap"><h1>Edit post</h1><PostForm post={post} /></div></section>;
}
