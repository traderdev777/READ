import Link from "next/link";
import { notFound } from "next/navigation";
import { cfg, slugOf, money } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { listItems, countItems, titleOf } from "@/lib/items";
import { setRole, deleteLead, removeItem } from "@/app/actions";

export const metadata = { title: "Admin" };
const TABS = ["overview", "users", "content", "leads", "subscribers", "payments"] as const;

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  if (!cfg.features.admin) notFound();
  const me = await requireAdmin();
  const { tab = "overview" } = await searchParams;
  const [users, leads, subs, paid] = await Promise.all([db.user.count(), db.lead.count(), db.subscriber.count(), db.payment.aggregate({ _sum: { amount: true }, where: { status: "paid" } })]);
  const counts = await Promise.all(cfg.entities.map(async (e) => ({ e, n: await countItems(e) })));
  return (
    <section><div className="wrap">
      <h1>Admin</h1>
      <div className="tabs">{TABS.map((t) => <Link key={t} className={`btn sm ${t === tab ? "" : "ghost"}`} href={`/admin?tab=${t}`}>{t[0].toUpperCase() + t.slice(1)}</Link>)}{cfg.features.blog && <Link className="btn sm ghost" href="/admin/posts">Blog posts</Link>}</div>

      {tab === "overview" && <div className="stats">
        <div className="card p stat"><b>{users}</b>Users</div>
        {counts.map(({ e, n }) => <div key={e.name} className="card p stat"><b>{n}</b>{e.plural}</div>)}
        <div className="card p stat"><b>{leads}</b>Leads</div>
        <div className="card p stat"><b>{subs}</b>Subscribers</div>
        <div className="card p stat"><b>{money(paid._sum.amount ?? 0)}</b>Revenue</div>
      </div>}

      {tab === "users" && <table><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Plan</th><th>Joined</th><th /></tr></thead><tbody>
        {(await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 200 })).map((u) => (
          <tr key={u.id}><td>{u.email}</td><td>{u.name}</td><td>{u.role}</td><td>{u.plan ?? "Free"}</td><td>{u.createdAt.toLocaleDateString("en-IN")}</td>
            <td>{u.id !== me.id && <form action={setRole}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="role" value={u.role === "admin" ? "user" : "admin"} /><button className="btn ghost sm">{u.role === "admin" ? "Remove admin" : "Make admin"}</button></form>}</td></tr>))}
      </tbody></table>}

      {tab === "content" && (await Promise.all(cfg.entities.map(async (e) => ({ e, ...(await listItems(e, {})) })))).map(({ e, items, total }) => (
        <div key={e.name} className="card p" style={{ marginBottom: 16 }}><h2>{e.plural} ({total})</h2>
          <table><tbody>{items.map((it) => <tr key={it.id}><td><Link className="link" href={`/browse/${slugOf(e)}/${it.id}`}>{titleOf(e, it)}</Link></td><td>{it.owner?.email}</td><td>{new Date(it.createdAt).toLocaleDateString("en-IN")}</td>
            <td className="row gap"><Link className="btn ghost sm" href={`/dashboard/${slugOf(e)}/${it.id}/edit`}>Edit</Link><form action={removeItem}><input type="hidden" name="_entity" value={slugOf(e)} /><input type="hidden" name="_id" value={it.id} /><button className="btn danger sm">Delete</button></form></td></tr>)}</tbody></table>
        </div>))}

      {tab === "leads" && <table><thead><tr><th>When</th><th>Name</th><th>Email</th><th>Phone</th><th>Message</th><th /></tr></thead><tbody>
        {(await db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200 })).map((l) => <tr key={l.id}><td>{l.createdAt.toLocaleString("en-IN")}</td><td>{l.name}</td><td><a className="link" href={`mailto:${l.email}`}>{l.email}</a></td><td>{l.phone}</td><td>{l.message}</td><td><form action={deleteLead}><input type="hidden" name="id" value={l.id} /><button className="btn ghost sm">Delete</button></form></td></tr>)}
      </tbody></table>}

      {tab === "subscribers" && <table><thead><tr><th>Email</th><th>Since</th></tr></thead><tbody>{(await db.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 500 })).map((s) => <tr key={s.id}><td>{s.email}</td><td>{s.createdAt.toLocaleDateString("en-IN")}</td></tr>)}</tbody></table>}

      {tab === "payments" && <table><thead><tr><th>When</th><th>User</th><th>Plan</th><th>Amount</th><th>Provider</th><th>Status</th></tr></thead><tbody>{(await db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { email: true } } } })).map((p) => <tr key={p.id}><td>{p.createdAt.toLocaleString("en-IN")}</td><td>{p.user.email}</td><td>{p.plan}</td><td>{money(p.amount)}</td><td>{p.provider}</td><td>{p.status}</td></tr>)}</tbody></table>}
    </div></section>
  );
}
