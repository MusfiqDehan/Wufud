"use client";
import { useFeatureAccess } from "@/lib/auth";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Banknote,
  Receipt,
  Scale,
  RefreshCw,
  Wallet,
  Clock,
  ShieldCheck,
  Building2,
  Boxes,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard, DonutChart } from "@/components/data/stat-card";
import { ChartCard } from "@/components/data/chart-card";
import { ManagedTable } from "@/components/data/managed-table";
import { api, apiList } from "@/lib/api";

type AccountSummary = {
  vendor_costs_sar?: string;
  vendor_costs_bdt?: string;
  expenses_bdt?: string;
  stock_issued_cost_bdt?: string;
  pos_collected?: string;
  pos_refunded?: string;
  bookings: number;
  collected: string;
  outstanding: string;
  refunds: string;
  installments_due?: string;
  installments_open?: number;
  quota?: {
    id: string;
    name: string;
    remaining: number;
    confirmed: number;
    held: number;
    total: number;
  }[];
};

type PaymentRow = {
  id: string;
  amount: string;
  currency?: string;
  source?: string;
  gatewaySlug?: string;
  tranId?: string;
  createdAt?: string;
};

type DisbursementRow = {
  id: string;
  amountSar: string;
  amountBdt: string;
  fxRate?: string;
  note?: string;
  createdAt?: string;
  vendor?: { name?: string };
};

type ExpenseRow = {
  id: string;
  title: string;
  amount: string;
  createdAt?: string;
};

type TransactionItem = {
  id: string;
  ref: string;
  type: "inflow" | "outflow";
  category: "collection" | "disbursement" | "expense" | "refund";
  title: string;
  counterparty?: string;
  amountBdt: number;
  amountSar?: number;
  status: "completed" | "settled" | "pending";
  date: string;
};

const formatMoney = (val?: string | number, curr = "BDT") => {
  if (val === undefined || val === null || val === "") return "—";
  const num = Number(val);
  if (isNaN(num)) return "—";
  const formatted = new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);
  return `${formatted} ${curr}`;
};

