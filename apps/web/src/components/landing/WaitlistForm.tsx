"use client";
import { useActionState, useEffect, useRef } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/actions/waitlist";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function WaitlistForm({ source = "landing" }: { source?: string }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, {
    status: "idle",
  });
  const { push } = useToast();
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "idle") return;
    if (state.status === "ok") {
      push({
        tone: "success",
        title: "You're on the list",
        description: "We'll email you when scans open.",
      });
      form.current?.reset();
    } else if (state.status === "duplicate")
      push({ title: state.message, description: "Nothing else to do. We have your address." });
    else push({ tone: "risk", title: "Not added", description: state.message });
  }, [state, push]);

  return (
    <form
      ref={form}
      action={action}
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
    >
      <input type="hidden" name="source" value={source} />
      <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Input
        label="Email"
        hideLabel
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@company.com"
        error={state.status === "error" ? state.message : undefined}
        hint={
          state.status === "ok" || state.status === "duplicate"
            ? state.message
            : "One email when scans open. No newsletter."
        }
      />
      <Button type="submit" size="lg" loading={pending} loadingLabel="Adding">
        Join the waitlist
      </Button>
    </form>
  );
}
