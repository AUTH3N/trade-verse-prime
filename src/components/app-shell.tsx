import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bookmark,
  Briefcase,
  ClipboardList,
  Fingerprint,
  Home,
  LayoutGrid,
  Search,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hasUserPin, verifyUserPin } from "@/lib/pin.functions";
import { getProfile } from "@/lib/account.functions";
import { toast } from "sonner";

const TABS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/watchlist", label: "Watchlist", icon: Bookmark },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/more", label: "More", icon: LayoutGrid },
] as const;

const PIN_SESSION_FLAG = "vyro:pin_ok";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [pinUnlocked, setPinUnlocked] = useState<boolean | null>(null);
  const [pinExists, setPinExists] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessionOk = sessionStorage.getItem(PIN_SESSION_FLAG) === "1";
      const [pinRes, profile] = await Promise.all([hasUserPin(), getProfile()]);
      if (cancelled) return;
      setPinExists(pinRes.hasPin);
      setPinUnlocked(sessionOk || !pinRes.hasPin);
      setDisplayName(profile?.display_name ?? "");
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
    return <PinGate name={displayName} onUnlock={() => setPinUnlocked(true)} />;
  }

  const initials = (displayName || "NT")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hideTopBar = location.pathname.startsWith("/search");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!hideTopBar && <TopBar initials={initials} />}
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-3">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-1/95 backdrop-blur">
        <div
          className="mx-auto grid max-w-3xl"
          style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
        >
          {TABS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition ${
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

function TopBar({ initials }: { initials: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-3">
        <Link
          to="/search"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2.5 text-sm text-muted-foreground"
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate">Search "Mutual Funds"</span>
        </Link>
        <Link
          to="/funds"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface-1 px-3 py-2.5 text-sm font-medium"
        >
          <Wallet className="size-4" />
          Funds
        </Link>
        <Link
          to="/more"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-1 text-sm font-bold text-primary"
          aria-label="Profile"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}

function PinGate({ name, onUnlock }: { name: string; onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) return;
    setBusy(true);
    try {
      // Verify with first 4 digits (server stores 4-digit PIN)
      const res = await verifyUserPin({ data: { pin: pin.slice(0, 4) } });
      if (!res.ok) {
        toast.error("Incorrect M-PIN");
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
    <div className="flex min-h-screen flex-col bg-background px-6 pb-8 pt-12">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground text-base font-bold">
            V
          </div>
          <div className="text-2xl font-black tracking-tight text-primary">Vyro</div>
        </div>
        <div className="mt-10">
          <div className="text-base text-muted-foreground">Welcome back</div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {name || "Trader"}
          </div>
        </div>
        <form onSubmit={submit} className="mt-8">
          <div className="relative">
            <input
              autoFocus
              type={show ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-xl border border-border bg-surface-1 px-4 py-4 pr-12 text-base outline-none focus:border-primary"
              placeholder="Enter 6 digit M-PIN"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Toggle visibility"
            >
              {show ? "🙈" : "👁"}
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" className="text-primary">
              Forgot M-PIN?
            </button>
            <button type="button" className="flex items-center gap-1.5 text-primary">
              <span className="grid size-5 place-items-center rounded-full bg-primary/20 text-[10px]">👥</span>
              Add account
            </button>
          </div>
          <button
            type="submit"
            disabled={busy || pin.length < 4}
            className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Verifying…" : "Unlock"}
          </button>
        </form>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => toast.info("Biometric not available on web preview")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-1 py-4 text-sm font-medium text-primary"
        >
          <Fingerprint className="size-5 text-bull" />
          Login with fingerprint
        </button>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            sessionStorage.removeItem(PIN_SESSION_FLAG);
            navigate({ to: "/auth", replace: true });
          }}
          className="block w-full py-2 text-center text-sm font-medium text-primary"
        >
          Login with OTP
        </button>
      </div>
    </div>
  );
}
