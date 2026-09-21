"use client";

import { useHostContext } from "@/components/host-provider";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/auth-layout";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { login, getAccess } from "@/lib/auth";
import { formatApiError } from "@/lib/api-error";
import { firstZodIssueMessage, loginSchema } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const context = useHostContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <MarketingShell>
      <AuthLayout>
        <Card className="p-7 sm:p-9">
          <p className="mb-3 text-xs uppercase tracking-widest text-teal-500">Welcome back</p><h1 className="text-3xl font-semibold">Sign in</h1><p className="mt-3 text-sm text-slate-500">Your workspace is right where you left it.</p>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError("");
              const check = loginSchema.safeParse({ email, password });
              if (!check.success) {
                setError(firstZodIssueMessage(check));
                setPending(false);
                return;
              }
              try {
                await login(email, password);
                const me = await getAccess();
                const roles = me.role_slugs ?? [];
                if (context?.plane === "platform" && !me.is_platform_admin) {
                  throw new Error("Please sign in on your agency’s website to access your account.");
                }
                if (context?.plane === "tenant" && roles.length === 0) {
                  throw new Error("This account does not have access to this agency. Platform administrators should sign in on the Wufud website.");
                }
                const next = new URLSearchParams(window.location.search).get("next");
                if (next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
                  router.push(next);
                  return;
                }
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
              <Label htmlFor="email">Email</Label>
              <Input type="email" autoComplete="email" required placeholder="you@example.com" id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput autoComplete="current-password" required placeholder="Enter your password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
              {pending ? "Signing in…" : "Continue"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">New to Wufud? <Link href={context?.plane === "tenant" ? "/register" : "/start"} className="font-medium text-teal-600 dark:text-teal-200">{context?.plane === "tenant" ? "Create an account" : "Start your agency"}</Link></p>
        </Card>
      </AuthLayout>
    </MarketingShell>
  );
}
