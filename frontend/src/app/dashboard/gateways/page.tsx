"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";

type GatewayField = { key: string; label: string; type: "text" | "password" | "boolean"; required: boolean };
type Gateway = {
  slug: string;
  name: string;
  is_configured: boolean;
  is_active: boolean;
  is_sandbox: boolean;
  config_schema?: GatewayField[];
};

export default function TenantGateways() {
  const list = useCrudList<Gateway>("tgw", "/api/payments/gateways");
  const mutate = useApiMutation<Record<string, unknown>>(["tgw"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("gateways", "edit");
  const [configuring, setConfiguring] = useState<Gateway | null>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo(() => (list.data?.items ?? []).map((r) => ({ ...r, id: r.slug })), [list.data]);
  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <GuardedShell plane="tenant" feature="gateways" level="view">
      <h1 className="text-2xl font-semibold">Payment gateways</h1>
      <p className="mt-1 text-sm text-slate-500">
        Methods the platform has enabled for agencies. Add this agency’s own credentials, then enable checkout and switch sandbox or live.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Gateways" value={list.data ? String(rows.length) : "—"} hint="Platform-enabled" onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
        <StatCard label="Active" value={String(activeCount)} hint="Taking checkout" onClick={() => setStatusFilter("active")} active={statusFilter === "active"} />
        <StatCard label="Configured" value={String(rows.filter((r) => r.is_configured).length)} hint="Credentials stored" />
      </div>

      <div className="mt-4">
        <ManagedTable<Gateway & { id: string }>
          rows={rows}
          initialFilter={statusFilter === "all" ? undefined : (r) => r.is_active}
          searchKeys={["name", "slug"]}
          searchPlaceholder="Search gateways…"
          columns={[
            {
              key: "name",
              header: "Gateway",
              render: (r) => (
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="font-mono text-xs text-slate-500">{r.slug}</p>
                </div>
              ),
            },
            {
              key: "is_sandbox",
              header: "Mode",
              render: (r) => (r.is_sandbox ? <span className="text-xs text-slate-500">Sandbox</span> : <Badge>Live</Badge>),
            },
            {
              key: "is_configured",
              header: "Configured",
              render: (r) => (r.is_configured ? <Badge>yes</Badge> : <span className="text-xs text-slate-400">No</span>),
            },
            {
              key: "is_active",
              header: "Checkout",
              render: (r) => (r.is_active ? <Badge>enabled</Badge> : <span className="text-xs text-slate-400">Off</span>),
            },
            {
              key: "actions",
              header: "",
              render: (row) =>
                canEdit ? (
                  <RowActions
                    actions={[
                      {
                        label: "Credentials",
                        onSelect: () => {
                          setConfiguring(row);
                          setCreds({});
                        },
                      },
                      {
                        label: row.is_active ? "Disable" : "Enable",
                        onSelect: () => mutate.mutate({ path: `/api/payments/gateways/${row.slug}/toggle`, method: "POST" }),
                      },
                      {
                        label: row.is_sandbox ? "Switch to live" : "Switch to sandbox",
                        onSelect: () => mutate.mutate({ path: `/api/payments/gateways/${row.slug}/sandbox`, method: "POST" }),
                      },
                    ]}
                  />
                ) : (
                  <span className="text-xs text-slate-400">No access</span>
                ),
            },
          ]}
          empty="The platform has not enabled any payment methods yet."
        />
      </div>

      <Dialog
        open={Boolean(configuring)}
        onClose={() => setConfiguring(null)}
        title={`Credentials · ${configuring?.name ?? ""}`}
        description="Stored per agency. Blank fields keep the current secret."
        wide
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!configuring) return;
            mutate.mutate({
              path: `/api/payments/gateways/${configuring.slug}`,
              method: "PATCH",
              body: { credentials: creds },
            });
            setConfiguring(null);
          }}
        >
          {(configuring?.config_schema ?? []).map((field) => (
            <div key={field.key}>
              <Label>{field.label}</Label>
              {field.type === "password" ? (
                <PasswordInput
                  autoComplete="off"
                  value={creds[field.key] ?? ""}
                  placeholder={configuring?.is_configured ? "Leave blank to keep current" : field.label}
                  onChange={(e) => setCreds((c) => ({ ...c, [field.key]: e.target.value }))}
                />
              ) : (
                <Input
                  type="text"
                  value={creds[field.key] ?? ""}
                  placeholder={configuring?.is_configured ? "Leave blank to keep current" : field.label}
                  onChange={(e) => setCreds((c) => ({ ...c, [field.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {!(configuring?.config_schema ?? []).length ? (
            <p className="text-sm text-slate-500">Local stub — no extra keys. Enable it for checkout after saving.</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfiguring(null)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Dialog>
    </GuardedShell>
  );
}
