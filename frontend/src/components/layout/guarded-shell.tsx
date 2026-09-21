"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PILGRIM_REGISTRY, PLATFORM_REGISTRY, TENANT_REGISTRY, canAccessFeature, type AccessMe } from "@wufud/contracts";
import { getAccess } from "@/lib/auth";
import { useHostContext } from "@/components/host-provider";
import { DashboardShell } from "./dashboard-shell";

export function GuardedShell({ plane, children, feature, level = "view" }: { plane: "platform" | "tenant" | "pilgrim"; children: React.ReactNode; feature?: string; level?: "view" | "edit" | "full" }) {
  const router = useRouter();
  const context = useHostContext();
  const [access, setAccess] = useState<AccessMe | null>(null);
  const wrongHost = context && (plane === "platform" ? context.plane !== "platform" : context.plane !== "tenant");
  useEffect(() => {
    if (!context || wrongHost) return;
    let active = true;
    getAccess().then(me => {
      if (!active) return;
      if ((plane === "platform" && !me.is_platform_admin) || (plane === "tenant" && (!me.tenant || (!me.is_tenant_admin && !me.role_slugs.some(role=>role!=="pilgrim"))))) {
        router.replace("/login");
        return;
      }
      setAccess(me);
    }).catch(() => { if (active) router.replace("/login"); });
    return () => { active = false; };
  }, [plane, router, context, wrongHost]);
  if (!context || wrongHost) return <div className="mx-auto max-w-lg px-6 py-24 text-center"><h1 className="text-2xl font-semibold">{wrongHost ? "This workspace belongs to a different site" : "This workspace is temporarily unavailable"}</h1><p className="mt-4 text-sm leading-7 text-slate-500">{wrongHost ? "Platform administration is available on the Wufud platform. Agency operations are available on your agency’s own website." : "Please refresh when the connection is restored."}</p><Link href="/" className="mt-6 inline-block text-teal-600 underline">Return to this site’s home page</Link></div>;
  if (!access) return <div role="status" className="flex min-h-screen items-center justify-center text-sm text-slate-500">Opening your workspace…</div>;
  const registry = plane === "platform" ? PLATFORM_REGISTRY : plane === "pilgrim" ? PILGRIM_REGISTRY : TENANT_REGISTRY;
  const home = plane === "platform" ? "/admin" : plane === "pilgrim" ? "/portal" : "/dashboard";
  if (feature && !canAccessFeature(feature, level, access)) {
    return (
      <DashboardShell access={access} registry={registry} home={home}>
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold">You don&apos;t have access</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">Your role doesn&apos;t include <span className="font-mono">{feature}:{level}</span> for this workspace. Ask an admin to update your permissions.</p>
          <Link href={home} className="mt-6 inline-block text-teal-600 underline">Back to overview</Link>
        </div>
      </DashboardShell>
    );
  }
  return <DashboardShell access={access} registry={registry} home={home}>{children}</DashboardShell>;
}
