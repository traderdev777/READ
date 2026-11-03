"use client";
import { useState } from "react";
import type { ScanResult } from "@/lib/scan/page";
import type { DeepScan } from "@/lib/scan/browser";
import s from "./page.module.css";

async function post<T>(path: string, url: string): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error);
  return j as T;
}

const ms = (v: number | null) => (v == null ? "–" : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v} ms`);
const grade = (lcp: number | null) => (lcp == null ? "" : lcp <= 2500 ? s.good : lcp <= 4000 ? s.ok : s.bad);

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deepErr, setDeepErr] = useState("");
  const [r, setR] = useState<ScanResult | null>(null);
  const [d, setD] = useState<DeepScan | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setDeepLoading(true); setErr(""); setDeepErr(""); setR(null); setD(null);
    post<DeepScan>("/api/deep-scan", url).then(setD).catch((x) => setDeepErr(x.message)).finally(() => setDeepLoading(false));
    try { setR(await post<ScanResult>("/api/scan", url)); }
    catch (x) { setErr(x instanceof Error ? x.message : "Scan failed."); setDeepLoading(false); }
    finally { setLoading(false); }
  }

  const byCat = r ? r.stack.reduce<Record<string, string[]>>((a, x) => ((a[x.category] ??= []).push(x.name), a), {}) : {};

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

          {deepLoading && <div className={s.card}><p className={s.muted}>Opening the site in a real browser for screenshots, design tokens and speed… (10–30 s)</p></div>}
          {deepErr && <div className={s.card}><p className={s.err}>Browser scan: {deepErr}</p></div>}

          {d && (
            <div className={`${s.card} ${s.shots}`}>
              <figure><img src={d.screenshots.desktop} alt="Desktop screenshot" /><figcaption>Desktop 1366px</figcaption></figure>
              <figure className={s.phone}><img src={d.screenshots.mobile} alt="Mobile screenshot" /><figcaption>Mobile 390px</figcaption></figure>
            </div>
          )}

          <div className={s.card}>
            <h3>Tech stack</h3>
            {Object.keys(byCat).length === 0 ? <p className={s.muted}>Nothing fingerprinted from the page source.</p> :
              <ul className={s.list}>{Object.entries(byCat).map(([c, n]) => <li key={c}><b>{c}</b> {n.join(", ")}</li>)}</ul>}
            {d && d.network.thirdParties.length > 0 && <p className={s.muted}>Third-party hosts: {d.network.thirdParties.join(", ")}</p>}
          </div>

          {d && (
            <div className={s.card}>
              <h3>Design system</h3>
              <h4>Colours</h4>
              <div className={s.swatches}>{d.design.colors.map((c) => <span key={c.role + c.value} title={`${c.role}: ${c.value} (${c.count})`} className={s.swatch} style={{ background: c.value }} />)}</div>
              <h4>Type</h4>
              <p className={s.muted}>{d.design.fonts.map((f) => `${f.family} (${f.count})`).join(" · ") || "–"}</p>
              <p className={s.muted}>Sizes: {d.design.fontSizes.map((f) => f.size).join(", ")}</p>
              <p className={s.muted}>Corner radii: {d.design.radii.join(", ") || "square"}</p>
              {d.design.buttons.length > 0 && <><h4>Buttons</h4><div className={s.btns}>{d.design.buttons.map((b, i) => <span key={i} style={{ background: b.bg, color: b.color, borderRadius: b.radius, font: `${b.font} system-ui` }} className={s.sampleBtn}>{b.text}</span>)}</div></>}
            </div>
          )}
          {!d && r.design.colors.length > 0 && (
            <div className={s.card}><h3>Design hints</h3><div className={s.swatches}>{r.design.colors.map((c) => <span key={c} title={c} className={s.swatch} style={{ background: c }} />)}</div><p className={s.muted}>Fonts: {r.design.fonts.join(", ") || "–"}</p></div>
          )}

          {d && (
            <div className={s.card}>
              <h3>Speed</h3>
              <div className={s.metrics}>
                <div className={grade(d.perf.lcpMs)}><b>{ms(d.perf.lcpMs)}</b><span>Largest paint</span></div>
                <div><b>{d.perf.cls ?? "–"}</b><span>Layout shift</span></div>
                <div><b>{ms(d.perf.ttfbMs)}</b><span>First byte</span></div>
                <div><b>{ms(d.perf.loadMs)}</b><span>Full load</span></div>
                <div><b>{d.perf.requests}</b><span>Requests</span></div>
                <div><b>{d.perf.transferKB} KB</b><span>Transferred*</span></div>
              </div>
              <p className={s.muted}>{Object.entries(d.network.byType).map(([t, v]) => `${t} ${v.count}`).join(" · ")}</p>
              <p className={s.small}>Measured once from READ&apos;s server. *Only responses that report their size.</p>
            </div>
          )}

          {d && d.features.length > 0 && (
            <div className={s.card}><h3>Features spotted</h3><div className={s.chips}>{d.features.map((f) => <span key={f} className={s.chip}>{f}</span>)}</div>
              {d.network.apiCalls.length > 0 && <><h4>API calls seen</h4><ul className={s.paths}>{d.network.apiCalls.map((a) => <li key={a}>{a}</li>)}</ul></>}
            </div>
          )}

          <div className={s.card}>
            <h3>Structure</h3>
            <p className={s.muted}>{r.structure.navLinks.length} nav links · {r.structure.scripts} scripts · {r.structure.stylesheets} stylesheets · {r.structure.images} images · {r.structure.forms} forms</p>
            {r.structure.navLinks.length > 0 && <><h4>Navigation</h4><ul className={s.paths}>{r.structure.navLinks.map((l, i) => <li key={i}>{l.text} → {l.href}</li>)}</ul></>}
            {r.structure.headings.length > 0 && <><h4>Headings</h4><ul className={s.list}>{r.structure.headings.map((h, i) => <li key={i}>H{h.level} {h.text}</li>)}</ul></>}
            {d && <><h4>Sitemap ({d.sitemap.urls.length}{d.sitemap.urls.length === 200 ? "+" : ""} pages)</h4>
              {d.sitemap.urls.length ? <ul className={s.paths}>{d.sitemap.urls.slice(0, 40).map((u) => <li key={u}>{u.replace(/^https?:\/\/[^/]+/, "") || "/"}</li>)}</ul> : <p className={s.muted}>No sitemap.xml found.</p>}</>}
          </div>
        </section>
      )}
    </main>
  );
}
