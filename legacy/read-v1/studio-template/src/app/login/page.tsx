import Link from "next/link";
import { AuthForm } from "@/components/Forms";

export const metadata = { title: "Log in" };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <section><div className="wrap"><h1>Log in</h1><AuthForm mode="login" next={next} /><p className="muted">New here? <Link className="link" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></p></div></section>;
}
