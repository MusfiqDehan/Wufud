"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Card } from "@/components/ui/card";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";

export function Settlements() {
  const list = useCrudList<{ id: string; gatewaySlug: string; status: string }>("settle", "/api/settlements");
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canFull = can("settlements", "full");
  const [openId, setOpenId] = useState("");
  const items = useCrudList<{ id: string; tranId?: string; gatewayAmount: string; internalAmount?: string; status: string }>(
    `settle-items-${openId || "none"}`,
    openId ? `/api/settlements/${openId}/items` : "/api/settlements",
  );
  const mutate = useApiMutation<Record<string, unknown>>(["settle", `settle-items-${openId || "none"}`]);
  const [statusFilter, setStatusFilter] = useState("all");
  const irows = useMemo(() => (items.data?.items ?? []).filter((i) => i.tranId), [items.data]);
  const mismatches = irows.filter((i) => i.status === "mismatch").length;
  return (
    <Card className="space-y-3 shadow-none">
      {list.isPending && <p role="status">Loading…</p>}
      {list.isError && <p role="alert" className="text-red-600">Could not load this page.</p>}
      {mutate.isError && <p role="alert" className="text-red-600">{mutate.error.message}</p>}
      <h2 className="font-semibold">Gateway settlement & reconciliation</h2>
      <p className="text-sm text-slate-500">Mismatches stay open until an admin resolves them — never silently corrected.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Reports" value={String(list.data?.items.length ?? "—")} hint="Imported windows" />
        <StatCard label="Open mismatches" value={openId ? String(mismatches) : "—"} hint={openId ? "In selected report" : "Inspect a report"} />
      </div>
      <ManagedTable<{ id: string; gatewaySlug: string; status: string }>
        rows={list.data?.items ?? []}
        searchKeys={["gatewaySlug", "status"]}
        searchPlaceholder="Search reports…"
        columns={[
          { key: "gatewaySlug", header: "Gateway" },
          { key: "status", header: "Status", render: (r) => <Badge>{r.status}</Badge> },
          { key: "actions", header: "", render: (row) => <RowActions actions={[{ label: openId === row.id ? "Close items" : "Inspect items", onSelect: () => setOpenId(openId === row.id ? "" : row.id) }]} /> },
        ]}
        empty="No settlement reports imported."
      />
      {openId ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Items" value={String(irows.length)} hint="Tap to show all" onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
            <StatCard label="Mismatches" value={String(mismatches)} hint="Tap to filter" onClick={() => setStatusFilter(statusFilter === "mismatch" ? "all" : "mismatch")} active={statusFilter === "mismatch"} />
          </div>
          <ManagedTable<{ id: string; tranId?: string; gatewayAmount: string; internalAmount?: string; status: string }>
          rows={irows}
          initialFilter={statusFilter === "all" ? undefined : (r) => r.status === statusFilter}
          searchKeys={["tranId", "status"]}
          searchPlaceholder="Search items…"
          columns={[
            { key: "tranId", header: "Transaction", render: (r) => <span className="font-mono text-xs">{r.tranId}</span> },
            { key: "gatewayAmount", header: "Gateway" },
            { key: "internalAmount", header: "Internal", render: (r) => r.internalAmount ?? "—" },
            { key: "status", header: "Status", render: (r) => <Badge>{r.status}</Badge> },
            {
              key: "actions",
              header: "",
              render: (row) => (row.status === "mismatch" ? (canFull ? <RowActions actions={[{ label: "Resolve mismatch", onSelect: () => mutate.mutate({ path: `/api/reconciliation/${row.id}/resolve`, method: "POST", body: { note: window.prompt("Explain how this mismatch was resolved") ?? "" } }) }]} /> : <span className="text-xs text-slate-400">Needs full access</span>) : <span className="text-xs text-slate-400">—</span>),
            },
          ]}
          empty="No items."
        />
        </>
      ) : null}
    </Card>
  );
}
