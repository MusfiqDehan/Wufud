"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { FeatureChecklist } from "@/components/platform/feature-checklist";
import { useCrudList } from "@/features/crud";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { PACKAGE_GATED_KEYS } from "@wufud/contracts";

type Plan = {
  id: string;
  name: string;
  slug: string;
  priceMonthly: string;
  currency?: string;
  maxUsers?: number;
  maxBranches?: number;
  features?: string[];
  description?: string;
  sortOrder?: number;
  trialDays?: number;
  invitationExpiresHours?: number;
};

function emptyFeatures() {
  return Object.fromEntries([...PACKAGE_GATED_KEYS].map((k) => [k, false]));
}

export default function PlansPage() {
  const list = useCrudList<Plan>("plans", "/api/platform/plans");
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("");
  const [maxUsers, setMaxUsers] = useState("10");
  const [maxBranches, setMaxBranches] = useState("1");
  const [description, setDescription] = useState("");
  const [trialDays, setTrialDays] = useState("14");
  const [invitationExpiresHours, setInvitationExpiresHours] = useState("168");
  const [features, setFeatures] = useState<Record<string, boolean>>(emptyFeatures);
  const [error, setError] = useState("");

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const avgPrice = rows.length ? Math.round(rows.reduce((s, p) => s + Number(p.priceMonthly ?? 0), 0) / rows.length) : 0;

  function loadPlan(plan: Plan | null) {
    setEditing(plan);
    setName(plan?.name ?? "");
    setSlug(plan?.slug ?? "");
    setPriceMonthly(plan?.priceMonthly ?? "");
    setMaxUsers(String(plan?.maxUsers ?? 10));
    setMaxBranches(String(plan?.maxBranches ?? 1));
    setDescription(plan?.description ?? "");
    setTrialDays(String(plan?.trialDays ?? 14));
    setInvitationExpiresHours(String(plan?.invitationExpiresHours ?? 168));
    const map = emptyFeatures();
    for (const k of plan?.features ?? []) map[k] = true;
    setFeatures(map);
    setError("");
    setDialogOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const selected = Object.entries(features).filter(([, on]) => on).map(([k]) => k);
    try {
      await api("/api/platform/plans", {
        method: "POST",
        body: JSON.stringify({
          id: editing?.id, name, slug, description: description || undefined, priceMonthly,
          currency: "BDT", features: selected, maxUsers: Number(maxUsers), maxBranches: Number(maxBranches),
          trialDays: Number(trialDays), invitationExpiresHours: Number(invitationExpiresHours),
        }),
      });
      void qc.invalidateQueries({ queryKey: ["plans"] });
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <GuardedShell plane="platform" feature="platform.plans" level="view">
      <div>
        <h1 className="text-2xl font-semibold">Plans</h1>
        <p className="mt-1 text-sm text-slate-500">Define billing tiers and which tenant modules each plan unlocks.</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Plans" value={list.data ? String(rows.length) : "—"} hint="Billing tiers" />
        <StatCard label="Avg price · BDT" value={rows.length ? String(avgPrice) : "—"} hint="Per month" />
        <StatCard label="Gated modules" value={String(PACKAGE_GATED_KEYS.size)} hint="Assignable keys" />
      </div>

      <div className="mt-4">
          <ManagedTable<Plan>
            rows={rows}
            searchKeys={["name", "slug"]}
            searchPlaceholder="Search plans…"
            onAdd={() => loadPlan(null)}
            addLabel="New plan"
            columns={[
              {
                key: "name",
                header: "Plan",
                render: (row) => (
                  <div><p className="font-medium">{row.name}</p><p className="font-mono text-xs text-slate-500">{row.slug}</p></div>
                ),
              },
              { key: "priceMonthly", header: "Monthly (BDT)", render: (r) => <span className="tabular-nums">{r.priceMonthly}</span> },
              { key: "features", header: "Modules", render: (row) => <span className="tabular-nums">{row.features?.length ?? 0}</span> },
              { key: "maxUsers", header: "Users", render: (r) => <span className="tabular-nums">{r.maxUsers ?? "—"}</span> },
              { key: "trialDays", header: "Trial", render: (r) => <span className="tabular-nums">{r.trialDays ?? 0}d</span> },
              { key: "invitationExpiresHours", header: "Invite", render: (r) => <span className="tabular-nums">{r.invitationExpiresHours ?? 168}h</span> },
              {
                key: "actions",
                header: "",
                render: (row) => (
                  <RowActions
                    actions={[
                      { label: "Edit plan", onSelect: () => loadPlan(row) },
                      { label: "Duplicate as new", onSelect: () => loadPlan({ ...row, id: undefined as unknown as string, name: `${row.name} (copy)`, slug: `${row.slug}-copy` }) },
                    ]}
                  />
                ),
              },
            ]}
            empty="No plans yet."
          />
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing?.id ? "Edit plan" : "New plan"} wide>
        <form className="space-y-4" onSubmit={save}>
          <div className="grid gap-3 md:grid-cols-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} required /></div>
            <div><Label>Monthly price (BDT)</Label><Input value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} required /></div>
            <div><Label>Max users</Label><Input type="number" min={0} value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} /></div>
            <div><Label>Max branches</Label><Input type="number" min={0} value={maxBranches} onChange={(e) => setMaxBranches(e.target.value)} /></div>
            <div><Label>Trial days</Label><Input type="number" min={0} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} /></div>
            <div><Label>Invitation expires (hours)</Label><Input type="number" min={1} value={invitationExpiresHours} onChange={(e) => setInvitationExpiresHours(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          </div>
          <FeatureChecklist value={features} onChange={setFeatures} />
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit">{editing?.id ? "Update plan" : "Create plan"}</Button>
          </div>
        </form>
      </Dialog>
    </GuardedShell>
  );
}
