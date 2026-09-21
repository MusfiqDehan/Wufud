import { Suspense } from "react";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PaymentOutcome } from "@/components/payments/payment-outcome";

export default function PaymentFailPage() {
  return (
    <MarketingShell ctaHref="/portal/bookings" ctaLabel="My bookings">
      <Suspense fallback={<p className="py-24 text-center text-sm text-slate-500">Loading payment result…</p>}>
        <PaymentOutcome expected="failure" />
      </Suspense>
      <SiteFooter />
    </MarketingShell>
  );
}
