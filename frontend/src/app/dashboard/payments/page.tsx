"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { getAccess, useFeatureAccess } from "@/lib/auth";
import { formatApiError } from "@/lib/api-error";

type ManualRow = { id: string; amount: string; status: string; method: string; recordedById?: string; approvedById?: string };

export default function PaymentsAdmin() {
  const manuals = useCrudList<ManualRow>("mp", "/api/manual-payments");
  const gateway = useCrudList<{ id: string; amount: string; tranId?: string; gatewaySlug?: string }>("gpay", "/api/payments");
  const branches = useCrudList<{ id: string; name: string; code: string }>("br-pay", "/api/branches");
  const me = useQuery({ queryKey: ["me"], queryFn: getAccess });
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("payments", "edit");
  const canFull = can("payments", "full");
  const mutate = useApiMutation<Record<string, unknown>>(["mp", "gpay"]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [branchId, setBranchId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const mrows = useMemo(() => manuals.data?.items ?? [], [manuals.data]);
  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    for (const r of mrows) by[r.status] = (by[r.status] ?? 0) + 1;
    return by;
  }, [mrows]);

  async function runAction(path: string, method: string, body: unknown, okMessage: string) {
    setNotice("");
    setError("");
    try {
      await mutate.mutateAsync({ path, method, body: body as Record<string, unknown> });
      setNotice(okMessage);
    } catch (e) {
      setError(formatApiError(e));
    }
  }

  return (
    <GuardedShell plane="tenant" feature="payments" level="view">
      <div>
        <h1 className="text-2xl font-semibold">Manual payments</h1>
        <p className="mt-1 text-sm text-slate-500">Branch collections need approval by a different user before they settle.</p>
      </div>
      {notice ? <p role="status" className="mt-3 text-sm text-teal-700">{notice}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All manual" value={manuals.data ? String(mrows.length) : "—"} hint="Tap to show all" onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
        <StatCard label="Pending" value={String(counts.pending ?? 0)} hint="Needs a different approver" onClick={() => setStatusFilter("pending")} active={statusFilter === "pending"} />
        <StatCard label="Approved" value={String(counts.approved ?? 0)} hint="Settled into bookings" onClick={() => setStatusFilter("approved")} active={statusFilter === "approved"} />
        <StatCard label="Gateway payments" value={gateway.data ? String(gateway.data.items.length) : "—"} hint="Online ledger" />
      </div>

      <div className="mt-4">
        <ManagedTable<ManualRow>
            rows={mrows}
            initialFilter={statusFilter === "all" ? undefined : (r) => r.status === statusFilter}
            searchKeys={["id", "method", "status"]}
            searchPlaceholder="Search payments…"
            onAdd={canEdit ? () => setRecordOpen(true) : undefined}
            addLabel="Record payment"
            columns={[
              { key: "amount", header: "Amount", render: (r) => <strong className="tabular-nums">{r.amount}</strong> },
              { key: "method", header: "Method", render: (r) => <span className="capitalize">{r.method}</span> },
              { key: "status", header: "Status", render: (r) => <Badge>{r.status}</Badge> },
              {
                key: "actions",
                header: "",
                render: (row) =>
                  row.status === "pending" && canFull ? (
                    <RowActions
                      actions={[
                        {
                          label: "Approve",
                          hint: me.data != null && row.recordedById === me.data.user_id ? "You recorded this payment — ask another staff member to approve it." : "Approve payment",
                          disabled: mutate.isPending || (me.data != null && row.recordedById === me.data.user_id),
                          onSelect: () => void runAction(`/api/manual-payments/${row.id}/approve`, "POST", undefined, "Payment approved."),
                        },
                        { label: "Reject", danger: true, disabled: mutate.isPending, onSelect: () => void runAction(`/api/manual-payments/${row.id}/reject`, "POST", {}, "Payment rejected.") },
                      ]}
                    />
                  ) : (
                    <span className="text-xs text-slate-400">{row.status === "pending" ? "Needs full access" : "Settled"}</span>
                  ),
              },
            ]}
            empty="No manual payments yet."
          />
          <p className="mt-2 text-xs text-slate-500">
            Maker-checker control: the person who recorded a payment cannot approve it — even the agency owner.
            Rejecting is always allowed.
          </p>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Gateway payments</h2>
      <div className="mt-4">
        <ManagedTable<{ id: string; amount: string; tranId?: string; gatewaySlug?: string }>
          rows={gateway.data?.items ?? []}
          searchKeys={["tranId", "gatewaySlug"]}
          searchPlaceholder="Search transactions…"
          columns={[
            { key: "tranId", header: "Transaction", render: (r) => <span className="font-mono text-xs">{r.tranId ?? "—"}</span> },
            { key: "amount", header: "Amount", render: (r) => <span className="tabular-nums">{r.amount}</span> },
            { key: "gatewaySlug", header: "Gateway", render: (r) => r.gatewaySlug ?? "—" },
          ]}
          empty="No gateway payments yet."
        />
      </div>

      <Dialog open={recordOpen} onClose={() => setRecordOpen(false)} title="Record manual payment" description="It needs approval by a different user before it settles.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void runAction("/api/manual-payments", "POST", { bookingId, amount, method, branchId: branchId || undefined }, "Payment recorded. It needs approval by a different user.");
            setBookingId(""); setAmount("");
            setRecordOpen(false);
          }}
        >
          <div><Label>Booking ID</Label><Input value={bookingId} onChange={(e) => setBookingId(e.target.value)} required /></div>
          <div><Label>Amount (BDT)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
          <div>
            <Label>Method</Label>
            <select className="h-11 w-full rounded-xl border px-3 dark:bg-navy-800" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash (branch)</option>
              <option value="card">Card (branch POS)</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
            </select>
          </div>
          <div>
            <Label>Branch (required for branch-scoped staff)</Label>
            <select className="h-11 w-full rounded-xl border px-3 dark:bg-navy-800" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Head office</option>
              {(branches.data?.items ?? []).map((b) => (<option key={b.id} value={b.id}>{b.name} ({b.code})</option>))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRecordOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutate.isPending}>Record payment</Button>
          </div>
        </form>
      </Dialog>
    </GuardedShell>
  );
}
