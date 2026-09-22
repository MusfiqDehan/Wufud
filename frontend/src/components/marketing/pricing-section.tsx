"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  Globe,
  HelpCircle,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "annual";

interface PlanItem {
  name: string;
  badge?: string;
  popular?: boolean;
  tagline: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  currency: string;
  priceNote?: string;
  href: string;
  trialDays: number;
  highlightStats: { label: string; value: string }[];
  features: string[];
}

const DEFAULT_PLANS: PlanItem[] = [
  {
    name: "Starter",
    tagline: "For boutique agencies & solo organizers launching professional digital bookings.",
    monthlyPrice: 4900,
    annualPrice: 3920,
    currency: "BDT",
    href: "/start?plan=starter",
    trialDays: 14,
    highlightStats: [
      { label: "Branch", value: "1 Branch" },
      { label: "Staff", value: "Up to 10 Users" },
      { label: "Pilgrims", value: "Unlimited" },
    ],
    features: [
      "Custom agency storefront & package catalog",
      "Dynamic seat integrity & room allocation",
      "Pilgrim profile, passport & family grouping",
      "Manual cash & bank transfer collection tracking",
      "Printable booking vouchers & pilgrim receipts",
      "Standard email & onboarding documentation",
    ],
  },
  {
    name: "Growth",
    badge: "MOST POPULAR",
    popular: true,
    tagline: "For established agencies operating across branches requiring complete financial control.",
    monthlyPrice: 12900,
    annualPrice: 10320,
    currency: "BDT",
    href: "/start?plan=growth",
    trialDays: 14,
    highlightStats: [
      { label: "Branches", value: "Up to 5 Branches" },
      { label: "Staff", value: "Up to 50 Users" },
      { label: "Custom Domain", value: "Included" },
    ],
    features: [
      "Everything in Starter, plus:",
      "Custom domain (youragency.com) with automated SSL",
      "Dynamic online payment gateways (SSLCommerz & Stripe)",
      "Accounts Hub: SAR & BDT vendor disbursements",
      "Automated pilgrim installment schedules & reminders",
      "Branch-level RBAC (isolate staff permissions by office)",
      "Stock management (Ihram, bags, Zamzam, ID tags)",
      "Self-service Pilgrim Portal for travelers",
      "Real-time departure quota & revenue analytics",
    ],
  },
  {
    name: "Enterprise",
    badge: "SCALE & CONSORTIUMS",
    tagline: "For nationwide operators, airline partners, and consortiums running high-volume departures.",
    monthlyPrice: null,
    annualPrice: null,
    currency: "BDT",
    priceNote: "Custom pricing / Volume scale",
    href: "/start?plan=enterprise",
    trialDays: 30,
    highlightStats: [
      { label: "Branches", value: "Unlimited" },
      { label: "Staff", value: "Unlimited" },
      { label: "SLA", value: "99.9% Uptime" },
    ],
    features: [
      "Everything in Growth, plus:",
      "Unlimited branches, headquarters & regional outlets",
      "Dedicated account manager & 24/7 priority emergency support",
      "Custom GDS, flight inventory & external ERP integrations",
      "Custom payment gateway adapters (regional & GCC banks)",
      "Automated settlement reconciliation & multi-bank support",
      "Detailed audit logging & security compliance reports",
      "Dedicated data migration from legacy spreadsheets/ERP",
    ],
  },
];

