"use client";
// READ Build Studio: a step-by-step interview that compares the reference with your build, then generates a full-stack platform.
import { useEffect, useState } from "react";
import type { Blueprint, Spec, Entity, Field, FieldType, Features } from "@/lib/studio/blueprint";
import s from "./page.module.css";

const STEPS = ["Basics", "Data", "Features", "Technology", "Design & plans", "Review & build"] as const;
const TYPES: FieldType[] = ["text", "longtext", "number", "money", "bool", "date", "image", "url", "select"];
const CATEGORIES = ["Marketplace / classifieds", "E-commerce store", "Trading / investing", "SaaS / software product", "Education / courses", "Real estate", "Media / blog / news", "Payments / fintech platform", "Developer tool / cloud", "AI product", "Healthcare", "Travel / booking", "Food / restaurant", "Portfolio / agency", "Community / social", "Website"];

type Gen = { zipId: string; name: string; fileCount: number; fileList: string[]; comparison: { label: string; reference: boolean; yours: boolean; status: string }[]; readme: string; schema: string; config: string; env: string; error?: string };

function Ask({ q, hint }: { q: string; hint?: string }) {
  return <div className={s.ask}><span className={s.askAvatar}>R</span><div><p>{q}</p>{hint && <p className={s.small}>{hint}</p>}</div></div>;
}

