import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cfg, entityBySlug, money } from "@/lib/config";
import { getItem, titleOf, imageOf } from "@/lib/items";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toggleFavorite, removeItem } from "@/app/actions";
import { ReviewForm } from "@/components/Forms";
import Quote from "@/components/Quote";

type P = { params: Promise<{ entity: string; id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { entity, id } = await params; const e = entityBySlug(entity);
  const it = e ? await getItem(e, id) : null;
  if (!e || !it) return { title: "Not found" };
  const img = imageOf(e, it);
  return { title: titleOf(e, it), description: String(it.description ?? "").slice(0, 160) || undefined, openGraph: img ? { images: [img] } : undefined };
}

export default async function Detail({ params }: P) {
  const { entity, id } = await params;
  const e = entityBySlug(entity);
  if (!e) notFound();
  const [it, user] = await Promise.all([getItem(e, id), currentUser()]);
  if (!it) notFound();
  if (e.visibility === "private" && it.ownerId !== user?.id && user?.role !== "admin") notFound();
  const img = imageOf(e, it);
  const [fav, reviews] = await Promise.all([
    user && cfg.features.favorites ? db.favorite.findUnique({ where: { userId_entity_itemId: { userId: user.id, entity: e.name, itemId: id } } }) : null,
    cfg.features.reviews ? db.review.findMany({ where: { entity: e.name, itemId: id }, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } }) : [],
  ]);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const mine = user && (it.ownerId === user.id || user.role === "admin");
  const fmt = (t: string, v: unknown) => v == null || v === "" ? "—" : t === "money" ? money(v) : t === "bool" ? (v ? "Yes" : "No") : t === "date" ? new Date(v as string).toLocaleDateString("en-IN") : String(v);
  const back = `/browse/${entity}/${id}`;
  return (
    <section><div className="wrap">
      <p className="small"><Link className="link" href={`/browse/${entity}`}>← All {e.plural.toLowerCase()}</Link></p>
      <div className="detail">
        <div>
          {img && <img src={img} alt={titleOf(e, it)} />}
          {it.description && <div className="prose">{String(it.description).split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</div>}
        </div>
        <div className="card p">
          <h1>{titleOf(e, it)}</h1>
          {cfg.features.marketData && <p><Quote symbol={titleOf(e, it)} /></p>}
          {cfg.features.reviews && reviews.length > 0 && <p className="muted">{"★".repeat(Math.round(avg))} {avg.toFixed(1)} ({reviews.length})</p>}
          <dl className="facts">{e.fields.filter((f) => !["longtext", "image"].includes(f.type) && f.name !== e.fields[0].name).map((f) => <Fragment key={f.name}><dt>{f.label}</dt><dd>{fmt(f.type, it[f.name])}</dd></Fragment>)}</dl>
          <p className="muted small">Posted by {it.owner?.name ?? it.owner?.email.split("@")[0]} on {new Date(it.createdAt).toLocaleDateString("en-IN")}</p>
          <div className="row gap wrap-row">
            {cfg.features.favorites && <form action={toggleFavorite}><input type="hidden" name="entity" value={e.name} /><input type="hidden" name="itemId" value={id} /><input type="hidden" name="back" value={back} /><button className="btn ghost">{fav ? "♥ Saved" : "♡ Save"}</button></form>}
            {cfg.features.contact && <Link className="btn" href={`/contact?about=${encodeURIComponent(titleOf(e, it))}`}>Enquire</Link>}
            {mine && <Link className="btn ghost" href={`/dashboard/${entity}/${id}/edit`}>Edit</Link>}
            {mine && <form action={removeItem}><input type="hidden" name="_entity" value={entity} /><input type="hidden" name="_id" value={id} /><button className="btn danger">Delete</button></form>}
          </div>
        </div>
      </div>
      {cfg.features.reviews && e.visibility === "public" && (
        <div style={{ marginTop: 40 }}>
          <h2>Reviews</h2>
          {reviews.map((r) => <div key={r.id} className="card p" style={{ marginBottom: 10 }}><b>{"★".repeat(r.rating)}</b> <span className="muted small">{r.user.name ?? r.user.email.split("@")[0]}</span><p>{r.text}</p></div>)}
          {user ? <ReviewForm entity={e.name} itemId={id} /> : <p className="muted"><Link className="link" href={`/login?next=${encodeURIComponent(back)}`}>Log in</Link> to write a review.</p>}
        </div>
      )}
    </div></section>
  );
}
