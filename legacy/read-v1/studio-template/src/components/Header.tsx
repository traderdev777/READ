import Link from "next/link";
import { cfg, publicEntities, slugOf } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { logout } from "@/app/actions";
import ThemeToggle from "./ThemeToggle";

export default async function Header() {
  const user = cfg.features.auth ? await currentUser() : null;
  return (
    <header className="hdr">
      <div className="wrap row">
        <Link href="/" className="logo">{cfg.name}</Link>
        <nav className="nav">
          {publicEntities().map((e) => <Link key={e.name} href={`/browse/${slugOf(e)}`}>{e.plural}</Link>)}
          {cfg.features.blog && <Link href="/blog">Blog</Link>}
          {cfg.features.payments !== "none" && cfg.plans.length > 0 && <Link href="/pricing">Pricing</Link>}
          {cfg.features.contact && <Link href="/contact">Contact</Link>}
        </nav>
        <div className="row gap">
          {cfg.features.darkMode && <ThemeToggle />}
          {cfg.features.auth && (user ? (
            <>
              {user.role === "admin" && cfg.features.admin && <Link className="btn ghost sm" href="/admin">Admin</Link>}
              <Link className="btn sm" href="/dashboard">Dashboard</Link>
              <form action={logout}><button className="link">Log out</button></form>
            </>
          ) : (
            <>
              <Link className="link" href="/login">Log in</Link>
              <Link className="btn sm" href="/signup">Sign up</Link>
            </>
          ))}
        </div>
      </div>
    </header>
  );
}
