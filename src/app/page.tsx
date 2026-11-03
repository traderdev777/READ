"use client";
import { useState } from "react";
import type { ScanResult } from "@/lib/scan/page";
import s from "./page.module.css";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [r, setR] = useState<ScanResult | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(""); setR(null);
    try {
      const res = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setR(j);
    } catch (e) { setErr(e instanceof Error ? e.message : "Scan failed."); }
    finally { setLoading(false); }
  }

  const byCat = r ? r.stack.reduce<Record<string, string[]>>((a, d) => ((a[d.category] ??= []).push(d.name), a), {}) : {};

  return (
    <main className={s.main}>
      <header className={s.hero}>
        <h1 className={s.logo}>READ</h1>
        <p className={s.tag}>Reverse Engineering Anything and Develop</p>
        <form onSubmit={run} className={s.form}>
          <input className={s.input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a website link, e.g. stripe.com" required />
          <button className={s.btn} disabled={loading}>{loading ? "Scanning…" : "Scan"}</button>
        </form>
        {err && <p className={s.err}>{err}</p>}
      </header>

      {r && (
        <section className={s.report}>
          <div className={s.card}>
            <h2>{r.title || r.finalUrl}</h2>
            {r.description && <p className={s.muted}>{r.description}</p>}
            <p className={s.muted}>HTTP {r.status} · {r.fetchedMs} ms · {(r.bytes / 1024).toFixed(1)} KB HTML{r.lang ? ` · lang ${r.lang}` : ""} · {r.security.https ? "HTTPS" : "no HTTPS"}{r.security.hsts ? " · HSTS" : ""}{r.security.csp ? " · CSP" : ""}{r.meta.viewport ? " · mobile viewport" : " · no viewport tag"}</p>
          </div>
          <div className={s.card}>
            <h3>Tech stack</h3>
            {Object.keys(byCat).length === 0 ? <p className={s.muted}>Nothing fingerprinted from the page source. Deeper detection comes with the browser scanner.</p> :
              <ul className={s.list}>{Object.entries(byCat).map(([c, n]) => <li key={c}><b>{c}</b> {n.join(", ")}</li>)}</ul>}
          </div>
          <div className={s.card}>
            <h3>Design hints</h3>
            <div className={s.swatches}>{r.design.colors.map((c) => <span key={c} title={c} className={s.swatch} style={{ background: c }} />)}</div>
            <p className={s.muted}>Fonts: {r.design.fonts.join(", ") || "not found in HTML"}</p>
            {r.meta.themeColor && <p className={s.muted}>Theme colour: {r.meta.themeColor}</p>}
          </div>
          <div className={s.card}>
            <h3>Structure</h3>
            <p className={s.muted}>{r.structure.navLinks.length} nav links · {r.structure.scripts} scripts · {r.structure.stylesheets} stylesheets · {r.structure.images} images · {r.structure.forms} forms</p>
            {r.structure.navLinks.length > 0 && <><h4>Navigation</h4><ul className={s.paths}>{r.structure.navLinks.map((l, i) => <li key={i}>{l.text} → {l.href}</li>)}</ul></>}
            {r.structure.headings.length > 0 && <><h4>Headings</h4><ul className={s.list}>{r.structure.headings.map((h, i) => <li key={i}>H{h.level} {h.text}</li>)}</ul></>}
          </div>
        </section>
      )}
    </main>
  );
}
