"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { DataTable } from "@/components/data/data-table";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { api } from "@/lib/api";
import { useFeatureAccess } from "@/lib/auth";

type Booking = { id: string; status: string; frozenPrice: string; pilgrimCount: number; amountReceived?: string };
type Detail = Booking & {
  pilgrims?: { id: string; fullName: string; passportNumber: string; cancelled: boolean }[];
  installments?: { id: string; sequence: number; amountDue: string; amountPaid: string; status: string }[];
  payments?: { id: string; amount: string; source: string }[];
};

export default function BookingsAdmin() {
  const list = useCrudList<Booking>("bookings", "/api/bookings");
  const mutate = useApiMutation<Record<string, unknown>>(["bookings"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("bookings", "edit");
  const canFull = can("bookings", "full");
  const canRefundEdit = can("refunds", "edit");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [refundFor, setRefundFor] = useState<Booking | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [partialIds, setPartialIds] = useState("");

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    for (const r of rows) by[r.status] = (by[r.status] ?? 0) + 1;
    return by;
  }, [rows]);

  const open = async (id: string) => {
    const d = await api<Detail>(`/api/bookings/${id}`);
    setDetail(d);
  };

  return (
    <GuardedShell plane="tenant" feature="bookings" level="view">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">Seat holds, confirmations, cancellations and refunds.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All bookings" value={list.data ? String(rows.length) : "—"} hint="Tap to show all" onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
        <StatCard label="Held" value={String(counts.held ?? 0)} hint="Awaiting confirmation" onClick={() => setStatusFilter("held")} active={statusFilter === "held"} />
        <StatCard label="Confirmed" value={String(counts.confirmed ?? 0)} hint="Ready to travel" onClick={() => setStatusFilter("confirmed")} active={statusFilter === "confirmed"} />
        <StatCard label="Cancelled" value={String(counts.cancelled ?? 0)} hint="Released seats" onClick={() => setStatusFilter("cancelled")} active={statusFilter === "cancelled"} />
      </div>

      <div className="mt-4">
          {list.isPending ? (
            <p role="status" className="py-10 text-center text-sm text-slate-500">Loading bookings…</p>
          ) : list.isError ? (
            <p role="alert" className="text-sm text-red-600">Could not load bookings. <button className="underline" onClick={() => void list.refetch()}>Try again</button></p>
          ) : (
            <ManagedTable<Booking>
              rows={rows}
              initialFilter={statusFilter === "all" ? undefined : (r) => r.status === statusFilter}
              searchKeys={["id", "status"]}
              searchPlaceholder="Search bookings…"
              columns={[
                { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
                { key: "status", header: "Status", render: (r) => <Badge>{r.status}</Badge> },
                { key: "frozenPrice", header: "Price", render: (r) => <span className="tabular-nums">{r.frozenPrice}</span> },
                { key: "pilgrimCount", header: "Pilgrims", render: (r) => <span className="tabular-nums">{r.pilgrimCount}</span> },
                {
                  key: "actions",
                  header: "",
                  render: (row) => (
                    <RowActions
                      actions={[
                        { label: "View details", onSelect: () => void open(row.id) },
                        ...(canRefundEdit ? [{ label: "Request refund", onSelect: () => { setRefundFor(row); setRefundAmount(""); } }] : []),
                        ...(canEdit ? [{ label: "Cancel booking", onSelect: () => mutate.mutate({ path: `/api/bookings/${row.id}/cancel`, method: "POST", body: {} }), danger: true as const, disabled: row.status === "cancelled" }] : []),
                        ...(canFull ? [{ label: "Archive", onSelect: () => mutate.mutate({ path: `/api/bookings/${row.id}`, method: "DELETE" }), danger: true as const }] : []),
                      ]}
                    />
                  ),
                },
              ]}
            />
          )}
      </div>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} title={`Booking ${detail?.id.slice(0, 8) ?? ""}`} description={detail ? `Status ${detail.status} · Price ${detail.frozenPrice} · Received ${detail.amountReceived ?? "0"}` : undefined} wide>
        {detail ? (
          <div className="space-y-5">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Pilgrims</h3>
              <DataTable
                rows={detail.pilgrims ?? []}
                columns={[
                  { key: "fullName", header: "Name" },
                  { key: "passportNumber", header: "Passport" },
                  { key: "cancelled", header: "Cancelled", render: (r) => (r.cancelled ? "Yes" : "No") },
                ]}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Installments</h3>
              <DataTable
                rows={detail.installments ?? []}
                columns={[
                  { key: "sequence", header: "#" },
                  { key: "amountDue", header: "Due" },
                  { key: "amountPaid", header: "Paid" },
                  { key: "status", header: "Status" },
                ]}
                empty="No installment plan — full payment."
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Payments</h3>
              <DataTable
                rows={detail.payments ?? []}
                columns={[{ key: "amount", header: "Amount" }, { key: "source", header: "Source" }]}
                empty="No payments yet."
              />
            </div>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const ids = partialIds.split(",").map((s) => s.trim()).filter(Boolean);
                mutate.mutate({ path: `/api/bookings/${detail.id}/cancel`, method: "POST", body: { pilgrimIds: ids } });
              }}
            >
              <div className="min-w-52 flex-1">
                <Label>Pilgrim IDs for partial cancel (comma separated)</Label>
                <Input placeholder="uuid-1, uuid-2" value={partialIds} onChange={(e) => setPartialIds(e.target.value)} />
              </div>
              <Button size="sm" type="submit">Partial cancel</Button>
            </form>
          </div>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(refundFor)} onClose={() => setRefundFor(null)} title="Request refund" description={refundFor ? `Booking ${refundFor.id.slice(0, 8)} · received ${refundFor.amountReceived ?? "0"}` : undefined}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!refundFor) return;
            void api(`/api/bookings/${refundFor.id}/refunds`, { method: "POST", body: JSON.stringify({ amount: refundAmount }) });
            setRefundAmount("");
            setRefundFor(null);
          }}
        >
          <div><Label>Refund amount</Label><Input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0.00" required /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRefundFor(null)}>Cancel</Button>
            <Button size="sm" type="submit">Request refund</Button>
          </div>
        </form>
      </Dialog>

      <CancellationRules />
    </GuardedShell>
  );
}

