"use client";
// Client wrappers so every form shows errors and success messages.
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";
import { signup, login, saveItem, addReview, sendContact, subscribe, savePost } from "@/app/actions";
import type { Entity } from "@/lib/config";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button className="btn" disabled={pending}>{pending ? "Please wait…" : children}</button>;
}
const Msg = ({ s }: { s: FormState }) => s?.error ? <p className="err">{s.error}</p> : s?.ok ? <p className="ok">{s.ok}</p> : null;

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [s, act] = useActionState(mode === "login" ? login : signup, undefined);
  return (
    <form action={act} className="stack">
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      {mode === "signup" && <label>Name<input name="name" autoComplete="name" /></label>}
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
      <Msg s={s} />
      <Submit>{mode === "login" ? "Log in" : "Create account"}</Submit>
    </form>
  );
}

function ImageInput({ name, label, value, required }: { name: string; label: string; value?: string; required?: boolean }) {
  const [url, setUrl] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const upload = async (f: File) => {
    setBusy(true); setErr("");
    const fd = new FormData(); fd.append("file", f);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await r.json(); setBusy(false);
    if (r.ok) setUrl(j.url); else setErr(j.error ?? "Upload failed");
  };
  return (
    <label>{label}
      <input name={name} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… or upload" required={required} />
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {busy && <span className="muted small">Uploading…</span>}{err && <span className="err">{err}</span>}
      {url && <img src={url} alt="" className="thumb" />}
    </label>
  );
}

export function ItemForm({ entity, slug, item, uploads }: { entity: Entity; slug: string; item?: Record<string, unknown>; uploads: boolean }) {
  const [s, act] = useActionState(saveItem, undefined);
  const val = (n: string) => { const v = item?.[n]; if (v instanceof Date) return v.toISOString().slice(0, 10); return v == null ? "" : String(v); };
  return (
    <form action={act} className="stack">
      <input type="hidden" name="_entity" value={slug} />
      {item?.id ? <input type="hidden" name="_id" value={String(item.id)} /> : null}
      {entity.fields.map((f) => {
        const req = !!f.required; const label = `${f.label}${req ? " *" : ""}`;
        if (f.type === "image" && uploads) return <ImageInput key={f.name} name={f.name} label={label} value={val(f.name)} required={req} />;
        if (f.type === "longtext") return <label key={f.name}>{label}<textarea name={f.name} rows={5} defaultValue={val(f.name)} required={req} /></label>;
        if (f.type === "select") return <label key={f.name}>{label}<select name={f.name} defaultValue={val(f.name)} required={req}><option value="">Choose…</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select></label>;
        if (f.type === "bool") return <label key={f.name} className="check"><input type="checkbox" name={f.name} defaultChecked={item?.[f.name] === true} /> {f.label}</label>;
        const type = f.type === "number" || f.type === "money" ? "number" : f.type === "date" ? "date" : f.type === "url" || f.type === "image" ? "url" : "text";
        return <label key={f.name}>{label}<input name={f.name} type={type} step={f.type === "money" ? "0.01" : f.type === "number" ? "any" : undefined} defaultValue={val(f.name)} required={req} /></label>;
      })}
      <Msg s={s} />
      <Submit>{item ? "Save changes" : `Add ${entity.name.toLowerCase()}`}</Submit>
    </form>
  );
}

export function ReviewForm({ entity, itemId }: { entity: string; itemId: string }) {
  const [s, act] = useActionState(addReview, undefined);
  return (
    <form action={act} className="stack">
      <input type="hidden" name="entity" value={entity} /><input type="hidden" name="itemId" value={itemId} />
      <label>Rating<select name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}</select></label>
      <label>Review<textarea name="text" rows={3} /></label>
      <Msg s={s} /><Submit>Post review</Submit>
    </form>
  );
}

export function ContactForm() {
  const [s, act] = useActionState(sendContact, undefined);
  return (
    <form action={act} className="stack">
      <label>Name *<input name="name" required /></label>
      <label>Email *<input name="email" type="email" required /></label>
      <label>Phone<input name="phone" type="tel" /></label>
      <label>Message *<textarea name="message" rows={5} required /></label>
      <Msg s={s} /><Submit>Send message</Submit>
    </form>
  );
}

export function SubscribeForm() {
  const [s, act] = useActionState(subscribe, undefined);
  return (
    <form action={act} className="row gap wrap-row">
      <input name="email" type="email" placeholder="you@email.com" required aria-label="Email" />
      <Submit>Subscribe</Submit><Msg s={s} />
    </form>
  );
}

export function PostForm({ post }: { post?: { id: string; title: string; slug: string; body: string; cover: string | null; published: boolean } }) {
  const [s, act] = useActionState(savePost, undefined);
  return (
    <form action={act} className="stack">
      {post && <input type="hidden" name="id" value={post.id} />}
      <label>Title *<input name="title" defaultValue={post?.title} required /></label>
      <label>URL slug<input name="slug" defaultValue={post?.slug} placeholder="auto from title" /></label>
      <label>Cover image URL<input name="cover" defaultValue={post?.cover ?? ""} /></label>
      <label>Body * (blank line = new paragraph)<textarea name="body" rows={12} defaultValue={post?.body} required /></label>
      <label className="check"><input type="checkbox" name="published" defaultChecked={post?.published ?? true} /> Published</label>
      <Msg s={s} /><Submit>Save post</Submit>
    </form>
  );
}
