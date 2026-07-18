import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist — Vyro" }] }),
  component: () => <ComingSoon title="Watchlists" body="Unlimited watchlists with live LTP, OI, IV, and Greeks are coming next." />,
});

function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-6 text-center">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{body}</div>
    </div>
  );
}
