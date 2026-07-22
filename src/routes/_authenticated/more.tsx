import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  FileText,
  Gift,
  GraduationCap,
  HelpCircle,
  LogOut,
  MessageSquare,
  QrCode,
  Receipt,
  Settings as SettingsIcon,
  ShieldAlert,
  Trophy,
  UserPlus,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/account.functions";
import { hasUserPin, setUserPin, removeUserPin } from "@/lib/pin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/more")({
  head: () => ({ meta: [{ title: "Profile — Vyro" }] }),
  component: MorePage,
});

function MorePage() {
  const navigate = useNavigate();
  const profileFn = useServerFn(getProfile);
  const { data: profile } = useSuspenseQuery(
    queryOptions({ queryKey: ["profile"], queryFn: () => profileFn() }),
  );
  const qc = useQueryClient();

  const name = (profile?.display_name || "TRADER").toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    sessionStorage.removeItem("vyro:pin_ok");
    qc.clear();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="-mt-3 space-y-4">
      <div className="relative flex items-center justify-between pt-2">
        <button onClick={() => navigate({ to: "/home" })} aria-label="Back">
          <ArrowLeft className="size-6 text-primary" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 text-base font-semibold">Profile</div>
        <span />
      </div>

      <section className="flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4">
        <div className="grid size-12 place-items-center rounded-full bg-warn/70 text-primary-foreground">
          <UserRound className="size-6" />
        </div>
        <div className="flex-1">
          <div className="text-base font-bold">{name}</div>
          <div className="text-xs text-muted-foreground">Account details</div>
        </div>
        <button onClick={() => toast.info("Account details — coming soon")} aria-label="Open account">
          <ExternalLink className="size-5 text-primary" />
        </button>
      </section>

      <section className="grid grid-cols-4 gap-3">
        <QuickTile icon={<QrCode className="size-6" />} label="Web login" onClick={() => toast.info("Web login — coming soon")} />
        <QuickTile icon={<SettingsIcon className="size-6" />} label="Services" onClick={() => toast.info("Services — coming soon")} />
        <PinManager />
        <QuickTile icon={<HelpCircle className="size-6" />} label="Support" onClick={() => toast.info("Support — coming soon")} />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <NavTile to="/leaderboard" icon={<Trophy className="size-6" />} label="Leaderboard" accent="warn" />
        <NavTile to="/analytics" icon={<BarChart3 className="size-6" />} label="Performance" accent="bull" />
        <NavTile to="/learn" icon={<GraduationCap className="size-6" />} label="Learn" accent="primary" />
      </section>

      <section className="rounded-2xl border border-border bg-surface-1 p-4">
        <div className="text-sm font-semibold">Reports</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ReportTile icon={<FileText />} label="Account Statement (Ledger)" />
          <ReportTile icon={<Receipt />} label="Realised P&L" />
          <ReportTile icon={<FileText />} label="Tax P&L" />
          <ReportTile icon={<FileText />} label="View all reports" />
        </div>
      </section>

      <section className="rounded-2xl border border-warn/40 bg-warn/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="size-5 shrink-0 text-warn" />
          <div className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Disclaimer:</span> Vyro is a paper-trading
            simulator for educational purposes only. All money, prices, and P&L are virtual. Nothing
            here is investment advice. Real trading involves substantial risk.
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => toast.info("Referral program — coming soon")}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4 text-left"
      >
        <Gift className="size-8 text-primary" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Earn ₹300 + 15% brokerage</div>
          <div className="text-xs text-primary">Refer friends now →</div>
        </div>
      </button>

      <section className="divide-y divide-border rounded-2xl border border-border bg-surface-1">
        <MenuItem icon={<MessageSquare className="size-5" />} label="Chat with us" chevron onClick={() => toast.info("Live chat — coming soon")} />
        <MenuItem icon={<FileText className="size-5" />} label="Submit feedback" external onClick={() => toast.info("Feedback form — coming soon")} />
      </section>

      <section className="divide-y divide-border rounded-2xl border border-border bg-surface-1">
        <MenuItem icon={<UserPlus className="size-5" />} label="Add account" onClick={() => toast.info("Multi-account — coming soon")} />
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm"
        >
          <span className="grid size-9 place-items-center rounded-full bg-background text-primary">
            <LogOut className="size-5" />
          </span>
          <span className="flex-1">Logout</span>
        </button>
      </section>

      <div className="flex items-center justify-between px-1 pb-4 pt-1 text-xs text-muted-foreground">
        <span>App Version 1.0.0</span>
        <span className="underline">Brokerage & Charges</span>
      </div>
    </div>
  );
}

function NavTile({
  to,
  icon,
  label,
  accent,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  accent: "warn" | "bull" | "primary";
}) {
  const tone = accent === "warn" ? "text-warn" : accent === "bull" ? "text-bull" : "text-primary";
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface-1 p-3 ${tone}`}
    >
      {icon}
      <span className="text-[11px] font-medium text-foreground">{label}</span>
    </Link>
  );
}

function QuickTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface-1 p-3 text-primary">
      {icon}
      <span className="text-[11px] font-medium text-foreground">{label}</span>
    </button>
  );
}

function ReportTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={() => toast.info(`${label} — coming soon`)}
      className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-primary"
    >
      {icon}
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}

function MenuItem({
  icon,
  label,
  chevron,
  external,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  chevron?: boolean;
  external?: boolean;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <span className="grid size-9 place-items-center rounded-full bg-background text-primary">
        {icon}
      </span>
      <span className="flex-1 text-sm">{label}</span>
      {chevron && <span className="text-muted-foreground">›</span>}
      {external && <ExternalLink className="size-4 text-primary" />}
    </button>
  );
}

function PinManager() {
  const [hasPin, setHas] = useState(false);
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    hasUserPin().then((r) => setHas(r.hasPin));
  }, []);

  async function save() {
    if (pin.length !== 4) return toast.error("PIN must be 4 digits");
    await setUserPin({ data: { pin } });
    toast.success("PIN saved");
    setHas(true);
    setPin("");
    setOpen(false);
  }

  async function clear() {
    await removeUserPin();
    setHas(false);
    toast.success("PIN removed");
  }

  return (
    <>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface-1 p-3 text-primary"
      >
        <SettingsIcon className="size-6" />
        <span className="text-[11px] font-medium text-foreground">
          {hasPin ? "Change PIN" : "Set PIN"}
        </span>
      </button>
      {open && (
        <div className="col-span-4 rounded-2xl border border-border bg-surface-1 p-4">
          <div className="text-sm font-semibold">{hasPin ? "Change 4-digit PIN" : "Set 4-digit PIN"}</div>
          <input
            value={pin}
            inputMode="numeric"
            maxLength={4}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:border-primary"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
            >
              Save
            </button>
            {hasPin && (
              <button
                onClick={clear}
                className="rounded-xl border border-bear/60 px-3 py-2 text-sm font-semibold text-bear"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
