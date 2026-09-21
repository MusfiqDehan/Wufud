"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { money } from "@/features/portal";

type AttemptStatus = "success" | "failed" | "cancelled" | "pending" | "init";
type Attempt = {
  tran_id: string;
  status: AttemptStatus;
  amount: string;
  currency: string;
  gateway_slug: string;
  gateway_name?: string;
  kind?: "booking" | "subscription";
  agency_slug?: string;
  agency_name?: string;
  login_url?: string;
};

const copy = {
  success: {
    eyebrow: "Payment confirmed",
    title: "Thank you. Your payment went through.",
    body: "Your agency has received this payment. Keep the reference below with your booking.",
    primary: { href: "/portal/bookings", label: "View my bookings" },
    secondary: { href: "/packages", label: "Browse journeys" },
  },
  failed: {
    eyebrow: "Payment unsuccessful",
    title: "This payment did not go through.",
    body: "Nothing was taken, or the bank declined the charge. You can try again with the same or another method.",
    primary: { href: "/packages", label: "Try another payment" },
    secondary: { href: "/portal/bookings", label: "View my bookings" },
  },
  cancelled: {
    eyebrow: "Payment cancelled",
    title: "You left checkout before finishing.",
    body: "No payment was taken. Your booking is still held if seats remain — you can pay from your bookings whenever you are ready.",
    primary: { href: "/packages", label: "Return to journeys" },
    secondary: { href: "/portal/bookings", label: "View my bookings" },
  },
} as const;

function outcomeOf(status?: string, expected?: "success" | "failure"): keyof typeof copy {
  if (status === "success") return "success";
  if (status === "cancelled") return "cancelled";
  if (status === "failed") return "failed";
  return expected === "success" ? "success" : "failed";
}

export function PaymentOutcome({ expected }: { expected: "success" | "failure" }) {
  const params = useSearchParams();
  const tranId = params.get("tran_id") ?? "";
  const reason = params.get("reason");
  const lookup = useQuery({
    queryKey: ["payment-attempt", tranId],
    queryFn: () => api<Attempt>(`/api/payments/attempts/${encodeURIComponent(tranId)}`),
    enabled: Boolean(tranId),
    retry: false,
  });

  const missing = lookup.error instanceof ApiError && lookup.error.status === 404;
  const outcome = outcomeOf(lookup.data?.status ?? (reason === "cancelled" ? "cancelled" : undefined), expected);
  const isSub = lookup.data?.kind === "subscription";
  const view = copy[outcome];
  const title = isSub && outcome === "success" ? "Your agency is ready." : view.title;
  const body =
    isSub && outcome === "success"
      ? "Payment confirmed. Sign in on your new subdomain with the password you chose."
      : isSub && outcome !== "success"
        ? "No subscription was created. You can start again and pick the same or another payment method."
        : view.body;
  const primary =
    isSub && outcome === "success" && lookup.data?.login_url
      ? { href: lookup.data.login_url, label: "Sign in to your agency", external: true }
      : isSub
        ? { href: "/start", label: outcome === "success" ? "Continue setup" : "Try again", external: false }
        : { ...view.primary, external: false };
  const secondary = isSub ? { href: "/", label: "Back to Wufud", external: false } : { ...view.secondary, external: false };
  const Icon = outcome === "success" ? CheckCircle2 : outcome === "cancelled" ? CircleAlert : CircleX;
  const iconWrap =
    outcome === "success"
      ? "bg-teal-100 text-teal-700 dark:bg-teal-600/20 dark:text-teal-200"
      : outcome === "cancelled"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
        : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-200";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-90px)] max-w-lg flex-col justify-center px-6 py-16">
      <Card className="p-8 text-center sm:p-10">
        <span className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${iconWrap}`} aria-hidden>
          <Icon size={32} strokeWidth={1.5} />
        </span>
        <p className="text-xs uppercase tracking-[.18em] text-teal-600">{view.eyebrow}</p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">{body}</p>

        {lookup.isPending && tranId ? (
          <p role="status" className="mt-6 text-sm text-slate-500">
            Checking your payment…
          </p>
        ) : null}

        {missing && outcome !== "success" ? (
          <p role="status" className="mt-6 text-sm text-slate-500">
            We could not match this payment. If money left your account, share the reference below with your agency.
          </p>
        ) : null}

        {lookup.data || tranId ? (
          <dl className="mt-7 divide-y divide-slate-100 rounded-2xl border border-slate-100 text-left text-sm dark:divide-navy-700 dark:border-navy-700">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-slate-500">Reference</dt>
              <dd className="font-mono text-xs sm:text-sm">{lookup.data?.tran_id ?? tranId}</dd>
            </div>
            {lookup.data?.amount ? (
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-medium tabular-nums">
                  {lookup.data.currency} {money(lookup.data.amount)}
                </dd>
              </div>
            ) : null}
            {lookup.data?.gateway_name ? (
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-slate-500">Method</dt>
                <dd>{lookup.data.gateway_name}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-8 flex flex-col gap-2">
          <Button asChild className="w-full">
            {primary.external ? <a href={primary.href}>{primary.label}</a> : <Link href={primary.href}>{primary.label}</Link>}
          </Button>
          <Button asChild variant="outline" className="w-full">
            {secondary.external ? <a href={secondary.href}>{secondary.label}</a> : <Link href={secondary.href}>{secondary.label}</Link>}
          </Button>
        </div>
      </Card>
    </div>
  );
}
