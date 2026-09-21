"use client";
import { createContext, useContext } from "react";
import type { PublicHostContext } from "@wufud/contracts";
const HostContext = createContext<PublicHostContext | null>(null);
export function HostProvider({ context, children }: { context: PublicHostContext | null; children: React.ReactNode }) {
  return <HostContext.Provider value={context}>{children}</HostContext.Provider>;
}
export const useHostContext = () => useContext(HostContext);
