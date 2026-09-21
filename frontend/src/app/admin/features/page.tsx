"use client";

import Link from "next/link";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/data/stat-card";
import { ManagedTable } from "@/components/data/managed-table";
import { PACKAGE_GATED_KEYS, TENANT_REGISTRY } from "@wufud/contracts";

export default function FeaturesPage() {
  const all = TENANT_REGISTRY.flatMap((g) => g.children.map((c) => ({ ...c, group: g.group })));
  return (
    <GuardedShell plane="platform" feature="platform.features" level="view">
      <h1 className="text-2xl font-semibold">Feature registry</h1>
      <p className="mt-1 text-sm text-slate-500">
        Package-gated modules ({PACKAGE_GATED_KEYS.size} keys). Assign them on{" "}
        <Link href="/admin/plans" className="text-teal-600 underline">
          Plans
        </Link>{" "}
        or per tenant on{" "}
        <Link href="/admin/tenants" className="text-teal-600 underline">
          Tenants
        </Link>
        .
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gated modules" value={String(PACKAGE_GATED_KEYS.size)} hint="Package keys" />
        <StatCard label="Registry entries" value={String(all.length)} hint="Across groups" />
        <StatCard label="Groups" value={String(TENANT_REGISTRY.length)} hint="Workspace sections" />
      </div>

      <div className="mt-4">
        <ManagedTable<{ key: string; name: string; group: string; route?: string }>
            rows={all.map((c) => ({ key: c.key, name: c.name, group: c.group, route: c.route }))}
            searchKeys={["name", "key", "group"]}
            searchPlaceholder="Search features…"
            columns={[
              { key: "name", header: "Feature", render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.group}</p></div> },
              { key: "key", header: "Key", render: (r) => <code className="text-xs text-slate-500">{r.key}</code> },
            ]}
            empty="No features registered."
          />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {TENANT_REGISTRY.map((group) => (
          <Card key={group.group} className="p-4 shadow-none">
            <h2 className="font-semibold">{group.group}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {group.children.map((item) => (
                <li key={item.key} className="flex justify-between gap-2">
                  <span>{item.name}</span>
                  <code className="text-xs text-slate-500">{item.key}</code>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <Button asChild variant="outline">
          <Link href="/admin/tenants">Manage tenant features</Link>
        </Button>
      </div>
    </GuardedShell>
  );
}
