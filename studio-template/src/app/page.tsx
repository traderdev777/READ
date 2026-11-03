import Link from "next/link";
import { cfg, publicEntities, slugOf, money } from "@/lib/config";
import { listItems } from "@/lib/items";
import ItemCard from "@/components/ItemCard";
import { SubscribeForm } from "@/components/Forms";

const FEATURE_TEXT: [keyof typeof cfg.features, string, string][] = [
  ["search", "Search and filters", "Find exactly what you need in seconds."],
  ["favorites", "Save favourites", "Keep a watchlist of what matters to you."],
  ["reviews", "Ratings and reviews", "Real feedback from real users."],
  ["dashboard", "Your dashboard", "Manage everything you own in one place."],
  ["marketData", "Live data", "Prices refresh automatically."],
  ["darkMode", "Dark mode", "Easy on the eyes, day or night."],
];

export default async function Home() {
  const lists = await Promise.all(publicEntities().map(async (e) => ({ e, ...(await listItems(e, {})) })));
  const firstPublic = publicEntities()[0];
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>{cfg.tagline || cfg.name}</h1>
          {cfg.description && <p>{cfg.description}</p>}
          <div className="ctas">
            {cfg.features.auth && <Link className="btn" href="/signup">Get started free</Link>}
            {firstPublic && <Link className="btn ghost" href={`/browse/${slugOf(firstPublic)}`}>Browse {firstPublic.plural.toLowerCase()}</Link>}
          </div>
        </div>
      </section>

      <section><div className="wrap grid">
        {FEATURE_TEXT.filter(([k]) => cfg.features[k]).map(([, t, d]) => <div key={t} className="card p"><h3>{t}</h3><p className="muted">{d}</p></div>)}
      </div></section>

      {lists.map(({ e, items, total }) => (
        <section key={e.name}><div className="wrap">
          <div className="row"><h2>Latest {e.plural.toLowerCase()}</h2><Link className="link" href={`/browse/${slugOf(e)}`}>View all {total} →</Link></div>
          {items.length ? <div className="grid">{items.slice(0, 8).map((it) => <ItemCard key={it.id} e={e} it={it} />)}</div> : <div className="empty">No {e.plural.toLowerCase()} yet. {cfg.features.auth && <Link className="link" href={`/dashboard/${slugOf(e)}/new`}>Add the first one →</Link>}</div>}
        </div></section>
      ))}

      {cfg.features.payments !== "none" && cfg.plans.length > 0 && (
        <section><div className="wrap"><h2>Plans</h2><div className="grid">
          {cfg.plans.map((p) => <div key={p.name} className="card plan"><h3>{p.name}</h3><div className="amt">{p.price ? money(p.price) : "Free"}{p.price ? <span className="muted small"> / {p.period}</span> : null}</div><ul>{p.perks.map((x) => <li key={x}>{x}</li>)}</ul><Link className="btn" href="/pricing">Choose {p.name}</Link></div>)}
        </div></div></section>
      )}

      {cfg.features.newsletter && <section><div className="wrap card p"><h2>Stay in the loop</h2><p className="muted">News and updates from {cfg.name}. No spam.</p><SubscribeForm /></div></section>}
    </>
  );
}
