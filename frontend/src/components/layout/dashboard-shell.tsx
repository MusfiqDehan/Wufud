"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessFeature, type AccessMe, type FeatureGroup } from "@wufud/contracts";
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  Boxes,
  Building2,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  Globe,
  Landmark,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal,
  Package,
  Receipt,
  RotateCcw,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { useHostContext } from "@/components/host-provider";
import { AgencyLogo } from "./agency-logo";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function routeIcon(route: string) {
  if (/settlement/.test(route)) return Scale;
  if (/refund/.test(route)) return RotateCcw;
  if (/vendor/.test(route)) return Building2;
  if (/disbursement/.test(route)) return Banknote;
  if (/stock/.test(route)) return Boxes;
  if (/expense/.test(route)) return Receipt;
  if (/pos/.test(route)) return ShoppingBag;
  if (/payment|gateway/.test(route)) return CreditCard;
  if (/account/.test(route)) return Landmark;
  if (/tenant|branch/.test(route)) return Building2;
  if (/user|pilgrim|permission/.test(route)) return Users;
  if (/email|mail/.test(route)) return Mail;
  if (/billing/.test(route)) return CreditCard;
  if (/domain|seo/.test(route)) return Globe;
  if (/package|plan|booking/.test(route)) return Package;
  if (/report/.test(route)) return BarChart3;
  if (/audit/.test(route)) return FileText;
  return Settings;
}

export function DashboardShell({ access, registry, children, home }: { access: AccessMe; registry: FeatureGroup[]; children: React.ReactNode; home: string }) {
  const context = useHostContext();
  const platform = home === "/admin";
  const agencyName = context?.branding?.display_name ?? access.tenant?.name ?? "Your agency";
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); document.querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')?.focus(); } };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);
  const items = registry.flatMap(g => g.children).filter(c => c.route && canAccessFeature(c.key, "view", access));
  const title = items.find(i => i.route === path)?.name ?? "Overview";
  const workspace = home === "/admin" ? "Platform console" : home === "/portal" ? "My journey" : "Agency operations";

  const flatNav = [{ key: "workspace-home", name: "Overview", route: home }, ...items.filter((i) => i.route !== home)];
  // Bottom nav: Overview + up to 3 primary + More (opens drawer)
  const bottomPrimary = flatNav.slice(0, 4);
  const hasMore = flatNav.length > 4;

  return (
    <div data-workspace={platform ? "platform" : "tenant"} className={cn("min-h-screen pb-24 lg:pb-0 lg:pl-64", platform ? "platform-console" : "agency-console")}>
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
      {open && <button aria-label="Close navigation overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}
      <aside id="workspace-navigation" className={cn("console-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white p-5 dark:border-navy-700 dark:bg-navy-900 lg:flex", open && "flex")}>
        <div className="flex items-center justify-between"><Link href={home}>{platform ? <BrandLogo /> : <AgencyLogo name={agencyName} />}</Link><Button aria-label="Close navigation" variant="ghost" className="px-2 lg:hidden" onClick={() => setOpen(false)}><X size={18} /></Button></div>
        <div className="workspace-selector my-7 flex items-center gap-3 rounded-xl border border-slate-200 bg-surface p-3 dark:border-navy-700 dark:bg-navy-800"><span className="rounded-lg bg-teal-100 p-2 text-teal-600"><Building2 size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{workspace}</p><p className="mt-0.5 truncate text-xs text-slate-500">{platform ? "Network administration" : agencyName}</p></div></div>
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">Workspace</p>
        <nav aria-label="Workspace navigation" className="nav-scroll -mr-2 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-2 pb-2">
          {[{ group: platform ? "Overview" : "Your workspace", children: [{ key: "workspace-home", name: "Overview", route: home }] }, ...registry.map(group => ({ ...group, children: group.children.filter(item => item.route !== home && items.some(allowed => allowed.key === item.key)) }))].filter(group => group.children.length).map(group => (
            <div key={group.group} className="mb-4">
              <p className="mb-2 px-3 pt-2 text-[10px] uppercase tracking-[.16em] text-slate-400">{group.group}</p>
              {group.children.map(item => {
                const Icon = item.route === home ? LayoutDashboard : routeIcon(item.route!);
                const active = path === item.route;
                return <Link key={item.key} href={item.route!} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={cn("nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", active ? "bg-navy-900 font-medium text-white dark:bg-teal-200 dark:text-navy-900" : "text-slate-600 hover:bg-surface dark:text-slate-300 dark:hover:bg-navy-800")}><Icon size={17} /><span>{item.name}</span>{active && <ChevronRight size={14} className="ml-auto" />}</Link>;
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-help mt-5 rounded-xl bg-teal-50 p-4 dark:bg-navy-800"><CircleHelp size={19} className="mb-2 text-teal-600" /><p className="text-sm font-medium">{platform ? "Built for your agency network." : "Your agency. Your journeys."}</p><Link href="/" className="mt-2 flex items-center gap-2 text-xs text-teal-600 dark:text-teal-200">{platform ? "View platform website" : "View agency storefront"} <ArrowUpRight size={13} /></Link></div>
      </aside>


      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur dark:border-navy-700 dark:bg-navy-900/95 sm:h-20 sm:gap-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button variant="ghost" className="px-2 lg:hidden" aria-label="Open navigation" aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(true)}><Menu size={20} /></Button>
          <span className="hidden text-sm text-slate-400 md:inline">{workspace}</span>
          <ChevronRight size={14} className="hidden text-slate-300 md:block" />
          <span className="truncate text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <ThemeToggle />
          <div className="hidden text-right md:block"><p className="max-w-40 truncate text-sm font-medium">{access.full_name}</p><p className="max-w-40 truncate text-xs text-slate-500">{access.email}</p></div>
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-600">{access.full_name?.slice(0, 1).toUpperCase()}</span>
          <Button variant="ghost" className="px-2" aria-label="Sign out" onClick={async () => { try { await logout(); } finally { router.push("/login"); } }}><LogOut size={17} /></Button>
        </div>
      </header>

      <main id="workspace-content" className="workspace-main mx-auto w-full max-w-[1500px] min-w-0 p-3 sm:p-8 sm:overflow-x-clip lg:p-10">{children}</main>
      <footer className="mx-3 flex items-center gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 dark:border-navy-700 sm:mx-8"><ShieldCheck size={14} /> <span className="truncate">{platform ? "Wufud Platform · Agency network management" : `${agencyName} · Powered by Wufud`}</span></footer>

      {/* Mobile bottom nav: icons + labels, replaces sidebar/top-nav on small screens */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/97 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-navy-700 dark:bg-navy-900/97 lg:hidden">
        <div className={cn("grid", hasMore ? "grid-cols-5" : "grid-cols-4")}>
          {bottomPrimary.map((item) => {
            const Icon = item.route === home ? LayoutDashboard : routeIcon(item.route!);
            const active = path === item.route;
            return (
              <Link
                key={item.key}
                href={item.route!}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium leading-none",
                  active ? "text-teal-600 dark:text-teal-200" : "text-slate-500 dark:text-slate-400",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                <span className="max-w-full truncate">{item.name}</span>
                <span aria-hidden className={cn("h-1 w-8 rounded-full", active ? "bg-teal-500" : "bg-transparent")} />
              </Link>
            );
          })}
          {hasMore ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="More navigation options"
              aria-expanded={open}
              className="flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium leading-none text-slate-500 dark:text-slate-400"
            >
              <MoreHorizontal size={20} />
              <span>More</span>
              <span aria-hidden className="h-1 w-8 rounded-full bg-transparent" />
            </button>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
