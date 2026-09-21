"use client";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Disbursements } from "@/features/accounts/disbursements";
export default function Page() { return <GuardedShell plane="tenant" feature="disbursements"><h1 className="mb-6 text-2xl font-semibold">Disbursements</h1><Disbursements /></GuardedShell>; }
