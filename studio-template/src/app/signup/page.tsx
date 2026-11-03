import Link from "next/link";
import { AuthForm } from "@/components/Forms";

export const metadata = { title: "Sign up" };
export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <section><div className="wrap"><h1>Create your account</h1><AuthForm mode="signup" next={next} /><p className="muted">Already have one? <Link className="link" href="/login">Log in</Link></p></div></section>;
}
