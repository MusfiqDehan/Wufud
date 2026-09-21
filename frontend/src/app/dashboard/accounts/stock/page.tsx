"use client";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Stock } from "@/features/accounts/stock";
export default function Page() { return <GuardedShell plane="tenant" feature="stock"><h1 className="mb-6 text-2xl font-semibold">Stock</h1><Stock /></GuardedShell>; }
