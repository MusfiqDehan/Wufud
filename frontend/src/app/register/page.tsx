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
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { firstZodIssueMessage, registerSchema } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const tenant = useHostContext()?.plane === "tenant";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!tenant) {
    return (
      <MarketingShell>
        <AuthLayout>
          <Card className="p-7 sm:p-9">
            <p className="mb-3 text-xs uppercase tracking-widest text-teal-500">Start your agency</p>
            <h1 className="text-3xl font-semibold">Create your workspace</h1>
            <p className="mt-3 text-sm text-slate-500">Choose a plan, claim a unique subdomain, and start on a trial or paid month.</p>
            <Button asChild className="mt-6 w-full">
              <Link href="/start">Continue</Link>
            </Button>
            <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-medium text-teal-600 dark:text-teal-200">Sign in</Link></p>
          </Card>
        </AuthLayout>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <AuthLayout>
        <Card className="p-7 sm:p-9">
          <p className="mb-3 text-xs uppercase tracking-widest text-teal-500">Let’s get started</p><h1 className="text-3xl font-semibold">Create account</h1><p className="mt-3 text-sm text-slate-500">Make room for your next journey.</p>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError("");
              const check = registerSchema.safeParse({ fullName, email, password });
              if (!check.success) {
                setError(firstZodIssueMessage(check));
                setPending(false);
                return;
              }
              try {
                const data = await api<{ access_token: string }>("/api/auth/register", {
                  method: "POST",
                  body: JSON.stringify({ fullName, email, password }),
                });
                localStorage.setItem("wufud_access", data.access_token);
                router.push("/portal");
              } catch (err) {
                setError(formatApiError(err));
              } finally {
                setPending(false);
              }
            }}
          >
            <div>
              <Label htmlFor="full-name">Full name</Label>
              <Input id="full-name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
              {pending ? "Creating account…" : "Register"}
            </Button>
          </form><p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-medium text-teal-600 dark:text-teal-200">Sign in</Link></p>
        </Card>
      </AuthLayout>
    </MarketingShell>
  );
}
