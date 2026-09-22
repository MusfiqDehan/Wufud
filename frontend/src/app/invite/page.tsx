"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { firstZodIssueMessage, inviteAcceptSchema } from "@/lib/validation";
import { getAccess } from "@/lib/auth";
import { storeAccessToken } from "@/lib/session";

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <Card className="p-7 sm:p-9">
      <p className="mb-3 text-xs uppercase tracking-widest text-teal-500">Invitation</p>
      <h1 className="text-3xl font-semibold">Join your workspace</h1>
      <p className="mt-3 text-sm text-slate-500">Set a password to accept this invitation. The link expires after 7 days.</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError("");
          const check = inviteAcceptSchema.safeParse({ token, password, fullName: fullName || undefined });
          if (!check.success) {
            setError(firstZodIssueMessage(check));
            setPending(false);
            return;
          }
          try {
            const data = await api<{ access_token: string }>("/api/auth/accept-invite", {
              method: "POST",
              body: JSON.stringify({ token, password, fullName: fullName || undefined }),
            });
            storeAccessToken(data.access_token);
            const me = await getAccess();
            const roles = me.role_slugs ?? [];
            if (me.is_platform_admin) router.push("/admin");
            else if (roles.includes("pilgrim")) router.push("/portal");
            else router.push("/dashboard");
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setPending(false);
          }
        }}
      >
        <div>
          <Label htmlFor="full-name">Full name</Label>
          <Input id="full-name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending || !token} aria-busy={pending}>
          {pending ? "Accepting…" : "Accept invitation"}
        </Button>
      </form>
    </Card>
  );
}

export default function InvitePage() {
  return (
    <MarketingShell>
      <AuthLayout>
        <Suspense fallback={<p className="text-sm text-slate-500">Loading invitation…</p>}>
          <AcceptInviteForm />
        </Suspense>
      </AuthLayout>
    </MarketingShell>
  );
}
