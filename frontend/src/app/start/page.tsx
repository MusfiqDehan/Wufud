import { Suspense } from "react";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { SiteFooter } from "@/components/marketing/site-footer";
import { StartAgencyForm } from "./start-form";

export default function StartPage() {
  return (
    <MarketingShell ctaHref="/login" ctaLabel="Sign in">
      <Suspense fallback={<p className="py-24 text-center text-sm text-slate-500">Loading plans…</p>}>
        <StartAgencyForm />
      </Suspense>
      <SiteFooter />
    </MarketingShell>
  );
}
