"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";

type Row = { id: string; domain: string; isPrimary: boolean; verificationToken?: string; verifiedAt?: string };

export default function TenantDomains() {
  const list = useCrudList<Row>("tdom", "/api/domains");
  const mutate = useApiMutation<Record<string, unknown>>(["tdom"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("domains", "edit");
  const [addOpen, setAddOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [copied, setCopied] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const verified = rows.filter((r) => r.verifiedAt).length;

  return (
    <GuardedShell plane="tenant" feature="domains" level="view">
      <div>
        <h1 className="text-2xl font-semibold">Custom domains</h1>
        <p className="mt-1 text-sm text-slate-500">Serve your storefront and pilgrim portal from your own hostname.</p>
      </div>

      <Card className="mt-4 space-y-2 text-sm shadow-none">
        <h2 className="font-semibold">How to add a custom domain</h2>
        <ol className="list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-300">
          <li>Add the domain — we generate a verification token for it.</li>
          <li>
            At your DNS provider, add a <code>TXT</code> record for the domain with the token value, and a <code>CNAME</code> pointing at your
            agency host.
          </li>
          <li>Press Verify. We mark the domain verified and sync the edge router (Traefik) automatically.</li>
          <li>Once verified, the domain serves your storefront with automatic TLS.</li>
        </ol>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Domains" value={list.data ? String(rows.length) : "—"} hint="Attached hostnames" onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
        <StatCard label="Verified" value={String(verified)} hint="Serving traffic" onClick={() => setStatusFilter("verified")} active={statusFilter === "verified"} />
        <StatCard label="Pending" value={String(rows.length - verified)} hint="Needs DNS + verify" onClick={() => setStatusFilter("pending")} active={statusFilter === "pending"} />
      </div>

      <div className="mt-4">
        <ManagedTable<Row>
            rows={rows}
            initialFilter={statusFilter === "all" ? undefined : statusFilter === "verified" ? (r) => Boolean(r.verifiedAt) : (r) => !r.verifiedAt}
            searchKeys={["domain"]}
            searchPlaceholder="Search domains…"
            onAdd={canEdit ? () => setAddOpen(true) : undefined}
            addLabel="Add domain"
            columns={[
              { key: "domain", header: "Domain", render: (r) => <span className="font-medium">{r.domain}</span> },
              { key: "isPrimary", header: "Primary", render: (r) => (r.isPrimary ? <Badge>primary</Badge> : <span className="text-xs text-slate-400">—</span>) },
              {
                key: "verificationToken",
                header: "Verification",
                render: (r) =>
                  r.verifiedAt ? (
                    <span className="text-xs text-teal-600">Verified {String(r.verifiedAt).slice(0, 10)}</span>
                  ) : (
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-navy-800">{r.verificationToken ?? "pending"}</code>
                  ),
              },
              {
                key: "actions",
                header: "",
                render: (row) => (
                  canEdit ? (
                  <RowActions
                    actions={[
                      ...(row.verifiedAt
                        ? []
                        : [
                            { label: "Verify domain", onSelect: () => mutate.mutate({ path: `/api/domains/${row.id}/verify`, method: "POST" }) },
                            {
                              label: copied === row.id ? "Copied!" : "Copy token",
                              onSelect: () => {
                                if (row.verificationToken) void navigator.clipboard?.writeText(row.verificationToken);
                                setCopied(row.id);
                              },
                            },
                          ]),
                    ]}
                  />
                  ) : (
                    <span className="text-xs text-slate-400">No access</span>
                  )
                ),
              },
            ]}
            empty="No custom domains yet."
          />
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add domain" description="We generate a TXT verification token for it.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({ path: "/api/domains", method: "POST", body: { domain } });
            setDomain("");
            setAddOpen(false);
          }}
        >
          <div><Label>Domain</Label><Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="travel.example.com" required /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">Add domain</Button>
          </div>
        </form>
      </Dialog>
    </GuardedShell>
  );
}
