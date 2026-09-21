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

export function Stock() {
  const list = useCrudList<{ id: string; name: string; quantity: number }>("stock", "/api/stock");
  const issues = useCrudList<{ id: string; quantity: number }>("issues", "/api/stock/issues");
  const mutate = useApiMutation<Record<string, unknown>>(["stock", "issues"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("stock", "edit");
  const canFull = can("stock", "full");
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueId, setIssueId] = useState("");
  const [issueQty, setIssueQty] = useState("");
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const onHand = rows.reduce((s, r) => s + Number(r.quantity ?? 0), 0);
  const issued = useMemo(() => (issues.data?.items ?? []).reduce((s, r) => s + Number(r.quantity ?? 0), 0), [issues.data]);
  return (
    <Card className="space-y-3 shadow-none">
      {list.isPending && <p role="status">Loading…</p>}
      {list.isError && <p role="alert" className="text-red-600">Could not load this page.</p>}
      {mutate.isError && <p role="alert" className="text-red-600">{mutate.error.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Stock (ihram sets, bags, SIM cards)</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="SKUs" value={String(rows.length)} hint="Inventory lines" />
        <StatCard label="On hand" value={String(onHand)} hint="Units in store" />
        <StatCard label="Issued" value={String(issued)} hint="To pilgrims" />
      </div>
      <div>
        <ManagedTable<{ id: string; name: string; quantity: number }>
          rows={rows}
          searchKeys={["name"]}
          searchPlaceholder="Search items…"
          onAdd={canEdit ? () => setAddOpen(true) : undefined}
          addLabel="Add stock"
          columns={[
            { key: "name", header: "Item", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "quantity", header: "On hand", render: (r) => <strong className="tabular-nums">{r.quantity}</strong> },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <RowActions
                  actions={[
                    ...(canEdit ? [{ label: "Issue to pilgrims", onSelect: () => { setIssueId(row.id); setIssueOpen(true); } }] : []),
                    ...(canFull ? [{ label: "Archive", danger: true as const, onSelect: () => mutate.mutate({ path: `/api/stock/${row.id}`, method: "DELETE" }) }] : []),
                  ]}
                />
              ),
            },
          ]}
          empty="No stock items yet."
        />
      </div>
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add stock">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {

            await mutate.mutateAsync({ path: "/api/stock", method: "POST", body: { name, quantity: Number(qty) } });
            setName(""); setQty(""); setAddOpen(false);
            } catch {}
          }}
        >
          <div><Label>Item</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Quantity</Label><Input value={qty} onChange={(e) => setQty(e.target.value)} required /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit">Add stock</Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue stock" description="Issues quantity of an item, optionally linked to a booking.">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {

            await mutate.mutateAsync({ path: "/api/stock/issue", method: "POST", body: { itemId: issueId, quantity: Number(issueQty) } });
            setIssueId(""); setIssueQty(""); setIssueOpen(false);
            } catch {}
          }}
        >
          <div><Label>Item ID to issue</Label><Input value={issueId} onChange={(e) => setIssueId(e.target.value)} required /></div>
          <div><Label>Quantity</Label><Input value={issueQty} onChange={(e) => setIssueQty(e.target.value)} required /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit">Issue to pilgrims</Button>
          </div>
        </form>
      </Dialog>
      <ManagedTable<{ id: string; quantity: number }>
        rows={issues.data?.items ?? []}
        searchKeys={["quantity"]}
        searchPlaceholder="Search issues…"
        columns={[{ key: "quantity", header: "Issued qty", render: (r) => <span className="tabular-nums">{r.quantity}</span> }]}
        empty="Nothing issued yet."
      />
    </Card>
  );
}

