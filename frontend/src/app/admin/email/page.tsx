"use client";

import { GuardedShell } from "@/components/layout/guarded-shell";
import { EmailAccountsPanel } from "@/components/data/email-accounts-panel";

export default function PlatformEmailPage() {
  return (
    <GuardedShell plane="platform" feature="platform.email" level="view">
      <h1 className="text-2xl font-semibold">Email</h1>
      <EmailAccountsPanel
        path="/api/platform/email-accounts"
        feature="platform.email"
        description="SMTP accounts used for tenant invitations and platform notices. Credentials are stored in the database — never hardcoded. Only one mailbox can be default; a single account is always default."
      />
    </GuardedShell>
  );
}
