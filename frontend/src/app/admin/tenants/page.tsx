"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users } from "lucide-react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { TenantFeaturesPanel } from "@/components/platform/tenant-features-panel";
import { useCrudList, useCrudMutation, useApiMutation } from "@/features/crud";
import { api } from "@/lib/api";

type Tenant = { id: string; name: string; slug: string; status: string; plan?: string; userCount?: number | null; maxUsers?: number };

export default function TenantsPage() {
  const list = useCrudList<Tenant>("tenants", "/api/platform/tenants");
  const plans = useCrudList<{ id: string; name: string; slug: string; trialDays?: number; invitationExpiresHours?: number }>("plans", "/api/platform/plans");
  const create = useCrudMutation<{ name: string; slug: string; ownerEmail?: string; plan?: string; trialDays?: number; invitationExpiresHours?: number }>("/api/platform/tenants", ["tenants"]);
  const mutate = useApiMutation<Record<string, unknown>>(["tenants"]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [planSlug, setPlanSlug] = useState("");
  const [trialDays, setTrialDays] = useState("14");
  const [invitationExpiresHours, setInvitationExpiresHours] = useState("168");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const selected = rows.find((t) => t.id === selectedId) ?? null;

  const active = rows.filter((t) => t.status === "active").length;
  const suspended = rows.filter((t) => t.status === "suspended").length;
  const trial = rows.filter((t) => t.status === "trial").length;
  const totalUsers = rows.reduce((s, t) => s + (t.userCount ?? 0), 0);
  const knownCounts = rows.filter((t) => typeof t.userCount === "number").length;

  const stats = useQuery({
    queryKey: ["tenant-user-stats", rows.map((t) => t.id).join(",")],
    queryFn: async () => {
      const out: Record<string, number> = {};
      await Promise.all(
        rows.map(async (t) => {
          if (typeof t.userCount === "number") {
            out[t.id] = t.userCount;
            return;
          }
          try {
            const s = await api<{ users: number }>(`/api/platform/tenants/${t.id}/stats`);
            out[t.id] = s.users;
          } catch {
            /* leave unknown */
          }
        }),
      );
      return out;
    },
    enabled: rows.length > 0,
    staleTime: 60_000,
  });
  const userCountOf = (t: Tenant) => t.userCount ?? stats.data?.[t.id] ?? null;

  return (
    <GuardedShell plane="platform" feature="platform.tenants" level="view">
      <div>
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="mt-1 text-sm text-slate-500">Provision agencies and manage plan entitlements per tenant.</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Agencies" value={list.data ? String(rows.length) : "—"} hint="In the network" icon={<Building2 size={16} className="text-teal-500" />} onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
        <StatCard label="Active" value={String(active)} hint="Signing in normally" onClick={() => setStatusFilter("active")} active={statusFilter === "active"} />
        <StatCard label="Suspended" value={String(suspended)} hint="Blocked from entry" onClick={() => setStatusFilter("suspended")} active={statusFilter === "suspended"} />
        <StatCard
          label="Total users"
          value={knownCounts || stats.data ? String(totalUsers + Object.entries(stats.data ?? {}).reduce((s, [id, v]) => (rows.find((t) => t.id === id && typeof t.userCount !== "number") ? s + v : s), 0)) : "—"}
          hint="Across all tenants"
          icon={<Users size={16} className="text-teal-500" />}
        />
      </div>

      <div className="mt-6">
        {list.isPending ? (
          <p role="status" className="py-10 text-center text-sm text-slate-500">Loading agencies…</p>
        ) : list.isError ? (
          <p role="alert" className="text-sm text-red-600">Could not load agencies. <button className="underline" onClick={() => void list.refetch()}>Try again</button></p>
        ) : (
          <ManagedTable<Tenant>
            rows={rows}
            initialFilter={statusFilter === "all" ? undefined : (r) => r.status === statusFilter}
            searchKeys={["name", "slug", "plan"]}
            searchPlaceholder="Search agencies…"
            onAdd={() => setInviteOpen(true)}
            addLabel="Invite tenant"
            columns={[
              {
                key: "name",
                header: "Agency",
                render: (r) => (
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{r.slug}</p>
                  </div>
                ),
              },
              { key: "plan", header: "Plan", render: (r) => <span className="capitalize">{r.plan ?? "Not assigned"}</span> },
              {
                key: "users",
                header: "Users",
                render: (r) => {
                  const c = userCountOf(r);
                  return (
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Users size={13} className="text-slate-400" />
                      {c === null ? <span className="text-slate-400">—</span> : <strong>{c}</strong>}
                      {r.maxUsers ? <span className="text-xs text-slate-400">/ {r.maxUsers}</span> : null}
                    </span>
                  );
                },
              },
              { key: "status", header: "Status", render: (r) => <Badge>{r.status}</Badge> },
              {
                key: "actions",
                header: "",
                render: (row) => (
                  <RowActions
                    actions={[
                      { label: selectedId === row.id ? "Close panel" : "Features & plan", onSelect: () => setSelectedId(row.id === selectedId ? null : row.id) },
                      { label: "Activate", onSelect: () => mutate.mutate({ path: `/api/platform/tenants/${row.id}/status`, method: "PATCH", body: { status: "active" } }), disabled: row.status === "active" },
                      { label: "Suspend", onSelect: () => mutate.mutate({ path: `/api/platform/tenants/${row.id}/status`, method: "PATCH", body: { status: "suspended" } }), danger: true, disabled: row.status === "suspended" },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </div>

      {selected ? <TenantFeaturesPanel tenant={selected} plans={plans.data?.items ?? []} /> : null}

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite tenant" description="Provision a new agency workspace and email the owner using the default platform mailbox.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(
              {
                name,
                slug,
                ownerEmail: ownerEmail || undefined,
                plan: planSlug || undefined,
                trialDays: Number(trialDays),
                invitationExpiresHours: Number(invitationExpiresHours),
              },
              {
                onSuccess: () => {
                  setInviteOpen(false);
                  setName("");
                  setSlug("");
                  setOwnerEmail("");
                  setPlanSlug("");
                },
              },
            );
          }}
        >
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} required /></div>
          <div><Label>Owner email</Label><Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} /></div>
          <div>
            <Label htmlFor="invite-plan">Plan</Label>
            <select
              id="invite-plan"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-800"
              value={planSlug}
              onChange={(e) => {
                const next = e.target.value;
                setPlanSlug(next);
                const plan = plans.data?.items.find((p) => p.slug === next);
                if (plan) {
                  setTrialDays(String(plan.trialDays ?? 14));
                  setInvitationExpiresHours(String(plan.invitationExpiresHours ?? 168));
                }
              }}
            >
              <option value="">No plan</option>
              {(plans.data?.items ?? []).map((p) => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>
          <div><Label>Trial days</Label><Input type="number" min={0} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} /></div>
          <div><Label>Invitation expires (hours)</Label><Input type="number" min={1} value={invitationExpiresHours} onChange={(e) => setInvitationExpiresHours(e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create tenant"}</Button>
          </div>
        </form>
      </Dialog>
    </GuardedShell>
  );
}
