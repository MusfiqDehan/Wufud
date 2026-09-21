"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ArrowUpRight, Building2, Layers3, ShieldCheck, Users } from "lucide-react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { StatCard, BarChart, DonutChart } from "@/components/data/stat-card";
import { ChartCard } from "@/components/data/chart-card";
import { ManagedTable } from "@/components/data/managed-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/row-actions";
import { useCrudList, useApiMutation } from "@/features/crud";
import { api } from "@/lib/api";

type Agency = { id: string; name: string; slug: string; status: string; plan?: string; userCount?: number | null; maxUsers?: number };
export default function AdminHome() { return <GuardedShell plane="platform"><PlatformOverview /></GuardedShell>; }
function PlatformOverview() {
  const tenants = useCrudList<Agency>("tenants", "/api/platform/tenants");
  const mutate = useApiMutation<Record<string, unknown>>(["tenants"]);
  const [statusFilter, setStatusFilter] = useState("all");
  const rows = useMemo(() => tenants.data?.items ?? [], [tenants.data]);
  const count = (status?: string) => tenants.data ? String(status ? rows.filter(t => t.status === status).length : rows.length) : "—";

  const stats = useQueries({
    queries: rows.slice(0, 20).map((t) => ({
      queryKey: ["tenant-stats", t.id],
      queryFn: () => api<{ users: number }>(`/api/platform/tenants/${t.id}/stats`),
      enabled: typeof t.userCount !== "number" && rows.length > 0,
      staleTime: 60_000,
      retry: false,
    })),
  });
  const userCountOf = (t: Agency) => {
    if (typeof t.userCount === "number") return t.userCount;
    const idx = rows.indexOf(t);
    return stats[idx]?.data?.users ?? null;
  };
  const totalUsers = rows.reduce((s, t, i) => s + (typeof t.userCount === "number" ? t.userCount : (stats[i]?.data?.users ?? 0)), 0);

  const statusDist = useMemo(() => {
    const palette: Record<string, string> = { active: "#0e8f86", trial: "#e8a13d", suspended: "#c65d6e" };
    const by: Record<string, number> = {};
    for (const t of rows) by[t.status] = (by[t.status] ?? 0) + 1;
    return Object.entries(by).map(([label, value]) => ({ label, value, color: palette[label] ?? "#506fc6" }));
  }, [rows]);

  const topAgencies = useMemo(
    () =>
      rows
        .map((t, i) => ({ label: t.slug.slice(0, 12), value: typeof t.userCount === "number" ? t.userCount : (stats[i]?.data?.users ?? 0) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, stats.map((s) => s.data?.users).join(",")],
  );

  const directory = statusFilter === "all" ? rows : rows.filter((t) => t.status === statusFilter);

  return <>
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 text-xs uppercase tracking-[.18em] text-teal-500">Network administration</p><h1 className="text-3xl font-semibold">Platform overview</h1><p className="mt-2 text-sm text-slate-500">Manage your agency network, subscriptions, and platform controls.</p></div><Button asChild><Link href="/admin/tenants"><Building2 size={16} />Manage agencies</Link></Button></div>
    {tenants.isError && <p role="alert" className="mt-4 text-sm text-red-600">Could not load agencies. <button className="underline" onClick={() => void tenants.refetch()}>Try again</button></p>}
    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Agencies" value={count()} hint="In the network" onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
      <StatCard label="Active agencies" value={count("active")} hint="Signing in normally" onClick={() => setStatusFilter("active")} active={statusFilter === "active"} />
      <StatCard label="Total users" value={tenants.data ? String(totalUsers) : "—"} hint="Across all tenants" icon={<Users size={16} className="text-teal-500" />} />
      <StatCard label="Suspended" value={count("suspended")} hint="Blocked from entry" onClick={() => setStatusFilter("suspended")} active={statusFilter === "suspended"} />
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <ChartCard title="Users by agency" subtitle="Headcount per tenant — biggest first">
        <BarChart data={topAgencies.length ? topAgencies : [{ label: "—", value: 0 }]} ariaLabel="Users by agency chart" />
      </ChartCard>
      <ChartCard title="Agency health" subtitle="Share of active, trial and suspended tenants">
        <DonutChart segments={statusDist.length ? statusDist : [{ label: "None", value: 1, color: "#cbd5e1" }]} centerLabel={count()} />
      </ChartCard>
    </div>
    <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_300px]">
      <section className="min-w-0">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Agency directory</h2><Link href="/admin/tenants" className="flex items-center gap-2 text-xs text-teal-600 dark:text-teal-200">Manage all <ArrowUpRight size={14} /></Link></div>
        {tenants.isPending ? <p role="status" className="p-8 text-sm text-slate-500">Loading your agency network…</p> : !tenants.isError && (
          <ManagedTable<Agency>
            rows={directory}
            searchKeys={["name", "slug", "plan"]}
            searchPlaceholder="Search agencies…"
            columns={[
              { key: "name", header: "Agency", render: r => <div><p className="font-medium">{r.name}</p><p className="mt-1 text-xs text-slate-500">{r.slug}</p></div> },
              { key: "plan", header: "Plan", render: r => <span className="capitalize">{r.plan ?? "Not assigned"}</span> },
              { key: "users", header: "Users", render: (r) => { const c = userCountOf(r); return <span className="inline-flex items-center gap-1.5 tabular-nums"><Users size={13} className="text-slate-400" />{c === null ? <span className="text-slate-400">—</span> : <strong>{c}</strong>}</span>; } },
              { key: "status", header: "Status", render: r => <Badge>{r.status}</Badge> },
              { key: "actions", header: "", render: (row) => <RowActions actions={[{ label: "Open in tenants", onSelect: () => { window.location.href = "/admin/tenants"; } }, { label: "Activate", onSelect: () => mutate.mutate({ path: `/api/platform/tenants/${row.id}/status`, method: "PATCH", body: { status: "active" } }), disabled: row.status === "active" }, { label: "Suspend", onSelect: () => mutate.mutate({ path: `/api/platform/tenants/${row.id}/status`, method: "PATCH", body: { status: "suspended" } }), danger: true, disabled: row.status === "suspended" }]} /> },
            ]}
            empty="No agencies yet."
          />
        )}
      </section>
      <aside className="rounded-2xl bg-navy-900 p-6 text-white"><ShieldCheck size={28} className="mb-6 text-teal-200" /><p className="text-xs uppercase tracking-[.15em] text-teal-200">Platform controls</p><h2 className="mt-3 text-xl font-semibold">Set the foundation.</h2><p className="mt-3 text-sm leading-7 text-slate-300">Keep plan entitlements, billing, and access aligned across every agency.</p><div className="mt-6 space-y-3">{[{href:"plans",name:"Plans & limits",icon:Layers3},{href:"billing",name:"Subscription billing",icon:Building2},{href:"audit",name:"Audit history",icon:ShieldCheck}].map(({href,name,icon:Icon})=><Link key={href} href={`/admin/${href}`} className="flex items-center gap-3 rounded-lg border border-white/15 px-3 py-3 text-sm hover:bg-white/10"><Icon size={16} />{name}<ArrowUpRight size={15} className="ml-auto" /></Link>)}</div></aside>
    </div>
  </>;
}
