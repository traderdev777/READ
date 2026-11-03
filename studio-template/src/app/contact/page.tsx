import { notFound } from "next/navigation";
import { cfg } from "@/lib/config";
import { ContactForm } from "@/components/Forms";

export const metadata = { title: "Contact" };
export default async function Contact({ searchParams }: { searchParams: Promise<{ about?: string }> }) {
  if (!cfg.features.contact) notFound();
  const { about } = await searchParams;
  return <section><div className="wrap"><h1>Contact us</h1>{about && <p className="muted">About: {about}</p>}<ContactForm />{cfg.whatsappNumber && <p className="muted">Or WhatsApp us at {cfg.whatsappNumber}.</p>}</div></section>;
}
