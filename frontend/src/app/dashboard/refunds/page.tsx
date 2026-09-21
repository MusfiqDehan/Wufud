"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";

const FLOW: Record<string, string[]> = {
  requested: ["approved", "rejected"],
  approved: ["processing", "rejected"],
  processing: ["paid"],
};

type Refund = { id: string; amount: string; status: string };

export default function RefundsAdmin() {
  const list = useCrudList<Refund>("rf", "/api/refunds");
  const mutate = useApiMutation<Record<string, unknown>>(["rf"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canFull = can("refunds", "full");
  const [statusFilter, setStatusFilter] = useState("all");
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    for (const r of rows) by[r.status] = (by[r.status] ?? 0) + 1;
    return by;
  }, [rows]);
  const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return (
    <GuardedShell plane="tenant" feature="refunds" level="view">
      <h1 className="text-2xl font-semibold">Refunds</h1>
      <p className="mt-1 text-sm text-slate-500">Request → approval → processing → paid. A refund can never exceed the amount received.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All refunds" value={list.data ? String(rows.length) : "—"} hint={`${total.toLocaleString()} BDT claimed`} onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
        <StatCard label="Requested" value={String(counts.requested ?? 0)} hint="Tap to filter" onClick={() => setStatusFilter("requested")} active={statusFilter === "requested"} />
        <StatCard label="Processing" value={String((counts.approved ?? 0) + (counts.processing ?? 0))} hint="In flight" onClick={() => setStatusFilter("approved")} active={statusFilter === "approved"} />
        <StatCard label="Paid" value={String(counts.paid ?? 0)} hint="Settled" onClick={() => setStatusFilter("paid")} active={statusFilter === "paid"} />
      </div>

      <div className="mt-4">
          {list.isPending ? (
            <p role="status" className="py-10 text-center text-sm text-slate-500">Loading refunds…</p>
          ) : list.isError ? (
            <p role="alert" className="text-sm text-red-600">Could not load refunds. <button className="underline" onClick={() => void list.refetch()}>Try again</button></p>
          ) : (
            <ManagedTable<Refund>
              rows={rows}
              initialFilter={statusFilter === "all" ? undefined : statusFilter === "approved" ? (r) => r.status === "approved" || r.status === "processing" : (r) => r.status === statusFilter}
              searchKeys={["id", "status"]}
              searchPlaceholder="Search refunds…"
              columns={[
                { key: "id", header: "Refund", render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
                { key: "amount", header: "Amount", render: (r) => <span className="tabular-nums">{r.amount}</span> },
                { key: "status", header: "Status", render: (r) => <Badge>{r.status}</Badge> },
                {
                  key: "actions",
                  header: "",
                  render: (row) => {
                    const next = FLOW[row.status] ?? [];
                    if (!next.length) return <span className="text-xs text-slate-400">Terminal</span>;
                    if (!canFull) return <span className="text-xs text-slate-400">Needs full access</span>;
                    return (
                      <RowActions
                        actions={next.map((s) => ({
                          label: s === "paid" ? "Mark paid" : s[0].toUpperCase() + s.slice(1),
                          danger: s === "rejected",
                          onSelect: () => mutate.mutate({ path: `/api/refunds/${row.id}`, method: "PATCH", body: { status: s } }),
                        }))}
                      />
                    );
                  },
                },
              ]}
            />
          )}
      </div>
    </GuardedShell>
  );
}
