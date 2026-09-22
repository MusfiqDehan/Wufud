"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHostContext } from "@/components/host-provider";
import { BrandLogo } from "@/components/layout/brand-logo";
import { AgencyLogo } from "@/components/layout/agency-logo";
import { logout } from "@/lib/auth";
import { useClientSignedIn } from "@/lib/use-client-signed-in";

export function SiteFooter() {
  const router = useRouter();
  const { signedIn, setSignedIn } = useClientSignedIn();
  const context = useHostContext();
  const tenant = context?.plane === "tenant";
  const name = tenant ? context.branding?.display_name ?? context.tenant?.name ?? "Your agency" : "Wufud";
  return (
    <footer className="border-t border-slate-200 px-6 py-10 dark:border-navy-700">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
        {tenant ? <AgencyLogo name={name} /> : <BrandLogo />}
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} {name}. {tenant ? "Powered by Wufud." : "With you, every step."}
        </p>
        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 dark:text-slate-300">
          <Link href={tenant ? "/packages" : "/#features"} className="hover:text-teal-500">
            {tenant ? "Our journeys" : "Platform features"}
          </Link>
          {!tenant && (
            <Link href="/changelog" className="hover:text-teal-500">
              Changelog
            </Link>
          )}
          {!tenant && (
            <Link href="/status" className="hover:text-teal-500">
              Status
            </Link>
          )}
          {signedIn ? (
            <button
              type="button"
              className="hover:text-teal-500"
              onClick={async () => {
                try {
                  await logout();
                } finally {
                  setSignedIn(false);
                  router.push("/");
                  router.refresh();
                }
              }}
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" className="hover:text-teal-500">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
