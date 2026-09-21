"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useApiMutation, useCrudList } from "@/features/crud";
import { formatApiError } from "@/lib/api-error";

export default function DomainsPage() {
  const list = useCrudList<{ id: string; host: string; isPrimary: boolean }>("pdom", "/api/platform/domains");
  const mutate = useApiMutation<Record<string, unknown>>(["pdom"]);
  const [addOpen, setAddOpen] = useState(false);
  const [host, setHost] = useState("");
  const [primary, setPrimary] = useState(false);
  const [error, setError] = useState("");

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);

  return (
    <GuardedShell plane="platform" feature="platform.domains" level="view">
      <div>
        <h1 className="text-2xl font-semibold">Platform domains</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hostnames served by the Wufud platform itself (marketing site, console). Agency storefronts use tenant custom domains instead —
          each agency verifies its own hostname under Dashboard → Domains.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Hosts" value={list.data ? String(rows.length) : "—"} hint="Platform hostnames" />
        <StatCard label="Primary" value={String(rows.filter((r) => r.isPrimary).length)} hint="Default host" />
      </div>

      <div className="mt-4">
          <ManagedTable<{ id: string; host: string; isPrimary: boolean }>
            rows={rows}
            searchKeys={["host"]}
            searchPlaceholder="Search hosts…"
            onAdd={() => setAddOpen(true)}
            addLabel="Add domain"
            columns={[
              { key: "host", header: "Host", render: (r) => <span className="font-medium">{r.host}</span> },
              { key: "isPrimary", header: "Primary", render: (r) => (r.isPrimary ? <Badge>primary</Badge> : <span className="text-xs text-slate-400">—</span>) },
            ]}
            empty="No platform hosts yet."
          />
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add platform hostname" description="Adding a primary host demotes the previous primary. Point DNS at the Traefik edge before adding; TLS is issued automatically.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            mutate.mutate(
              { path: "/api/platform/domains", method: "POST", body: { host, isPrimary: primary } },
              {
                onSuccess: () => { setHost(""); setPrimary(false); setAddOpen(false); },
                onError: (err) => setError(formatApiError(err, "We couldn't add that domain. Try again.")),
              },
            );
          }}
        >
          <div><Label>Host</Label><Input placeholder="wufud.org" value={host} onChange={(e) => setHost(e.target.value)} required /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
            Make primary
          </label>
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">Add domain</Button>
          </div>
        </form>
      </Dialog>
    </GuardedShell>
  );
}