const FAQS = [
  {
    q: "Can we upgrade or switch plans when Hajj season approaches?",
    a: "Yes, absolutely. You can upgrade from Starter to Growth (or to Enterprise) at any time directly from your platform billing settings. Changes take effect immediately, and any unused balance is automatically prorated.",
  },
  {
    q: "How does the 14-day free trial work?",
    a: "You get full access to all features of your chosen plan for 14 days without entering any credit card or payment information. When the trial ends, you can choose to activate your subscription or contact us.",
  },
  {
    q: "Do you take a percentage or commission per booking?",
    a: "No! Wufud is a pure SaaS platform. We believe your pilgrimage revenues belong 100% to your agency. You pay only the flat monthly or annual software fee regardless of how many packages or pilgrims you handle.",
  },
  {
    q: "Can our branch staff only see bookings from their own branch?",
    a: "Yes. Wufud features granular Role-Based Access Control (RBAC). You can assign managers, package creators, and sales agents specifically scoped to individual branches so they only see and manage their branch's bookings and manual payments.",
  },
  {
    q: "How does multi-currency bookkeeping in BDT and Saudi Riyal (SAR) work?",
    a: "The Accounts Hub allows you to collect pilgrim payments in your local currency (BDT) while tracking hotel and transport vendor disbursements in Saudi Riyals (SAR), with automated exchange rate conversion and settlement reconciliation.",
  },
];

