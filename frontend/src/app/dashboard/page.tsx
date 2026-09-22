"use client";
import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Compass, Wallet } from "lucide-react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { StatCard, BarChart, DonutChart, Sparkline } from "@/components/data/stat-card";
import { ChartCard } from "@/components/data/chart-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/empty-state";
import { useHostContext } from "@/components/host-provider";
import { useQuery } from "@tanstack/react-query";
import { canAccessFeature } from "@wufud/contracts";
import { getAccess } from "@/lib/auth";
import { api } from "@/lib/api";
import type { JourneyPackage } from "@/components/marketing/tenant-packages";
const money = (value?: string) => value === undefined ? "—" : new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(Number(value));
export default function TenantHome() { return <GuardedShell plane="tenant"><AgencyOverview /></GuardedShell>; }
function AgencyOverview() {
  const context = useHostContext();
  const access = useQuery({ queryKey: ["workspace-guide-access"], queryFn: getAccess });
  const can = (key: string) => !!access.data && canAccessFeature(key,"view",access.data);
  const report = useQuery({ queryKey: ["report"], queryFn: () => api<{ bookings: number; collected: string; outstanding: string; refunds: string; quota?: { id: string; name: string; remaining: number; confirmed: number; held: number; total: number }[] }>("/api/reports/summary"), enabled: can("reports") });
  const packages = useQuery({ queryKey: ["agency-departures"], queryFn: () => api<{items: JourneyPackage[]}>("/api/admin/packages"), enabled: can("packages") });
  const bookings = useQuery({ queryKey: ["dashboard-bookings"], queryFn: () => api<{items: { id: string; status: string }[]}>("/api/bookings"), enabled: can("bookings") });
  const departures = (packages.data?.items ?? []).filter(p=>p.departureDate && new Date(p.departureDate).getTime()>=Date.now()).sort((a,b)=>a.departureDate.localeCompare(b.departureDate)).slice(0,3);
  const statusMix = (() => {
    const by: Record<string, number> = {};
    for (const b of bookings.data?.items ?? []) by[b.status] = (by[b.status] ?? 0) + 1;
    return Object.entries(by).map(([label, value], i) => ({ label, value, color: ["#0e8f86", "#e8a13d", "#506fc6", "#c65d6e", "#7a9e7e"][i % 5] }));
  })();
  const quotaBars = useMemo(() => {
    const map = new Map<string, { label: string; value: number; total: number }>();
    for (const q of report.data?.quota ?? []) {
      const existing = map.get(q.name) ?? { label: q.name, value: 0, total: 0 };
      existing.value += (q.confirmed + q.held);
      existing.total += q.total;
      map.set(q.name, existing);
    }
    const colors = ["#0e8f86", "#506fc6", "#e8a13d", "#8b5cf6", "#c65d6e"];
    return Array.from(map.values()).map((t, idx) => ({
      ...t,
      color: colors[idx % colors.length],
    }));
  }, [report.data?.quota]);
  const total = Number(report.data?.collected ?? 0) + Number(report.data?.outstanding ?? 0);
  const ratio = total ? Math.round(Number(report.data?.collected ?? 0)/total*100) : 0;
  return <>
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 text-xs uppercase tracking-[.18em] text-amber-700 dark:text-amber-300">{context?.branding?.display_name ?? "Your agency"} · Daily operations</p><h1 className="font-serif text-4xl">Agency dashboard</h1><p className="mt-2 text-sm text-slate-500">A little clarity for every journey you’re preparing.</p></div>{can("bookings") && <Button asChild><Link href="/dashboard/bookings">Manage bookings <ArrowRight size={16} /></Link></Button>}</div>
    {report.isError && <p role="alert" className="mt-4 text-sm text-red-600">Could not load your summary. <button className="underline" onClick={()=>void report.refetch()}>Try again</button></p>}
    {can("reports") && <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Bookings" value={String(report.data?.bookings ?? "—")} hint="Across your agency" /><StatCard label="Collected · BDT" value={money(report.data?.collected)} hint="Payments received" /><StatCard label="Outstanding · BDT" value={money(report.data?.outstanding)} hint="Remaining to collect" /><StatCard label="Refunded · BDT" value={money(report.data?.refunds)} hint="Paid refunds" /></div>}
    {!can("reports") && can("packages") && packages.data && <div className="mt-8 grid gap-4 sm:grid-cols-3"><StatCard label="Packages loaded" value={String(packages.data.items.length)} hint="In the current package page" /><StatCard label="Journey types" value={String(new Set(packages.data.items.map(p=>p.kind)).size)} hint="Across loaded packages" /><StatCard label="Next departure" value={departures[0]?.departureDate.slice(0,10) ?? "—"} hint={departures[0]?.name ?? "No upcoming departures"} /></div>}
    {can("reports") && report.data ? (
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard title="Collection split" subtitle="Collected vs outstanding" action={<Sparkline points={[Number(report.data.collected ?? 0), Number(report.data.outstanding ?? 0)]} />}>
          <DonutChart segments={[{ label: "Collected", value: Number(report.data.collected ?? 0), color: "#0e8f86" }, { label: "Outstanding", value: Number(report.data.outstanding ?? 0), color: "#e8a13d" }]} centerLabel={`${ratio}%`} />
        </ChartCard>
        <ChartCard title="Booking mix" subtitle={bookings.data ? "By status — see all in Bookings" : "Open the bookings workspace to load the mix"} action={can("bookings") ? <Button size="sm" variant="ghost" asChild><Link href="/dashboard/bookings">Open</Link></Button> : undefined}>
          {statusMix.length ? <DonutChart segments={statusMix} centerLabel={String(bookings.data?.items.length ?? "")} /> : <p className="py-6 text-center text-xs text-slate-500">No booking data yet.</p>}
        </ChartCard>
        <ChartCard title="Seats filling" subtitle="Confirmed + held per tier">
          {quotaBars.length ? <BarChart data={quotaBars} ariaLabel="Seats filling chart" /> : <p className="py-6 text-center text-xs text-slate-500">No quota data yet.</p>}
        </ChartCard>
      </div>
    ) : null}
    <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1fr_320px]"><section className="min-w-0"><div className="mb-5 flex items-center gap-3"><CalendarDays size={19} className="text-amber-700 dark:text-amber-300" /><h2 className="font-serif text-2xl">Upcoming departures</h2></div>{!can("packages") ? <EmptyState title="Your next step" body="Use the workspace navigation to open the tools available to your role." /> : packages.isPending ? <p role="status" className="py-10 text-slate-500">Loading departures…</p> : packages.isError ? <p role="alert" className="text-sm text-red-600">Could not load departures. <button className="underline" onClick={()=>void packages.refetch()}>Try again</button></p> : departures.length ? <div className="space-y-4">{departures.map(pkg=><Card key={pkg.id} className="flex flex-wrap items-center gap-4 shadow-none"><span className="rounded-xl bg-[#f0e7d4] p-4 text-amber-800"><Compass size={24} strokeWidth={1.4} /></span><div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-[.13em] text-slate-500">{pkg.kind.replaceAll("_"," ")}</p><h3 className="mt-1 text-lg font-semibold">{pkg.name}</h3><p className="mt-2 text-xs text-slate-500">Departure · {pkg.departureDate.slice(0,10)}</p></div><Link href="/dashboard/packages" aria-label={`Manage ${pkg.name}`} className="rounded-full border border-slate-200 p-3 dark:border-navy-700"><ArrowRight size={16} /></Link></Card>)}</div> : <EmptyState title="No upcoming departures" body="Create or update your packages to prepare for the next journey." />}</section><div className="rounded-2xl bg-[#eae1cf] p-7 text-[#153e35]"><Wallet size={25} strokeWidth={1.4} /><h2 className="mt-5 font-serif text-2xl">Keep the journey moving.</h2>{can("reports") && report.data ? <><p className="mt-4 text-sm">{ratio}% of booking value collected</p><div role="progressbar" aria-label="Booking value collected" aria-valuenow={ratio} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2 overflow-hidden rounded-full bg-white/50"><div style={{width:`${ratio}%`}} className="h-full rounded-full bg-[#315b47]" /></div></> : null}<p className="mt-5 text-sm leading-7">Review payments and follow up on outstanding balances before departure.</p>{can("payments") && <Link href="/dashboard/payments" className="mt-6 flex items-center justify-between rounded-lg bg-[#153e35] px-4 py-3 text-sm text-white">Review payments <ArrowRight size={15} /></Link>}<Link href="/" className="mt-6 block text-xs underline underline-offset-4">Visit your agency storefront</Link></div></div>
  </>;
}
