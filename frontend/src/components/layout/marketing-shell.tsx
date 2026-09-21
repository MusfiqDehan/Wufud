"use client";
import { useHostContext } from "@/components/host-provider";
import { AgencyLogo } from "./agency-logo";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export function MarketingShell({ children, ctaHref = "/login", ctaLabel = "Sign in", tenant: tenantProp = false }: { children: React.ReactNode; ctaHref?: string; ctaLabel?: string; tenant?: boolean }) {
  const context = useHostContext();
  const tenant = tenantProp || context?.plane === "tenant";
  const agencyName = context?.branding?.display_name ?? context?.tenant?.name ?? "Your agency";
  return (
    <div className={tenant ? "tenant-site min-h-screen bg-[#faf7ef] dark:bg-navy-900" : "min-h-screen"}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-surface/95 backdrop-blur dark:border-navy-700 dark:bg-navy-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link href="/" aria-label={tenant ? `${agencyName} home` : "Wufud home"}>{tenant ? <AgencyLogo name={agencyName} /> : <BrandLogo />}</Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
            <Link href="/#features" className="hover:text-teal-500">{tenant ? "Why travel with us" : "Features"}</Link>
            {!tenant && <Link href="/#solutions" className="hover:text-teal-500">Who it’s for</Link>}
            {!tenant && <Link href="/#pricing" className="hover:text-teal-500">Pricing</Link>}
            {tenant && <Link href="/packages" className="hover:text-teal-500">Our journeys</Link>}
          </nav>
          <div className="flex items-center gap-2"><ThemeToggle /><Button asChild><Link href={ctaHref}>{ctaLabel}<ArrowUpRight className="hidden h-4 w-4 sm:block" /></Link></Button></div>
        </div>
        <nav aria-label="Mobile navigation" className="flex justify-center gap-6 border-t border-slate-200/60 px-4 py-3 text-xs dark:border-navy-700 md:hidden"><Link href="/#features">{tenant ? "Why travel with us" : "Features"}</Link>{!tenant && <Link href="/#pricing">Pricing</Link>}{tenant && <Link href="/packages">Our journeys</Link>}</nav>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