export function PricingTable({
  plans: customPlans,
}: {
  plans?: { name: string; price: string; features: string[]; href?: string; trial?: string }[];
}) {
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="pricing" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      {/* Background glow accents */}
      <div
        className="pointer-events-none absolute left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-3xl dark:opacity-20"
        aria-hidden
      >
        <div className="h-72 w-[600px] rounded-full bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-400" />
      </div>

      {/* Header */}
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-50/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-teal-600 backdrop-blur dark:border-teal-400/30 dark:bg-navy-800/90 dark:text-teal-300">
          <Sparkles size={14} className="text-teal-500 animate-pulse" />
          <span>Transparent & Predictable Investment</span>
        </div>

        <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl text-navy-900 dark:text-white">
          Simple plans for sacred journeys.
        </h2>

        <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
          Whether you run a focused boutique agency or manage nationwide departures across multiple branches, Wufud
          gives you a calm, unified workspace. No per-booking commissions.
        </p>

        {/* Billing cycle toggle */}
        <div className="mt-8 flex justify-center">
          <div className="relative flex items-center rounded-full border border-slate-200 bg-slate-100/90 p-1 shadow-inner dark:border-navy-700 dark:bg-navy-800">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={cn(
                "relative rounded-full px-5 py-2 text-xs font-semibold transition-all duration-200",
                cycle === "monthly"
                  ? "bg-white text-navy-900 shadow-sm dark:bg-navy-700 dark:text-white"
                  : "text-slate-600 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              Billed Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("annual")}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all duration-200",
                cycle === "annual"
                  ? "bg-white text-navy-900 shadow-sm dark:bg-navy-700 dark:text-white"
                  : "text-slate-600 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              <span>Billed Annually</span>
              <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:bg-teal-400/20 dark:text-teal-300">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="relative mt-14 grid gap-8 lg:grid-cols-3 lg:items-stretch">
        {DEFAULT_PLANS.map((plan) => {
          const isAnnual = cycle === "annual";
          const displayPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
          const monthlyEquivalent = plan.monthlyPrice;
          const savings =
            plan.monthlyPrice && plan.annualPrice
              ? (plan.monthlyPrice * 12 - plan.annualPrice * 12).toLocaleString()
              : null;

          return (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col justify-between rounded-3xl p-8 transition-all duration-300",
                plan.popular
                  ? "border-2 border-teal-500 bg-white/95 shadow-xl shadow-teal-500/10 ring-4 ring-teal-500/10 dark:border-teal-400 dark:bg-navy-800/95 lg:-translate-y-2"
                  : "border border-slate-200/90 bg-white/70 shadow-sm hover:shadow-md hover:border-slate-300 dark:border-navy-700/80 dark:bg-navy-800/60 dark:hover:border-navy-600"
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md shadow-teal-500/30">
                    <Sparkles size={12} />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-navy-900 dark:text-white">{plan.name}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 min-h-[32px]">{plan.tagline}</p>
                  </div>
                  {!plan.popular && plan.badge && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-navy-700 dark:text-slate-300">
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="mt-6 border-y border-slate-100 py-6 dark:border-navy-700">
                  {displayPrice !== null ? (
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400">
                          {plan.currency}
                        </span>
                        <span className="text-4xl font-extrabold tracking-tight text-navy-900 dark:text-white sm:text-5xl">
                          {displayPrice.toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/ month</span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {isAnnual ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-teal-600 dark:text-teal-300">
                            <span>Billed annually (BDT {(displayPrice * 12).toLocaleString()}/yr)</span>
                            {savings && (
                              <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal-600 dark:text-teal-300">
                                Save BDT {savings}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>Billed monthly. Cancel anytime.</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl font-bold text-navy-900 dark:text-white">Custom / Let’s talk</div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Tailored volume agreements for large groups & airlines.
                      </p>
                    </div>
                  )}

                  {/* Highlights Stat Pill Grid */}
                  <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center dark:bg-navy-900/60">
                    {plan.highlightStats.map((stat) => (
                      <div key={stat.label} className="flex flex-col">
                        <span className="text-[11px] font-bold text-navy-900 dark:text-slate-100 truncate">
                          {stat.value}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature List */}
                <div className="mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Included with {plan.name}:
                  </p>
                  <ul className="mt-3.5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    {plan.features.map((feature, idx) => {
                      const isHeader = feature.endsWith(":");
                      if (isHeader) {
                        return (
                          <li
                            key={idx}
                            className="pt-2 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400"
                          >
                            {feature}
                          </li>
                        );
                      }
                      return (
                        <li key={idx} className="flex items-start gap-2.5 leading-snug">
                          <span
                            className={cn(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                              plan.popular
                                ? "bg-teal-500 text-white dark:bg-teal-400 dark:text-navy-900"
                                : "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300"
                            )}
                          >
                            <Check size={11} strokeWidth={2.5} />
                          </span>
                          <span>{feature}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Action Button & Guarantee */}
              <div className="mt-8 pt-6">
                <Button
                  asChild
                  size="lg"
                  variant={plan.popular ? "default" : "outline"}
                  className={cn(
                    "w-full h-12 text-sm font-semibold transition-all duration-200",
                    plan.popular
                      ? "bg-teal-600 text-white shadow-lg shadow-teal-600/25 hover:bg-teal-500 dark:bg-teal-500 dark:text-navy-900 dark:hover:bg-teal-400"
                      : "border-slate-300 hover:border-teal-500 hover:text-teal-600 dark:border-navy-600 dark:hover:border-teal-400"
                  )}
                >
                  <Link href={plan.href} className="flex items-center justify-center gap-2">
                    <span>{plan.monthlyPrice !== null ? `Start ${plan.trialDays}-day free trial` : "Talk to our team"}</span>
                    <ArrowRight size={16} />
                  </Link>
                </Button>

                <p className="mt-2.5 text-center text-[11px] text-slate-500 dark:text-slate-400">
                  {plan.monthlyPrice !== null
                    ? `${plan.trialDays}-day free trial · No credit card required`
                    : "Customized pilot & SLA contract"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Assurance Badges */}
      <div className="mt-16 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 backdrop-blur dark:border-navy-700 dark:bg-navy-800/50">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 dark:text-white">
                Isolated Schemas
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Each tenant gets a private PostgreSQL schema. Your agency data is strictly isolated.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300">
              <Zap size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 dark:text-white">
                Zero Setup Fees
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Instant provisioning. Launch your agency workspace in 60 seconds with no onboarding fees.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300">
              <RotateCcw size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 dark:text-white">
                No Lock-In Contract
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Upgrade, downgrade, or export your pilgrim data and accounting records whenever you want.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300">
              <CreditCard size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 dark:text-white">
                Zero Commissions
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                We never take a cut of your package sales. 100% of pilgrim payments belong to your agency.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing FAQs Accordion */}
      <div className="mt-16 mx-auto max-w-3xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            <HelpCircle size={14} />
            <span>Questions & Answers</span>
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 dark:text-white">
            Frequently asked questions about pricing
          </h3>
        </div>

        <div className="mt-8 space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-navy-700 dark:bg-navy-800"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-semibold text-navy-900 dark:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={cn("shrink-0 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-3 text-xs leading-relaxed text-slate-600 dark:border-navy-700 dark:text-slate-300">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
