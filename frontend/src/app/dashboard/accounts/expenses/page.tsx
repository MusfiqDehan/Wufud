"use client";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Expenses } from "@/features/accounts/expenses";
export default function Page() { return <GuardedShell plane="tenant" feature="expenses"><h1 className="mb-6 text-2xl font-semibold">Expenses</h1><Expenses /></GuardedShell>; }
