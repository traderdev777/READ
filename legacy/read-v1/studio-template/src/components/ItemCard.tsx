import Link from "next/link";
import { money, slugOf, type Entity } from "@/lib/config";
import { titleOf, imageOf, priceOf, type Item } from "@/lib/items";

export default function ItemCard({ e, it }: { e: Entity; it: Item }) {
  const img = imageOf(e, it); const price = priceOf(e, it);
  const chips = e.fields.filter((f) => f.type === "select" && it[f.name]).slice(0, 2);
  const sub = e.fields.find((f) => f.type === "text" && f.name !== e.fields[0].name && it[f.name]);
  return (
    <Link href={`/browse/${slugOf(e)}/${it.id}`} className="card item">
      {e.fields.some((f) => f.type === "image") && <div className="ph">{img ? <img src={img} alt={titleOf(e, it)} loading="lazy" /> : <span>{titleOf(e, it).slice(0, 1)}</span>}</div>}
      <div className="pad">
        <h3>{titleOf(e, it)}</h3>
        {sub && <p className="muted small">{String(it[sub.name])}</p>}
        <div className="row gap small">{chips.map((f) => <span key={f.name} className="chip">{String(it[f.name])}</span>)}</div>
        {price != null && <p className="price">{money(price)}</p>}
      </div>
    </Link>
  );
}
