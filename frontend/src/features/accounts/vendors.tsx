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

export function Vendors() {
  const list = useCrudList<{ id: string; name: string; kind: string }>("vendors", "/api/vendors");
  const mutate = useApiMutation<Record<string, unknown>>(["vendors"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("vendors", "edit");
  const canFull = can("vendors", "full");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("hotel");
  const [kindFilter, setKindFilter] = useState("all");
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const kinds = useMemo(() => {
    const by: Record<string, number> = {};
    for (const r of rows) by[r.kind] = (by[r.kind] ?? 0) + 1;
    return by;
  }, [rows]);
  return (
    <Card className="space-y-3 shadow-none">
      {list.isPending && <p role="status">Loading…</p>}
      {list.isError && <p role="alert" className="text-red-600">Could not load this page.</p>}
      {mutate.isError && <p role="alert" className="text-red-600">{mutate.error.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Vendors (hotels, airlines, transport, visa)</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All vendors" value={String(rows.length)} hint="Tap to show all" onClick={() => setKindFilter("all")} active={kindFilter === "all"} />
        {Object.keys(kinds).slice(0, 3).map((k) => (
          <StatCard key={k} label={k} value={String(kinds[k])} hint="Tap to filter" onClick={() => setKindFilter(kindFilter === k ? "all" : k)} active={kindFilter === k} />
        ))}
      </div>
      <div>
        <ManagedTable<{ id: string; name: string; kind: string }>
          rows={rows}
          initialFilter={kindFilter === "all" ? undefined : (r) => r.kind === kindFilter}
          searchKeys={["name", "kind"]}
          searchPlaceholder="Search vendors…"
          onAdd={canEdit ? () => setOpen(true) : undefined}
          addLabel="Add vendor"
          columns={[
            { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "kind", header: "Kind", render: (r) => <Badge>{r.kind}</Badge> },
            { key: "actions", header: "", render: (row) => (canFull ? <RowActions actions={[{ label: "Archive", danger: true, onSelect: () => mutate.mutate({ path: `/api/vendors/${row.id}`, method: "DELETE" }) }]} /> : <span className="text-xs text-slate-400">No access</span>) },
          ]}
          empty="No vendors yet."
        />
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add vendor">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {

            await mutate.mutateAsync({ path: "/api/vendors", method: "POST", body: { name, kind } });
            setName(""); setOpen(false);
            } catch {}
          }}
        >
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div>
            <Label>Kind</Label>
            <select className="h-11 w-full rounded-xl border px-3 dark:bg-navy-800" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="hotel">Hotel</option>
              <option value="airline">Airline</option>
              <option value="transport">Transport</option>
              <option value="visa">Visa</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit">Add vendor</Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

