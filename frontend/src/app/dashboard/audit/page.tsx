"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { useCrudList } from "@/features/crud";

export default function TenantAuditPage() {
  const list = useCrudList<{ id: string; action: string; targetType: string; actorId?: string }>("taudit", "/api/audit");
  const [actionFilter, setActionFilter] = useState("all");
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const actions = useMemo(() => {
    const by: Record<string, number> = {};
    for (const r of rows) by[r.action] = (by[r.action] ?? 0) + 1;
    return by;
  }, [rows]);

  return (
    <GuardedShell plane="tenant" feature="audit" level="view">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-slate-500">Every state-changing action is recorded with the actor and target.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Events" value={list.data ? String(rows.length) : "—"} hint="Recorded actions" onClick={() => setActionFilter("all")} active={actionFilter === "all"} />
        {Object.keys(actions).slice(0, 3).map((a) => (
          <StatCard key={a} label={a} value={String(actions[a])} hint="Tap to filter" onClick={() => setActionFilter(actionFilter === a ? "all" : a)} active={actionFilter === a} />
        ))}
      </div>

      <div className="mt-4">
        <ManagedTable<{ id: string; action: string; targetType: string; actorId?: string }>
            rows={rows}
            initialFilter={actionFilter === "all" ? undefined : (r) => r.action === actionFilter}
            searchKeys={["action", "targetType", "actorId"]}
            searchPlaceholder="Search actions…"
            columns={[
              { key: "action", header: "Action", render: (r) => <span className="font-mono text-xs">{r.action}</span> },
              { key: "targetType", header: "Target" },
              { key: "actorId", header: "Actor", render: (r) => <span className="font-mono text-xs">{r.actorId?.slice(0, 8) ?? "—"}</span> },
            ]}
          />
      </div>
    </GuardedShell>
  );
}
