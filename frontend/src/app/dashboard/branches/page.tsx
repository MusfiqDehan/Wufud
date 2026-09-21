"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";

type Branch = { id: string; name: string; code: string; city?: string };

export default function BranchesPage() {
  const list = useCrudList<Branch>("br", "/api/branches");
  const mutate = useApiMutation<Record<string, unknown>>(["br"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("branches", "edit");
  const canFull = can("branches", "full");
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [editing, setEditing] = useState<Branch | null>(null);

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);

  return (
    <GuardedShell plane="tenant" feature="branches" level="view">
      <div>
        <h1 className="text-2xl font-semibold">Branches</h1>
        <p className="mt-1 text-sm text-slate-500">Offices with branch-scoped staff and collections.</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Branches" value={list.data ? String(rows.length) : "—"} hint="Across the agency" />
      </div>

      <div className="mt-4">
        <ManagedTable<Branch>
            rows={rows}
            searchKeys={["name", "code", "city"]}
            searchPlaceholder="Search branches…"
            onAdd={canEdit ? () => setAddOpen(true) : undefined}
            addLabel="Add branch"
            columns={[
              {
                key: "name",
                header: "Branch",
                render: (r) => (
                  <div><p className="font-medium">{r.name}</p><p className="mt-0.5 text-xs text-slate-500">{r.code}{r.city ? ` · ${r.city}` : ""}</p></div>
                ),
              },
              { key: "code", header: "Code" },
              { key: "city", header: "City", render: (r) => r.city ?? "—" },
              {
                key: "actions",
                header: "",
                render: (row) => (
                  <RowActions
                    actions={[
                      ...(canEdit ? [{ label: "Edit", onSelect: () => setEditing(row) }] : []),
                      ...(canFull ? [{ label: "Archive", danger: true as const, onSelect: () => mutate.mutate({ path: `/api/branches/${row.id}`, method: "DELETE" }) }] : []),
                    ]}
                  />
                ),
              },
            ]}
          />
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add branch">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({ path: "/api/branches", method: "POST", body: { name, code, city } });
            setName(""); setCode(""); setCity(""); setAddOpen(false);
          }}
        >
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} required /></div>
          <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">Add branch</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit branch">
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing((b) => (b ? { ...b, name: e.target.value } : b))} /></div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (editing) mutate.mutate({ path: `/api/branches/${editing.id}`, method: "PATCH", body: { name: editing.name, city: editing.city } });
                setEditing(null);
              }}
            >
              Save
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </GuardedShell>
  );
}
