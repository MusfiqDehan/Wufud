"use client";

import { useCallback, useEffect, useState } from "react";
import { hasAccessToken } from "@/lib/auth";

/** Client-only session flag; false on first paint until localStorage is read. */
export function useClientSignedIn() {
  const [signedIn, setSignedIn] = useState(false);

  const sync = useCallback(() => {
    setSignedIn(hasAccessToken());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("wufud-auth-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("wufud-auth-changed", sync);
    };
  }, [sync]);

  return { signedIn, setSignedIn, sync };
}

export function isSignInMarketingCta(ctaHref: string) {
  return ctaHref === "/login" || ctaHref.startsWith("/login?");
}
