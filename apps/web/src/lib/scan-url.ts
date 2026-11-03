/**
 * Client- and server-side validation for the URL RED is asked to scan.
 * Rules: https only, a public hostname, no credentials, no non-default port,
 * and nothing that resolves by name to this machine or a private network.
 * DNS rebinding is out of scope here; the scanner re-checks resolved IPs server-side.
 */
export type ScanUrlResult = { ok: true; url: string; host: string } | { ok: false; error: string };

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".corp",
  ".intranet",
  ".test",
  ".invalid",
  ".example",
];

function ipv4Private(h: string): boolean | null {
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, b, Number(m[3]), Number(m[4])].some((n) => n > 255)) return true;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function ipv6Private(h: string): boolean | null {
  if (!h.startsWith("[")) return null;
  const v = h.slice(1, -1).toLowerCase();
  return (
    v === "::" ||
    v === "::1" ||
    v.startsWith("fc") ||
    v.startsWith("fd") ||
    v.startsWith("fe8") ||
    v.startsWith("fe9") ||
    v.startsWith("fea") ||
    v.startsWith("feb") ||
    v.startsWith("::ffff:")
  );
}

export function validateScanUrl(input: string): ScanUrlResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Paste a URL to scan, e.g. https://stripe.com" };
  if (/^http:\/\//i.test(raw))
    return { ok: false, error: "Use https://. RED only scans sites served over TLS." };
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !/^https:\/\//i.test(raw))
    return { ok: false, error: "Only https:// URLs can be scanned." };
  let u: URL;
  try {
    u = new URL(/^https:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { ok: false, error: "That isn't a valid URL. Try https://example.com" };
  }
  if (u.username || u.password)
    return { ok: false, error: "Remove the username or password from the URL." };
  if (u.port && u.port !== "443")
    return {
      ok: false,
      error: "Custom ports aren't scanned. Use the site's public https address.",
    };
  const host = u.hostname.toLowerCase();
  const v4 = ipv4Private(host);
  const v6 = ipv6Private(host);
  if (v4 === true || v6 === true)
    return { ok: false, error: "Private and reserved IP addresses can't be scanned." };
  if (v4 === false || v6 === false)
    return { ok: false, error: "Use the site's domain name, not a raw IP address." };
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s)))
    return { ok: false, error: "Local and internal hostnames can't be scanned." };
  if (
    !host.includes(".") ||
    !/^[a-z0-9.-]+$/.test(host) ||
    host.startsWith(".") ||
    host.endsWith(".") ||
    host.split(".").some((p) => !p || p.length > 63)
  ) {
    return { ok: false, error: "Use a public domain, e.g. https://stripe.com" };
  }
  if (!/^[a-z]{2,63}$|^xn--[a-z0-9-]+$/.test(host.split(".").pop() ?? ""))
    return { ok: false, error: "That domain ending doesn't look public." };
  u.hash = "";
  return { ok: true, url: u.toString(), host };
}
