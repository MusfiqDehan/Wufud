"use client";
import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAccess } from "@/lib/auth";
import { canAccessFeature, PLATFORM_REGISTRY, TENANT_REGISTRY } from "@wufud/contracts";
export function WorkspaceGuide({ platform = false }: { platform?: boolean }) {
  const access = useQuery({ queryKey: ["workspace-guide-access"], queryFn: getAccess });
  const routes = platform ? ["tenants", "plans", "billing"] : ["packages", "bookings", "payments"];
  const items = (platform ? PLATFORM_REGISTRY : TENANT_REGISTRY).flatMap(g => g.children).filter(i => routes.some(r => i.route === `${platform ? "/admin" : "/dashboard"}/${r}`) && access.data && canAccessFeature(i.key, "view", access.data));
  return <section className="mt-8"><div className="rounded-2xl bg-navy-900 p-7 text-white sm:p-9"><Compass size={28} strokeWidth={1.5} className="mb-5 text-teal-200" /><p className="text-xs uppercase tracking-[.18em] text-teal-200">{platform ? "A stronger foundation" : "Ready for the next journey"}</p><h2 className="mt-3 text-2xl font-medium">{platform ? "Help every agency move forward." : "Bring the details together."}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">{platform ? "Manage agencies, shape your plans, and keep subscriptions organized from one central workspace." : "Keep packages up to date, review bookings, and follow up on payments so your team can focus on your pilgrims."}</p></div>{items.length > 0 && <><h2 className="mb-4 mt-8 text-lg font-semibold">Continue in your workspace</h2><div className="grid gap-4 sm:grid-cols-3">{items.map(i => <Link key={i.key} href={i.route!} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium transition hover:border-teal-400 dark:border-navy-700 dark:bg-navy-800">{i.name}<ArrowUpRight size={18} className="text-teal-500" /></Link>)}</div></>}</section>;
}
