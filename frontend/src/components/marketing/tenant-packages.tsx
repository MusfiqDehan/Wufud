"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Flame,
  Hotel,
  Info,
  MapPin,
  Plane,
  Search,
  Sparkles,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";
import { useCrudList } from "@/features/crud";
import { EmptyState } from "@/components/data/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type JourneyTier = {
  id: string;
  name: string;
  price: string;
  currency?: string;
  roomType?: string;
  features?: string[];
  seatsTotal: number;
  seatsConfirmed?: number;
  seatsHeld?: number;
  seatsAvailable?: number;
};

export type JourneyPackage = {
  id: string;
  name: string;
  kind: "hajj" | "ramadan_umrah" | "offseason_umrah" | "ziyarah" | string;
  departureDate: string;
  description?: string;
  durationDays?: number;
  makkahHotel?: string;
  makkahDistance?: string;
  madinahHotel?: string;
  madinahDistance?: string;
  airline?: string;
  flightRoute?: string;
  inclusions?: string[];
  itinerary?: { day: string; title: string; desc: string }[];
  featured?: boolean;
  bannerImage?: string;
  maxPilgrims?: number;
  tiers?: JourneyTier[];
};

const formatMoney = (val?: string | number) => {
  if (val === undefined || val === null || val === "") return "—";
  const num = Number(val);
  if (isNaN(num)) return "—";
  return `${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(num)} BDT`;
};

const getKindMeta = (kind: string) => {
  switch (kind) {
    case "hajj":
      return {
        label: "Hajj 2027",
        badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300",
        border: "border-emerald-500/30",
        headerGradient: "from-emerald-900/15 via-teal-900/10 to-transparent",
      };
    case "ramadan_umrah":
      return {
        label: "Ramadan Umrah",
        badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300",
        border: "border-purple-500/30",
        headerGradient: "from-purple-900/15 via-indigo-900/10 to-transparent",
      };
    case "offseason_umrah":
      return {
        label: "Premium Umrah",
        badgeBg: "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300",
        border: "border-teal-500/30",
        headerGradient: "from-teal-900/15 via-cyan-900/10 to-transparent",
      };
    case "ziyarah":
      return {
        label: "Islamic Ziyarah",
        badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300",
        border: "border-amber-500/30",
        headerGradient: "from-amber-900/15 via-orange-900/10 to-transparent",
      };
    default:
      return {
        label: kind.replaceAll("_", " "),
        badgeBg: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
        border: "border-slate-500/30",
        headerGradient: "from-slate-900/10 to-transparent",
      };
  }
};

