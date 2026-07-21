import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Banknote, ChevronRight, History, Wallet as WalletIcon } from "lucide-react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getWallet } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/funds")({
  head: () => ({ meta: [{ title: "Funds — Vyro" }] }),
  component: FundsPage,
});

function fmt(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function FundsPage() {
  const walletFn = useServerFn(getWallet);
  const { data: wallet } = useSuspenseQuery(
    queryOptions({ queryKey: ["wallet"], queryFn: () => walletFn() }),
  );

  const cash = Number(wallet.balance);
  const margin = Number(wallet.margin_used);
  const total = cash + margin;
  const available = cash;

  return (
    <div className="-mt-3 flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="pt-2">
        <Link to="/home" aria-label="Back" className="inline-flex text-primary">
          <ArrowLeft className="size-6" />
        </Link>
      </div>

      <div className="mt-6 flex items-start justify-between">
        <div>
          <div className="text-base font-semibold text-primary">Funds</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{fmt(total)}</div>
        </div>
        <div className="relative">
          <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-bear/40 to-primary/30 text-3xl">
            💼
          </div>
        </div>
      </div>

      <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface-1">
        <Row label="Cash balance" value={fmt(cash)} chevron />
        <Row label="Margin from shares" value="0" chevron />
        <Row label="Used margin" value={fmt(margin)} chevron />
        <Row label="Available margin" value={fmt(available)} highlight />
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-surface-1 px-4 py-3.5 text-sm">
        <div className="flex items-center justify-between">
          <span>Available margin for buying options</span>
          <span className="font-semibold tabular-nums">{fmt(available)}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <MenuRow icon={<Banknote className="size-5" />} label="Amount due details" onClick={() => toast.info("Amount due details — coming soon")} />
        <MenuRow icon={<History className="size-5" />} label="Track deposit & withdraw request" chevron onClick={() => toast.info("Deposit/Withdraw history — coming soon")} />
        <MenuRow icon={<WalletIcon className="size-5" />} label="Pledge for margin/unpledge" chevron onClick={() => toast.info("Pledge — coming soon")} />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Note:</span> Deposits will reflect in your
        account immediately. Withdraw requests placed before 04:00 PM IST on a business day will
        get processed on the same day.
      </p>

      <div className="mt-auto pt-6" />
      <div className="sticky bottom-20 grid grid-cols-2 gap-3 bg-background pb-2 pt-2">
        <button onClick={() => toast.info("Deposit — coming soon")} className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">
          Deposit
        </button>
        <button onClick={() => toast.info("Withdraw — coming soon")} className="rounded-xl border border-primary py-3 text-sm font-semibold text-primary">
          Withdraw
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  chevron,
  highlight,
}: {
  label: string;
  value: string;
  chevron?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${highlight ? "bg-surface-2" : ""}`}>
      <span className={`text-sm ${highlight ? "font-semibold" : ""}`}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        {chevron && <ChevronRight className="size-4 text-muted-foreground" />}
      </div>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  chevron,
}: {
  icon: React.ReactNode;
  label: string;
  chevron?: boolean;
}) {
  return (
    <button className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-3.5 text-left">
      <span className="grid size-9 place-items-center rounded-full bg-background text-primary">
        {icon}
      </span>
      <span className="flex-1 text-sm">{label}</span>
      {chevron && <ChevronRight className="size-4 text-muted-foreground" />}
    </button>
  );
}