function CancellationRules() {
  const list = useCrudList<{ id: string; daysBeforeDeparture: number; chargePercent: string }>("crules", "/api/cancellation-rules");
  const mutate = useApiMutation<Record<string, unknown>>(["crules"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("bookings", "edit");
  const canFull = can("bookings", "full");
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("");
  const [pct, setPct] = useState("");
  return (
    <div className="mt-8">
      <h2 className="mb-1 text-lg font-semibold">Cancellation charge rules</h2>
      <p className="mb-3 text-sm text-slate-500">Charge percent applied by days remaining before departure, plus disbursed vendor costs.</p>
      <ManagedTable<{ id: string; daysBeforeDeparture: number; chargePercent: string }>
        rows={list.data?.items ?? []}
        searchKeys={["daysBeforeDeparture", "chargePercent"]}
        searchPlaceholder="Search rules…"
        onAdd={canEdit ? () => setOpen(true) : undefined}
        addLabel="Add rule"
        columns={[
          { key: "daysBeforeDeparture", header: "Days before" },
          { key: "chargePercent", header: "Charge %" },
          {
            key: "actions",
            header: "",
            render: (row) => (
              canFull ? <RowActions actions={[{ label: "Archive rule", danger: true, onSelect: () => mutate.mutate({ path: `/api/cancellation-rules/${row.id}`, method: "DELETE" }) }]} /> : <span className="text-xs text-slate-400">No access</span>
            ),
          },
        ]}
        empty="No rules configured."
      />
      <Dialog open={open} onClose={() => setOpen(false)} title="Add cancellation rule">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({ path: "/api/cancellation-rules", method: "POST", body: { daysBeforeDeparture: Number(days), chargePercent: pct } });
            setDays(""); setPct(""); setOpen(false);
          }}
        >
          <div><Label>Days before</Label><Input value={days} onChange={(e) => setDays(e.target.value)} required /></div>
          <div><Label>Charge %</Label><Input value={pct} onChange={(e) => setPct(e.target.value)} required /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit">Add rule</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
