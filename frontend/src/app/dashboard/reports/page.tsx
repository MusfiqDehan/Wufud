"use client";

import { useQuery } from "@tanstack/react-query";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard, BarChart, DonutChart, Sparkline } from "@/components/data/stat-card";
import { ChartCard } from "@/components/data/chart-card";
import { api } from "@/lib/api";

type Summary = {
  vendor_costs_bdt?: string; vendor_costs_sar?: string; expenses_bdt?: string; stock_issued_cost_bdt?: string; pos_collected?: string; pos_refunded?: string;
  bookings: number;
  collected: string;
  outstanding: string;
  refunds: string;
  installments_due?: string;
  installments_open?: number;
  quota?: { id: string; name: string; remaining: number; confirmed: number; held: number; total: number }[];
};

const money = (v?: string | number) => v === undefined || v === null ? "—" : new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(Number(v));

export default function ReportsPage() {
  const report = useQuery({ queryKey: ["report"], queryFn: () => api<Summary>("/api/reports/summary") });
  const d = report.data;
  const collected = Number(d?.collected ?? 0);
  const outstanding = Number(d?.outstanding ?? 0);
  const whole = collected + outstanding;
  const ratio = whole ? Math.round((collected / whole) * 100) : 0;
  const quota = d?.quota ?? [];
  const quotaTaken = quota.map((q) => ({ label: q.name.slice(0, 10), value: q.confirmed + q.held }));

  return (
    <GuardedShell plane="tenant" feature="reports" level="view">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Collections, dues, refunds and seat quota at a glance.</p>
        </div>
        {report.data ? <Sparkline points={[collected, outstanding, Number(d?.refunds ?? 0)]} /> : null}
      </div>

      {report.isPending ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">Loading report…</p>
      ) : report.isError ? (
        <p role="alert" className="mt-6 text-sm text-red-600">Could not load report. <button className="underline" onClick={() => void report.refetch()}>Try again</button></p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Bookings" value={String(d?.bookings ?? "—")} hint="In scope" />
            <StatCard label="Collected · BDT" value={money(d?.collected)} hint={`${ratio}% of booking value`} />
            <StatCard label="Outstanding · BDT" value={money(d?.outstanding)} hint="Still to collect" />
            <StatCard label="Refunded · BDT" value={money(d?.refunds)} hint="Paid out" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Vendor costs · BDT" value={money(d?.vendor_costs_bdt)} hint={`${money(d?.vendor_costs_sar)} SAR at recorded rates`} />
            <StatCard label="Expenses · BDT" value={money(d?.expenses_bdt)} hint="Operating expenses" />
            <StatCard label="Supplies issued · BDT" value={money(d?.stock_issued_cost_bdt)} hint="Cost recorded when issued" />
            <StatCard label="POS collections · BDT" value={money(d?.pos_collected)} hint={`${money(d?.pos_refunded)} BDT refunded`} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <ChartCard title="Collection progress" subtitle="Collected vs outstanding value">
              <DonutChart
                segments={[
                  { label: "Collected", value: collected, color: "#0e8f86" },
                  { label: "Outstanding", value: outstanding, color: "#e8a13d" },
                ]}
                centerLabel={`${ratio}%`}
              />
            </ChartCard>
            <ChartCard title="Seats taken by tier" subtitle="Confirmed + held seats">
              <BarChart data={quotaTaken.length ? quotaTaken : [{ label: "—", value: 0 }]} ariaLabel="Seats taken by tier" />
            </ChartCard>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <StatCard label="Installments due · BDT" value={money(d?.installments_due)} hint="Open + overdue" />
              <StatCard label="Open installments" value={String(d?.installments_open ?? "—")} hint="Schedules in flight" />
            </div>
          </div>
          <h2 className="mt-8 text-lg font-semibold">Remaining seat quota</h2>
          <div className="mt-4">
            <ManagedTable<{ id: string; name: string; remaining: number; confirmed: number; held: number; total: number }>
              rows={quota}
              searchKeys={["name"]}
              searchPlaceholder="Search tiers…"
              columns={[
                { key: "name", header: "Tier", render: (r) => <span className="font-medium">{r.name}</span> },
                { key: "remaining", header: "Remaining", render: (r) => <strong className="tabular-nums">{r.remaining}</strong> },
                { key: "confirmed", header: "Confirmed", render: (r) => <span className="tabular-nums">{r.confirmed}</span> },
                { key: "held", header: "Held", render: (r) => <span className="tabular-nums">{r.held}</span> },
                { key: "total", header: "Total", render: (r) => <span className="tabular-nums">{r.total}</span> },
              ]}
              empty="No tiers yet."
            />
          </div>
        </>
      )}
    </GuardedShell>
  );
}
