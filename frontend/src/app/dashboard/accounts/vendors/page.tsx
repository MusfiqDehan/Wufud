"use client";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Vendors } from "@/features/accounts/vendors";
export default function Page() { return <GuardedShell plane="tenant" feature="vendors"><h1 className="mb-6 text-2xl font-semibold">Vendors</h1><Vendors /></GuardedShell>; }
