import Link from "next/link";
export default function Success() {
  return <section><div className="wrap"><h1>You&apos;re all set 🎉</h1><p className="muted">Your plan is active. It can take a few seconds to show up.</p><Link className="btn" href="/dashboard">Go to dashboard</Link></div></section>;
}
