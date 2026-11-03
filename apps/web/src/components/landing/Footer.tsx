import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-12 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-10">
        <div className="grid gap-4">
          <Logo height={24} />
          <p className="font-mono text-xs text-chrome-500">Built in Belagavi.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-chrome-300">
            {[
              ["How it works", "#how"],
              ["Evidence", "#evidence"],
              ["Actions", "#actions"],
              ["Pricing", "#pricing"],
              ["Waitlist", "#waitlist"],
            ].map(([l, h]) => (
              <li key={h}>
                <a href={h} className="rounded-sm hover:text-chrome-100">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