export default function AccountsOverviewPage() {
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const [filterType, setFilterType] = useState<"all" | "inflow" | "outflow">("all");

  // Fetch accounts financial summary
  const summaryQuery = useQuery({
    queryKey: ["accounts", "summary"],
    queryFn: () => api<AccountSummary>("/api/accounts/summary"),
  });

  // Fetch recent payments for financial ledger
  const paymentsQuery = useQuery({
    queryKey: ["accounts", "payments-ledger"],
    queryFn: () => apiList<PaymentRow>("/api/payments"),
    enabled: can("payments", "view"),
  });

  // Fetch recent disbursements
  const disbursementsQuery = useQuery({
    queryKey: ["accounts", "disbursements-ledger"],
    queryFn: () => apiList<DisbursementRow>("/api/disbursements"),
    enabled: can("disbursements", "view"),
  });

  // Fetch recent expenses
  const expensesQuery = useQuery({
    queryKey: ["accounts", "expenses-ledger"],
    queryFn: () => apiList<ExpenseRow>("/api/expenses"),
    enabled: can("expenses", "view"),
  });

  const summary = summaryQuery.data;

  // Numeric computations
  const collectedBookings = Number(summary?.collected ?? 0);
  const collectedPos = Number(summary?.pos_collected ?? 0);
  const totalCollections = collectedBookings + collectedPos;

  const vendorCostsBdt = Number(summary?.vendor_costs_bdt ?? 0);
  const vendorCostsSar = Number(summary?.vendor_costs_sar ?? 0);
  const expensesBdt = Number(summary?.expenses_bdt ?? 0);
  const stockCostBdt = Number(summary?.stock_issued_cost_bdt ?? 0);
  const refundsBdt = Number(summary?.refunds ?? 0) + Number(summary?.pos_refunded ?? 0);

  const totalOutflows = vendorCostsBdt + expensesBdt + refundsBdt;
  const netCashflow = totalCollections - totalOutflows;

  const outstanding = Number(summary?.outstanding ?? 0);
  const installmentsDue = Number(summary?.installments_due ?? 0);
  const totalBookingValue = collectedBookings + outstanding;
  const realizationRate = totalBookingValue > 0 ? Math.round((collectedBookings / totalBookingValue) * 100) : 0;

  // Compile unified transactions ledger
  const transactions = useMemo<TransactionItem[]>(() => {
    const list: TransactionItem[] = [];

    // Payments / Collections
    const payments = paymentsQuery.data?.items ?? [];
    for (const p of payments) {
      list.push({
        id: p.id,
        ref: p.tranId ? `TXN-${p.tranId.slice(0, 8)}` : `PAY-${p.id.slice(0, 8)}`,
        type: "inflow",
        category: "collection",
        title: p.source ? `Payment via ${p.source}` : p.gatewaySlug ? `Gateway: ${p.gatewaySlug}` : "Booking Collection",
        counterparty: "Pilgrim Client",
        amountBdt: Number(p.amount ?? 0),
        status: "settled",
        date: p.createdAt ?? new Date().toISOString(),
      });
    }

    // Disbursements
    const disbursements = disbursementsQuery.data?.items ?? [];
    for (const d of disbursements) {
      list.push({
        id: d.id,
        ref: `DISB-${d.id.slice(0, 8)}`,
        type: "outflow",
        category: "disbursement",
        title: d.note ? `Vendor: ${d.note}` : "Vendor Fund Disbursement",
        counterparty: d.vendor?.name ?? "Service Provider",
        amountBdt: Number(d.amountBdt ?? 0),
        amountSar: Number(d.amountSar ?? 0),
        status: "completed",
        date: d.createdAt ?? new Date().toISOString(),
      });
    }

    // Expenses
    const expenses = expensesQuery.data?.items ?? [];
    for (const e of expenses) {
      list.push({
        id: e.id,
        ref: `EXP-${e.id.slice(0, 8)}`,
        type: "outflow",
        category: "expense",
        title: e.title ?? "Operating Expense",
        counterparty: "Agency Operations",
        amountBdt: Number(e.amount ?? 0),
        status: "completed",
        date: e.createdAt ?? new Date().toISOString(),
      });
    }

    // Sort descending by date or id
    return list.sort((a, b) => b.id.localeCompare(a.id));
  }, [paymentsQuery.data, disbursementsQuery.data, expensesQuery.data]);

  // Filtered transactions for the ledger table
  const filteredTransactions = useMemo(() => {
    if (filterType === "all") return transactions;
    return transactions.filter((t) => t.type === filterType);
  }, [transactions, filterType]);

  // Data for Cashflow Breakdown Chart
  const flowItems = [
    { label: "Bookings", amount: collectedBookings, type: "inflow", color: "#0e8f86" },
    { label: "POS Sales", amount: collectedPos, type: "inflow", color: "#14b89a" },
    { label: "Vendors (SAR)", amount: vendorCostsBdt, type: "outflow", color: "#e8a13d" },
    { label: "Operating Exp", amount: expensesBdt, type: "outflow", color: "#ef4444" },
    { label: "Refunds", amount: refundsBdt, type: "outflow", color: "#f43f5e" },
  ];
  const maxFlowAmount = Math.max(1, ...flowItems.map((f) => f.amount));

  // Data for Outflows Distribution Donut Chart
  const outflowSegments = [
    { label: "Vendor Payouts", value: Math.max(0, vendorCostsBdt), color: "#e8a13d" },
    { label: "Operating Expenses", value: Math.max(0, expensesBdt), color: "#ef4444" },
    { label: "Refunds Paid", value: Math.max(0, refundsBdt), color: "#f43f5e" },
  ].filter((s) => s.value > 0);

  const isRefreshing =
    summaryQuery.isFetching ||
    paymentsQuery.isFetching ||
    disbursementsQuery.isFetching ||
    expensesQuery.isFetching;

  const handleRefreshAll = () => {
    void summaryQuery.refetch();
    void paymentsQuery.refetch();
    void disbursementsQuery.refetch();
    void expensesQuery.refetch();
  };

  return (
    <GuardedShell plane="tenant" feature="accounts" level="view">
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Account Overview
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Executive financial dashboard, cashflow balances, currency exposure, and liquidity at a glance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              Live Ledger
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-teal-600" : ""} />
              {isRefreshing ? "Updating…" : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Primary Financial KPI Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Gross Collections"
            value={formatMoney(totalCollections)}
            hint={`${realizationRate}% of total booking value collected`}
            icon={<TrendingUp className="text-emerald-500" size={18} />}
          />
          <StatCard
            label="Vendor Outflows"
            value={formatMoney(vendorCostsBdt)}
            hint={`${formatMoney(vendorCostsSar, "SAR")} at recorded FX rates`}
            icon={<Banknote className="text-amber-500" size={18} />}
          />
          <StatCard
            label="Operating Expenses"
            value={formatMoney(expensesBdt)}
            hint={`${formatMoney(stockCostBdt)} supplies consumed separately`}
            icon={<Receipt className="text-rose-500" size={18} />}
          />
          <StatCard
            label="Net Operating Cashflow"
            value={formatMoney(netCashflow)}
            hint={
              netCashflow >= 0
                ? "Positive operational cash balance"
                : "Deficit relative to collected inflows"
            }
            icon={<Scale className={netCashflow >= 0 ? "text-teal-500" : "text-rose-500"} size={18} />}
          />
        </div>

        {/* Secondary Financial Health & Risk KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 shadow-none">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Outstanding Receivables</span>
              <Wallet size={16} className="text-amber-500" />
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatMoney(outstanding)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Uncollected booking dues</p>
          </Card>

          <Card className="p-4 shadow-none">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Installments Due</span>
              <Clock size={16} className="text-indigo-500" />
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatMoney(installmentsDue)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Across {summary?.installments_open ?? 0} active payment plans
            </p>
          </Card>

          <Card className="p-4 shadow-none">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Customer Refunds Paid</span>
              <ArrowDownRight size={16} className="text-rose-500" />
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatMoney(refundsBdt)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {formatMoney(summary?.pos_refunded, "BDT")} from counter POS
            </p>
          </Card>

          <Card className="p-4 shadow-none">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>SAR Foreign Exposure</span>
              <Building2 size={16} className="text-teal-500" />
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatMoney(vendorCostsSar, "SAR")}
            </div>
            <p className="mt-1 text-xs text-slate-500">Saudi hotel & flight allocations</p>
          </Card>
        </div>

        {/* Visual Analytics: Cash Flow Chart & Outflows Distribution */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Cashflow Distribution Bar Chart */}
          <div className="lg:col-span-8">
            <ChartCard
              title="Cashflow Dynamics (Inflows vs. Outflows)"
              subtitle="Comparison of revenue streams against procurement disbursements and operating overhead"
              action={
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-500" /> Inflows
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Outflows
                  </span>
                </div>
              }
            >
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-navy-900/60 sm:grid-cols-3">
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      Total Inflows
                    </span>
                    <p className="mt-0.5 text-base font-bold text-teal-600 dark:text-teal-400">
                      +{formatMoney(totalCollections)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      Total Outflows
                    </span>
                    <p className="mt-0.5 text-base font-bold text-rose-600 dark:text-rose-400">
                      -{formatMoney(totalOutflows)}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      Net Balance
                    </span>
                    <p
                      className={`mt-0.5 text-base font-bold ${
                        netCashflow >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600"
                      }`}
                    >
                      {netCashflow >= 0 ? "+" : ""}
                      {formatMoney(netCashflow)}
                    </p>
                  </div>
                </div>

                {/* SVG Visual Flow Bars */}
                <div className="space-y-3 pt-2">
                  {flowItems.map((item) => {
                    const percent = Math.max(4, Math.round((item.amount / maxFlowAmount) * 100));
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-navy-100">
                            {item.label}
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                            {item.type === "inflow" ? "+" : "-"}
                            {formatMoney(item.amount)}
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-navy-700">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Right Column: Outflows Distribution & Health Meter */}
          <div className="space-y-6 lg:col-span-4">
            <ChartCard
              title="Outflows Allocation"
              subtitle="Cost breakdown by operational category"
            >
              <div className="mt-2 flex justify-center py-2">
                {outflowSegments.length > 0 ? (
                  <DonutChart
                    segments={outflowSegments}
                    size={150}
                    centerLabel={formatMoney(totalOutflows).split(" ")[0]}
                  />
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">No outflow records yet</div>
                )}
              </div>
            </ChartCard>

            <Card className="p-5 shadow-none">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Collection Efficiency
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Percentage of booking contracts collected to date
              </p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-teal-600 dark:text-teal-400">{realizationRate}% Collected</span>
                  <span className="text-slate-500">{100 - realizationRate}% Outstanding</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-navy-700">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-500"
                    style={{ width: `${realizationRate}%` }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-navy-700">
                  <span className="text-slate-500">Active Bookings</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {summary?.bookings ?? 0}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Open Installments</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {summary?.installments_open ?? 0}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Financial Activity & Ledger Table with Cursor Pagination */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Recent Financial Activity & Ledger
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unified audit trail of payments, vendor disbursements, and operating expenses.
              </p>
            </div>
            {/* Filter Pills */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-navy-700 dark:bg-navy-800">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  filterType === "all"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-navy-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                All ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("inflow")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  filterType === "inflow"
                    ? "bg-white text-teal-700 shadow-xs dark:bg-navy-700 dark:text-teal-300"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Inflows ({transactions.filter((t) => t.type === "inflow").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("outflow")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  filterType === "outflow"
                    ? "bg-white text-amber-700 shadow-xs dark:bg-navy-700 dark:text-amber-300"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Outflows ({transactions.filter((t) => t.type === "outflow").length})
              </button>
            </div>
          </div>

          <ManagedTable<TransactionItem>
            rows={filteredTransactions}
            searchKeys={["ref", "title", "counterparty"]}
            searchPlaceholder="Search reference, description, or counterparty…"
            defaultPageSize={10}
            columns={[
              {
                key: "ref",
                header: "Reference",
                render: (r) => (
                  <span className="font-mono text-xs font-semibold text-slate-700 dark:text-navy-100">
                    {r.ref}
                  </span>
                ),
              },
              {
                key: "title",
                header: "Transaction",
                render: (r) => (
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">{r.title}</span>
                    <div className="text-[11px] text-slate-400">{r.counterparty}</div>
                  </div>
                ),
              },
              {
                key: "category",
                header: "Category",
                render: (r) => {
                  const labelMap: Record<string, { label: string; color: string }> = {
                    collection: { label: "Collection", color: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300" },
                    disbursement: { label: "Disbursement", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
                    expense: { label: "Expense", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" },
                    refund: { label: "Refund", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" },
                  };
                  const meta = labelMap[r.category] ?? { label: r.category, color: "bg-slate-100 text-slate-700" };
                  return (
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${meta.color}`}>
                      {meta.label}
                    </span>
                  );
                },
              },
              {
                key: "amountBdt",
                header: "Amount",
                render: (r) => (
                  <div className="text-right">
                    <span
                      className={`font-semibold tabular-nums ${
                        r.type === "inflow"
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {r.type === "inflow" ? "+" : "-"}
                      {formatMoney(r.amountBdt)}
                    </span>
                    {r.amountSar ? (
                      <div className="text-[10px] text-slate-400">
                        {formatMoney(r.amountSar, "SAR")}
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={13} />
                    <span className="capitalize">{r.status}</span>
                  </span>
                ),
              },
              {
                key: "date",
                header: "Date",
                render: (r) => (
                  <span className="text-xs text-slate-500">
                    {new Date(r.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                ),
              },
            ]}
            empty="No financial transactions recorded yet."
          />
        </div>
      </div>
    </GuardedShell>
  );
}
