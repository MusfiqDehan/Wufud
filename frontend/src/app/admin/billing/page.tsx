"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useCrudList } from "@/features/crud";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { useFeatureAccess } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function BillingPage() {
  const tenants = useCrudList<{ id: string; name: string; slug: string; plan?: string }>("tenants", "/api/platform/tenants");
  const plans = useCrudList<{ id: string; name: string; slug: string; priceMonthly: string }>("plans", "/api/platform/plans");
  const overview = useQuery({ queryKey: ["billing-overview"], queryFn: () => api<{ tenants: number; on_plan: number; unassigned: number; plans: number }>("/api/platform/billing/overview") });
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("platform.billing", "edit");
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [planId, setPlanId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const trows = useMemo(() => tenants.data?.items ?? [], [tenants.data]);
  const assigned = trows.filter((t) => t.plan).length;
  const planNames = useMemo(() => Object.fromEntries((plans.data?.items ?? []).map((p) => [p.slug, p.name])), [plans.data]);

  return (
    <GuardedShell plane="platform" feature="platform.billing" level="view">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">Assign a subscription plan to a tenant. This copies plan features and limits onto the agency.</p>
      </div>
      {message ? <p role="status" className="mt-3 text-sm text-teal-700">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tenants" value={overview.data ? String(overview.data.tenants) : tenants.data ? String(trows.length) : "—"} hint="In the network" />
        <StatCard label="On a plan" value={overview.data ? String(overview.data.on_plan) : String(assigned)} hint="With subscription" />
        <StatCard label="Unassigned" value={overview.data ? String(overview.data.unassigned) : String(trows.length - assigned)} hint="Needs a plan" />
        <StatCard label="Plans" value={overview.data ? String(overview.data.plans) : plans.data ? String(plans.data.items.length) : "—"} hint="Billing tiers" />
      </div>
      {tenants.isError ? <p role="alert" className="mt-3 text-sm text-red-600">Tenant list needs <span className="font-mono">platform.tenants:view</span>. Stats above use <span className="font-mono">platform.billing:view</span>.</p> : null}

      <div className="mt-4">
          <ManagedTable<{ id: string; name: string; slug: string; plan?: string }>
            rows={trows}
            searchKeys={["name", "slug", "plan"]}
            searchPlaceholder="Search tenants…"
            onAdd={canEdit ? () => setDialogOpen(true) : undefined}
            addLabel="Assign plan"
            columns={[
              {
                key: "name",
                header: "Tenant",
                render: (r) => (
                  <div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.slug}</p></div>
                ),
              },
              { key: "plan", header: "Plan", render: (r) => (r.plan ? <Badge>{planNames[r.plan] ?? r.plan}</Badge> : <span className="text-xs text-slate-400">Unassigned</span>) },
              {
                key: "actions",
                header: "",
                render: (row) => (
                  <RowActions
                    actions={[
                      ...(canEdit ? [{ label: "Change plan", onSelect: () => { setTenantId(row.id); setDialogOpen(true); } }] : []),
                      { label: "Open tenants", onSelect: () => { window.location.href = "/admin/tenants"; } },
                    ]}
                  />
                ),
              },
            ]}
            empty="No tenants yet."
          />
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Assign subscription plan" description="Creates an active period and copies plan features and limits onto the tenant.">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setMessage("");
            setError("");
            try {
              await api(`/api/platform/tenants/${tenantId}/subscribe`, { method: "POST", body: JSON.stringify({ planId }) });
              setMessage("Subscription updated.");
              void qc.invalidateQueries({ queryKey: ["tenants"] });
              setDialogOpen(false);
            } catch (err) {
              setError(formatApiError(err));
            }
          }}
        >
          <div>
            <Label>Tenant</Label>
            <select className="h-11 w-full rounded-xl border px-3 dark:bg-navy-800" value={tenantId} onChange={(e) => setTenantId(e.target.value)} required>
              <option value="">Select tenant…</option>
              {trows.map((t) => (<option key={t.id} value={t.id}>{t.name} ({t.plan ?? "no plan"})</option>))}
            </select>
          </div>
          <div>
            <Label>Plan</Label>
            <select className="h-11 w-full rounded-xl border px-3 dark:bg-navy-800" value={planId} onChange={(e) => setPlanId(e.target.value)} required>
              <option value="">Select plan…</option>
              {(plans.data?.items ?? []).map((p) => (<option key={p.id} value={p.id}>{p.name} — BDT {p.priceMonthly}/mo</option>))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit">Assign plan</Button>
          </div>
        </form>
      </Dialog>
    </GuardedShell>
  );
}
