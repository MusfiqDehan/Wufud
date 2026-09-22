"use client";

import { useEffect } from "react";
import {
  refreshAccessIfNearExpiry,
  scheduleProactiveAccessRefresh,
  stopProactiveAccessRefresh,
} from "@/lib/session";

/** Keeps access tokens fresh via timed refresh and tab visibility. */
export function SessionKeeper() {
  useEffect(() => {
    scheduleProactiveAccessRefresh();

    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshAccessIfNearExpiry();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopProactiveAccessRefresh();
    };
  }, []);

  return null;
}
