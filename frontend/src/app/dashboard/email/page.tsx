"use client";

import { GuardedShell } from "@/components/layout/guarded-shell";
import { EmailAccountsPanel } from "@/components/data/email-accounts-panel";

export default function TenantEmailPage() {
  return (
    <GuardedShell plane="tenant" feature="email" level="view">
      <h1 className="text-2xl font-semibold">Email</h1>
      <EmailAccountsPanel
        path="/api/email-accounts"
        feature="email"
        description="Agency SMTP accounts for staff invites and booking notices. Credentials stay in this tenant schema. Only one mailbox can be default; a single account is always default."
      />
    </GuardedShell>
  );
}
