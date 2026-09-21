"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { useCrudList } from "@/features/crud";

export default function PilgrimsPage() {
  const list = useCrudList<{ id: string; fullName: string; passportNumber: string; nationality?: string }>("pilgrims", "/api/pilgrims");
  const [natFilter, setNatFilter] = useState("all");
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const nats = useMemo(() => {
    const by: Record<string, number> = {};
    for (const r of rows) by[r.nationality ?? "Unknown"] = (by[r.nationality ?? "Unknown"] ?? 0) + 1;
    return by;
  }, [rows]);

  return (
    <GuardedShell plane="tenant" feature="pilgrims" level="view">
      <h1 className="text-2xl font-semibold">Pilgrims</h1>
      <p className="mt-1 text-sm text-slate-500">Passport records live on each booking; this is the agency-wide directory.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pilgrims" value={list.data ? String(rows.length) : "—"} hint="Across all bookings" onClick={() => setNatFilter("all")} active={natFilter === "all"} />
        {Object.keys(nats).slice(0, 3).map((n) => (
          <StatCard key={n} label={n} value={String(nats[n])} hint="Tap to filter" onClick={() => setNatFilter(natFilter === n ? "all" : n)} active={natFilter === n} />
        ))}
      </div>

      <div className="mt-4">
          {list.isPending ? (
            <p role="status" className="py-10 text-center text-sm text-slate-500">Loading pilgrims…</p>
          ) : list.isError ? (
            <p role="alert" className="text-sm text-red-600">Could not load pilgrims. <button className="underline" onClick={() => void list.refetch()}>Try again</button></p>
          ) : (
            <ManagedTable<{ id: string; fullName: string; passportNumber: string; nationality?: string }>
              rows={rows}
              initialFilter={natFilter === "all" ? undefined : (r) => (r.nationality ?? "Unknown") === natFilter}
              searchKeys={["fullName", "passportNumber"]}
              searchPlaceholder="Search name or passport…"
              columns={[
                { key: "fullName", header: "Name", render: (r) => <span className="font-medium">{r.fullName}</span> },
                { key: "passportNumber", header: "Passport", render: (r) => <span className="font-mono text-xs">{r.passportNumber}</span> },
                { key: "nationality", header: "Nationality", render: (r) => r.nationality ?? "—" },
              ]}
            />
          )}
      </div>
    </GuardedShell>
  );
}
