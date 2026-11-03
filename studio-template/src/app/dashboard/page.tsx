import Link from "next/link";
import { cfg, slugOf, money } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { listItems, countItems, getItem, titleOf, priceOf } from "@/lib/items";
import { db } from "@/lib/db";
import { removeItem } from "@/app/actions";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const { saved } = await searchParams;
  const mine = await Promise.all(cfg.entities.map(async (e) => ({ e, ...(await listItems(e, { ownerId: user.id })) })));
  const favs = cfg.features.favorites ? await db.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }) : [];
  const favItems = (await Promise.all(favs.map(async (f) => { const e = cfg.entities.find((x) => x.name === f.entity); const it = e ? await getItem(e, f.itemId) : null; return e && it ? { e, it } : null; }))).filter(Boolean) as { e: (typeof cfg.entities)[number]; it: Awaited<ReturnType<typeof getItem>> & object }[];
  const trades = cfg.entities.find((e) => e.name === "Trade");
  let pnl: { invested: number; count: number } | null = null;
  if (trades) {
    const all = (await listItems(trades, { ownerId: user.id })).items;
    pnl = { count: await countItems(trades, { ownerId: user.id }), invested: all.reduce((a, t) => a + (t.side === "Sell" ? -1 : 1) * (Number(t.quantity) || 0) * (Number(t.price) || 0), 0) };
  }
  return (
    <section><div className="wrap">
      <h1>Hi {user.name ?? user.email.split("@")[0]}</h1>
      <p className="muted">{user.role === "admin" ? "Admin · " : ""}{user.plan ?? "Free"} plan · member since {user.createdAt.toLocaleDateString("en-IN")}</p>
      {saved && <p className="ok">Saved.</p>}
      <div className="stats">
        {mine.map(({ e, total }) => <div key={e.name} className="card p stat"><b>{total}</b>My {e.plural.toLowerCase()}</div>)}
        {cfg.features.favorites && <div className="card p stat"><b>{favItems.length}</b>Saved</div>}
        {pnl && <div className="card p stat"><b>{money(pnl.invested)}</b>Net invested (buys − sells)</div>}
      </div>
      {mine.map(({ e, items }) => (
        <div key={e.name} className="card p" style={{ marginBottom: 18 }}>
          <div className="row"><h2>My {e.plural.toLowerCase()}</h2><Link className="btn sm" href={`/dashboard/${slugOf(e)}/new`}>+ Add {e.name.toLowerCase()}</Link></div>
          {items.length ? (
            <table><thead><tr><th>{e.fields[0].label}</th>{e.fields.slice(1, 4).filter((f) => f.type !== "longtext" && f.type !== "image").map((f) => <th key={f.name}>{f.label}</th>)}<th /></tr></thead>
              <tbody>{items.map((it) => (
                <tr key={it.id}>
                  <td><Link className="link" href={`/browse/${slugOf(e)}/${it.id}`}>{titleOf(e, it)}</Link></td>
                  {e.fields.slice(1, 4).filter((f) => f.type !== "longtext" && f.type !== "image").map((f) => <td key={f.name}>{f.type === "money" ? money(it[f.name]) : f.type === "date" && it[f.name] ? new Date(it[f.name]).toLocaleDateString("en-IN") : String(it[f.name] ?? "—")}</td>)}
                  <td className="row gap"><Link className="btn ghost sm" href={`/dashboard/${slugOf(e)}/${it.id}/edit`}>Edit</Link><form action={removeItem}><input type="hidden" name="_entity" value={slugOf(e)} /><input type="hidden" name="_id" value={it.id} /><button className="btn danger sm">Delete</button></form></td>
                </tr>))}</tbody></table>
          ) : <div className="empty">Nothing yet.</div>}
        </div>
      ))}
      {cfg.features.favorites && <div className="card p"><h2>Saved</h2>{favItems.length ? <ul>{favItems.map(({ e, it }) => <li key={it.id}><Link className="link" href={`/browse/${slugOf(e)}/${it.id}`}>{titleOf(e, it)}</Link> {priceOf(e, it) != null && <span className="muted">· {money(priceOf(e, it))}</span>}</li>)}</ul> : <p className="muted">Tap ♡ Save on anything to keep it here.</p>}</div>}
    </div></section>
  );
}
