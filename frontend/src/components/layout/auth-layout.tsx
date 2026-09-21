"use client";
import { useHostContext } from "@/components/host-provider";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Compass } from "lucide-react";
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const context = useHostContext();
  const tenant = context?.plane === "tenant";
  const name = context?.branding?.display_name ?? "Your agency";
  return <div className="mx-auto grid min-h-[calc(100vh-90px)] max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-24"><div className="hidden lg:block"><Link href="/" className="mb-12 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16} />Back to home</Link><Compass size={42} strokeWidth={1} className="mb-8 text-teal-500" /><p className="mb-4 text-xs uppercase tracking-[.2em] text-teal-500">{tenant ? `Travel with ${name}` : "Your agency starts here"}</p><h2 className="text-5xl font-medium leading-tight">{tenant ? "Your journey." : "A little less admin."}<br /><span className="font-serif italic text-teal-600">{tenant ? "All in one place." : "A lot more possibility."}</span></h2><p className="mt-6 max-w-sm text-sm leading-7 text-slate-500">{tenant ? "Manage your family’s bookings, keep track of payments, and prepare for your journey with your agency." : "One place to organize the details, support your people, and move forward with confidence."}</p><div className="mt-10 space-y-4">{(tenant ? ["Journeys selected for you", "Your family’s booking details", "Payments and installments"] : ["Packages and bookings, together", "Payments with a clear picture", "Teams connected across branches"]).map(t => <p key={t} className="flex items-center gap-3 text-sm"><CheckCircle2 size={17} className="text-teal-500" />{t}</p>)}</div></div><div className="w-full max-w-md justify-self-center">{children}<p className="mt-6 text-center text-xs text-slate-500">{tenant ? name : "Wufud"} · With you, every step.</p></div></div>;
}
