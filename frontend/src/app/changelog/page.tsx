import type { Metadata } from "next";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { SiteFooter } from "@/components/marketing/sections";
import { ChangelogView } from "./changelog-view";
import { getChangelogEntries } from "@/data/changelog-data";

export const metadata: Metadata = {
  title: "Changelog | Wufud SaaS Platform",
  description: "Explore the latest product releases, features, security upgrades, and fixes for the Wufud Hajj & Umrah SaaS platform.",
  openGraph: {
    title: "Wufud Platform Changelog",
    description: "Follow the product evolution, feature drops, and continuous improvements across Wufud.",
  },
};

export default function ChangelogPage() {
  const releases = getChangelogEntries();

  return (
    <MarketingShell ctaHref="/login" ctaLabel="Platform login">
      <ChangelogView releases={releases} />
      <SiteFooter />
    </MarketingShell>
  );
}
