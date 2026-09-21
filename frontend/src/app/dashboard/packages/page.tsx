"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList, useCrudMutation } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";

type Tier = { id: string; name: string; price: string; seatsTotal: number; seatsHeld: number; seatsConfirmed: number };
type Pkg = { id: string; name: string; kind: string; departureDate: string; maxPilgrims?: number; isPublished: boolean; tiers?: Tier[] };

export default function PackagesAdmin() {
  const list = useCrudList<Pkg>("pkgs", "/api/admin/packages");
  const create = useCrudMutation<Record<string, unknown>>("/api/admin/packages", ["pkgs"]);
  const mutate = useApiMutation<Record<string, unknown>>(["pkgs"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("packages", "edit");
  const canFull = can("packages", "full");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("offseason_umrah");
  const [departure, setDeparture] = useState("");
  const [maxPilgrims, setMaxPilgrims] = useState("10");
  const [kindFilter, setKindFilter] = useState("all");
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [editMaxPilgrims, setEditMaxPilgrims] = useState("10");
  const [quotaFor, setQuotaFor] = useState<Tier | null>(null);
  const [quota, setQuota] = useState("");
  const [tierFor, setTierFor] = useState<Pkg | null>(null);
  const [tierName, setTierName] = useState("");
  const [tierPrice, setTierPrice] = useState("");
  const [tierSeats, setTierSeats] = useState("");

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const published = rows.filter((p) => p.isPublished).length;
  const totalSeats = rows.reduce((s, p) => s + (p.tiers ?? []).reduce((a, t) => a + t.seatsTotal, 0), 0);
  const taken = rows.reduce((s, p) => s + (p.tiers ?? []).reduce((a, t) => a + t.seatsConfirmed + t.seatsHeld, 0), 0);
  const kinds = useMemo(() => {
    const by: Record<string, number> = {};
    for (const p of rows) by[p.kind] = (by[p.kind] ?? 0) + 1;
    return by;
  }, [rows]);

  return (
    <GuardedShell plane="tenant" feature="packages" level="view">
      <div>
        <h1 className="text-2xl font-semibold">Packages</h1>
        <p className="mt-1 text-sm text-slate-500">Journeys, tiers and seat quotas.</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Packages" value={list.data ? String(rows.length) : "—"} hint={`${published} published`} onClick={() => setKindFilter("all")} active={kindFilter === "all"} />
        <StatCard label="Seats taken" value={`${taken}/${totalSeats}`} hint="Held + confirmed" />
        <StatCard label="Hajj" value={String(kinds.hajj ?? 0)} hint="Tap to filter" onClick={() => setKindFilter("hajj")} active={kindFilter === "hajj"} />
        <StatCard label="Umrah" value={String((kinds.ramadan_umrah ?? 0) + (kinds.offseason_umrah ?? 0))} hint="All Umrah kinds" onClick={() => setKindFilter("umrah")} active={kindFilter === "umrah"} />
      </div>

      <div className="mt-4">
          {list.isPending ? (
            <p role="status" className="py-10 text-center text-sm text-slate-500">Loading packages…</p>
          ) : list.isError ? (
            <p role="alert" className="text-sm text-red-600">Could not load packages. <button className="underline" onClick={() => void list.refetch()}>Try again</button></p>
          ) : (
            <ManagedTable<Pkg>
              rows={rows}
              initialFilter={kindFilter === "all" ? undefined : kindFilter === "umrah" ? (r) => r.kind.includes("umrah") : (r) => r.kind === kindFilter}
              searchKeys={["name", "kind"]}
              searchPlaceholder="Search packages…"
              onAdd={canEdit ? () => setCreateOpen(true) : undefined}
              addLabel="Create package"
              columns={[
                {
                  key: "name",
                  header: "Package",
                  render: (r) => (
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="mt-0.5 text-xs capitalize text-slate-500">
                        {r.kind.replaceAll("_", " ")} · departs {String(r.departureDate).slice(0, 10)} · max {r.maxPilgrims ?? 10} pilgrims
                      </p>
                    </div>
                  ),
                },
                {
                  key: "tiers",
                  header: "Quota",
                  render: (row) => {
                    const ts = row.tiers ?? [];
                    if (!ts.length) return <span className="text-xs text-slate-400">No tiers</span>;
                    return (
                      <span className="text-xs tabular-nums">
                        {ts.map((t) => `${t.name} ${t.seatsConfirmed + t.seatsHeld}/${t.seatsTotal}`).join(" · ")}
                      </span>
                    );
                  },
                },
                { key: "isPublished", header: "Status", render: (r) => <Badge>{r.isPublished ? "published" : "draft"}</Badge> },
                {
                  key: "actions",
                  header: "",
                  render: (row) => (
                    <RowActions
                      actions={[
                        ...(canEdit ? [{ label: "Edit details", onSelect: () => { setEditing(row); setEditMaxPilgrims(String(row.maxPilgrims ?? 10)); } }] : []),
                        ...(canEdit ? [{ label: "Manage tiers", onSelect: () => { setTierFor(row); setTierName(""); setTierPrice(""); setTierSeats(""); } }] : []),
                        ...(canEdit ? [{ label: row.isPublished ? "Unpublish" : "Publish", onSelect: () => mutate.mutate({ path: `/api/admin/packages/${row.id}`, method: "PATCH", body: { isPublished: !row.isPublished } }) }] : []),
                        ...(canFull ? [{ label: "Archive", danger: true as const, onSelect: () => mutate.mutate({ path: `/api/admin/packages/${row.id}`, method: "DELETE" }) }] : []),
                      ]}
                    />
                  ),
                },
              ]}
            />
          )}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Create package" description="Starts with one Economy tier — add more afterwards.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const start = new Date();
            const end = departure ? new Date(departure) : new Date(Date.now() + 120 * 86400000);
            create.mutate(
              {
                name,
                kind,
                departureDate: end,
                bookingOpensAt: start,
                bookingClosesAt: end,
                maxPilgrims: Number(maxPilgrims) || 10,
                isPublished: true,
                tiers: [{ name: "Economy", price: "180000", seatsTotal: 20 }],
              },
              { onSuccess: () => { setCreateOpen(false); setName(""); setDeparture(""); setMaxPilgrims("10"); } },
            );
          }}
        >
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div>
            <Label>Kind</Label>
            <select className="h-11 w-full rounded-xl border px-3 dark:bg-navy-800" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="hajj">Hajj</option>
              <option value="ramadan_umrah">Ramadan Umrah</option>
              <option value="offseason_umrah">Off-season Umrah</option>
              <option value="ziyarah">Ziyarah</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Departure</Label><Input type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} /></div>
            <div>
              <Label>Max Pilgrims per Booking</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxPilgrims}
                onChange={(e) => setMaxPilgrims(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create package"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit package">
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing((p) => (p ? { ...p, name: e.target.value } : p))} /></div>
          <div>
            <Label>Max Pilgrims per Booking</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={editMaxPilgrims}
              onChange={(e) => setEditMaxPilgrims(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (editing) {
                  mutate.mutate({
                    path: `/api/admin/packages/${editing.id}`,
                    method: "PATCH",
                    body: {
                      name: editing.name,
                      maxPilgrims: Number(editMaxPilgrims) || 10,
                    },
                  });
                }
                setEditing(null);
              }}
            >
              Save
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={Boolean(tierFor)} onClose={() => { setTierFor(null); setQuotaFor(null); }} title={`Tiers · ${tierFor?.name ?? ""}`} wide>
        <div className="space-y-2">
          {(tierFor?.tiers ?? []).map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-navy-700">
              <span className="font-medium">{t.name}</span>
              <span className="tabular-nums text-slate-500">{t.price} · {t.seatsConfirmed + t.seatsHeld}/{t.seatsTotal}</span>
              <span className="ml-auto flex gap-1.5">
                {canEdit ? <Button size="sm" variant="outline" onClick={() => { setQuotaFor(t); setQuota(String(t.seatsTotal)); }}>Set quota</Button> : null}
                {canFull ? <Button size="sm" variant="ghost" onClick={() => mutate.mutate({ path: `/api/admin/packages/tiers/${t.id}`, method: "DELETE" })}>Remove</Button> : null}
              </span>
            </div>
          ))}
          {quotaFor && canEdit ? (
            <form
              className="flex items-end gap-2 rounded-xl bg-slate-50 p-3 dark:bg-navy-900"
              onSubmit={(e) => {
                e.preventDefault();
                mutate.mutate({ path: `/api/admin/packages/tiers/${quotaFor.id}`, method: "PATCH", body: { seatsTotal: Number(quota) } });
                setQuotaFor(null);
              }}
            >
              <div className="flex-1"><Label>Quota for {quotaFor.name}</Label><Input value={quota} onChange={(e) => setQuota(e.target.value)} required /></div>
              <Button size="sm" type="submit">Save</Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setQuotaFor(null)}>Cancel</Button>
            </form>
          ) : null}
          {canEdit ? (
          <form
            className="flex flex-wrap items-end gap-2 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!tierFor) return;
              mutate.mutate({ path: `/api/admin/packages/${tierFor.id}/tiers`, method: "POST", body: { name: tierName, price: tierPrice, seatsTotal: Number(tierSeats) } });
              setTierName(""); setTierPrice(""); setTierSeats("");
            }}
          >
            <div><Label>Tier</Label><Input aria-label="Tier name" placeholder="VIP" className="w-28" value={tierName} onChange={(e) => setTierName(e.target.value)} required /></div>
            <div><Label>Price</Label><Input aria-label="Tier price" placeholder="550000" className="w-28" value={tierPrice} onChange={(e) => setTierPrice(e.target.value)} required /></div>
            <div><Label>Seats</Label><Input aria-label="Tier seats" placeholder="8" className="w-20" value={tierSeats} onChange={(e) => setTierSeats(e.target.value)} required /></div>
            <Button size="sm" type="submit">Add tier</Button>
          </form>
          ) : null}
        </div>
      </Dialog>
    </GuardedShell>
  );
}
