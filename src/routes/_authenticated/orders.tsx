import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — Vyro" }] }),
  component: () => (
    <div className="rounded-2xl border border-border bg-surface-1 p-6 text-center">
      <div className="text-lg font-semibold">Orders</div>
      <div className="mt-2 text-sm text-muted-foreground">
        Open, pending, executed, and cancelled orders will appear here.
      </div>
    </div>
  ),
});
