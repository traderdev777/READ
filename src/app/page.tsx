"use client";
import { useEffect, useMemo, useState } from "react";
import type { ScanResult } from "@/lib/scan/page";
import type { DeepScan } from "@/lib/scan/browser";
import type { SitemapResult } from "@/lib/scan/sitemap";
import type { Report, Finding, Area } from "@/lib/report";
import type { Insight } from "@/lib/insight";
import { SectionsTab, BuildTab } from "./actions-ui";
import s from "./page.module.css";

type Analysis = { id: string; about: Insight; quick: ScanResult; deep: DeepScan | null; deepError: string | null; sitemap: SitemapResult | null; report: Report };
const TABS = ["Overview", "What it does", "Tech", "Code", "Sections", "Build", "Issues", "Speed", "Design", "SEO", "Content", "Network", "Accessibility", "Security", "Sitemap", "Export"] as const;
type Tab = (typeof TABS)[number];
const STEPS = ["Fetching the page", "Opening it in a real browser", "Measuring speed and coverage", "Reading design tokens", "Checking SEO, accessibility and security", "Visiting on a phone", "Crawling the sitemap", "Scoring and writing the report"];

const ms = (v: number | null | undefined) => (v == null ? "–" : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v} ms`);
const kb = (v: number) => (v >= 1024 ? `${(v / 1024).toFixed(1)} MB` : `${v} KB`);
const tone = (n: number) => (n >= 90 ? s.good : n >= 50 ? s.ok : s.bad);
const rate = (v: number | null | undefined, good: number, poor: number) => (v == null ? "" : v <= good ? s.good : v <= poor ? s.ok : s.bad);

function Gauge({ value, label, big }: { value: number; label: string; big?: boolean }) {
  const r = big ? 52 : 30, c = 2 * Math.PI * r, size = (r + 8) * 2;
  return (
    <div className={`${s.gauge} ${tone(value)}`}>
      <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} className={s.track} /><circle cx={size / 2} cy={size / 2} r={r} className={s.arc} strokeDasharray={`${(value / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} /><text x="50%" y="54%" textAnchor="middle" className={big ? s.gaugeBig : s.gaugeNum}>{value}</text></svg>
      <span>{label}</span>
    </div>
  );
}

function T({ head, rows }: { head: string[]; rows: (string | number | React.ReactNode)[][] }) {
  if (!rows.length) return <p className={s.muted}>Nothing found.</p>;
  return <div className={s.tableWrap}><table className={s.table}><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>;
}

function Stat({ v, l, cls }: { v: React.ReactNode; l: string; cls?: string }) {
  return <div className={`${s.stat} ${cls ?? ""}`}><b>{v}</b><span>{l}</span></div>;
}

function FindingRow({ f }: { f: Finding }) {
  return (
    <div className={`${s.finding} ${s["sev_" + f.severity]}`}>
      <div className={s.fHead}><span className={s.sev}>{f.severity === "pass" ? "✓ pass" : f.severity}</span><b>{f.title}</b><span className={s.area}>{f.area}</span></div>
      {f.detail && <p className={s.muted}>{f.detail}</p>}
      {f.fix && <p className={s.fix}><b>Fix:</b> {f.fix}</p>}
    </div>
  );
}

function download(name: string, body: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type }));
  a.download = name; a.click();
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [a, setA] = useState<Analysis | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [areaFilter, setAreaFilter] = useState<Area | "All">("All");

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setStep((x) => Math.min(x + 1, STEPS.length - 1)), 3500);
    return () => clearInterval(t);
  }, [loading]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setStep(0); setErr(""); setA(null); setTab("Overview");
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setA(j);
    } catch (x) { setErr(x instanceof Error ? x.message : "Scan failed"); }
    finally { setLoading(false); }
  }

  const host = useMemo(() => { try { return a ? new URL(a.quick.finalUrl).hostname : ""; } catch { return ""; } }, [a]);

  return (
    <main className={s.main}>
      <header className={`${s.hero} ${a ? s.heroSmall : ""}`}>
        <h1 className={s.logo}>READ</h1>
        <p className={s.tag}>Reverse Engineering Anything and Develop</p>
        <form onSubmit={run} className={s.form}>
          <input className={s.input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a website link, e.g. stripe.com" required />
          <button className={s.btn} disabled={loading}>{loading ? "Analysing…" : "Analyse"}</button>
        </form>
        {loading && <div className={s.progress}><div className={s.bar} style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /><p>{STEPS[step]}… <span className={s.muted}>(20–60 s)</span></p></div>}
        {err && <p className={s.err}>{err}</p>}
      </header>

      {a && (
        <>
          <nav className={s.tabs}>{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={tab === t ? s.tabOn : ""}>{t === "Build" ? "⚡ Build / Act" : t === "Sections" ? `Sections${a.deep ? ` (${a.deep.blocks.length})` : ""}` : t}{t === "Issues" ? ` (${a.report.findings.filter((f) => f.severity !== "pass").length})` : ""}</button>)}</nav>
          {a.deepError && <div className={s.card}><p className={s.err}>The browser scan failed ({a.deepError}). Showing the fetch-based results only.</p></div>}
          <section className={s.report}>{render(tab, a, host, areaFilter, setAreaFilter, setTab)}</section>
        </>
      )}
    </main>
  );
}

