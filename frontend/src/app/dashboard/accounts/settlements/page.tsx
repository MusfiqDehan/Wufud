"use client";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Settlements } from "@/features/accounts/settlements";
export default function Page() { return <GuardedShell plane="tenant" feature="settlements"><h1 className="mb-6 text-2xl font-semibold">Settlements</h1><Settlements /></GuardedShell>; }
