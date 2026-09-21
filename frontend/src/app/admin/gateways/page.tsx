"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";

type GatewayField = { key: string; label: string; type: "text" | "password" | "boolean"; required: boolean };
type Gateway = {
  slug: string;
  name: string;
  description?: string;
  is_enabled_for_tenants: boolean;
  config_schema?: GatewayField[];
  has_credentials: boolean;
  is_sandbox: boolean;
};

export default function GatewaysPage() {
  const list = useCrudList<Gateway>("pgw", "/api/gateways");
  const mutate = useApiMutation<Record<string, unknown>>(["pgw"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("platform.gateways", "edit");
  const rows = useMemo(() => (list.data?.items ?? []).map((r) => ({ ...r, id: r.slug })), [list.data]);
  const enabled = rows.filter((r) => r.is_enabled_for_tenants).length;
  const [configuring, setConfiguring] = useState<Gateway | null>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});

  return (
    <GuardedShell plane="platform" feature="platform.gateways" level="view">
      <h1 className="text-2xl font-semibold">Gateway catalog</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enable a method for agencies, switch sandbox or live, and optionally store platform credentials. Agencies then add their own keys.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Gateways" value={list.data ? String(rows.length) : "—"} hint="In the catalog" />
        <StatCard label="Enabled" value={String(enabled)} hint="For tenant checkout" />
        <StatCard label="Live" value={String(rows.filter((r) => !r.is_sandbox).length)} hint="Not in sandbox" />
      </div>

      <div className="mt-4">
        <ManagedTable<Gateway & { id: string }>
          rows={rows}
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
              key: "has_credentials",
              header: "Credentials",
              render: (r) => (r.has_credentials ? <Badge>saved</Badge> : <span className="text-xs text-slate-400">None</span>),
            },
            {
              key: "is_enabled_for_tenants",
              header: "Tenants",
              render: (r) => (r.is_enabled_for_tenants ? <Badge>enabled</Badge> : <span className="text-xs text-slate-400">Off</span>),
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
                        label: row.is_enabled_for_tenants ? "Disable for tenants" : "Enable for tenants",
                        onSelect: () => mutate.mutate({ path: `/api/gateways/${row.slug}/toggle`, method: "POST" }),
                      },
                      {
                        label: row.is_sandbox ? "Switch to live" : "Switch to sandbox",
                        onSelect: () => mutate.mutate({ path: `/api/gateways/${row.slug}/sandbox`, method: "POST" }),
                      },
                    ]}
                  />
                ) : (
                  <span className="text-xs text-slate-400">No access</span>
                ),
            },
          ]}
          empty="No gateways configured."
        />
      </div>

      <Dialog
        open={Boolean(configuring)}
        onClose={() => setConfiguring(null)}
        title={`Credentials · ${configuring?.name ?? ""}`}
        description="Optional platform keys. Blank fields keep the stored secret. Values live in the database, not in source."
        wide
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!configuring) return;
            mutate.mutate({
              path: "/api/gateways",
              method: "POST",
              body: {
                slug: configuring.slug,
                name: configuring.name,
                platformCredentials: creds,
              },
            });
            setConfiguring(null);
          }}
        >
          {(configuring?.config_schema ?? []).map((field) => (
            <div key={field.key}>
              <Label>
                {field.label}
                {field.required ? "" : " (optional)"}
              </Label>
              {field.type === "password" ? (
                <PasswordInput
                  autoComplete="off"
                  value={creds[field.key] ?? ""}
                  placeholder={configuring?.has_credentials ? "Leave blank to keep current" : field.label}
                  onChange={(e) => setCreds((c) => ({ ...c, [field.key]: e.target.value }))}
                />
              ) : (
                <Input
                  type="text"
                  value={creds[field.key] ?? ""}
                  placeholder={configuring?.has_credentials ? "Leave blank to keep current" : field.label}
                  onChange={(e) => setCreds((c) => ({ ...c, [field.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {!(configuring?.config_schema ?? []).length ? (
            <p className="text-sm text-slate-500">This gateway has no extra credentials (local stub).</p>
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
