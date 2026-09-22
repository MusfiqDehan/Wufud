"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Plane,
  Sparkles,
  Wallet,
} from "lucide-react";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useCrudList } from "@/features/crud";
import { api, ApiError } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { hasAccessToken, storefrontSession } from "@/lib/auth";
import { clearStoredAccessToken } from "@/lib/session";
import type { JourneyPackage } from "@/components/marketing/tenant-packages";

const formatMoney = (val?: string | number) => {
  if (val === undefined || val === null || val === "") return "—";
  const num = Number(val);
  if (isNaN(num)) return "—";
  return `${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(num)} BDT`;
};

export default function PackageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const list = useCrudList<JourneyPackage>("pubpkg", "/api/packages");
  const pkg = list.data?.items.find((p) => p.id === id);
  const [tierId, setTierId] = useState("");
  const [mode, setMode] = useState<"full" | "installment">("installment");
  const [pilgrims, setPilgrims] = useState<Array<{ fullName: string; passportNumber: string; nationality: string }>>([
    { fullName: "Demo Pilgrim", passportNumber: "A1234567", nationality: "BD" },
  ]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gatewaySlug, setGatewaySlug] = useState("");
  const gateways = useCrudList<{ slug: string; name: string; is_sandbox?: boolean }>(
    "avail-gw",
    "/api/payments/available-gateways",
  );

  useEffect(() => {
    setSignedIn(hasAccessToken());
  }, []);

  const chosenTier = pkg?.tiers?.find((t) => t.id === (tierId || pkg?.tiers?.[0]?.id));
  const maxPilgrims = pkg?.maxPilgrims ?? 10;
  const seatsAvailable = chosenTier
    ? chosenTier.seatsAvailable ??
      (chosenTier.seatsTotal - (chosenTier.seatsConfirmed ?? 0) - (chosenTier.seatsHeld ?? 0))
    : maxPilgrims;
  const maxAllowed = Math.max(1, Math.min(maxPilgrims, seatsAvailable));

  return (
    <MarketingShell>
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8">
        {/* Back Link */}
        <Link
          href="/packages"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-6"
        >
          <ArrowLeft size={14} />
          Back to all journeys
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] items-start">
          {/* Left Column: Rich Package Details */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 uppercase tracking-wider">
                  {pkg?.kind?.replaceAll("_", " ") || "Journey"}
                </span>
                {pkg?.durationDays && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-navy-700 dark:text-slate-200 flex items-center gap-1">
                    <Clock size={12} className="text-teal-600 dark:text-teal-400" />
                    {pkg.durationDays} Days / {pkg.durationDays - 1} Nights
                  </span>
                )}
                {pkg?.featured && (
                  <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-400/15 dark:text-amber-300 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-500" />
                    Most Popular
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {pkg?.name ?? "Pilgrimage Journey"}
              </h1>

              {pkg?.description && (
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {pkg.description}
                </p>
              )}
            </div>

            {/* Flight & Travel Information */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-navy-800/60 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Plane size={14} className="text-teal-600 dark:text-teal-400" />
                Flight & Departure Schedule
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Departure Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {pkg?.departureDate?.slice(0, 10) ?? "To be confirmed"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Flight / Carrier</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {pkg?.airline ?? "Direct / 1-Stop Transit"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sacred Sanctuary Accommodations */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 size={14} className="text-teal-600 dark:text-teal-400" />
                Verified Haram Accommodations
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-navy-800 shadow-2xs">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🕋</span> Makkah Al-Mukarramah
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {pkg?.makkahHotel || "Swissôtel Al Maqam Makkah (5-Star)"}
                  </p>
                  <p className="mt-1.5 text-xs text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-1">
                    <MapPin size={12} className="shrink-0" />
                    {pkg?.makkahDistance || "0m · Direct Haram Access"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-navy-800 shadow-2xs">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🕌</span> Madinah Al-Munawwarah
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {pkg?.madinahHotel || "Pullman Zamzam Madinah (5-Star)"}
                  </p>
                  <p className="mt-1.5 text-xs text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-1">
                    <MapPin size={12} className="shrink-0" />
                    {pkg?.madinahDistance || "50m · Facing Prophet's Mosque"}
                  </p>
                </div>
              </div>
            </div>

            {/* Inclusions */}
            {pkg?.inclusions && pkg.inclusions.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-navy-800 space-y-3 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  What is Included in Your Package
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-700 dark:text-slate-300">
                  {pkg.inclusions.map((inc, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{inc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Booking & Checkout Card */}
          <Card className="p-6 sm:p-7 shadow-lg border-amber-800/15 dark:border-white/10">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Book Your Pilgrimage
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Reserve seats for yourself and family members. Choose full payment or installment
                plan.
              </p>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                const chosen = tierId || pkg?.tiers?.[0]?.id;
                if (!chosen) {
                  setError("Choose a package tier first.");
                  return;
                }
                for (let i = 0; i < pilgrims.length; i++) {
                  if (!pilgrims[i].fullName.trim() || !pilgrims[i].passportNumber.trim()) {
                    setError(`Enter full name and passport number for Pilgrim ${i + 1}.`);
                    return;
                  }
                }
                const passports = pilgrims.map((p) => p.passportNumber.trim().toUpperCase());
                if (new Set(passports).size !== passports.length) {
                  setError("Passport numbers must be unique across all pilgrims.");
                  return;
                }
                setSubmitting(true);
                try {
                  if (!hasAccessToken()) {
                    if (!email || !password) {
                      throw new Error("Enter your email and password to complete the booking.");
                    }
                    await storefrontSession(email, password, pilgrims[0].fullName.trim());
                    setSignedIn(true);
                  }
                  const booking = await api<{ id: string; frozenPrice: string; downPayment?: string }>("/api/bookings", {
                    method: "POST",
                    body: JSON.stringify({
                      tierId: chosen,
                      paymentMode: mode,
                      pilgrims: pilgrims.map((p) => ({
                        fullName: p.fullName.trim(),
                        passportNumber: p.passportNumber.trim().toUpperCase(),
                        nationality: p.nationality || "BD",
                      })),
                    }),
                  });
                  const slug = gatewaySlug;
                  if (!slug) throw new Error("Choose a payment method.");
                  const payAmount =
                    mode === "installment"
                      ? booking.downPayment || (Number(booking.frozenPrice) * 0.3).toFixed(2)
                      : booking.frozenPrice;
                  const pay = await api<{ gateway_url: string }>("/api/payments/initiate", {
                    method: "POST",
                    body: JSON.stringify({
                      source_id: booking.id,
                      gateway_slug: slug,
                      amount: payAmount,
                      currency: "BDT",
                    }),
                  });
                  window.location.href = pay.gateway_url;
                } catch (err) {
                  if (
                    err instanceof ApiError &&
                    (err.error_code === "AUTHENTICATION_REQUIRED" ||
                      err.error_code === "TOKEN_EXPIRED")
                  ) {
                    clearStoredAccessToken();
                    setSignedIn(false);
                    setError("Sign in with your pilgrim email to complete this booking.");
                  } else {
                    setError(formatApiError(err, "We couldn't complete your booking. Try again."));
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <div>
                <Label>Select Room Tier</Label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-navy-600 dark:bg-navy-800 dark:text-white mt-1"
                  value={tierId}
                  onChange={(e) => setTierId(e.target.value)}
                >
                  {pkg?.tiers?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.roomType || (t.name === "Economy" ? "Quad" : t.name === "Standard" ? "Triple" : "Twin/Double")}) — {formatMoney(t.price)}
                    </option>
                  ))}
                </select>
              </div>

              {chosenTier && (
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block">
                        Package Price ({pilgrims.length} {pilgrims.length === 1 ? "Pilgrim" : "Pilgrims"})
                      </span>
                      <strong className="text-base font-extrabold text-emerald-800 dark:text-emerald-300">
                        {formatMoney(Number(chosenTier.price) * pilgrims.length)}
                      </strong>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-slate-400 block">{chosenTier.name} Tier</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        {formatMoney(chosenTier.price)} each
                      </span>
                    </div>
                  </div>

                  {mode === "installment" ? (
                    <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Due Today (30% Down Payment):
                      </span>
                      <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
                        {formatMoney(Number(chosenTier.price) * pilgrims.length * 0.3)}
                      </strong>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Due Today (Full Payment):
                      </span>
                      <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
                        {formatMoney(Number(chosenTier.price) * pilgrims.length)}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Payment Mode</Label>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-navy-600 dark:bg-navy-800 dark:text-white mt-1"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "full" | "installment")}
                  >
                    <option value="installment">Installment Plan</option>
                    <option value="full">Pay in Full</option>
                  </select>
                </div>

                <div>
                  <Label>Payment Gateway</Label>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-navy-600 dark:bg-navy-800 dark:text-white mt-1"
                    value={gatewaySlug}
                    onChange={(e) => setGatewaySlug(e.target.value)}
                    required
                  >
                    <option value="">Choose Method</option>
                    {(gateways.data?.items ?? []).map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.name}
                        {g.is_sandbox ? " (test)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Pilgrims Section */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Pilgrims ({pilgrims.length}/{maxAllowed})
                  </Label>
                  {pilgrims.length < maxAllowed && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2.5 border-teal-600/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-navy-700"
                      onClick={() => {
                        if (pilgrims.length < maxAllowed) {
                          setPilgrims((prev) => [...prev, { fullName: "", passportNumber: "", nationality: "BD" }]);
                        }
                      }}
                    >
                      + Add Pilgrim
                    </Button>
                  )}
                </div>

                {pilgrims.map((pilgrim, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-900/60 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{idx === 0 ? "Pilgrim 1 (Primary Contact)" : `Pilgrim ${idx + 1}`}</span>
                      {idx > 0 && (
                        <button
                          type="button"
                          className="text-rose-600 hover:text-rose-700 text-xs font-medium"
                          onClick={() => setPilgrims((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={pilgrim.fullName}
                        onChange={(e) =>
                          setPilgrims((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, fullName: e.target.value } : p)),
                          )
                        }
                        placeholder="Full Name"
                        required
                      />
                      <Input
                        value={pilgrim.passportNumber}
                        onChange={(e) =>
                          setPilgrims((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, passportNumber: e.target.value } : p)),
                          )
                        }
                        placeholder="Passport #"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              {signedIn ? (
                <p className="text-xs text-slate-500 font-medium">
                  Signed in. This booking will be securely saved to your account.
                </p>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-navy-900/60">
                  <Label>Pilgrim Account</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    required={!signedIn}
                  />
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (at least 6 characters)"
                    autoComplete="current-password"
                    required={!signedIn}
                    minLength={6}
                  />
                  <p className="text-[11px] text-slate-500">
                    New email creates your pilgrim account. Existing email signs you in.
                  </p>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-sm font-bold bg-[#153e35] hover:bg-[#1f594d] text-white dark:bg-amber-600 dark:hover:bg-amber-500"
                disabled={submitting}
              >
                {submitting ? "Processing Booking…" : "Confirm Booking & Proceed to Payment"}
              </Button>

              {!signedIn && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => router.push(`/login?next=/packages/${id}`)}
                >
                  Already have an account? Sign in first
                </Button>
              )}
            </form>
          </Card>
        </div>
      </div>
    </MarketingShell>
  );
}
