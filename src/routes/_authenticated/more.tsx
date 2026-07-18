import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { hasUserPin, setUserPin } from "@/lib/pin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/more")({
  head: () => ({ meta: [{ title: "More — Vyro" }] }),
  component: MorePage,
});

function MorePage() {
  const navigate = useNavigate();
  const [pinExists, setPinExists] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hasUserPin().then((r) => setPinExists(r.hasPin));
  }, []);

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setBusy(true);
    try {
      await setUserPin({ data: { pin } });
      toast.success("PIN set — you'll be asked for it on next app open");
      setPin("");
      setPinExists(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set PIN");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    sessionStorage.removeItem("vyro:pin_ok");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="text-base font-semibold">App PIN</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {pinExists
            ? "A PIN is set. It will be asked when you open the app."
            : "Set a 4-digit PIN to lock the app on open."}
        </p>
        <form onSubmit={savePin} className="mt-3 flex gap-2">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            pattern="\d{4}"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder={pinExists ? "New PIN" : "4-digit PIN"}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-center text-lg font-mono tracking-[0.5em] outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || pin.length !== 4}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
          >
            {pinExists ? "Update" : "Set"}
          </button>
        </form>
      </section>

      <button
        type="button"
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-1 px-4 py-3 text-sm font-semibold text-bear hover:bg-surface-2 transition"
      >
        <LogOut className="size-4" /> Sign out
      </button>
    </div>
  );
}
