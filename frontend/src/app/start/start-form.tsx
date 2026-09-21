"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { firstZodIssueMessage, validateStartAgency } from "@/lib/validation";
import { useCrudList } from "@/features/crud";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceMonthly: string;
  currency?: string;
  features?: string[];
  maxUsers?: number;
  maxBranches?: number;
  trialDays?: number;
};

type Gateway = { slug: string; name: string; is_sandbox?: boolean };

function platformRoot() {
  if (typeof window === "undefined") return "wufud.localhost";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "wufud.localhost";
  return host;
}

function money(value: string, currency = "BDT") {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "Custom";
  return `${currency} ${n.toLocaleString()}/mo`;
}

export function StartAgencyForm() {
  const params = useSearchParams();
  const plansQuery = useCrudList<Plan>("public-plans", "/api/public/plans");
  const gatewaysQuery = useCrudList<Gateway>("billing-gateways", "/api/public/billing-gateways");
  const plans = plansQuery.data?.items ?? [];
  const gateways = gatewaysQuery.data?.items ?? [];
  const [planId, setPlanId] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"trial" | "paid">("trial");
  const [gatewaySlug, setGatewaySlug] = useState("");
  const [slugOk, setSlugOk] = useState<{ available: boolean; reason?: string; slug: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ login_url: string; slug: string } | null>(null);
  const [awaitingEmail, setAwaitingEmail] = useState<{ email: string; slug: string } | null>(null);

  const selected = useMemo(() => plans.find((p) => p.id === planId || p.slug === planId), [plans, planId]);
  const price = Number(selected?.priceMonthly ?? 0);
  const trialDays = selected?.trialDays ?? 0;
  const canTrial = trialDays > 0;
  const canPay = price > 0;

  useEffect(() => {
    const wanted = params.get("plan");
    const match = plans.find((p) => p.slug === wanted || p.id === wanted) ?? plans[0];
    if (match) setPlanId(match.id);
  }, [plans, params]);

  useEffect(() => {
    if (!gatewaySlug && gateways[0]) setGatewaySlug(gateways[0].slug);
  }, [gateways, gatewaySlug]);

  useEffect(() => {
    if (!slugTouched && agencyName) setSlug(agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  }, [agencyName, slugTouched]);

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugOk(null);
      return;
    }
    const t = setTimeout(() => {
      void api<{ available: boolean; reason?: string; slug: string }>(`/api/public/onboard/slug?slug=${encodeURIComponent(slug)}`).then(setSlugOk);
    }, 250);
    return () => clearTimeout(t);
  }, [slug]);

  useEffect(() => {
    if (mode === "trial" && !canTrial && canPay) setMode("paid");
    if (mode === "paid" && !canPay && canTrial) setMode("trial");
  }, [mode, canTrial, canPay]);

  if (awaitingEmail) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center sm:p-10">
        <p className="text-xs uppercase tracking-[.18em] text-teal-600">Check your email</p>
        <h1 className="mt-3 text-2xl font-semibold">Verify to create your workspace.</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          We sent a link to <span className="font-medium text-slate-700 dark:text-slate-200">{awaitingEmail.email}</span>.
          Your subdomain <span className="font-mono">{awaitingEmail.slug}.{platformRoot()}</span> is reserved until you verify — nothing is provisioned until then.
        </p>
        <Button asChild variant="outline" className="mt-8 w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center sm:p-10">
        <p className="text-xs uppercase tracking-[.18em] text-teal-600">Agency ready</p>
        <h1 className="mt-3 text-2xl font-semibold">Your workspace is live.</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Sign in on <span className="whitespace-nowrap font-mono text-slate-700 dark:text-slate-200">{done.slug}.{platformRoot()}</span> with the password you just chose.
        </p>
        <Button asChild className="mt-8 w-full">
          <a href={done.login_url}>Sign in to your agency</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8">
      <p className="text-xs uppercase tracking-[.18em] text-teal-600">Start your agency</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Create your workspace and subdomain.</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
        Pick a plan, claim a unique subdomain, and start on a trial or pay for the first month.
      </p>

      <form
        className="mt-10 space-y-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (!selected) {
            setError("Choose a plan.");
            return;
          }
          const check = validateStartAgency({
            agencyName,
            slug,
            fullName,
            email,
            password,
            planId: selected.id,
            mode,
            gatewaySlug: mode === "paid" ? gatewaySlug : undefined,
            slugAvailable: slugOk?.available ?? undefined,
          });
          if (!check.success) {
            setError(firstZodIssueMessage(check));
            return;
          }
          if (slugOk && !slugOk.available) {
            setError(slugOk.reason ?? "That subdomain is not available. Try another one.");
            return;
          }
          setPending(true);
          try {
            const result = await api<{
              status: string;
              login_url?: string;
              gateway_url?: string;
              slug: string;
              email?: string;
              verify_url?: string;
            }>("/api/public/onboard", {
              method: "POST",
              body: JSON.stringify({
                agencyName,
                slug,
                fullName,
                email,
                password,
                planId: selected.id,
                mode,
                gatewaySlug: mode === "paid" ? gatewaySlug : undefined,
              }),
            });
            if (result.status === "pending_payment" && result.gateway_url) {
              window.location.href = result.gateway_url;
              return;
            }
            if (result.status === "pending_verification") {
              if (result.verify_url && typeof window !== "undefined") {
                window.location.href = result.verify_url;
                return;
              }
              setAwaitingEmail({ email: result.email ?? email, slug: result.slug });
              return;
            }
            if (result.login_url) setDone({ login_url: result.login_url, slug: result.slug });
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setPending(false);
          }
        }}
      >
        {plansQuery.isError ? (
          <p role="alert" className="text-sm text-red-600">Could not load plans. Refresh and try again.</p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((plan) => {
            const active = selected?.id === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanId(plan.id)}
                className={cn(
                  "rounded-2xl border p-5 text-left transition",
                  active ? "border-teal-500 bg-teal-50 dark:bg-navy-800" : "border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-900",
                )}
              >
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-2 text-lg font-medium tracking-tight">{money(plan.priceMonthly, plan.currency)}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {plan.trialDays ? `${plan.trialDays}-day trial` : "No trial"} · {plan.maxUsers || "Unlimited"} users
                </p>
              </button>
            );
          })}
        </div>

        <Card className="space-y-4 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="agency-name">Agency name</Label>
              <Input id="agency-name" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="slug">Subdomain</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                {slug || "your-agency"}.{platformRoot()}
                {slugOk ? ` · ${slugOk.available ? "available" : slugOk.reason}` : ""}
              </p>
            </div>
            <div>
              <Label htmlFor="full-name">Your name</Label>
              <Input id="full-name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">How would you like to start?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={cn("cursor-pointer rounded-xl border p-4", mode === "trial" ? "border-teal-500" : "border-slate-200 dark:border-navy-700")}>
                <input
                  type="radio"
                  name="mode"
                  className="sr-only"
                  checked={mode === "trial"}
                  disabled={!canTrial}
                  onChange={() => setMode("trial")}
                />
                <p className="font-medium">Trial{selected ? ` · ${trialDays} days` : ""}</p>
                <p className="mt-1 text-xs text-slate-500">{canTrial ? "Verify your email to create the workspace. No charge today." : "This plan does not include a trial."}</p>
              </label>
              <label className={cn("cursor-pointer rounded-xl border p-4", mode === "paid" ? "border-teal-500" : "border-slate-200 dark:border-navy-700")}>
                <input
                  type="radio"
                  name="mode"
                  className="sr-only"
                  checked={mode === "paid"}
                  disabled={!canPay}
                  onChange={() => setMode("paid")}
                />
                <p className="font-medium">Pay first month{selected && canPay ? ` · ${money(selected.priceMonthly, selected.currency)}` : ""}</p>
                <p className="mt-1 text-xs text-slate-500">{canPay ? "Choose a gateway. After payment you sign in on your subdomain." : "This plan is not billed online."}</p>
              </label>
            </div>
          </div>

          {mode === "paid" ? (
            <div>
              <Label htmlFor="gateway">Payment method</Label>
              <select
                id="gateway"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-800"
                value={gatewaySlug}
                onChange={(e) => setGatewaySlug(e.target.value)}
                required
              >
                <option value="">Choose a gateway</option>
                {gateways.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.name}
                    {g.is_sandbox ? " (sandbox)" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending || (slugOk != null && !slugOk.available)} aria-busy={pending}>
            {pending ? "Working…" : mode === "paid" ? "Continue to payment" : "Create agency"}
          </Button>
          <p className="text-center text-sm text-slate-500">
            Already have an account? <Link href="/login" className="font-medium text-teal-600">Sign in</Link>
          </p>
        </Card>
      </form>
    </div>
  );
}