export function StudioTab({ id, blocks }: { id: string; blocks: string[] }) {
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [gen, setGen] = useState<Gen | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/studio/blueprint", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) })
      .then((r) => r.json()).then((j) => { if (j.error) setErr(j.error); else { setBp(j); setSpec(j.spec); } }).catch(() => setErr("Couldn't load the blueprint"));
  }, [id]);

  if (err) return <div className={s.card}><p className={s.err}>{err}</p></div>;
  if (!bp || !spec) return <div className={s.card}><p className={s.muted}>Reading the reference and preparing questions…</p></div>;

  const up = (patch: Partial<Spec>) => setSpec({ ...spec, ...patch });
  const upF = (patch: Partial<Features>) => setSpec({ ...spec, features: { ...spec.features, ...patch } });
  const qs = (st: string) => bp.questions.filter((q) => q.step === st);

  const generate = async () => {
    setBusy(true); setGen(null);
    const r = await fetch("/api/studio/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, spec }) });
    setGen(await r.json()); setBusy(false);
  };

  return (
    <>
      <div className={s.card}>
        <h3>Build Studio</h3>
        <p className={s.muted}>I&apos;ll ask you a few questions at each step, compare the reference site with what you&apos;re building, and then generate a complete working platform: database, accounts, dashboard, admin, APIs and payments.</p>
        <div className={s.stepper}>{STEPS.map((t, i) => <button key={t} className={`${s.stepDot} ${i === step ? s.stepOn : ""} ${i < step ? s.stepDone : ""}`} onClick={() => setStep(i)}><span>{i + 1}</span>{t}</button>)}</div>
      </div>

      {step === 0 && (
        <div className={s.card}>
          {qs("basics").map((q) => <Ask key={q.id} q={q.ask} hint={q.hint ? `From the reference: ${q.hint}` : undefined} />)}
          <div className={s.formGrid}>
            <label>Product name<input value={spec.name} onChange={(e) => up({ name: e.target.value })} /></label>
            <label>Tagline<input value={spec.tagline} onChange={(e) => up({ tagline: e.target.value })} placeholder="One line" /></label>
            <label>Who is it for?<input value={spec.audience} onChange={(e) => up({ audience: e.target.value })} /></label>
            <label>Type of product<select value={spec.category} onChange={(e) => up({ category: e.target.value })}>{[...new Set([spec.category, ...CATEGORIES])].map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
          <label className={s.full}>What does it do? (2–3 sentences)<textarea rows={3} value={spec.description} onChange={(e) => up({ description: e.target.value })} /></label>
        </div>
      )}

      {step === 1 && (
        <div className={s.card}>
          {qs("data").map((q) => <Ask key={q.id} q={q.ask} />)}
          {blocks.length > 0 && <p className={s.small}>Sections on the reference page: {blocks.join(" · ")}</p>}
          {spec.entities.map((e, ei) => <EntityEditor key={ei} e={e} onChange={(ne) => up({ entities: spec.entities.map((x, i) => (i === ei ? ne : x)) })} onRemove={() => up({ entities: spec.entities.filter((_, i) => i !== ei) })} />)}
          <button className={s.btnGhost} onClick={() => up({ entities: [...spec.entities, { name: "New type", plural: "New types", visibility: "public", fields: [{ name: "title", label: "Title", type: "text", required: true }, { name: "description", label: "Description", type: "longtext" }] }] })}>+ Add another type</button>
        </div>
      )}

      {step === 2 && (
        <div className={s.card}>
          {qs("features").map((q) => <Ask key={q.id} q={q.ask} />)}
          <div className={s.tableWrap}><table className={s.table}><thead><tr><th>Feature</th><th>Reference</th><th>My suggestion</th><th>Your platform</th></tr></thead><tbody>
            {bp.capabilities.map((c) => {
              const k = c.key as keyof Features;
              const val = spec.features[k];
              return (
                <tr key={c.key}>
                  <td><b>{c.label}</b></td>
                  <td>{c.refHas ? "✓ Has it" : "— No"}<div className={s.small}>{c.evidence}</div></td>
                  <td>{c.suggest ? <span className={s.good}>Recommended</span> : <span className={s.muted}>Optional</span>}<div className={s.small}>{c.why}</div>
                    {c.options && <div className={s.small}>{c.options.filter((o) => o.pros).map((o) => <div key={o.value}><b>{o.label}</b>: + {o.pros}{o.cons ? ` · − ${o.cons}` : ""}</div>)}</div>}</td>
                  <td>{k === "payments" ? <select value={spec.features.payments} onChange={(e) => upF({ payments: e.target.value as Features["payments"] })}><option value="razorpay">Razorpay</option><option value="stripe">Stripe</option><option value="none">None</option></select>
                    : k === "analytics" ? <select value={spec.features.analytics} onChange={(e) => upF({ analytics: e.target.value as Features["analytics"] })}><option value="plausible">Plausible</option><option value="ga">Google Analytics</option><option value="none">None</option></select>
                    : <label className={s.check}><input type="checkbox" checked={!!val} disabled={k === "auth" && spec.features.dashboard} onChange={(e) => upF({ [k]: e.target.checked } as Partial<Features>)} /> {val ? "Include" : "Skip"}</label>}
                    {k === "whatsapp" && spec.features.whatsapp && <input className={s.mini} placeholder="WhatsApp number" value={spec.whatsappNumber ?? ""} onChange={(e) => up({ whatsappNumber: e.target.value })} />}
                  </td>
                </tr>
              );
            })}
          </tbody></table></div>
        </div>
      )}

      {step === 3 && (
        <div className={s.card}>
          {qs("tech").map((q) => <Ask key={q.id} q={q.ask} />)}
          {bp.techChoices.map((t) => (
            <div key={t.key} className={s.techRow}>
              <h4>{t.label}</h4><p className={s.small}>Reference uses: <b>{t.reference}</b></p>
              <div className={s.bigActions}>{t.options.map((o) => {
                const selected = t.key === "db" ? spec.tech.db === o.value : t.key === "hosting" ? spec.tech.hosting === o.value : true;
                return (
                  <button key={o.value} className={`${s.actionTile} ${selected ? s.tileOn : ""}`} onClick={() => { if (t.key === "db") up({ tech: { ...spec.tech, db: o.value as Spec["tech"]["db"] } }); if (t.key === "hosting") up({ tech: { ...spec.tech, hosting: o.value as Spec["tech"]["hosting"] } }); }}>
                    <b>{o.label}{o.recommended ? " · recommended" : ""}</b><span>+ {o.pros}</span><span>− {o.cons}</span>
                  </button>
                );
              })}</div>
            </div>
          ))}
          <h4>Reference stack (for comparison)</h4>
          <table className={s.table}><tbody>{bp.referenceStack.map((l) => <tr key={l.layer}><td>{l.layer}</td><td>{l.items.join(", ")}</td></tr>)}</tbody></table>
        </div>
      )}

      {step === 4 && (
        <div className={s.card}>
          <Ask q={qs("design")[0]?.ask ?? "Design"} hint={`From the reference: colour ${bp.spec.design.primary}, font ${bp.spec.design.font}, radius ${bp.spec.design.radius}${bp.spec.design.dark ? ", dark" : ""}.`} />
          <div className={s.formGrid}>
            <label>Main colour<input type="color" value={spec.design.primary} onChange={(e) => up({ design: { ...spec.design, primary: e.target.value } })} /></label>
            <label>Font<select value={spec.design.font} onChange={(e) => up({ design: { ...spec.design, font: e.target.value } })}>{["Inter", "Poppins", "Roboto", "Montserrat", "DM Sans", "Manrope", "Plus Jakarta Sans", "Outfit", "Rubik", "Space Grotesk"].map((f) => <option key={f}>{f}</option>)}</select></label>
            <label>Corner radius<input value={spec.design.radius} onChange={(e) => up({ design: { ...spec.design, radius: e.target.value } })} /></label>
            <label className={s.check}><input type="checkbox" checked={spec.design.dark} onChange={(e) => up({ design: { ...spec.design, dark: e.target.checked } })} /> Dark by default</label>
          </div>
          {spec.features.payments !== "none" && <>
            <Ask q={qs("plans")[0]?.ask ?? "Plans"} />
            {spec.plans.map((p, i) => (
              <div key={i} className={s.planRow}>
                <input value={p.name} onChange={(e) => up({ plans: spec.plans.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} placeholder="Plan name" />
                <input type="number" value={p.price} onChange={(e) => up({ plans: spec.plans.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x) })} placeholder="₹" />
                <select value={p.period} onChange={(e) => up({ plans: spec.plans.map((x, j) => j === i ? { ...x, period: e.target.value as "month" } : x) })}><option value="month">/ month</option><option value="year">/ year</option><option value="once">one-time</option></select>
                <input value={p.perks.join(", ")} onChange={(e) => up({ plans: spec.plans.map((x, j) => j === i ? { ...x, perks: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) } : x) })} placeholder="Perks, comma separated" />
                <button className={s.btnGhost} onClick={() => up({ plans: spec.plans.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <button className={s.btnGhost} onClick={() => up({ plans: [...spec.plans, { name: "Business", price: 1999, period: "month", perks: ["Everything in Pro"] }] })}>+ Add plan</button>
          </>}
        </div>
      )}

      {step === 5 && <Review bp={bp} spec={spec} gen={gen} busy={busy} onGenerate={generate} />}

      <div className={s.navRow}>
        {step > 0 && <button className={s.btnGhost} onClick={() => setStep(step - 1)}>← Back</button>}
        {step < STEPS.length - 1 && <button className={s.btn} onClick={() => setStep(step + 1)}>Next: {STEPS[step + 1]} →</button>}
      </div>
    </>
  );
}

function EntityEditor({ e, onChange, onRemove }: { e: Entity; onChange: (e: Entity) => void; onRemove: () => void }) {
  const setField = (i: number, patch: Partial<Field>) => onChange({ ...e, fields: e.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  return (
    <div className={s.entity}>
      <div className={s.formGrid}>
        <label>Type name (singular)<input value={e.name} onChange={(x) => onChange({ ...e, name: x.target.value })} /></label>
        <label>Plural<input value={e.plural} onChange={(x) => onChange({ ...e, plural: x.target.value })} /></label>
        <label>Who can see them?<select value={e.visibility} onChange={(x) => onChange({ ...e, visibility: x.target.value as Entity["visibility"] })}><option value="public">Public: anyone can browse</option><option value="private">Private: only the owner (and admin)</option></select></label>
        <button className={s.btnGhost} onClick={onRemove}>Remove type</button>
      </div>
      <table className={s.table}><thead><tr><th>Field</th><th>Kind</th><th>Required</th><th>Filter</th><th>Options (for select)</th><th /></tr></thead><tbody>
        {e.fields.map((f, i) => (
          <tr key={i}>
            <td><input className={s.mini} value={f.label} onChange={(x) => setField(i, { label: x.target.value, name: x.target.value })} /></td>
            <td><select value={f.type} onChange={(x) => setField(i, { type: x.target.value as FieldType })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></td>
            <td><input type="checkbox" checked={!!f.required} onChange={(x) => setField(i, { required: x.target.checked })} /></td>
            <td><input type="checkbox" checked={!!f.filter} onChange={(x) => setField(i, { filter: x.target.checked })} /></td>
            <td>{f.type === "select" ? <input className={s.mini} value={(f.options ?? []).join(", ")} onChange={(x) => setField(i, { options: x.target.value.split(",").map((o) => o.trim()) })} /> : <span className={s.muted}>—</span>}</td>
            <td>{i > 0 && <button className={s.btnGhost} onClick={() => onChange({ ...e, fields: e.fields.filter((_, j) => j !== i) })}>✕</button>}</td>
          </tr>
        ))}
      </tbody></table>
      <button className={s.btnGhost} onClick={() => onChange({ ...e, fields: [...e.fields, { name: "", label: "New field", type: "text" }] })}>+ Add field</button>
    </div>
  );
}

function Review({ bp, spec, gen, busy, onGenerate }: { bp: Blueprint; spec: Spec; gen: Gen | null; busy: boolean; onGenerate: () => void }) {
  const on = (k: string) => k === "payments" ? spec.features.payments !== "none" : k === "analytics" ? spec.features.analytics !== "none" : !!spec.features[k as keyof Features];
  const rows = bp.capabilities.map((c) => ({ label: c.label, ref: c.refHas, yours: on(c.key), status: c.refHas && on(c.key) ? "Both" : c.refHas ? "Only reference" : on(c.key) ? "Extra in yours" : "Neither" }));
  const count = (st: string) => rows.filter((r) => r.status === st).length;
  const missing = rows.filter((r) => r.status === "Only reference");
  return (
    <div className={s.card}>
      <Ask q={`Here's how ${spec.name} compares with the reference. ${missing.length ? `You're skipping ${missing.length} thing${missing.length > 1 ? "s" : ""} it has (${missing.map((m) => m.label).join(", ")}). Add them in Features if you want parity.` : "You cover everything the reference has."} Ready to build?`} />
      <div className={s.stats}>
        <div className={s.stat}><b>{count("Both")}</b><span>In both</span></div>
        <div className={s.stat}><b>{count("Extra in yours")}</b><span>Extra in yours</span></div>
        <div className={s.stat}><b>{count("Only reference")}</b><span>Only in reference</span></div>
        <div className={s.stat}><b>{spec.entities.length}</b><span>Data types</span></div>
      </div>
      <table className={s.table}><thead><tr><th>Capability</th><th>Reference</th><th>{spec.name}</th><th>Status</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.label}><td>{r.label}</td><td>{r.ref ? "✓ Yes" : "—"}</td><td>{r.yours ? "✓ Yes" : "—"}</td><td className={r.status === "Only reference" ? s.warnText : r.status === "Extra in yours" ? s.good : ""}>{r.status}</td></tr>)}
      </tbody></table>
      <p className={s.small}>Stack: Next.js 16 + TypeScript · Prisma + {spec.tech.db === "postgres" ? "PostgreSQL" : "SQLite"} · built-in auth · {spec.features.payments !== "none" ? spec.features.payments : "no payments"} · hosting on {spec.tech.hosting}.</p>
      <button className={s.btn} disabled={busy} onClick={onGenerate}>{busy ? "Building your platform…" : `Build ${spec.name}`}</button>
      {gen?.error && <p className={s.err}>{gen.error}</p>}
      {gen && !gen.error && (
        <div className={s.result}>
          <h4>{gen.name}: {gen.fileCount} files, ready to run</h4>
          <div className={s.btns}><a className={s.btnSm} href={`/api/sites/${gen.zipId}/zip`}>Download project (.zip)</a></div>
          <ol className={s.steps}>
            <li>Unzip, then <code>cp .env.example .env</code> and set AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD.</li>
            <li><code>npm install</code></li>
            <li><code>npx prisma db push</code> then <code>npm run seed</code></li>
            <li><code>npm run dev</code> and open http://localhost:3000</li>
          </ol>
          <details><summary>README</summary><pre className={s.pre}>{gen.readme}</pre></details>
          <details><summary>Database schema (prisma/schema.prisma)</summary><pre className={s.pre}>{gen.schema}</pre></details>
          <details><summary>Platform config (src/config.json)</summary><pre className={s.pre}>{gen.config}</pre></details>
          <details><summary>Environment (.env.example)</summary><pre className={s.pre}>{gen.env}</pre></details>
          <details><summary>All files</summary><ul className={s.paths}>{gen.fileList.map((f) => <li key={f}>{f}</li>)}</ul></details>
        </div>
      )}
    </div>
  );
}
