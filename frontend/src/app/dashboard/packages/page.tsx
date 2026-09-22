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
import { cn } from "@/lib/utils";

const PRESET_INCLUSIONS = [
  "Visa processing & medical insurance",
  "5-star hotel accommodation",
  "Air-conditioned VIP transport",
  "Historical Ziyarah tours with guide",
  "Full board / daily catering",
  "5L Zamzam water canister",
  "Experienced Muallim assistance",
  "Ihram & travel essentials kit",
  "24/7 on-ground assistance",
];

type Tier = { id: string; name: string; price: string; seatsTotal: number; seatsHeld: number; seatsConfirmed: number; roomType?: string };
type Pkg = {
  id: string;
  name: string;
  kind: string;
  description?: string;
  departureDate: string;
  bookingOpensAt?: string;
  bookingClosesAt?: string;
  durationDays?: number;
  maxPilgrims?: number;
  makkahHotel?: string;
  makkahDistance?: string;
  madinahHotel?: string;
  madinahDistance?: string;
  airline?: string;
  flightRoute?: string;
  inclusions?: string[];
  isPublished: boolean;
  tiers?: Tier[];
};

export default function PackagesAdmin() {
  const list = useCrudList<Pkg>("pkgs", "/api/admin/packages");
  const create = useCrudMutation<Record<string, unknown>>("/api/admin/packages", ["pkgs"]);
  const mutate = useApiMutation<Record<string, unknown>>(["pkgs"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("packages", "edit");
  const canFull = can("packages", "full");

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"basic" | "hotels" | "inclusions" | "tier">("basic");
  const [name, setName] = useState("");
  const [kind, setKind] = useState("offseason_umrah");
  const [durationDays, setDurationDays] = useState("14");
  const [departure, setDeparture] = useState("");
  const [bookingOpens, setBookingOpens] = useState(() => new Date().toISOString().slice(0, 10));
  const [bookingCloses, setBookingCloses] = useState("");
  const [maxPilgrims, setMaxPilgrims] = useState("10");

  const [makkahHotel, setMakkahHotel] = useState("");
  const [makkahDistance, setMakkahDistance] = useState("");
  const [madinahHotel, setMadinahHotel] = useState("");
  const [madinahDistance, setMadinahDistance] = useState("");
  const [airline, setAirline] = useState("");
  const [flightRoute, setFlightRoute] = useState("");

  const [description, setDescription] = useState("");
  const [inclusions, setInclusions] = useState<string[]>([
    "Visa processing & medical insurance",
    "Air-conditioned VIP transport",
    "Historical Ziyarah tours with guide",
    "5L Zamzam water canister",
  ]);
  const [customInc, setCustomInc] = useState("");

  const [initTierName, setInitTierName] = useState("Economy");
  const [initTierPrice, setInitTierPrice] = useState("180000");
  const [initTierSeats, setInitTierSeats] = useState("20");
  const [initTierRoomType, setInitTierRoomType] = useState("Quad Sharing");

  const resetCreateForm = () => {
    setName("");
    setKind("offseason_umrah");
    setDurationDays("14");
    setDeparture("");
    setBookingOpens(new Date().toISOString().slice(0, 10));
    setBookingCloses("");
    setMaxPilgrims("10");
    setMakkahHotel("");
    setMakkahDistance("");
    madinahHotel && setMadinahHotel("");
    setMadinahDistance("");
    setAirline("");
    setFlightRoute("");
    setDescription("");
    setInclusions([
      "Visa processing & medical insurance",
      "Air-conditioned VIP transport",
      "Historical Ziyarah tours with guide",
      "5L Zamzam water canister",
    ]);
    setCustomInc("");
    setInitTierName("Economy");
    setInitTierPrice("180000");
    setInitTierSeats("20");
    setInitTierRoomType("Quad Sharing");
    setCreateTab("basic");
  };

  // Edit modal state
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [editTab, setEditTab] = useState<"basic" | "hotels" | "inclusions">("basic");
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState("offseason_umrah");
  const [editDurationDays, setEditDurationDays] = useState("14");
  const [editDeparture, setEditDeparture] = useState("");
  const [editBookingOpens, setEditBookingOpens] = useState("");
  const [editBookingCloses, setEditBookingCloses] = useState("");
  const [editMaxPilgrims, setEditMaxPilgrims] = useState("10");
  const [editMakkahHotel, setEditMakkahHotel] = useState("");
  const [editMakkahDistance, setEditMakkahDistance] = useState("");
  const [editMadinahHotel, setEditMadinahHotel] = useState("");
  const [editMadinahDistance, setEditMadinahDistance] = useState("");
  const [editAirline, setEditAirline] = useState("");
  const [editFlightRoute, setEditFlightRoute] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInclusions, setEditInclusions] = useState<string[]>([]);

  const openEditModal = (pkg: Pkg) => {
    setEditing(pkg);
    setEditTab("basic");
    setEditName(pkg.name);
    setEditKind(pkg.kind);
    setEditDurationDays(String(pkg.durationDays ?? 14));
    setEditDeparture(pkg.departureDate ? String(pkg.departureDate).slice(0, 10) : "");
    setEditBookingOpens(pkg.bookingOpensAt ? String(pkg.bookingOpensAt).slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditBookingCloses(pkg.bookingClosesAt ? String(pkg.bookingClosesAt).slice(0, 10) : pkg.departureDate ? String(pkg.departureDate).slice(0, 10) : "");
    setEditMaxPilgrims(String(pkg.maxPilgrims ?? 10));
    setEditMakkahHotel(pkg.makkahHotel ?? "");
    setEditMakkahDistance(pkg.makkahDistance ?? "");
    setEditMadinahHotel(pkg.madinahHotel ?? "");
    setEditMadinahDistance(pkg.madinahDistance ?? "");
    setEditAirline(pkg.airline ?? "");
    setEditFlightRoute(pkg.flightRoute ?? "");
    setEditDescription(pkg.description ?? "");
    setEditInclusions(pkg.inclusions ?? []);
  };

  const [kindFilter, setKindFilter] = useState("all");
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
                        {r.kind.replaceAll("_", " ")} · {r.durationDays ?? 14} days · departs {String(r.departureDate).slice(0, 10)} · max {r.maxPilgrims ?? 10} pilgrims
                      </p>
                      {(r.makkahHotel || r.madinahHotel) && (
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {r.makkahHotel ? `🕋 ${r.makkahHotel}${r.makkahDistance ? ` (${r.makkahDistance})` : ""}` : ""}
                          {r.makkahHotel && r.madinahHotel ? " · " : ""}
                          {r.madinahHotel ? `🕌 ${r.madinahHotel}${r.madinahDistance ? ` (${r.madinahDistance})` : ""}` : ""}
                        </p>
                      )}
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
                        ...(canEdit ? [{ label: "Edit details", onSelect: () => openEditModal(row) }] : []),
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

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create package"
        description="Configure package details, accommodation, flight routes, and initial seat quota."
        wide
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const depDate = departure ? new Date(departure) : new Date(Date.now() + 60 * 86400000);
            const openDate = bookingOpens ? new Date(bookingOpens) : new Date();
            const closeDate = bookingCloses ? new Date(bookingCloses) : new Date(depDate.getTime() - 86400000);

            if (openDate.getTime() >= closeDate.getTime() || closeDate.getTime() > depDate.getTime()) {
              alert("Booking must open before it closes, and close by departure date.");
              return;
            }

            create.mutate(
              {
                name,
                kind,
                durationDays: Number(durationDays) || 14,
                departureDate: depDate,
                bookingOpensAt: openDate,
                bookingClosesAt: closeDate,
                maxPilgrims: Number(maxPilgrims) || 10,
                makkahHotel: makkahHotel.trim() || undefined,
                makkahDistance: makkahDistance.trim() || undefined,
                madinahHotel: madinahHotel.trim() || undefined,
                madinahDistance: madinahDistance.trim() || undefined,
                airline: airline.trim() || undefined,
                flightRoute: flightRoute.trim() || undefined,
                description: description.trim() || undefined,
                inclusions,
                isPublished: true,
                tiers: [
                  {
                    name: initTierName || "Economy",
                    price: initTierPrice || "180000",
                    seatsTotal: Number(initTierSeats) || 20,
                    roomType: initTierRoomType || "Quad Sharing",
                  },
                ],
              },
              {
                onSuccess: () => {
                  setCreateOpen(false);
                  resetCreateForm();
                },
              },
            );
          }}
        >
          {/* Section Navigation Tabs */}
          <div className="flex border-b border-slate-200 text-xs font-medium dark:border-navy-700">
            {[
              { id: "basic", label: "1. Basic & Dates" },
              { id: "hotels", label: "2. Hotels & Flights" },
              { id: "inclusions", label: "3. Inclusions & Notes" },
              { id: "tier", label: "4. Initial Tier" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCreateTab(t.id as typeof createTab)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 transition-colors",
                  createTab === t.id
                    ? "border-teal-600 font-semibold text-teal-600 dark:border-teal-400 dark:text-teal-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Basic & Dates */}
          {createTab === "basic" && (
            <div className="space-y-3 pt-1">
              <div>
                <Label>Package name</Label>
                <Input
                  placeholder="e.g. Executive Ramadan Umrah 2027"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Journey kind</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-800"
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="hajj">Hajj</option>
                    <option value="ramadan_umrah">Ramadan Umrah</option>
                    <option value="offseason_umrah">Off-season Umrah</option>
                    <option value="ziyarah">Ziyarah</option>
                  </select>
                </div>
                <div>
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Departure date</Label>
                  <Input
                    type="date"
                    value={departure}
                    onChange={(e) => {
                      setDeparture(e.target.value);
                      if (!bookingCloses) setBookingCloses(e.target.value);
                    }}
                    required
                  />
                </div>
                <div>
                  <Label>Booking opens</Label>
                  <Input
                    type="date"
                    value={bookingOpens}
                    onChange={(e) => setBookingOpens(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Booking closes</Label>
                  <Input
                    type="date"
                    value={bookingCloses}
                    onChange={(e) => setBookingCloses(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Max pilgrims per single booking</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={maxPilgrims}
                  onChange={(e) => setMaxPilgrims(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-slate-400">Limits how many pilgrims can be submitted in one group checkout.</p>
              </div>
            </div>
          )}

          {/* Tab 2: Hotels & Flights */}
          {createTab === "hotels" && (
            <div className="space-y-3 pt-1">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-navy-700 dark:bg-navy-900/40">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Makkah Accommodation</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Makkah hotel name</Label>
                    <Input
                      placeholder="e.g. Swissôtel Al Maqam / Pullman Zamzam"
                      value={makkahHotel}
                      onChange={(e) => setMakkahHotel(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Distance to Haram</Label>
                    <Input
                      placeholder="e.g. 100m / Zero distance"
                      value={makkahDistance}
                      onChange={(e) => setMakkahDistance(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-navy-700 dark:bg-navy-900/40">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Madinah Accommodation</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Madinah hotel name</Label>
                    <Input
                      placeholder="e.g. Dar Al Taqwa / Anwar Al Madinah"
                      value={madinahHotel}
                      onChange={(e) => setMadinahHotel(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Distance to Prophet's Mosque</Label>
                    <Input
                      placeholder="e.g. 50m from courtyard"
                      value={madinahDistance}
                      onChange={(e) => setMadinahDistance(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-navy-700 dark:bg-navy-900/40">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Flight & Transit</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Airline</Label>
                    <Input
                      placeholder="e.g. Saudia / Biman Bangladesh"
                      value={airline}
                      onChange={(e) => setAirline(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Flight route</Label>
                    <Input
                      placeholder="e.g. DAC - JED - MED - DAC"
                      value={flightRoute}
                      onChange={(e) => setFlightRoute(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Inclusions & Notes */}
          {createTab === "inclusions" && (
            <div className="space-y-3 pt-1">
              <div>
                <Label>Package overview / description</Label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-teal-500 focus:outline-none dark:border-navy-700 dark:bg-navy-800"
                  placeholder="Summarize this package for pilgrims (itinerary highlights, special arrangements, VIP care)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <Label>Key package inclusions</Label>
                <p className="mb-2 text-xs text-slate-500">Select standard inclusions or add custom items:</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_INCLUSIONS.map((inc) => {
                    const selected = inclusions.includes(inc);
                    return (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => {
                          setInclusions(selected ? inclusions.filter((i) => i !== inc) : [...inclusions, inc]);
                        }}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all text-left",
                          selected
                            ? "border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-200"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300",
                        )}
                      >
                        {selected ? "✓ " : "+ "}
                        {inc}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-end gap-2 pt-1">
                <div className="flex-1">
                  <Label>Add custom inclusion</Label>
                  <Input
                    placeholder="e.g. Wheelchair assistance in Haram"
                    value={customInc}
                    onChange={(e) => setCustomInc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customInc.trim() && !inclusions.includes(customInc.trim())) {
                          setInclusions([...inclusions, customInc.trim()]);
                          setCustomInc("");
                        }
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (customInc.trim() && !inclusions.includes(customInc.trim())) {
                      setInclusions([...inclusions, customInc.trim()]);
                      setCustomInc("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              {inclusions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inclusions.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-navy-700 dark:text-slate-200"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => setInclusions(inclusions.filter((i) => i !== item))}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Initial Tier */}
          {createTab === "tier" && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-slate-500">
                A package requires at least one price & seat tier. You can add more tiers (such as VIP, Standard) anytime from the "Manage tiers" menu.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Initial tier name</Label>
                  <Input
                    placeholder="Economy"
                    value={initTierName}
                    onChange={(e) => setInitTierName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Room type</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-800"
                    value={initTierRoomType}
                    onChange={(e) => setInitTierRoomType(e.target.value)}
                  >
                    <option value="Quad Sharing">Quad Sharing (4 in room)</option>
                    <option value="Triple Sharing">Triple Sharing (3 in room)</option>
                    <option value="Double Sharing">Double / Twin Sharing</option>
                    <option value="Single Room">Single Room</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price per pilgrim (BDT)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="180000"
                    value={initTierPrice}
                    onChange={(e) => setInitTierPrice(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Total seats quota</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    placeholder="20"
                    value={initTierSeats}
                    onChange={(e) => setInitTierSeats(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-navy-700">
            <div className="flex gap-2">
              {createTab !== "basic" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tabs = ["basic", "hotels", "inclusions", "tier"] as const;
                    const prevIdx = tabs.indexOf(createTab) - 1;
                    if (prevIdx >= 0) setCreateTab(tabs[prevIdx]);
                  }}
                >
                  Previous
                </Button>
              )}
              {createTab !== "tier" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tabs = ["basic", "hotels", "inclusions", "tier"] as const;
                    const nextIdx = tabs.indexOf(createTab) + 1;
                    if (nextIdx < tabs.length) setCreateTab(tabs[nextIdx]);
                  }}
                >
                  Next step
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create package"}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Edit details · ${editing?.name ?? ""}`}
        wide
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editing) return;
            const depDate = editDeparture ? new Date(editDeparture) : new Date(editing.departureDate);
            const openDate = editBookingOpens ? new Date(editBookingOpens) : new Date(editing.bookingOpensAt ?? Date.now());
            const closeDate = editBookingCloses ? new Date(editBookingCloses) : new Date(editing.bookingClosesAt ?? depDate.getTime() - 86400000);

            if (openDate.getTime() >= closeDate.getTime() || closeDate.getTime() > depDate.getTime()) {
              alert("Booking must open before it closes, and close by departure date.");
              return;
            }

            mutate.mutate({
              path: `/api/admin/packages/${editing.id}`,
              method: "PATCH",
              body: {
                name: editName,
                kind: editKind,
                durationDays: Number(editDurationDays) || 14,
                departureDate: depDate,
                bookingOpensAt: openDate,
                bookingClosesAt: closeDate,
                maxPilgrims: Number(editMaxPilgrims) || 10,
                makkahHotel: editMakkahHotel.trim() || null,
                makkahDistance: editMakkahDistance.trim() || null,
                madinahHotel: editMadinahHotel.trim() || null,
                madinahDistance: editMadinahDistance.trim() || null,
                airline: editAirline.trim() || null,
                flightRoute: editFlightRoute.trim() || null,
                description: editDescription.trim() || null,
                inclusions: editInclusions,
              },
            });
            setEditing(null);
          }}
        >
          {/* Edit Tabs */}
          <div className="flex border-b border-slate-200 text-xs font-medium dark:border-navy-700">
            {[
              { id: "basic", label: "Basic & Dates" },
              { id: "hotels", label: "Hotels & Flights" },
              { id: "inclusions", label: "Inclusions & Notes" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEditTab(t.id as typeof editTab)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 transition-colors",
                  editTab === t.id
                    ? "border-teal-600 font-semibold text-teal-600 dark:border-teal-400 dark:text-teal-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {editTab === "basic" && (
            <div className="space-y-3 pt-1">
              <div>
                <Label>Package name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Journey kind</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-800"
                    value={editKind}
                    onChange={(e) => setEditKind(e.target.value)}
                  >
                    <option value="hajj">Hajj</option>
                    <option value="ramadan_umrah">Ramadan Umrah</option>
                    <option value="offseason_umrah">Off-season Umrah</option>
                    <option value="ziyarah">Ziyarah</option>
                  </select>
                </div>
                <div>
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={editDurationDays}
                    onChange={(e) => setEditDurationDays(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Departure date</Label>
                  <Input
                    type="date"
                    value={editDeparture}
                    onChange={(e) => setEditDeparture(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Booking opens</Label>
                  <Input
                    type="date"
                    value={editBookingOpens}
                    onChange={(e) => setEditBookingOpens(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Booking closes</Label>
                  <Input
                    type="date"
                    value={editBookingCloses}
                    onChange={(e) => setEditBookingCloses(e.target.value)}
                    required
                  />
                </div>
              </div>

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
            </div>
          )}

          {editTab === "hotels" && (
            <div className="space-y-3 pt-1">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-navy-700 dark:bg-navy-900/40">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Makkah Hotel</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Hotel name</Label>
                    <Input
                      placeholder="e.g. Swissôtel Makkah"
                      value={editMakkahHotel}
                      onChange={(e) => setEditMakkahHotel(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Distance to Haram</Label>
                    <Input
                      placeholder="e.g. 100m"
                      value={editMakkahDistance}
                      onChange={(e) => setEditMakkahDistance(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-navy-700 dark:bg-navy-900/40">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Madinah Hotel</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Hotel name</Label>
                    <Input
                      placeholder="e.g. Dar Al Taqwa"
                      value={editMadinahHotel}
                      onChange={(e) => setEditMadinahHotel(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Distance to Prophet's Mosque</Label>
                    <Input
                      placeholder="e.g. 50m"
                      value={editMadinahDistance}
                      onChange={(e) => setEditMadinahDistance(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-navy-700 dark:bg-navy-900/40">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Flight Route</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Airline</Label>
                    <Input
                      placeholder="e.g. Saudia"
                      value={editAirline}
                      onChange={(e) => setEditAirline(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Flight route</Label>
                    <Input
                      placeholder="e.g. DAC - JED - MED - DAC"
                      value={editFlightRoute}
                      onChange={(e) => setEditFlightRoute(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {editTab === "inclusions" && (
            <div className="space-y-3 pt-1">
              <div>
                <Label>Package description</Label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-teal-500 focus:outline-none dark:border-navy-700 dark:bg-navy-800"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div>
                <Label>Inclusions</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_INCLUSIONS.map((inc) => {
                    const selected = editInclusions.includes(inc);
                    return (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => {
                          setEditInclusions(selected ? editInclusions.filter((i) => i !== inc) : [...editInclusions, inc]);
                        }}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all text-left",
                          selected
                            ? "border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-200"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300",
                        )}
                      >
                        {selected ? "✓ " : "+ "}
                        {inc}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-navy-700">
            <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
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
