import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, Compass, Globe2, Layers3, ShieldCheck, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/layout/brand-logo";
export { SiteFooter } from "./site-footer";

export function Hero({ eyebrow, title, subtitle, primaryHref, primaryLabel }: { eyebrow: string; title: string; subtitle: string; primaryHref: string; primaryLabel: string }) {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
      <div>
        <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-teal-600 dark:bg-navy-800 dark:text-teal-200"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" />{eyebrow} · Made for meaningful journeys</p>
        <h1 className="max-w-2xl text-4xl font-medium leading-[1.1] tracking-[-.055em] sm:text-5xl lg:text-[64px]">{title}</h1>
        <p className="mt-6 max-w-lg text-base leading-8 text-slate-500 dark:text-slate-300">{subtitle}</p>
        <div className="mt-8 flex flex-wrap items-center gap-5"><Button asChild size="lg"><Link href={primaryHref}>{primaryLabel}<ArrowUpRight size={18} /></Link></Button><Link href="#features" className="flex items-center gap-2 text-sm font-medium">Discover Wufud <ArrowRight size={16} /></Link></div>
        <div className="mt-9 flex flex-wrap gap-5 text-xs text-slate-500"><span className="flex items-center gap-2"><ShieldCheck size={16} className="text-teal-500" />Built around your agency</span><span className="flex items-center gap-2"><Users size={16} className="text-teal-500" />Connected at every step</span></div>
      </div>
      <div className="relative pb-8 pl-3 sm:pl-7">
        <div className="hero-art relative flex min-h-[400px] flex-col justify-between overflow-hidden rounded-t-[160px] rounded-b-3xl p-8 text-navy-900 sm:min-h-[470px]">
          <div className="absolute inset-5 rounded-t-[145px] rounded-b-2xl border border-white/30" />
          <div className="relative mx-auto mt-8 text-center"><BrandLogo variant="mark" className="mx-auto h-16 w-16 drop-shadow-md" /><p className="mt-4 text-[10px] uppercase tracking-[.25em]">A purpose beyond the destination</p><p className="mt-4 font-serif text-4xl leading-tight">Extraordinary journeys.<br /><span className="italic">Beautifully managed.</span></p></div>
          <svg viewBox="0 0 440 190" className="relative mt-5 w-full" role="img" aria-label="Illustration of mosque domes and arches"><path d="M0 175h440v15H0z" fill="#42695b"/><path d="M148 170V94q72-100 144 0v76" fill="#f3ecd8"/><path d="M142 96q78-120 156 0z" fill="#315a4e"/><path d="M215 19h10v17h-10z" fill="#315a4e"/><path d="M181 175v-45q39-58 78 0v45" fill="#648573"/><path d="M205 175v-35q15-28 30 0v35" fill="#1d443b"/><path d="M68 175V62h24v113M348 175V62h24v113" fill="#f3ecd8"/><path d="M63 62l17-30 17 30M343 62l17-30 17 30" fill="#315a4e"/><path d="M73 80h14v35H73M353 80h14v35h-14" fill="#719483"/><path d="M15 175v-40q23-38 46 0v40M379 175v-40q23-38 46 0v40" fill="#dce0c9"/></svg>
          <div className="relative mt-2 flex justify-between text-[10px] uppercase tracking-[.18em]"><span>Hajj & Umrah</span><span>With you, all the way</span></div>
        </div>
        <div className="absolute bottom-0 left-0 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-navy-700 dark:bg-navy-800"><span className="rounded-full bg-teal-50 p-2.5 text-teal-600"><CheckCircle2 size={22} /></span><div><p className="text-sm font-semibold">Less administration. More care.</p><p className="mt-1 text-xs text-slate-500">One workspace for the whole journey</p></div></div>
      </div>
    </section>
  );
}
const icons = [Globe2, ShieldCheck, Wallet, Users, Layers3, Compass];
export function FeatureGrid({ items }: { items: { title: string; body: string }[] }) {
  return <section id="features" className="mx-auto max-w-7xl px-6 py-20 sm:px-8"><div className="mb-10 grid gap-5 md:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-teal-500">Thoughtfully connected</p><h2 className="mt-3 text-3xl font-medium sm:text-4xl">Everything in place.<br />Every journey in focus.</h2></div><p className="max-w-md self-end text-sm leading-7 text-slate-500">Bring your people, packages, and payments together. Spend less time managing the details and more time supporting the people who trust you.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, i) => { const Icon = icons[i % icons.length]; return <Card key={item.title} className="p-7 shadow-none"><span className="mb-6 inline-flex rounded-xl bg-teal-50 p-3 text-teal-600 dark:bg-navy-700 dark:text-teal-200"><Icon size={22} strokeWidth={1.5} /></span><h3 className="text-lg font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-300">{item.body}</p></Card>; })}</div></section>;
}
export function ImpactStats({ items }: { items: { value: string; label: string }[] }) {
  return <section className="border-y border-teal-400/15 bg-teal-50 py-10 dark:bg-navy-800"><div className="mx-auto grid max-w-7xl gap-8 px-8 text-center sm:grid-cols-3">{items.map(item => <div key={item.label}><div className="text-3xl font-medium tracking-tight text-teal-600 dark:text-teal-200">{item.value}</div><div className="mt-2 text-xs text-slate-500 dark:text-slate-300">{item.label}</div></div>)}</div></section>;
}
export function SolutionsTabs({ items }: { items: { persona: string; body: string }[] }) {
  return <section id="solutions" className="mx-auto max-w-7xl px-6 py-20 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[.18em] text-teal-500">One connected experience</p><h2 className="mt-3 text-3xl font-medium sm:text-4xl">Built for everyone on the journey.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{items.map((item, i) => <div key={item.persona} className="border-t border-slate-200 pt-6 dark:border-navy-700"><span className="text-xs text-teal-500">0{i + 1} /</span><h3 className="mt-5 text-xl font-semibold">{item.persona}</h3><p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-300">{item.body}</p></div>)}</div></section>;
}
export { PricingTable } from "./pricing-section";
export function CtaBand({ title, href, label }: { title: string; href: string; label: string }) {
  return <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-8"><div className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-navy-900 p-8 text-white sm:p-12 md:flex-row md:items-center"><div><p className="mb-4 text-xs uppercase tracking-[.18em] text-teal-200">The next journey starts here</p><h2 className="max-w-xl text-3xl font-medium sm:text-4xl">{title}</h2></div><Button asChild size="lg" className="shrink-0 bg-teal-200 text-navy-900 hover:bg-teal-100"><Link href={href}>{label}<ArrowUpRight size={18} /></Link></Button></div></section>;
}
