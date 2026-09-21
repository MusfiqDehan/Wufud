"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CreditCard, FileCheck2, Plane, Ticket, Wallet } from "lucide-react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard, Sparkline } from "@/components/data/stat-card";
import { ChartCard } from "@/components/data/chart-card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { EmptyState } from "@/components/data/empty-state";
import { useCrudList } from "@/features/crud";
import {
  BookingDetailView,
  bookingTotals,
  fmtDate,
  money,
  type BookingDetail,
  type PortalBooking,
} from "@/features/portal";
import { api } from "@/lib/api";

export default function PortalBookingsPage() {
  return (
    <GuardedShell plane="pilgrim">
      <PortalBookings />
    </GuardedShell>
  );
}

function PortalBookings() {
  const list = useCrudList<PortalBooking>("mine", "/api/me/bookings");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const { paid, total, progress, counts } = useMemo(() => bookingTotals(rows), [rows]);

  const detail = useQuery({
    queryKey: ["portal-booking", selectedId],
    queryFn: () => api<BookingDetail>(`/api/me/bookings/${selectedId}`),
    enabled: Boolean(selectedId),
  });

  const openDetail = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const filtered = statusFilter === "all" ? undefined : (r: PortalBooking) => r.status === statusFilter;

  if (list.isError)
    return (
      <div>
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <p role="alert" className="mt-4 text-sm text-red-600">
          Could not load your bookings.{" "}
          <button className="underline" onClick={() => void list.refetch()}>
            Try again
          </button>
        </p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs uppercase tracking-[.18em] text-teal-600">Pilgrim portal · Bookings</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Flight schedule & payments</h1>
        <p className="mt-1 text-sm text-slate-500">Filter by status, track what you have paid, and open a booking for package details.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My bookings"
          value={list.data ? String(rows.length) : "—"}
          hint="Across all packages"
          icon={<Ticket size={16} className="text-teal-500" />}
          onClick={() => setStatusFilter("all")}
          active={statusFilter === "all"}
        />
        <StatCard
          label="Confirmed"
          value={String(counts.confirmed ?? 0)}
          hint="Ready to travel"
          icon={<FileCheck2 size={16} className="text-teal-500" />}
          onClick={() => setStatusFilter("confirmed")}
          active={statusFilter === "confirmed"}
        />
        <StatCard
          label="Paid · BDT"
          value={money(paid)}
          hint={total ? `${progress}% of ${money(total)}` : "No dues yet"}
          icon={<Wallet size={16} className="text-teal-500" />}
        />
        <StatCard
          label="Outstanding · BDT"
          value={money(Math.max(0, total - paid))}
          hint="Remaining to pay"
          icon={<CreditCard size={16} className="text-teal-500" />}
        />
      </div>

      <ChartCard
        title="Payment journey"
        subtitle="How much of your total booking value is settled"
        action={<Sparkline points={rows.map((r) => Number(r.amountReceived ?? 0))} />}
      >
        <p className="text-sm text-slate-500">{progress}% collected</p>
        <div
          role="progressbar"
          aria-label="Booking value paid"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-700"
        >
          <div style={{ width: `${progress}%` }} className="h-full rounded-full bg-teal-500 transition-all" />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>
            Total <strong className="text-slate-800 dark:text-white">{money(total)}</strong>
          </span>
          <span>
            Paid <strong className="text-teal-600">{money(paid)}</strong>
          </span>
          <span>
            Due <strong className="text-slate-800 dark:text-white">{money(Math.max(0, total - paid))}</strong>
          </span>
        </div>
      </ChartCard>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <CalendarDays size={18} className="text-teal-600" /> Flight schedule & bookings
        </h2>
        {list.isPending ? (
          <p role="status" className="py-10 text-center text-sm text-slate-500">
            Loading your bookings…
          </p>
        ) : rows.length ? (
          <ManagedTable<PortalBooking>
            rows={rows}
            initialFilter={filtered}
            searchKeys={["id", "status"]}
            searchPlaceholder="Search by booking or status…"
            columns={[
              {
                key: "package",
                header: "Package · Flight",
                render: (r) => (
                  <div className="min-w-44">
                    <p className="font-medium">{r.tier?.package?.name ?? "Package"}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Plane size={12} /> Departs {fmtDate(r.tier?.package?.departureDate)} · {r.tier?.name ?? ""}
                    </p>
                  </div>
                ),
              },
              { key: "status", header: "Status", render: (r) => <Badge>{r.status}</Badge> },
              {
                key: "payment",
                header: "Paid / Total",
                render: (r) => (
                  <span className="tabular-nums">
                    {money(r.amountReceived)} <span className="text-slate-400">/ {money(r.frozenPrice)}</span>
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (r) => (
                  <RowActions
                    actions={[
                      { label: "View flight & package", onSelect: () => openDetail(r.id) },
                      { label: "Payment schedule", onSelect: () => openDetail(r.id) },
                      { label: "Travel checklist", onSelect: () => openDetail(r.id) },
                    ]}
                  />
                ),
              },
            ]}
            empty="No bookings match this filter."
          />
        ) : (
          <EmptyState
            title="No bookings yet"
            body="Once your agency adds you to a Hajj or Umrah package, your flight schedule and details will appear here."
          />
        )}
      </div>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Journey details"
        description={detail.data?.tier?.package?.name ?? "Booking"}
        wide
      >
        {detail.isPending ? (
          <p role="status" className="py-6 text-center text-sm text-slate-500">
            Loading details…
          </p>
        ) : detail.isError ? (
          <p role="alert" className="text-sm text-red-600">
            Could not load details.{" "}
            <button className="underline" onClick={() => void detail.refetch()}>
              Try again
            </button>
          </p>
        ) : detail.data ? (
          <BookingDetailView booking={detail.data} />
        ) : null}
      </Dialog>
    </div>
  );
}
