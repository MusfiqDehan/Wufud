import { Compass, Plane, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type PortalPackage = {
  id: string;
  name: string;
  kind: string;
  description?: string;
  departureDate: string;
  bookingClosesAt?: string;
};
export type PortalTier = { id: string; name: string; price: string; currency?: string; package?: PortalPackage };
export type PortalBooking = {
  id: string;
  status: string;
  frozenPrice: string;
  amountReceived: string;
  pilgrimCount: number;
  paymentMode: string;
  tier?: PortalTier;
  pilgrims?: { id: string; fullName: string; passportNumber: string; cancelled: boolean }[];
};
export type BookingDetail = PortalBooking & {
  installments?: { id: string; sequence: number; amountDue: string; amountPaid: string; status: string; dueDate: string }[];
  payments?: { id: string; amount: string; source: string }[];
};

export const money = (v?: string | number) =>
  v === undefined || v === null || v === ""
    ? "—"
    : new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(Number(v));

export const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? String(iso).slice(0, 10)
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export const daysUntil = (iso?: string) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.ceil(ms / 86400000);
};

export function bookingTotals(rows: PortalBooking[]) {
  const paid = rows.reduce((s, r) => s + Number(r.amountReceived ?? 0), 0);
  const total = rows.reduce((s, r) => s + Number(r.frozenPrice ?? 0), 0);
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return { paid, total, progress: total ? Math.round((paid / total) * 100) : 0, counts };
}

export function nextDeparture(rows: PortalBooking[]) {
  return rows
    .filter((r) => r.tier?.package?.departureDate)
    .sort((a, b) => String(a.tier?.package?.departureDate).localeCompare(String(b.tier?.package?.departureDate)))
    .find((r) => new Date(String(r.tier?.package?.departureDate)).getTime() >= Date.now() - 86400000);
}

export function TravelChecklist({ bookings, detail }: { bookings: PortalBooking[]; detail?: BookingDetail }) {
  const pilgrims = detail?.pilgrims ?? bookings.flatMap((b) => b.pilgrims ?? []);
  const hasPassport = pilgrims.length > 0 && pilgrims.every((p) => p.passportNumber);
  const installments = detail?.installments ?? [];
  const allPaid = installments.length > 0 && installments.every((i) => i.status === "paid");
  const items = [
    { label: "Passport details added", done: hasPassport },
    { label: "Booking confirmed", done: bookings.some((b) => b.status === "confirmed") },
    {
      label: "Full payment settled",
      done: bookings.length > 0 && bookings.every((b) => Number(b.amountReceived ?? 0) >= Number(b.frozenPrice ?? 0)),
    },
    { label: "Installments cleared", done: installments.length === 0 || allPaid },
  ];
  return (
    <ul className="space-y-2.5 text-sm">
      {items.map((i) => (
        <li key={i.label} className="flex items-start gap-2.5">
          <span
            aria-hidden
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i.done ? "bg-teal-500 text-white" : "bg-slate-200 text-slate-500 dark:bg-navy-700"}`}
          >
            {i.done ? "✓" : "·"}
          </span>
          <span className={i.done ? "text-slate-700 dark:text-slate-200" : "text-slate-500"}>{i.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function BookingDetailView({ booking }: { booking: BookingDetail }) {
  const pkg = booking.tier?.package;
  const inDays = daysUntil(pkg?.departureDate);
  const pct = Number(booking.frozenPrice)
    ? Math.round((Number(booking.amountReceived ?? 0) / Number(booking.frozenPrice)) * 100)
    : 0;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-navy-900 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Flight schedule</p>
          <p className="mt-1 flex items-center gap-1.5 font-semibold">
            <Plane size={15} className="text-teal-600" /> {fmtDate(pkg?.departureDate)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {inDays !== null && inDays >= 0 ? `Departs in ${inDays} day${inDays === 1 ? "" : "s"}` : "Departed"} · Booking
            closes {fmtDate(pkg?.bookingClosesAt)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Package</p>
          <p className="mt-1 flex items-center gap-1.5 font-semibold">
            <Compass size={15} className="text-teal-600" /> {pkg?.name ?? "—"}
          </p>
          <p className="mt-0.5 text-xs capitalize text-slate-500">
            {pkg?.kind.replaceAll("_", " ") ?? ""} · Tier {booking.tier?.name ?? ""} · {booking.paymentMode}
          </p>
        </div>
      </div>
      {pkg?.description ? <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{pkg.description}</p> : null}

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <h3 className="flex items-center gap-1.5 font-semibold">
            <Wallet size={15} /> Payments
          </h3>
          <span className="text-xs text-slate-500">
            {money(booking.amountReceived)} of {money(booking.frozenPrice)} · {pct}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Amount paid"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-700"
        >
          <div style={{ width: `${Math.min(100, pct)}%` }} className="h-full rounded-full bg-teal-500" />
        </div>
        {(booking.installments ?? []).length ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {booking.installments!.map((ins) => (
              <li
                key={ins.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-navy-700"
              >
                <span>
                  #{ins.sequence} · due {fmtDate(ins.dueDate)}
                </span>
                <span className="tabular-nums">
                  {money(ins.amountPaid)} / {money(ins.amountDue)}
                </span>
                <Badge>{ins.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Full-payment booking — no installment schedule.</p>
        )}
        {(booking.payments ?? []).length ? (
          <p className="mt-2 text-xs text-slate-500">{booking.payments!.length} payment(s) recorded.</p>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Users size={15} /> Pilgrims ({booking.pilgrims?.length ?? booking.pilgrimCount})
        </h3>
        {(booking.pilgrims ?? []).length ? (
          <ul className="space-y-1.5 text-sm">
            {booking.pilgrims!.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-navy-700"
              >
                <span className="font-medium">{p.fullName}</span>
                <span className="text-xs text-slate-500">Passport {p.passportNumber}</span>
                {p.cancelled ? <Badge>cancelled</Badge> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Pilgrim names are added by your agency.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href="/portal/bookings">Back to bookings</a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="/">Agency storefront</a>
        </Button>
      </div>
    </div>
  );
}
