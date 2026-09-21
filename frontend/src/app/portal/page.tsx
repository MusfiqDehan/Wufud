"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Luggage, Plane } from "lucide-react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/empty-state";
import { useCrudList } from "@/features/crud";
import { daysUntil, fmtDate, nextDeparture, TravelChecklist, type PortalBooking } from "@/features/portal";
import { getAccess } from "@/lib/auth";

export default function PortalHome() {
  return (
    <GuardedShell plane="pilgrim">
      <PortalOverview />
    </GuardedShell>
  );
}

function PortalOverview() {
  const me = useQuery({ queryKey: ["portal-me"], queryFn: getAccess });
  const list = useCrudList<PortalBooking>("mine", "/api/me/bookings");
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const upcoming = useMemo(() => nextDeparture(rows), [rows]);
  const nextIn = daysUntil(upcoming?.tier?.package?.departureDate);

  if (list.isError)
    return (
      <div>
        <h1 className="text-2xl font-semibold">My journey</h1>
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[.18em] text-teal-600">Pilgrim portal · My journey</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {me.data ? `Assalamu alaikum, ${me.data.full_name.split(" ")[0]}` : "My journey"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Your next departure, travel checklist, and a shortcut to bookings.</p>
        </div>
        <Button asChild>
          <Link href="/portal/bookings">
            View bookings <ArrowRight size={16} />
          </Link>
        </Button>
      </div>

      {list.isPending ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Loading your journey…
        </p>
      ) : upcoming ? (
        <Card className="flex flex-wrap items-center gap-4 border-teal-500/40 p-5 shadow-none">
          <span className="rounded-xl bg-teal-100 p-2.5 text-teal-700">
            <Plane size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-slate-500">Next departure</p>
            <p className="font-semibold">{fmtDate(upcoming.tier?.package?.departureDate)}</p>
            <p className="text-xs text-slate-500">
              {nextIn !== null && nextIn >= 0 ? `in ${nextIn} day${nextIn === 1 ? "" : "s"}` : "departed"} ·{" "}
              {upcoming.tier?.package?.name}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/portal/bookings">Open booking</Link>
          </Button>
        </Card>
      ) : (
        <EmptyState
          title="No upcoming departure"
          body="Once your agency adds you to a Hajj or Umrah package, your flight date will appear here."
        />
      )}

      <Card className="space-y-3 p-5 shadow-none">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Luggage size={16} className="text-teal-600" /> Travel checklist
        </h2>
        <TravelChecklist bookings={rows} />
      </Card>
    </div>
  );
}
