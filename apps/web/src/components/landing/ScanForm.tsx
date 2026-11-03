"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { MagneticButton } from "@/motion/MagneticButton";
import { validateScanUrl } from "@/lib/scan-url";

/** The hero URL input. Validates on submit and on blur after the first attempt. */
export function ScanForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const r = validateScanUrl(value);
    if (!r.ok) return setError(r.error);
    setError(undefined);
    setPending(true);
    router.push(`/scan?url=${encodeURIComponent(r.url)}`);
  };

  return (
    <form
      id="scan"
      onSubmit={submit}
      noValidate
      className="scroll-mt-28 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
    >
      <Input
        label="Site to scan"
        hideLabel
        mono
        name="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://stripe.com"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (touched) {
            const r = validateScanUrl(e.target.value);
            setError(r.ok ? undefined : r.error);
          }
        }}
        error={error}
        hint={
          error ? undefined : "Public https sites only. Private networks and localhost are refused."
        }
      />
      <MagneticButton
        type="submit"
        size="lg"
        loading={pending}
        loadingLabel="Opening scan"
        iconRight={<ArrowRight strokeWidth={1.5} aria-hidden />}
      >
        Scan
      </MagneticButton>
    </form>
  );
}