function render(tab: Tab, a: Analysis, host: string, areaFilter: Area | "All", setAreaFilter: (x: Area | "All") => void, setTab: (t: Tab) => void) {
  const { quick: q, deep: d, sitemap: sm, report: r } = a;
  const areas = Object.keys(r.scores).filter((k) => k !== "overall") as Area[];

  switch (tab) {
    case "Overview":
      return (
        <>
          <div className={`${s.card} ${s.overview}`}>
            <Gauge value={r.scores.overall} label="Overall" big />
            <div className={s.ovText}>
              <h2>{q.title || host}</h2>
              {q.description && <p className={s.muted}>{q.description}</p>}
              <p dangerouslySetInnerHTML={{ __html: r.summary.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") }} />
              <p className={s.small}>{q.finalUrl} · HTTP {q.status} · {d ? `${d.network.requests} requests · ${kb(d.network.transferKB)}` : `${(q.bytes / 1024).toFixed(0)} KB HTML`}</p>
            </div>
          </div>
          <div className={`${s.card} ${s.gauges}`}>{areas.map((k) => <Gauge key={k} value={r.scores[k]} label={k} />)}</div>
          {d && (
            <div className={`${s.card} ${s.shots}`}>
              <figure><img src={d.screenshots.desktop} alt="Desktop" /><figcaption>Desktop 1366px</figcaption></figure>
              <figure className={s.phone}><img src={d.screenshots.mobile} alt="Mobile" /><figcaption>iPhone 390px</figcaption></figure>
            </div>
          )}
          {d && (
            <div className={s.card}>
              <h3>Key numbers</h3>
              <div className={s.stats}>
                <Stat v={ms(d.speed.lcpMs)} l="Largest paint (LCP)" cls={rate(d.speed.lcpMs, 2500, 4000)} />
                <Stat v={d.speed.cls ?? "–"} l="Layout shift (CLS)" cls={rate(d.speed.cls, 0.1, 0.25)} />
                <Stat v={ms(d.speed.tbtMs)} l="Blocking time (TBT)" cls={rate(d.speed.tbtMs, 200, 600)} />
                <Stat v={kb(d.network.transferKB)} l="Page weight" cls={rate(d.network.transferKB, 1500, 4000)} />
                <Stat v={d.content.wordCount.toLocaleString()} l="Words" />
                <Stat v={d.network.thirdParty.length} l="Third-party hosts" />
              </div>
            </div>
          )}
          <div className={s.card}>
            <h3>Top issues</h3>
            {r.findings.filter((f) => f.severity !== "pass").slice(0, 6).map((f, i) => <FindingRow key={i} f={f} />)}
            <button className={s.link} onClick={() => setTab("Issues")}>See all issues →</button>
          </div>
          {d && <div className={s.card}><h3>Features</h3><div className={s.chips}>{d.features.map((f) => <span key={f.name} className={f.found ? s.chip : s.chipOff}>{f.found ? "✓" : "–"} {f.name}</span>)}</div></div>}
        </>
      );

    case "What it does": {
      const ab = a.about;
      return (
        <>
          <div className={s.card}>
            <h3>What it is</h3>
            <p className={s.lead}>{ab.oneLiner}</p>
            <div className={s.stats}><Stat v={ab.category} l={`Category (${ab.confidence} confidence)`} /><Stat v={ab.audience.join(", ") || "General"} l="Audience" /><Stat v={ab.hosting ?? "Unknown"} l="Hosted on" /><Stat v={ab.pageTypes.length} l="Page types" /></div>
            {ab.valueProp && <><h4>Main promise (H1)</h4><p>“{ab.valueProp}”</p></>}
          </div>
          {ab.offerings.length > 0 && <div className={s.card}><h3>What it offers</h3><p className={s.small}>From the page&apos;s section headings.</p><ul className={s.bullets}>{ab.offerings.map((o) => <li key={o}>{o}</li>)}</ul></div>}
          <div className={s.card}>
            <h3>How users use it</h3>
            {ab.userFlows.length ? ab.userFlows.map((f) => <div key={f.name} className={s.flow}><b>{f.name}</b><div className={s.flowSteps}>{f.steps.map((x, i) => <span key={i}>{x}</span>)}</div></div>) : <p className={s.muted}>No clear flows on this page.</p>}
          </div>
          <div className={s.card}><h3>How it makes money</h3><ul className={s.bullets}>{ab.monetisation.map((m) => <li key={m}>{m}</li>)}</ul><p className={s.small}>Inferred from pricing, checkout, CTAs and ad pixels on the page.</p></div>
          {ab.pageTypes.length > 0 && <div className={s.card}><h3>Pages and templates</h3><div className={s.chips}>{ab.pageTypes.map((p) => <span key={p} className={s.chip}>{p}</span>)}</div></div>}
          {a.report.aiNarrative && <div className={s.card}><h3>AI analysis</h3><pre className={s.md}>{a.report.aiNarrative}</pre></div>}
        </>
      );
    }

    case "Code": {
      if (!d) return <div className={s.card}><p className={s.muted}>Needs the browser scan.</p></div>;
      const c = d.code;
      return (
        <>
          <div className={s.card}>
            <h3>How it&apos;s coded</h3>
            <div className={s.stats}><Stat v={c.languages.length} l="Languages" /><Stat v={c.bundler ?? "Unknown"} l="Build tool" /><Stat v={c.scripts.length} l="Script files" /><Stat v={c.stylesheets.length} l="Stylesheets" /><Stat v={kb(c.htmlKB)} l="HTML size" /><Stat v={c.sourceMaps.length ? `${c.sourceTree.length} files` : "Not public"} l="Original source (maps)" /></div>
            <p className={s.muted}>Rendering: {c.rendering}{c.generator ? ` · generator: ${c.generator}` : ""} · {c.inlineScripts} inline scripts ({kb(c.inlineKB)}), {c.inlineStyles} inline style blocks</p>
            <div className={s.chips}>{c.languages.map((l) => <span key={l} className={s.chip}>{l}</span>)}</div>
          </div>
          {c.packages.length > 0 && <div className={s.card}><h3>npm packages used</h3><p className={s.small}>Read from the site&apos;s public source maps.</p><T head={["Package", "Files bundled", "npm"]} rows={c.packages.map((p) => [<code key="n">{p.name}</code>, p.files, <a key="l" className={s.link} href={`https://www.npmjs.com/package/${p.name}`} target="_blank" rel="noreferrer">view ↗</a>])} /></div>}
          {c.sourceTree.length > 0 && <div className={s.card}><h3>Original source files ({c.sourceTree.length})</h3><p className={s.small}>The site publishes source maps, so its original file structure is visible.</p><ul className={s.paths}>{c.sourceTree.map((f) => <li key={f}>{f}</li>)}</ul></div>}
          {!c.sourceMaps.length && <div className={s.card}><p className={s.muted}>This site doesn&apos;t publish source maps, so its original file names and packages aren&apos;t visible. Libraries were detected from the running page instead (Tech tab).</p></div>}
          <div className={s.card}><h3>Scripts</h3><T head={["File", "Size", "Loading", "Type"]} rows={c.scripts.map((x) => [<code key="s">{x.src}</code>, kb(x.kb), x.loading, x.type])} /></div>
          <div className={s.card}><h3>Stylesheets</h3><T head={["File", "Size"]} rows={c.stylesheets.map((x) => [<code key="s">{x.href}</code>, kb(x.kb)])} /></div>
          <div className={s.card}><h3>Code samples</h3><p className={s.small}>Shown for study. Don&apos;t paste third-party code into your product; use Sections → Rebuild to get original code.</p>{c.samples.map((x) => <div key={x.label}><h4>{x.label}</h4><pre className={s.pre}>{x.code}</pre></div>)}</div>
        </>
      );
    }

    case "Sections":
      if (!d) return <div className={s.card}><p className={s.muted}>Needs the browser scan.</p></div>;
      return <SectionsTab d={d} id={a.id} />;

    case "Build":
      return <BuildTab id={a.id} title={`Based on ${q.title || host}`} />;

    case "Issues": {
      const list = r.findings.filter((f) => areaFilter === "All" || f.area === areaFilter);
      return (
        <div className={s.card}>
          <div className={s.filters}>{(["All", ...areas] as const).map((x) => <button key={x} className={areaFilter === x ? s.tabOn : ""} onClick={() => setAreaFilter(x)}>{x}{x !== "All" ? ` ${r.scores[x]}` : ""}</button>)}</div>
          {list.map((f, i) => <FindingRow key={i} f={f} />)}
        </div>
      );
    }

    case "Speed":
      if (!d) return <div className={s.card}><p className={s.muted}>Needs the browser scan.</p></div>;
      return (
        <>
          <div className={s.card}>
            <h3>Core Web Vitals and timings</h3>
            <div className={s.stats}>
              <Stat v={ms(d.speed.ttfbMs)} l="Time to first byte" cls={rate(d.speed.ttfbMs, 800, 1800)} />
              <Stat v={ms(d.speed.fcpMs)} l="First contentful paint" cls={rate(d.speed.fcpMs, 1800, 3000)} />
              <Stat v={ms(d.speed.lcpMs)} l="Largest contentful paint" cls={rate(d.speed.lcpMs, 2500, 4000)} />
              <Stat v={d.speed.cls ?? "–"} l="Cumulative layout shift" cls={rate(d.speed.cls, 0.1, 0.25)} />
              <Stat v={ms(d.speed.tbtMs)} l={`Total blocking (${d.speed.longTasks} long tasks)`} cls={rate(d.speed.tbtMs, 200, 600)} />
              <Stat v={ms(d.speed.domContentLoadedMs)} l="DOM ready" />
              <Stat v={ms(d.speed.loadMs)} l="Full load (desktop)" />
              <Stat v={ms(d.speed.mobileLoadMs)} l="Full load (phone)" />
              <Stat v={ms(d.speed.mobileLcpMs)} l="LCP (phone)" cls={rate(d.speed.mobileLcpMs, 2500, 4000)} />
            </div>
            {d.speed.lcpElement && <p className={s.small}>LCP element: <code>{d.speed.lcpElement}</code></p>}
            <p className={s.small}>One lab run from READ&apos;s server. Real users on slower phones and networks will see higher numbers.</p>
          </div>
          <div className={s.card}>
            <h3>Where the bytes go</h3>
            <T head={["Type", "Requests", "Size"]} rows={Object.entries(d.network.byType).sort((x, y) => y[1].kb - x[1].kb).map(([t, v]) => [t, v.count, kb(v.kb)])} />
            <h4>Heaviest files</h4>
            <T head={["File", "Type", "Size"]} rows={d.network.heaviest.map((h) => [<code key="u">{h.url}</code>, h.type, kb(h.kb)])} />
            <h4>Slowest requests</h4>
            <T head={["File", "Type", "Time"]} rows={d.network.slowest.map((h) => [<code key="u">{h.url}</code>, h.type, ms(h.ms)])} />
          </div>
          <div className={s.card}>
            <h3>Code coverage (used vs. shipped)</h3>
            <div className={s.stats}>
              <Stat v={kb(d.coverage.jsKB)} l="JavaScript shipped" />
              <Stat v={`${kb(d.coverage.jsUnusedKB)} (${d.coverage.jsKB ? Math.round((100 * d.coverage.jsUnusedKB) / d.coverage.jsKB) : 0}%)`} l="JS unused on this page" />
              <Stat v={kb(d.coverage.cssKB)} l="CSS shipped" />
              <Stat v={`${kb(d.coverage.cssUnusedKB)} (${d.coverage.cssKB ? Math.round((100 * d.coverage.cssUnusedKB) / d.coverage.cssKB) : 0}%)`} l="CSS unused" />
            </div>
            <T head={["File", "Type", "Size", "Unused"]} rows={d.coverage.files.map((f) => [<code key="u">{f.url}</code>, f.type, kb(f.kb), `${f.unusedPct}%`])} />
          </div>
          <div className={s.card}>
            <h3>Images</h3>
            <div className={s.stats}>
              <Stat v={d.images.count} l="Images" /><Stat v={kb(d.images.totalKB)} l="Image weight" /><Stat v={d.images.lazy} l="Lazy-loaded" /><Stat v={d.images.withoutSize} l="No width/height" />
            </div>
            <p className={s.muted}>Formats: {Object.entries(d.images.formats).map(([f, n]) => `${f} ${n}`).join(" · ")}</p>
            <h4>Largest images</h4><T head={["Image", "Size"]} rows={d.images.largest.map((i) => [<code key="u">{i.src}</code>, kb(i.kb)])} />
            {d.images.oversized.length > 0 && <><h4>Oversized (downloaded much larger than shown)</h4><T head={["Image", "Natural", "Shown"]} rows={d.images.oversized.map((i) => [<code key="u">{i.src}</code>, i.natural, i.shown])} /></>}
          </div>
          {(d.network.uncompressed.length > 0 || d.network.noCache.length > 0) && (
            <div className={s.card}>
              {d.network.uncompressed.length > 0 && <><h3>Not compressed</h3><ul className={s.paths}>{d.network.uncompressed.map((u) => <li key={u}>{u}</li>)}</ul></>}
              {d.network.noCache.length > 0 && <><h3>Not cached</h3><ul className={s.paths}>{d.network.noCache.map((u) => <li key={u}>{u}</li>)}</ul></>}
            </div>
          )}
        </>
      );

    case "Design":
      if (!d) return <div className={s.card}><p className={s.muted}>Needs the browser scan.</p></div>;
      return (
        <>
          <div className={s.card}>
            <h3>Colour palette</h3>
            {(["background", "text", "border"] as const).map((role) => (
              <div key={role}><h4>{role}</h4><div className={s.palette}>{d.design.colors.filter((c) => c.role === role).map((c) => <div key={c.value} className={s.pal}><span style={{ background: c.value }} /><code>{c.hex}</code><small>{c.count}×</small></div>)}</div></div>
            ))}
          </div>
          <div className={s.card}>
            <h3>Typography</h3>
            <div className={s.stats}><Stat v={d.design.headingFont ?? "–"} l="Heading font" /><Stat v={d.design.bodyFont ?? "–"} l="Body font" /></div>
            <T head={["Font family", "Text elements"]} rows={d.design.fonts.map((f) => [<span key="f" style={{ fontFamily: `"${f.family}", system-ui, sans-serif` }}>{f.family}</span>, f.count])} />
            <h4>Type scale</h4>
            <div className={s.scale}>{[...d.design.fontSizes].sort((x, y) => parseFloat(y.size) - parseFloat(x.size)).map((f) => <span key={f.size} style={{ fontSize: f.size, fontFamily: `"${d.design.bodyFont}", system-ui, sans-serif` }}>Aa <small>{f.size} · {f.count}×</small></span>)}</div>
            <p className={s.muted}>Line heights: {d.design.lineHeights.join(", ")}</p>
            {d.design.fontsLoaded.length > 0 && <><h4>Web fonts loaded</h4><T head={["Family", "Weight", "Style", "Status"]} rows={d.design.fontsLoaded.map((f) => [f.family, f.weight, f.style, f.status])} /></>}
          </div>
          <div className={s.card}>
            <h3>Spacing, corners, shadows</h3>
            <h4>Spacing scale</h4><div className={s.chips}>{d.design.spacing.map((x) => <span key={x.value} className={s.chip}>{x.value} · {x.count}×</span>)}</div>
            <h4>Corner radii</h4><div className={s.radii}>{d.design.radii.map((x) => <span key={x.value} style={{ borderRadius: x.value }}>{x.value}</span>)}</div>
            <h4>Shadows</h4>{d.design.shadows.length ? <div className={s.radii}>{d.design.shadows.map((x) => <span key={x.value} style={{ boxShadow: x.value }} title={x.value}>{x.count}×</span>)}</div> : <p className={s.muted}>Flat design, no shadows.</p>}
          </div>
          <div className={s.card}>
            <h3>Buttons</h3>
            <div className={s.btns}>{d.design.buttons.map((b, i) => <span key={i} title={`${b.bg} / ${b.color} / ${b.radius} / ${b.padding}`} style={{ background: b.bg, color: b.color, borderRadius: b.radius, padding: b.padding, font: `${b.font} "${d.design.bodyFont ?? "system-ui"}", system-ui, sans-serif` }} className={s.sampleBtn}>{b.text}</span>)}</div>
            <T head={["Label", "Background", "Text", "Radius", "Padding", "Font"]} rows={d.design.buttons.map((b) => [b.text, b.bg, b.color, b.radius, b.padding, b.font])} />
          </div>
          <div className={s.card}>
            <h3>Breakpoints and CSS variables</h3>
            <p className={s.muted}>Breakpoints: {d.design.breakpoints.join(" · ") || "none readable (cross-origin CSS)"}</p>
            {d.design.cssVariables.length > 0 && <T head={["Variable", "Value"]} rows={d.design.cssVariables.map((v) => [<code key="n">{v.name}</code>, <span key="v" className={s.varVal}>{/^#|rgb|hsl/.test(v.value) && <i style={{ background: v.value }} />}{v.value}</span>])} />}
          </div>
          <div className={s.card}><h3>Full page</h3><img className={s.full} src={d.screenshots.full} alt="Full page screenshot" /></div>
        </>
      );

    case "SEO": {
      const seo = d?.seo;
      return (
        <>
          <div className={s.card}>
            <h3>Search snippet preview</h3>
            <div className={s.serp}><small>{host}</small><b>{seo?.title ?? q.title}</b><p>{seo?.description ?? q.description ?? "No description: Google will pick text from the page."}</p></div>
            <T head={["Tag", "Value", "Check"]} rows={[
              ["Title", seo?.title ?? q.title ?? "–", `${(seo?.title ?? q.title ?? "").length} chars`],
              ["Description", seo?.description ?? q.description ?? "–", `${(seo?.description ?? q.description ?? "").length} chars`],
              ["Canonical", seo?.canonical ?? q.meta.canonical ?? "missing", ""],
              ["Robots", seo?.robotsMeta ?? "(default: index, follow)", ""],
              ["Language", seo?.lang ?? q.lang ?? "missing", ""],
              ["Viewport", seo?.viewport ?? (q.meta.viewport ? "set" : "missing"), ""],
              ["Charset", seo?.charset ?? "–", ""],
              ["Favicon", seo?.favicon ?? "missing", seo?.appleTouchIcon ? "apple-touch-icon ✓" : ""],
              ["Web manifest", seo?.manifest ? "yes" : "no", ""],
              ["Theme colour", seo?.themeColor ?? q.meta.themeColor ?? "–", ""],
              ["hreflang", seo?.hreflang.join(", ") || "none", ""],
            ]} />
          </div>
          {seo && (
            <div className={s.card}>
              <h3>Social sharing</h3>
              {seo.og.image && <img className={s.ogImg} src={seo.og.image} alt="Open Graph" />}
              <h4>Open Graph</h4><T head={["Property", "Value"]} rows={Object.entries(seo.og).map(([k, v]) => [`og:${k}`, v])} />
              <h4>Twitter / X</h4><T head={["Property", "Value"]} rows={Object.entries(seo.twitter).map(([k, v]) => [`twitter:${k}`, v])} />
              <h4>Structured data</h4><p className={s.muted}>{seo.jsonLdTypes.join(", ") || "No JSON-LD."}{seo.microdata ? ` · ${seo.microdata} microdata items` : ""}</p>
            </div>
          )}
          <div className={s.card}>
            <h3>Heading outline</h3>
            <ul className={s.outline}>{(d?.content.headings ?? q.structure.headings).map((h, i) => <li key={i} style={{ paddingLeft: (h.level - 1) * 18 }}><span className={s.hTag}>H{h.level}</span>{h.text}</li>)}</ul>
          </div>
          {d && (
            <div className={s.card}>
              <h3>Links</h3>
              <div className={s.stats}><Stat v={d.links.internal} l="Internal" /><Stat v={d.links.external} l="External" /><Stat v={d.links.nofollow} l="nofollow" /><Stat v={d.links.mailto + d.links.tel} l="Email / phone" /></div>
              {d.links.social.length > 0 && <p className={s.muted}>Social profiles: {d.links.social.join(", ")}</p>}
              <T head={["Linked domain", "Links"]} rows={d.links.externalHosts.map((h) => [h.host, h.count])} />
            </div>
          )}
        </>
      );
    }

    case "Content":
      return (
        <>
          {d && (
            <div className={s.card}>
              <h3>Content stats</h3>
              <div className={s.stats}><Stat v={d.content.wordCount.toLocaleString()} l="Words" /><Stat v={`${d.content.readingMin} min`} l="Reading time" /><Stat v={d.content.paragraphs} l="Paragraphs" /><Stat v={d.content.lists} l="Lists" /><Stat v={d.content.tables} l="Tables" /><Stat v={d.layout.iframes} l="Embeds" /></div>
            </div>
          )}
          {d && (
            <div className={s.card}>
              <h3>Page sections (top to bottom)</h3>
              <T head={["#", "Element", "Heading", "Height"]} rows={d.layout.sections.map((x, i) => [i + 1, `<${x.tag}${x.id ? "#" + x.id : ""}>`, x.heading ?? "–", `${x.height}px`])} />
              <p className={s.small}>Page height {d.layout.pageHeight}px · {d.layout.stickyHeader ? "sticky header" : "static header"}</p>
            </div>
          )}
          {d && <div className={s.card}><h3>Calls to action</h3><div className={s.chips}>{d.content.ctas.map((c, i) => <span key={i} className={s.chip}>{c}</span>)}</div></div>}
          {d && d.content.forms.length > 0 && <div className={s.card}><h3>Forms</h3><T head={["Method", "Action", "Fields"]} rows={d.content.forms.map((f) => [f.method, f.action ?? "(same page / JS)", f.fields.join(", ")])} /></div>}
          <div className={s.card}>
            <h3>Navigation</h3>
            <T head={["Label", "Link"]} rows={q.structure.navLinks.map((l) => [l.text, <code key="h">{l.href}</code>])} />
          </div>
        </>
      );

    case "Tech":
      return (
        <>
          <div className={s.card}>
            <h3>Technology stack</h3>
            {a.about.techSummary.length > 0 && <ul className={s.bullets}>{a.about.techSummary.map((t) => <li key={t}>{t}</li>)}</ul>}
            <T head={["Layer", "Technology"]} rows={a.about.stackLayers.map((l) => [l.layer, l.items.join(", ")])} />
          </div>
          <div className={s.card}>
            <h3>Detected technologies</h3>
            <T head={["Technology", "Category", "Evidence"]} rows={[
              ...q.stack.map((t) => [t.name, t.category, t.evidence]),
              ...(d?.runtime ?? []).filter((x) => !q.stack.some((t) => t.name === x.name)).map((x) => [x.name + (x.version ? ` ${x.version}` : ""), "Runtime (in page)", "JS globals / DOM"]),
            ]} />
          </div>
          {d && (
            <div className={s.card}>
              <h3>Third-party services</h3>
              <div className={s.chips}>{[...new Set(d.network.thirdParty.map((t) => t.category))].map((c) => <span key={c} className={s.chip}>{c}</span>)}</div>
              <T head={["Host", "Category", "Requests", "Size"]} rows={d.network.thirdParty.map((t) => [t.host, t.category, t.count, kb(t.kb)])} />
            </div>
          )}
          {d && (
            <div className={s.card}>
              <h3>Server response</h3>
              <T head={["Header", "Value"]} rows={Object.entries(d.response.headers).filter(([k]) => !k.startsWith(":") && k !== "set-cookie").map(([k, v]) => [k, <code key="v">{v.slice(0, 200)}</code>])} />
            </div>
          )}
          {d && <div className={s.card}><h3>Page structure</h3><div className={s.stats}><Stat v={d.layout.domNodes.toLocaleString()} l="DOM elements" cls={rate(d.layout.domNodes, 1500, 3000)} /><Stat v={d.layout.domDepth} l="DOM depth" /><Stat v={q.structure.scripts} l="Script tags" /><Stat v={q.structure.stylesheets} l="Stylesheets" /></div></div>}
        </>
      );

    case "Network":
      if (!d) return <div className={s.card}><p className={s.muted}>Needs the browser scan.</p></div>;
      return (
        <>
          <div className={s.card}>
            <div className={s.stats}><Stat v={d.network.requests} l="Requests" /><Stat v={kb(d.network.transferKB)} l="Transferred" /><Stat v={d.network.failed.length} l="Failed" cls={d.network.failed.length ? s.bad : s.good} /><Stat v={Object.entries(d.network.protocols).map(([p, n]) => `${p} ${n}`).join(" · ")} l="Protocols" /></div>
          </div>
          <div className={s.card}><h3>API calls (XHR / fetch)</h3><T head={["Method", "Endpoint", "Status", "Type"]} rows={d.network.apiCalls.map((x) => [x.method, <code key="u">{x.url}</code>, x.status ?? "–", x.mime ?? "–"])} /></div>
          {d.network.failed.length > 0 && <div className={s.card}><h3>Failed requests</h3><T head={["Status", "URL"]} rows={d.network.failed.map((f) => [f.status ?? "blocked", <code key="u">{f.url}</code>])} /></div>}
          <div className={s.card}><h3>Storage</h3>
            <div className={s.stats}><Stat v={d.storage.cookies.length} l="Cookies" /><Stat v={d.storage.cookies.filter((c) => c.thirdParty).length} l="Third-party cookies" /><Stat v={d.storage.localStorageKeys} l="localStorage keys" /><Stat v={d.storage.serviceWorker ? "yes" : "no"} l="Service worker" /></div>
          </div>
        </>
      );

    case "Accessibility":
      if (!d) return <div className={s.card}><p className={s.muted}>Needs the browser scan.</p></div>;
      return (
        <>
          <div className={s.card}>
            <h3>Accessibility checks</h3>
            <div className={s.stats}>
              <Stat v={d.a11y.imagesWithoutAlt} l="Images without alt" cls={d.a11y.imagesWithoutAlt ? s.bad : s.good} />
              <Stat v={d.a11y.inputsWithoutLabel} l="Unlabelled fields" cls={d.a11y.inputsWithoutLabel ? s.bad : s.good} />
              <Stat v={d.a11y.buttonsWithoutName} l="Unnamed buttons" cls={d.a11y.buttonsWithoutName ? s.bad : s.good} />
              <Stat v={d.a11y.linksWithoutText} l="Empty links" cls={d.a11y.linksWithoutText ? s.ok : s.good} />
              <Stat v={d.a11y.headingSkips} l="Heading skips" cls={d.a11y.headingSkips ? s.ok : s.good} />
              <Stat v={d.a11y.lang ?? "missing"} l="Page language" cls={d.a11y.lang ? s.good : s.bad} />
            </div>
            <p className={s.muted}>Landmarks: {d.a11y.landmarks.join(", ") || "none"}</p>
            {d.a11y.lowContrast.length > 0 && <><h4>Low-contrast text</h4><T head={["Text", "Contrast"]} rows={d.a11y.lowContrast.map((c) => [c.text, `${c.ratio}:1`])} /></>}
          </div>
          <div className={s.card}>
            <h3>Mobile</h3>
            <div className={s.stats}>
              <Stat v={d.a11y.smallTapTargets} l="Tap targets under 32px" cls={d.a11y.smallTapTargets > 5 ? s.ok : s.good} />
              <Stat v={d.a11y.mobileHorizontalScroll ? "yes" : "no"} l="Sideways scroll" cls={d.a11y.mobileHorizontalScroll ? s.bad : s.good} />
              <Stat v={ms(d.speed.mobileLcpMs)} l="Phone LCP" cls={rate(d.speed.mobileLcpMs, 2500, 4000)} />
            </div>
            <img className={s.phoneShot} src={d.screenshots.mobile} alt="Mobile" />
          </div>
          {r.findings.filter((f) => f.area === "Accessibility" || f.area === "Mobile").map((f, i) => <FindingRow key={i} f={f} />)}
        </>
      );

    case "Security":
      return (
        <>
          <div className={s.card}>
            <h3>Security headers</h3>
            <T head={["Header", "Status", "Why it matters"]} rows={r.securityHeaders.map((h) => [<code key="n">{h.name}</code>, h.present ? <span key="p" className={s.okText}>✓ {h.value?.slice(0, 60)}</span> : <span key="p" className={s.badText}>missing</span>, h.why])} />
            {d && d.response.redirects.length > 0 && <p className={s.muted}>Redirect chain: {[...d.response.redirects, d.finalUrl].join(" → ")}</p>}
          </div>
          {d && (
            <div className={s.card}>
              <h3>Cookies</h3>
              <T head={["Name", "Domain", "Secure", "HttpOnly", "SameSite", "Expires", "Party"]} rows={d.storage.cookies.map((c) => [c.name, c.domain, c.secure ? "✓" : "✗", c.httpOnly ? "✓" : "✗", c.sameSite, c.expiresDays == null ? "session" : `${c.expiresDays} d`, c.thirdParty ? "3rd" : "1st"])} />
            </div>
          )}
          {d && (d.consoleErrors.length > 0 || d.pageErrors.length > 0) && (
            <div className={s.card}><h3>JavaScript errors</h3><ul className={s.paths}>{[...d.pageErrors, ...d.consoleErrors].map((e, i) => <li key={i}>{e}</li>)}</ul></div>
          )}
        </>
      );

    case "Sitemap":
      if (!sm) return <div className={s.card}><p className={s.muted}>No sitemap data.</p></div>;
      return (
        <>
          <div className={s.card}>
            <div className={s.stats}><Stat v={sm.total} l={sm.source === "sitemap" ? "URLs in sitemap" : "URLs from links"} /><Stat v={sm.templates.length} l="Page templates" /><Stat v={sm.robots.found ? "yes" : "no"} l="robots.txt" /></div>
            {sm.sitemaps.length > 0 && <p className={s.small}>Read: {sm.sitemaps.join(", ")}</p>}
            {sm.robots.disallow.length > 0 && <p className={s.muted}>Blocked for crawlers: {sm.robots.disallow.join(", ")}</p>}
          </div>
          <div className={s.card}><h3>Page templates</h3><p className={s.small}>Similar URLs grouped, so you can see which page types the site is built from.</p><T head={["Pattern", "Pages", "Example"]} rows={sm.templates.map((t) => [<code key="p">{t.pattern}</code>, t.count, <code key="e">{t.example.replace(/^https?:\/\/[^/]+/, "")}</code>])} /></div>
          <div className={s.card}><h3>URLs</h3><ul className={s.paths}>{sm.urls.map((u) => <li key={u}>{u.replace(/^https?:\/\/[^/]+/, "") || "/"}</li>)}</ul></div>
        </>
      );

    case "Export":
      return (
        <div className={s.card}>
          <h3>Download</h3>
          <div className={s.btns}>
            <button className={s.btn} onClick={() => download(`READ-${host}.md`, r.markdown + (r.aiNarrative ? `\n\n---\n\n${r.aiNarrative}` : ""), "text/markdown")}>Report (.md)</button>
            <button className={s.btn} onClick={() => download(`READ-${host}.json`, JSON.stringify({ ...a, deep: a.deep ? { ...a.deep, screenshots: undefined } : null }, null, 2), "application/json")}>Raw data (.json)</button>
            {d && <button className={s.btn} onClick={() => { const l = document.createElement("a"); l.href = d.screenshots.full; l.download = `READ-${host}-full.jpg`; l.click(); }}>Full screenshot</button>}
          </div>
          {r.aiNarrative ? <><h3>AI analysis</h3><pre className={s.md}>{r.aiNarrative}</pre></> : <p className={s.small}>{r.aiError ? `AI write-up unavailable: ${r.aiError}` : "Set GEMINI_API_KEY on the server to add an AI-written teardown."}</p>}
          <h3>Report preview</h3>
          <pre className={s.md}>{r.markdown}</pre>
        </div>
      );
  }
}
