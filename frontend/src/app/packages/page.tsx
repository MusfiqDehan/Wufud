"use client";

import { TenantPackages } from "@/components/marketing/tenant-packages";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { SiteFooter } from "@/components/marketing/sections";

export default function PackagesPage() {
  return (
    <MarketingShell>
      <div className="mx-auto min-h-[65vh] max-w-7xl px-6 py-14 sm:px-8">
        <p className="text-xs uppercase tracking-[.2em] text-amber-700 dark:text-amber-400 font-semibold">
          Sacred Pilgrimages & Spiritual Journeys
        </p>
        <h1 className="mt-3 font-serif text-4xl font-bold sm:text-5xl text-slate-900 dark:text-white">
          Explore Our Journeys
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Compare Hajj, Ramadan Umrah, and Ziyarah packages with verified 5-star Haram
          accommodations, direct flights, and flexible installment plans for your whole family.
        </p>

        <div className="mt-10">
          <TenantPackages />
        </div>
      </div>
      <SiteFooter />
    </MarketingShell>
  );
}
