import { notFound } from "next/navigation";
import { cfg, entityBySlug } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { ItemForm } from "@/components/Forms";

export default async function NewItem({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  await requireUser(`/dashboard/${entity}/new`);
  const e = entityBySlug(entity);
  if (!e) notFound();
  return <section><div className="wrap"><h1>Add {e.name.toLowerCase()}</h1><ItemForm entity={e} slug={entity} uploads={cfg.features.uploads} /></div></section>;
}
