"use client";
import { useState } from "react";
import type { DeepScan, Block } from "@/lib/scan/browser";
import type { ActionResult } from "@/lib/actions";
import s from "./page.module.css";

type Res = ActionResult & { previewId?: string; zipId?: string; fileList?: string[]; error?: string };

async function act(body: Record<string, unknown>): Promise<Res> {
  const r = await fetch("/api/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) return { title: "Error", summary: j.error ?? "Action failed", files: [], error: j.error };
  return j;
}

function Code({ lang, code, path }: { lang: string; code: string; path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={s.codeBox}>
      <div className={s.codeHead}><code>{path}</code><span className={s.muted}>{lang}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre className={s.pre}>{code}</pre>
    </div>
  );
}

export function ResultView({ r }: { r: Res }) {
  return (
    <div className={s.result}>
      <h4>{r.title}</h4>
      <p className={r.error ? s.err : s.muted}>{r.summary}{r.aiError ? ` (AI: ${r.aiError})` : ""}</p>
      {(r.previewId || r.zipId) && (
        <div className={s.btns}>
          {r.previewId && <a className={s.btnSm} href={`/p/${r.previewId}`} target="_blank" rel="noreferrer">Open preview ↗</a>}
          {r.zipId && <a className={s.btnGhost} href={`/api/sites/${r.zipId}/zip`}>Download code (.zip)</a>}
        </div>
      )}
      {r.previewId && <iframe className={s.frame} src={`/p/${r.previewId}`} title="Preview" />}
      {r.steps && r.steps.length > 0 && <ol className={s.steps}>{r.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>}
      {r.files.map((f) => <Code key={f.path} {...f} />)}
      {r.fileList && <p className={s.small}>Project files: {r.fileList.join(", ")}</p>}
    </div>
  );
}

function SectionCard({ b, id, exact, owns }: { b: Block; id: string; exact: boolean; owns: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [res, setRes] = useState<Res | null>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [ask, setAsk] = useState("");
  const run = async (action: string, instruction?: string) => {
    setBusy(action); setRes(await act({ id, scope: "section", index: b.index, action, instruction, exact, ownsSite: owns })); setBusy(null);
  };
  return (
    <div className={s.card}>
      <div className={s.secHead}>
        <span className={s.secNum}>{b.index + 1}</span>
        <div><b>{b.kind}</b><p className={s.small}>{b.heading ?? b.texts[0] ?? b.selector} · {b.height}px · {b.layout}{b.columns > 1 ? `, ${b.columns} columns` : ""} · {b.images.length} images · {b.links} links</p></div>
      </div>
      {b.shot && <img className={s.secShot} src={b.shot} alt={`Section ${b.index + 1}`} />}
      {b.issues.length > 0 && <p className={s.warn}>⚠ {b.issues.join(" · ")}</p>}
      <div className={s.actionsRow}>
        <button className={s.btnSm} disabled={!!busy} onClick={() => run("rebuild")}>{busy === "rebuild" ? "Building…" : "Rebuild as code"}</button>
        <button className={s.btnGhost} disabled={!!busy} onClick={() => run("improve")}>{busy === "improve" ? "Checking…" : "Improve / fix"}</button>
        <button className={s.btnGhost} onClick={() => setShowHtml((x) => !x)}>{showHtml ? "Hide code" : "View HTML & CSS"}</button>
      </div>
      <form className={s.askRow} onSubmit={(e) => { e.preventDefault(); if (ask.trim()) run("custom", ask); }}>
        <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Custom action, e.g. make this a 3-step timeline with icons" />
        <button className={s.btnGhost} disabled={!!busy}>{busy === "custom" ? "Working…" : "Run"}</button>
      </form>
      {showHtml && <><Code lang="html" path={`${b.selector} (original HTML, cleaned)`} code={b.html} /><Code lang="css" path="Computed styles" code={b.css} /></>}
      {res && <ResultView r={res} />}
    </div>
  );
}

export function SectionsTab({ d, id }: { d: DeepScan; id: string }) {
  const [exact, setExact] = useState(false);
  const [owns, setOwns] = useState(false);
  return (
    <>
      <div className={s.card}>
        <h3>Sections ({d.blocks.length})</h3>
        <p className={s.muted}>The page split into its building blocks, top to bottom. Act on any one: rebuild it as a clean React component, get fixes, see its HTML/CSS, or give a custom instruction.</p>
        <label className={s.check}><input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} /> Keep the original text (exact mode)</label>
        {exact && <label className={s.check}><input type="checkbox" checked={owns} onChange={(e) => setOwns(e.target.checked)} /> I own this site or have the rights to its content</label>}
        {exact && !owns && <p className={s.small}>Exact mode only works for sites you own. Otherwise READ uses placeholder copy.</p>}
      </div>
      {d.blocks.map((b) => <SectionCard key={b.index} b={b} id={id} exact={exact} owns={owns} />)}
    </>
  );
}

export function BuildTab({ id, title }: { id: string; title: string }) {
  const [brand, setBrand] = useState("");
  const [tagline, setTagline] = useState("");
  const [primary, setPrimary] = useState("#7c3aed");
  const [changes, setChanges] = useState("");
  const [dark, setDark] = useState(false);
  const [exact, setExact] = useState(false);
  const [owns, setOwns] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [res, setRes] = useState<Res | null>(null);
  const [ask, setAsk] = useState("");
  const run = async (action: string, extra: Record<string, unknown> = {}) => { setBusy(action); setRes(null); setRes(await act({ id, scope: "site", action, exact, ownsSite: owns, ...extra })); setBusy(null); };
  return (
    <>
      <div className={s.card}>
        <h3>Act on the whole site</h3>
        <p className={s.muted}>{title}</p>
        <div className={s.bigActions}>
          <button className={s.actionTile} disabled={!!busy} onClick={() => run("fix")}><b>{busy === "fix" ? "Working…" : "Fix everything"}</b><span>Ready-to-paste code for security headers, SEO metadata, JSON-LD, sitemap, images, scripts + a full checklist</span></button>
          <button className={s.actionTile} disabled={!!busy} onClick={() => document.getElementById("gen")?.scrollIntoView({ behavior: "smooth" })}><b>Build my version</b><span>A new Next.js site with this structure, your brand and changes. Live preview + zip</span></button>
        </div>
        <form className={s.askRow} onSubmit={(e) => { e.preventDefault(); if (ask.trim()) run("custom", { instruction: ask }); }}>
          <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Custom action, e.g. plan a mobile app version, or write the backend API for this" />
          <button className={s.btnGhost} disabled={!!busy}>{busy === "custom" ? "Working…" : "Run"}</button>
        </form>
      </div>
      <div className={s.card} id="gen">
        <h3>Build my version</h3>
        <div className={s.formGrid}>
          <label>Brand name<input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. WowCars" /></label>
          <label>Tagline<input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line about what you do" /></label>
          <label>Main colour<input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} /></label>
          <label className={s.check}><input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark theme</label>
        </div>
        <label className={s.full}>Your changes<textarea value={changes} onChange={(e) => setChanges(e.target.value)} placeholder="e.g. Add a pricing page in ₹, remove the blog, add WhatsApp contact, focus on Bengaluru" rows={3} /></label>
        <label className={s.check}><input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} /> Reuse the original text (exact mode)</label>
        {exact && <label className={s.check}><input type="checkbox" checked={owns} onChange={(e) => setOwns(e.target.checked)} /> I own this site or have the rights to its content</label>}
        <button className={s.btn} disabled={!!busy || !brand.trim()} onClick={() => run("generate", { input: { brand, tagline, primary, changes, dark } })}>{busy === "generate" ? "Generating…" : "Generate site"}</button>
        <p className={s.small}>READ never copies the original site&apos;s code or images. Text is reused only in exact mode for sites you own. Changes are applied by the AI model when GEMINI_API_KEY is set; otherwise you get a clean template to edit.</p>
      </div>
      {res && <div className={s.card}><ResultView r={res} /></div>}
    </>
  );
}
