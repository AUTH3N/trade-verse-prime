import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Home,
  ListOrdered,
  MoreHorizontal,
  Search,
  Star,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hasUserPin, verifyUserPin } from "@/lib/pin.functions";
import { toast } from "sonner";

const TABS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/orders", label: "Orders", icon: ListOrdered },
  { to: "/portfolio", label: "Portfolio", icon: Wallet },
  { to: "/more", label: "More", icon: MoreHorizontal },
] as const;

const PIN_SESSION_FLAG = "vyro:pin_ok";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [pinUnlocked, setPinUnlocked] = useState<boolean | null>(null);
  const [pinExists, setPinExists] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessionOk = sessionStorage.getItem(PIN_SESSION_FLAG) === "1";
      const res = await hasUserPin();
      if (cancelled) return;
      setPinExists(res.hasPin);
      setPinUnlocked(sessionOk || !res.hasPin);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (pinUnlocked === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!pinUnlocked && pinExists) {
    return <PinGate onUnlock={() => setPinUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-3">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-1/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {TABS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/home" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            V
          </div>
          <span className="text-base font-semibold tracking-tight">Vyro</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg border border-border bg-surface-1 text-muted-foreground hover:text-foreground"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg border border-border bg-surface-1 text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setBusy(true);
    try {
      const res = await verifyUserPin({ data: { pin } });
      if (!res.ok) {
        toast.error("Incorrect PIN");
        setPin("");
        return;
      }
      sessionStorage.setItem(PIN_SESSION_FLAG, "1");
      onUnlock();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-xs text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold">
          V
        </div>
        <h1 className="mt-5 text-lg font-semibold">Enter your PIN</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unlock Vyro to continue trading.
        </p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="mt-5 w-full rounded-xl border border-border bg-surface-1 px-4 py-3 text-center text-2xl font-mono tracking-[0.75em] outline-none focus:border-primary"
          placeholder="••••"
        />
        <button
          type="submit"
          disabled={busy || pin.length !== 4}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
        >
          Unlock
        </button>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            sessionStorage.removeItem(PIN_SESSION_FLAG);
            navigate({ to: "/auth", replace: true });
          }}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
