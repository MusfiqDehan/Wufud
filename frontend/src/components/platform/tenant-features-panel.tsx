"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { FeatureChecklist } from "./feature-checklist";

type TenantRow = { id: string; name: string; slug: string; plan?: string };
type PlanRow = { id: string; name: string; slug: string };
type FeatureState = {
  tenant_id: string;
  plan: string | null;
  effective: Record<string, boolean>;
  overrides: Record<string, boolean>;
  enabled: string[];
};

export function TenantFeaturesPanel({ tenant, plans }: { tenant: TenantRow; plans: PlanRow[] }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [planId, setPlanId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const features = useQuery({
    queryKey: ["tenant-features", tenant.id],
    queryFn: () => api<FeatureState>(`/api/platform/tenants/${tenant.id}/features`),
  });

  useEffect(() => {
    if (features.data?.effective) setDraft(features.data.effective);
  }, [features.data?.effective]);

  return (
    <Card className="mt-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{tenant.name}</h2>
          <p className="text-sm text-slate-500">
            {tenant.slug} · plan: {features.data?.plan ?? tenant.plan ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label>Assign plan</Label>
            <select
              className="h-11 min-w-[12rem] rounded-xl border px-3 dark:bg-navy-800"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="">Select plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!planId}
            onClick={async () => {
              setError("");
              try {
                await api(`/api/platform/tenants/${tenant.id}/subscribe`, {
                  method: "POST",
                  body: JSON.stringify({ planId }),
                });
                setMessage("Plan assigned.");
                void qc.invalidateQueries({ queryKey: ["tenants"] });
                void qc.invalidateQueries({ queryKey: ["tenant-features", tenant.id] });
              } catch (e) {
                setError(formatApiError(e));
              }
            }}
          >
            Apply plan
          </Button>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Toggle package modules for this tenant. Changes become overrides when they differ from the plan baseline.
      </p>

      {features.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading features…</p> : null}

      {features.data ? (
        <>
          <div className="mt-4">
            <FeatureChecklist value={draft} onChange={setDraft} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={async () => {
                setError("");
                setMessage("");
                try {
                  await api(`/api/platform/tenants/${tenant.id}/features`, {
                    method: "PATCH",
                    body: JSON.stringify({ features: draft }),
                  });
                  setMessage("Features saved.");
                  void qc.invalidateQueries({ queryKey: ["tenant-features", tenant.id] });
                } catch (e) {
                  setError(formatApiError(e));
                }
              }}
            >
              Save feature overrides
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(features.data!.effective)}>
              Reset draft
            </Button>
          </div>
          {Object.keys(features.data.overrides).length ? (
            <p className="mt-2 text-xs text-slate-500">
              Active overrides: {Object.entries(features.data.overrides).map(([k, v]) => `${k}=${v}`).join(", ")}
            </p>
          ) : null}
        </>
      ) : null}

      {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </Card>
  );
}
