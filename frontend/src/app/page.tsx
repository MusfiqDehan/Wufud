import { TenantLanding } from "@/components/marketing/tenant-landing";
import { headers } from "next/headers";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { CtaBand, FeatureGrid, Hero, ImpactStats, PricingTable, SiteFooter, SolutionsTabs } from "@/components/marketing/sections";
import { fetchContext } from "@/lib/host";

export default async function HomePage() {
  const host = (await headers()).get("host") ?? "localhost";
  let ctx;
  try {
    ctx = await fetchContext(host);
  } catch {
    return <div className="mx-auto max-w-xl px-6 py-24 text-center"><p className="text-xs uppercase tracking-widest text-slate-500">Site temporarily unavailable</p><h1 className="mt-4 text-3xl font-semibold">We couldn’t load this website.</h1><p className="mt-4 text-slate-500">Please try again shortly. Your agency’s website will be available when the connection is restored.</p><a href="/" className="mt-6 inline-block rounded-lg bg-navy-900 px-6 py-3 text-white">Try again</a></div>;
  }

  if (ctx.plane === "tenant") return <TenantLanding context={ctx} />;

  return (
    <MarketingShell ctaHref="/login" ctaLabel="Platform login">
      <Hero
        eyebrow="Wufud"
        title="Hajj & Umrah journeys, beautifully managed."
        subtitle="From the first booking to the journey home. Bring your packages, pilgrims, teams, and payments together in one calm, connected workspace."
        primaryHref="/start"
        primaryLabel="Start your agency"
      />
      <FeatureGrid
        items={[
          { title: "Agency storefront", body: "Custom domain, SEO, and branded package browsing." },
          { title: "Seat integrity", body: "Manage availability with confidence and keep every package within its seat capacity." },
          { title: "Dynamic gateways", body: "SSLCommerz and Stripe, plus manual branch collections." },
          { title: "Branch management", body: "Give each team the tools and access they need, with a clear view across branches." },
          { title: "Accounts", body: "Installments, refunds, SAR/BDT vendor disbursements, stock." },
          { title: "Reports", body: "Collections, outstanding, refunds, remaining quota." },
        ]}
      />
      <ImpactStats
        items={[
          { value: "One workspace", label: "From booking to reconciliation" },
          { value: "Every branch", label: "Working together, with clear access" },
          { value: "Flexible payments", label: "Online, at the branch, or in installments" },
        ]}
      />
      <SolutionsTabs
        items={[
          { persona: "Platform operator", body: "Invite tenants, toggle features, watch usage, take subscription payments." },
          { persona: "Agency owner", body: "Run packages, staff, branches, and finance from one dashboard." },
          { persona: "Pilgrim", body: "Browse, book the family, pay in full or installments, track the journey." },
        ]}
      />
      <PricingTable
        plans={[
          { name: "Starter", price: "BDT 4,900/mo", href: "/start?plan=starter", trial: "14-day trial", features: ["1 branch", "Core booking", "Email support"] },
          { name: "Growth", price: "BDT 12,900/mo", href: "/start?plan=growth", trial: "14-day trial", features: ["5 branches", "Accounts & reports", "Custom domain"] },
          { name: "Enterprise", price: "Let’s talk", href: "/start?plan=enterprise", trial: "30-day trial", features: ["Unlimited", "Dedicated onboarding", "SLA"] },
        ]}
      />
      <CtaBand title="Launch your agency on Wufud." href="/start" label="Start your agency" />
      <SiteFooter />
    </MarketingShell>
  );
}
