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

export function Expenses() {
  const list = useCrudList<{ id: string; title: string; amount: string }>("exp", "/api/expenses");
  const mutate = useApiMutation<Record<string, unknown>>(["exp"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("expenses", "edit");
  const canFull = can("expenses", "full");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  return (
    <Card className="space-y-3 shadow-none">
      {list.isPending && <p role="status">Loading…</p>}
      {list.isError && <p role="alert" className="text-red-600">Could not load this page.</p>}
      {mutate.isError && <p role="alert" className="text-red-600">{mutate.error.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Expenses</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Expenses" value={String(rows.length)} hint={`${total.toLocaleString()} BDT total`} />
      </div>
      <ManagedTable<{ id: string; title: string; amount: string }>
        rows={rows}
        searchKeys={["title"]}
        searchPlaceholder="Search expenses…"
        onAdd={canEdit ? () => setOpen(true) : undefined}
        addLabel="Add expense"
        columns={[
          { key: "title", header: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "amount", header: "Amount", render: (r) => <strong className="tabular-nums">{r.amount}</strong> },
          { key: "actions", header: "", render: (row) => (canFull ? <RowActions actions={[{ label: "Archive", danger: true, onSelect: () => mutate.mutate({ path: `/api/expenses/${row.id}`, method: "DELETE" }) }]} /> : <span className="text-xs text-slate-400">No access</span>) },
        ]}
        empty="No expenses yet."
      />
      <Dialog open={open} onClose={() => setOpen(false)} title="Add expense">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {

            await mutate.mutateAsync({ path: "/api/expenses", method: "POST", body: { title, amount } });
            setTitle(""); setAmount(""); setOpen(false);
            } catch {}
          }}
        >
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div><Label>Amount</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit">Add expense</Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

