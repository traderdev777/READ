import { notFound } from "next/navigation";
import { cfg, entityBySlug } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { getItem, titleOf } from "@/lib/items";
import { ItemForm } from "@/components/Forms";

export default async function EditItem({ params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params;
  const user = await requireUser(`/dashboard/${entity}/${id}/edit`);
  const e = entityBySlug(entity);
  const it = e ? await getItem(e, id) : null;
  if (!e || !it || (it.ownerId !== user.id && user.role !== "admin")) notFound();
  const plain = JSON.parse(JSON.stringify(it));
  for (const f of e.fields) if (f.type === "date" && it[f.name]) plain[f.name] = new Date(it[f.name]).toISOString().slice(0, 10);
  return <section><div className="wrap"><h1>Edit {titleOf(e, it)}</h1><ItemForm entity={e} slug={entity} item={plain} uploads={cfg.features.uploads} /></div></section>;
}