export function TenantPackages() {
  const list = useCrudList<JourneyPackage>("pubpkg", "/api/packages");
  const [selectedKind, setSelectedKind] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [quickViewPkg, setQuickViewPkg] = useState<JourneyPackage | null>(null);

  const items = list.data?.items ?? [];

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return items.filter((pkg) => {
      if (selectedKind !== "all" && pkg.kind !== selectedKind) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = pkg.name.toLowerCase().includes(q);
        const matchesKind = pkg.kind.toLowerCase().includes(q);
        const matchesMakkah = pkg.makkahHotel?.toLowerCase().includes(q);
        const matchesMadinah = pkg.madinahHotel?.toLowerCase().includes(q);
        const matchesAirline = pkg.airline?.toLowerCase().includes(q);
        if (!matchesName && !matchesKind && !matchesMakkah && !matchesMadinah && !matchesAirline) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedKind, search]);

  // Counts by kind
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const item of items) {
      c[item.kind] = (c[item.kind] ?? 0) + 1;
    }
    return c;
  }, [items]);

  if (list.isPending) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">
          Loading curated pilgrimage packages…
        </p>
      </div>
    );
  }

  if (list.isError) {
    return (
      <div className="py-12">
        <EmptyState
          title="Journeys are temporarily unavailable"
          body="Please try again to see this agency’s packages."
        />
        <div className="mt-4 text-center">
          <Button onClick={() => void list.refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title="New journeys are on their way"
        body="Check back soon for upcoming departures from your agency."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Category Filter Pills & Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Journeys" },
            { id: "hajj", label: "Hajj 2027" },
            { id: "ramadan_umrah", label: "Ramadan Umrah" },
            { id: "offseason_umrah", label: "Premium Umrah" },
            { id: "ziyarah", label: "Ziyarah Tours" },
          ].map((cat) => {
            const count = counts[cat.id] ?? 0;
            if (cat.id !== "all" && count === 0) return null;
            const active = selectedKind === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedKind(cat.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#153e35] text-[#fff8e9] shadow-md dark:bg-amber-600 dark:text-white"
                    : "border border-amber-800/15 bg-white/70 text-slate-700 hover:bg-amber-50 dark:border-white/10 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/70 text-slate-700 dark:bg-navy-900 dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Search Input */}
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <Input
            aria-label="Search packages"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by package name or journey type"
            className="h-9 pl-9 text-xs font-medium rounded-full border-amber-800/20 bg-white/90 dark:border-white/10 dark:bg-navy-800"
          />
        </div>
      </div>

      {/* Packages Grid */}
      {filteredPackages.length === 0 ? (
        <EmptyState
          title={search ? "No matching journeys" : "New journeys are on their way"}
          body={
            search
              ? "Try a different name or journey type."
              : "Check back soon for available packages from your agency."
          }
        />
      ) : (
        <div className="grid gap-7 lg:grid-cols-2">
          {filteredPackages.map((pkg) => {
            const meta = getKindMeta(pkg.kind);
            const prices = (pkg.tiers ?? []).map((t) => Number(t.price)).filter(Number.isFinite);
            const minPrice = prices.length ? Math.min(...prices) : null;
            const totalAvailableSeats = (pkg.tiers ?? []).reduce(
              (sum, t) => sum + (t.seatsTotal - (t.seatsConfirmed ?? 0) - (t.seatsHeld ?? 0)),
              0,
            );

            return (
              <div
                key={pkg.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-amber-800/15 bg-white shadow-xs transition-all hover:shadow-xl dark:border-white/10 dark:bg-navy-800"
              >
                {/* Header Gradient Top Banner */}
                <div
                  className={`border-b border-amber-800/10 bg-gradient-to-r ${meta.headerGradient} p-6 dark:border-white/10`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${meta.badgeBg}`}
                      >
                        <Compass size={13} />
                        {meta.label}
                      </span>
                      {pkg.featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:bg-amber-400/15 dark:text-amber-300">
                          <Sparkles size={12} className="text-amber-500" />
                          Most Popular
                        </span>
                      )}
                    </div>

                    {/* Duration & Availability Badge */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700 shadow-2xs dark:border-white/10 dark:bg-navy-700 dark:text-slate-200">
                        <Clock size={12} className="text-teal-600 dark:text-teal-400" />
                        {pkg.durationDays ? `${pkg.durationDays} Days` : "Flexible Duration"}
                      </span>
                      {totalAvailableSeats > 0 && totalAvailableSeats <= 15 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                          <Flame size={12} className="text-rose-500" />
                          Only {totalAvailableSeats} seats left
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 size={12} />
                          Seats available
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-4 font-serif text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    {pkg.name}
                  </h3>

                  {pkg.description && (
                    <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300 line-clamp-2">
                      {pkg.description}
                    </p>
                  )}

                  {/* Flight & Departure Metadata Bar */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-amber-700 dark:text-amber-400" />
                      Departure:{" "}
                      <strong className="font-semibold text-slate-800 dark:text-slate-100">
                        {pkg.departureDate ? pkg.departureDate.slice(0, 10) : "Upcoming"}
                      </strong>
                    </span>

                    {pkg.airline && (
                      <span className="flex items-center gap-1.5">
                        <Plane size={14} className="text-teal-600 dark:text-teal-400" />
                        <span>{pkg.airline}</span>
                        {pkg.flightRoute && (
                          <span className="text-slate-400 dark:text-slate-500">
                            ({pkg.flightRoute})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body: Accommodation & Sacred Proximity */}
                <div className="p-6 space-y-5 flex-1">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                      <Building2 size={13} />
                      Sacred Sanctuaries Accommodation
                    </h4>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Makkah Hotel Card */}
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-white/10 dark:bg-navy-900/60">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                            <span>🕋</span> Makkah Hotel
                          </span>
                          <span className="text-[10px] font-bold rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            5-Star Luxury
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {pkg.makkahHotel || "Swissôtel Al Maqam / Fairmont"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                          <MapPin size={11} className="shrink-0" />
                          {pkg.makkahDistance || "0m · Direct Haram Access"}
                        </p>
                      </div>

                      {/* Madinah Hotel Card */}
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-white/10 dark:bg-navy-900/60">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                            <span>🕌</span> Madinah Hotel
                          </span>
                          <span className="text-[10px] font-bold rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            5-Star Luxury
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {pkg.madinahHotel || "Pullman Zamzam / Dar Al Taqwa"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                          <MapPin size={11} className="shrink-0" />
                          {pkg.madinahDistance || "50m · Facing Prophet's Mosque"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Key Inclusions Highlights */}
                  {pkg.inclusions && pkg.inclusions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                        <Sparkles size={13} />
                        Curated Package Inclusions
                      </h4>
                      <div className="grid gap-1.5 sm:grid-cols-2 text-xs text-slate-700 dark:text-slate-300">
                        {pkg.inclusions.slice(0, 4).map((inc, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <CheckCircle2
                              size={14}
                              className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                            />
                            <span className="line-clamp-1 text-[11px] leading-4">{inc}</span>
                          </div>
                        ))}
                      </div>
                      {pkg.inclusions.length > 4 && (
                        <p className="mt-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          + {pkg.inclusions.length - 4} more inclusions (Buffet Meals, Scholar
                          Guided Ziyarah, Zamzam Can 5L)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Room Sharing Tiers Comparison */}
                  {pkg.tiers && pkg.tiers.length > 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-navy-900/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Available Room Configurations
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {pkg.tiers.length} Tiers
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {pkg.tiers.map((t) => (
                          <div
                            key={t.id}
                            className="rounded-lg border border-slate-200/70 bg-white p-2 text-center dark:border-white/10 dark:bg-navy-800"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                              {t.name}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white block mt-0.5">
                              {formatMoney(t.price)}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {t.roomType || (t.name === "Economy" ? "Quad (4 Beds)" : t.name === "Standard" ? "Triple (3 Beds)" : "Twin / Double")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Price & CTAs */}
                <div className="border-t border-slate-100 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-navy-900/60">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        All-Inclusive Price
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl sm:text-2xl font-black text-[#153e35] dark:text-emerald-400 tabular-nums">
                          {minPrice ? `From ${formatMoney(minPrice)}` : "Contact for Pricing"}
                        </span>
                        <span className="text-[11px] text-slate-400">/ pilgrim</span>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Wallet size={12} />
                        Installment payment plans available
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickViewPkg(pkg)}
                        className="text-xs font-semibold h-9 rounded-xl border-amber-800/20 text-slate-700 hover:bg-amber-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-navy-700"
                      >
                        <Info size={14} />
                        Details
                      </Button>

                      <Link
                        href={`/packages/${pkg.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#153e35] px-5 py-2 text-xs font-bold text-[#fff8e9] shadow-md transition-all hover:bg-[#1f594d] hover:shadow-lg dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-white h-9"
                      >
                        <span>Select & Book</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick View Details & Itinerary Modal */}
      {quickViewPkg && (
        <Dialog
          open={true}
          onClose={() => setQuickViewPkg(null)}
          title={quickViewPkg.name}
          description={`Comprehensive itinerary, sacred sanctuary accommodations, and inclusions.`}
          wide
        >
          <div className="space-y-6 py-2">
            {/* Quick Metadata Bar */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                {quickViewPkg.kind.replaceAll("_", " ").toUpperCase()}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 dark:bg-navy-700 dark:text-slate-200 flex items-center gap-1.5">
                <Clock size={13} />
                {quickViewPkg.durationDays ? `${quickViewPkg.durationDays} Days / ${quickViewPkg.durationDays - 1} Nights` : "14 Days"}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 dark:bg-navy-700 dark:text-slate-200 flex items-center gap-1.5">
                <CalendarDays size={13} />
                Departure: {quickViewPkg.departureDate?.slice(0, 10)}
              </span>
              {quickViewPkg.airline && (
                <span className="rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 flex items-center gap-1.5">
                  <Plane size={13} />
                  {quickViewPkg.airline} ({quickViewPkg.flightRoute || "DAC ⇄ JED"})
                </span>
              )}
            </div>

            {/* Sacred Hotels Detailed Showcase */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Hotels & Proximity to Harams
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-navy-700 dark:bg-navy-900">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🕋</span> Makkah Al-Mukarramah
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {quickViewPkg.makkahHotel || "Swissôtel Al Maqam Makkah (5-Star)"}
                  </p>
                  <p className="mt-1 text-xs text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                    <MapPin size={12} />
                    {quickViewPkg.makkahDistance || "0m · Direct Haram Access"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-navy-700 dark:bg-navy-900">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🕌</span> Madinah Al-Munawwarah
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {quickViewPkg.madinahHotel || "Pullman Zamzam Madinah (5-Star)"}
                  </p>
                  <p className="mt-1 text-xs text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                    <MapPin size={12} />
                    {quickViewPkg.madinahDistance || "50m · Facing Prophet's Mosque"}
                  </p>
                </div>
              </div>
            </div>

            {/* Inclusions List */}
            {quickViewPkg.inclusions && quickViewPkg.inclusions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Full Inclusions List
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {quickViewPkg.inclusions.map((inc, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{inc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Tiers & Room Sharing */}
            {quickViewPkg.tiers && quickViewPkg.tiers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tier Options & Pricing
                </h4>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-navy-700 dark:border-navy-700 dark:bg-navy-900">
                  {quickViewPkg.tiers.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {t.name}
                        </span>
                        <span className="text-slate-500 ml-2">
                          ({t.roomType || (t.name === "Economy" ? "Quad Sharing" : t.name === "Standard" ? "Triple Sharing" : "Double / Twin")})
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="text-sm font-extrabold text-[#153e35] dark:text-emerald-400">
                          {formatMoney(t.price)}
                        </strong>
                        <span className="text-[10px] text-slate-400 ml-1">/ person</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-navy-700">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setQuickViewPkg(null)}
              >
                Close
              </Button>
              <Link
                href={`/packages/${quickViewPkg.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#153e35] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#1f594d] dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                <span>Proceed to Book Online</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
