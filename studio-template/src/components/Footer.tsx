import Link from "next/link";
import { cfg, publicEntities, slugOf } from "@/lib/config";
import Subscribe from "./Subscribe";

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap ftr-grid">
        <div><div className="logo">{cfg.name}</div><p className="muted">{cfg.tagline}</p></div>
        <div><h4>Explore</h4>{publicEntities().map((e) => <Link key={e.name} href={`/browse/${slugOf(e)}`}>{e.plural}</Link>)}{cfg.features.blog && <Link href="/blog">Blog</Link>}</div>
        <div><h4>Company</h4>{cfg.features.contact && <Link href="/contact">Contact</Link>}{cfg.features.payments !== "none" && <Link href="/pricing">Pricing</Link>}<Link href="/dashboard">My account</Link></div>
        {cfg.features.newsletter && <div><h4>Newsletter</h4><Subscribe /></div>}
      </div>
      <div className="wrap muted small">© {new Date().getFullYear()} {cfg.name}</div>
    </footer>
  );
}
