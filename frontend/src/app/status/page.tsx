import type { Metadata } from "next";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { SiteFooter } from "@/components/marketing/sections";
import { StatusView } from "./status-view";

export const metadata: Metadata = {
  title: "System Status | Wufud SaaS Platform",
  description: "Live operational status, uptime statistics, and real-time connectivity diagnostics for the Wufud Hajj & Umrah platform.",
  openGraph: {
    title: "Wufud Platform Status & Healthcheck",
    description: "Monitor real-time service health, database latency, and API availability across Wufud.",
  },
};

export default function StatusPage() {
  return (
    <MarketingShell ctaHref="/login" ctaLabel="Platform login">
      <StatusView />
      <SiteFooter />
    </MarketingShell>
  );
}
