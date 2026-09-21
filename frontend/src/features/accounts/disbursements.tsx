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

export function Disbursements() {
  const list = useCrudList<{ id: string; amountSar: string; amountBdt: string }>("disb", "/api/disbursements");
  const mutate = useApiMutation<Record<string, unknown>>(["disb"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("disbursements", "edit");
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [sar, setSar] = useState("");
  const [fx, setFx] = useState("32.5");
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const totalSar = rows.reduce((s, r) => s + Number(r.amountSar ?? 0), 0);
  return (
    <Card className="space-y-3 shadow-none">
      {list.isPending && <p role="status">Loading…</p>}
      {list.isError && <p role="alert" className="text-red-600">Could not load this page.</p>}
      {mutate.isError && <p role="alert" className="text-red-600">{mutate.error.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Vendor fund distribution (SAR → BDT)</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Disbursements" value={String(rows.length)} hint={`${totalSar.toLocaleString()} SAR total`} />
      </div>
      <ManagedTable<{ id: string; amountSar: string; amountBdt: string }>
        rows={rows}
        searchKeys={["amountSar", "amountBdt"]}
        searchPlaceholder="Search amounts…"
        onAdd={canEdit ? () => setOpen(true) : undefined}
        addLabel="Disburse"
        columns={[
          { key: "amountSar", header: "SAR", render: (r) => <span className="tabular-nums">{r.amountSar}</span> },
          { key: "amountBdt", header: "BDT", render: (r) => <strong className="tabular-nums">{r.amountBdt}</strong> },
        ]}
        empty="No disbursements yet."
      />
      <Dialog open={open} onClose={() => setOpen(false)} title="Record disbursement" description="Vendor payout in SAR with FX rate; BDT equivalent is stored.">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {

            await mutate.mutateAsync({ path: "/api/disbursements", method: "POST", body: { vendorId, amountSar: sar, fxRate: fx } });
            setSar(""); setOpen(false);
            } catch {}
          }}
        >
          <div><Label>Vendor ID</Label><Input value={vendorId} onChange={(e) => setVendorId(e.target.value)} required /></div>
          <div><Label>Amount (SAR)</Label><Input value={sar} onChange={(e) => setSar(e.target.value)} required /></div>
          <div><Label>FX rate</Label><Input value={fx} onChange={(e) => setFx(e.target.value)} required /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit">Disburse</Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

