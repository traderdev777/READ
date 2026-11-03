import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cfg, entityBySlug } from "@/lib/config";
import { listItems } from "@/lib/items";
import ItemCard from "@/components/ItemCard";

type P = { params: Promise<{ entity: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const e = entityBySlug((await params).entity);
  return { title: e ? e.plural : "Not found", description: e ? `Browse ${e.plural.toLowerCase()} on ${cfg.name}` : undefined };
}

export default async function Browse({ params, searchParams }: P) {
  const { entity } = await params; const sp = await searchParams;
  const e = entityBySlug(entity);
  if (!e || e.visibility !== "public") notFound();
  const filterFields = e.fields.filter((f) => f.filter && (f.type === "select" || f.type === "text"));
  const priceField = e.fields.find((f) => f.type === "money" && f.filter);
  const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  const { items, total, page, pages } = await listItems(e, {
    q: cfg.features.search ? sp.q : undefined, sort: sp.sort, page: num(sp.page), min: num(sp.min), max: num(sp.max),
    filters: Object.fromEntries(filterFields.map((f) => [f.name, sp[f.name] ?? ""])),
  });
  const qs = (p: number) => "?" + new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v) as [string, string][]), page: String(p) }).toString();
  return (
    <section><div className="wrap">
      <div className="row"><h1>{e.plural}</h1>{cfg.features.auth && <Link className="btn sm" href={`/dashboard/${entity}/new`}>+ Add {e.name.toLowerCase()}</Link>}</div>
      {cfg.features.search && (
        <form className="filters">
          <label>Search<input name="q" defaultValue={sp.q} placeholder={`Search ${e.plural.toLowerCase()}`} /></label>
          {filterFields.map((f) => f.type === "select"
            ? <label key={f.name}>{f.label}<select name={f.name} defaultValue={sp[f.name] ?? ""}><option value="">All</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select></label>
            : <label key={f.name}>{f.label}<input name={f.name} defaultValue={sp[f.name]} /></label>)}
          {priceField && <><label>Min {priceField.label.toLowerCase()}<input name="min" type="number" defaultValue={sp.min} /></label><label>Max {priceField.label.toLowerCase()}<input name="max" type="number" defaultValue={sp.max} /></label></>}
          <label>Sort<select name="sort" defaultValue={sp.sort ?? ""}><option value="">Newest</option><option value="oldest">Oldest</option>{priceField && <><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></>}</select></label>
          <button className="btn">Apply</button>
        </form>
      )}
      <p className="muted small">{total} result{total === 1 ? "" : "s"}</p>
      {items.length ? <div className="grid">{items.map((it) => <ItemCard key={it.id} e={e} it={it} />)}</div> : <div className="empty">Nothing matches. Try other filters.</div>}
      {pages > 1 && <div className="pager">{page > 1 && <Link className="btn ghost sm" href={qs(page - 1)}>← Prev</Link>}<span className="muted">Page {page} of {pages}</span>{page < pages && <Link className="btn ghost sm" href={qs(page + 1)}>Next →</Link>}</div>}
    </div></section>
  );
}
