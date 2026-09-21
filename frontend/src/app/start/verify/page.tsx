"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";

function VerifySignupForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState("");
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (!token) {
      setError("This verification link is missing a token.");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await api<{ status: string; login_url?: string; slug: string }>("/api/public/onboard/verify", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (data.login_url) {
          setLoginUrl(data.login_url);
          setSlug(data.slug);
        } else {
          setError("Verification did not complete. Try again from the start page.");
        }
      } catch (err) {
        if (!cancelled) setError(formatApiError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loginUrl) {
    return (
      <Card className="p-7 sm:p-9 text-center">
        <p className="text-xs uppercase tracking-widest text-teal-500">Verified</p>
        <h1 className="mt-3 text-3xl font-semibold">Your workspace is live.</h1>
        <p className="mt-3 text-sm text-slate-500">Sign in on your agency subdomain with the password you chose during signup.</p>
        <Button asChild className="mt-8 w-full">
          <a href={loginUrl}>Sign in to {slug || "your agency"}</a>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-7 sm:p-9 text-center">
      <p className="text-xs uppercase tracking-widest text-teal-500">Email verification</p>
      <h1 className="mt-3 text-3xl font-semibold">{error ? "Could not verify" : "Creating your workspace…"}</h1>
      <p className="mt-3 text-sm text-slate-500">
        {error || "This usually takes a few seconds. Do not close this tab."}
      </p>
      {error ? (
        <Button asChild className="mt-8 w-full" variant="outline">
          <Link href="/start">Back to signup</Link>
        </Button>
      ) : null}
    </Card>
  );
}

export default function VerifySignupPage() {
  return (
    <MarketingShell>
      <AuthLayout>
        <Suspense fallback={<p className="text-center text-sm text-slate-500">Loading…</p>}>
          <VerifySignupForm />
        </Suspense>
      </AuthLayout>
    </MarketingShell>
  );
}
