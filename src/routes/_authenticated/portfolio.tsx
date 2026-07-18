import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio — Vyro" }] }),
  component: () => (
    <div className="rounded-2xl border border-border bg-surface-1 p-6 text-center">
      <div className="text-lg font-semibold">Portfolio</div>
      <div className="mt-2 text-sm text-muted-foreground">
        Holdings, positions, day P&L, and analytics will appear here.
      </div>
    </div>
  ),
});
