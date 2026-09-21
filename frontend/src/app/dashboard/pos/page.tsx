"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Search,
  Package,
  Sparkles,
  Receipt,
  Coins,
  AlertCircle,
  Edit3,
  Boxes,
  RefreshCw,
  Tag,
  ArrowRight,
  CreditCard,
  UserCheck,
  Calendar,
  Eye,
  Check,
  Building2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { useApiMutation, useCrudList } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { StatCard } from "@/components/data/stat-card";
import { ManagedTable } from "@/components/data/managed-table";
import { ReceiptModal, ReceiptData } from "@/components/pos/receipt-modal";

type CatalogItem = {
  id: string;
  name: string;
  kind: "product" | "service";
  salePrice: string;
  quantity: number;
  unitCost?: string;
};

type SaleLine = {
  itemId: string;
  name: string;
  kind: string;
  quantity: number;
  unitPrice: string;
  stockIssueId?: string;
};

type PosSaleRecord = {
  receipt?: ReceiptData;
  refundReceipt?: ReceiptData;
  id: string;
  requestKey: string;
  total: string;
  status: "paid" | "refunded";
  lines: SaleLine[];
  createdAt?: string;
};

type BookingSummary = {
  id: string;
  status: string;
  frozenPrice: string;
  amountReceived: string;
  remainingBalance: string;
  currency: string;
  paymentMode: string;
  tierName: string;
  packageName: string;
  pilgrims: { id: string; fullName: string; passportNumber: string }[];
  primaryPilgrim: string;
  installments: {
    id: string;
    sequence: number;
    dueDate: string;
    amountDue: string;
    amountPaid: string;
    amountWaived?: string;
    status: string;
  }[];
  nextOpenInstallment?: {
    id: string;
    sequence: number;
    dueDate: string;
    amountDue: string;
    amountPaid: string;
    amountWaived?: string;
    status: string;
  };
};

type InstallmentPaymentRecord = {
  status?: string;
  receipt?: ReceiptData;
  id: string;
  booking?: { id: string };
  amount: string;
  currency: string;
  gatewaySlug?: string;
  tranId?: string;
  createdAt: string;
};

const formatMoney = (val?: string | number) => {
  if (val === undefined || val === null || val === "") return "—";
  const num = Number(val);
  if (isNaN(num)) return "—";
  return `${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(num)} BDT`;
};

export default function PosPage() {
  return (
    <GuardedShell plane="tenant" feature="pos">
      <PosTerminal />
    </GuardedShell>
  );
}

function PosTerminal() {
  const catalog = useCrudList<CatalogItem>("pos-catalog", "/api/pos/catalog?page_size=100");
  const sales = useCrudList<PosSaleRecord>("pos-sales", "/api/pos/sales");
  const activeBookings = useCrudList<BookingSummary>("pos-bookings", "/api/pos/bookings");
  const recentInstallmentPayments = useCrudList<InstallmentPaymentRecord>(
    "pos-recent-installments",
    "/api/pos/installments",
  );

  const mutation = useApiMutation<Record<string, unknown>>([
    "pos-catalog",
    "pos-sales",
    "pos-bookings",
    "pos-recent-installments",
    "stock",
    "accounts",
  ]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);

  // Terminal Navigation Mode
  const [terminalMode, setTerminalMode] = useState<"retail" | "installments">("retail");

  // Retail POS State
  const [cart, setCart] = useState<Record<string, number>>({});
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [catalogSearch, setCatalogSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "product" | "service" | "in_stock">(
    "all",
  );
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cashTendered, setCashTendered] = useState<string>("");

  // Installment Collection State
  const [bookingSearch, setBookingSearch] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [collectionKey, setCollectionKey] = useState(() => crypto.randomUUID());
  const [installmentAmount, setInstallmentAmount] = useState<string>("");
  const [installmentMethod, setInstallmentMethod] = useState<
    "cash" | "card" | "bkash" | "nagad" | "bank_transfer"
  >("cash");
  const [installmentTendered, setInstallmentTendered] = useState<string>("");

  // History Ledger Table Sub-Tab
  const [historyTab, setHistoryTab] = useState<"sales" | "installments">("sales");

  // Receipt Modal State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Quick Catalog Modals
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Full Screen / Focused Mode State
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {}
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {}
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen && !receiptOpen && !addItemOpen && !editItem) {
        toggleFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, receiptOpen, addItemOpen, editItem]);

  const items = Array.isArray(catalog.data) ? catalog.data : (catalog.data?.items ?? []);
  const salesList = Array.isArray(sales.data) ? sales.data : (sales.data?.items ?? []);
  const bookingsList = Array.isArray(activeBookings.data)
    ? (activeBookings.data as unknown as BookingSummary[])
    : (activeBookings.data?.items ?? []);
  const installmentList = Array.isArray(recentInstallmentPayments.data)
    ? recentInstallmentPayments.data
    : (recentInstallmentPayments.data?.items ?? []);

  // Filtered Catalog Items
  const filteredCatalogItems = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (categoryFilter === "product" && item.kind !== "product") return false;
      if (categoryFilter === "service" && item.kind !== "service") return false;
      if (categoryFilter === "in_stock") {
        if (item.kind === "product" && item.quantity <= 0) return false;
      }
      return true;
    });
  }, [items, catalogSearch, categoryFilter]);

  // Selected Cart Items & Totals
  const selectedItems = useMemo(() => {
    return items
      .filter((i) => (cart[i.id] ?? 0) > 0)
      .map((i) => ({
        ...i,
        cartQty: cart[i.id],
        lineTotal: (Math.round(Number(i.salePrice) * 100) * cart[i.id]) / 100,
      }));
  }, [items, cart]);

  const totalAmount = selectedItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const totalItemCount = selectedItems.reduce((sum, i) => sum + i.cartQty, 0);

  // Cash tendered change calculation
  const tenderedNum = Number(cashTendered) || 0;
  const changeDue = tenderedNum > 0 ? tenderedNum - totalAmount : 0;

  // Selected Booking for Installment Collection
  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return bookingsList.find((b) => b.id === selectedBookingId) ?? null;
  }, [bookingsList, selectedBookingId]);

  // Filtered Bookings for Search Autocomplete
  const filteredBookings = useMemo(() => {
    if (!bookingSearch.trim()) return bookingsList.slice(0, 10);
    const q = bookingSearch.trim().toLowerCase();
    return bookingsList.filter(
      (b) =>
        b.primaryPilgrim.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.packageName.toLowerCase().includes(q) ||
        b.pilgrims.some(
          (p) =>
            p.fullName.toLowerCase().includes(q) || p.passportNumber.toLowerCase().includes(q),
        ),
    );
  }, [bookingsList, bookingSearch]);

  // Next open installment amount for selected booking
  const nextDueAmount = useMemo(() => {
    if (!selectedBooking?.nextOpenInstallment) return 0;
    const due = Number(selectedBooking.nextOpenInstallment.amountDue);
    const paid = Number(selectedBooking.nextOpenInstallment.amountPaid);
    return Math.max(0, due - paid - Number(selectedBooking.nextOpenInstallment.amountWaived ?? 0));
  }, [selectedBooking]);

  useEffect(() => { setCollectionKey(crypto.randomUUID()); }, [selectedBooking?.id, installmentAmount, installmentMethod]);

  const instAmountNum = Number(installmentAmount) || 0;
  const instTenderedNum = Number(installmentTendered) || 0;
  const instChangeDue = instTenderedNum > 0 ? instTenderedNum - instAmountNum : 0;

  // Cart Management Handlers
  const handleAddToCart = (item: CatalogItem) => {
    const current = cart[item.id] ?? 0;
    if (item.kind === "product" && current >= item.quantity) return;
    setCart((prev) => ({ ...prev, [item.id]: current + 1 }));
    setRequestKey(crypto.randomUUID());
  };

  const handleDecrementCart = (item: CatalogItem) => {
    const current = cart[item.id] ?? 0;
    if (current <= 1) {
      handleRemoveFromCart(item.id);
    } else {
      setCart((prev) => ({ ...prev, [item.id]: current - 1 }));
      setRequestKey(crypto.randomUUID());
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setRequestKey(crypto.randomUUID());
  };

  const handleClearCart = () => {
    setCart({});
    setCashTendered("");
    setCustomerName("");
    setCustomerPhone("");
    setRequestKey(crypto.randomUUID());
  };

  // Retail Sale Checkout Handler
  const handleCheckout = async () => {
    if (!selectedItems.length || mutation.isPending) return;
    try {
      const saleResult = (await mutation.mutateAsync({
        path: "/api/pos/sales",
        method: "POST",
        body: {
          requestKey,
          lines: selectedItems.map((i) => ({ itemId: i.id, quantity: i.cartQty })),
          paymentMethod,
          amountTendered: tenderedNum > 0 ? tenderedNum : totalAmount,
          customerName: customerName.trim() || "Walk-in Pilgrim",
          customerPhone: customerPhone.trim(),
        },
      })) as {
        id?: string;
        total?: string;
        receipt?: ReceiptData;
      };

      if (saleResult?.receipt) {
        setReceiptData(saleResult.receipt);
        setReceiptOpen(true);
      }

      handleClearCart();
      setBannerMessage("Sale completed! Stock quantities and stock issues updated.");
      setTimeout(() => setBannerMessage(null), 5000);
    } catch {}
  };

  // Installment Collection Handler
  const handleCollectInstallment = async () => {
    if (!selectedBooking || instAmountNum <= 0 || mutation.isPending) return;
    try {
      const result = (await mutation.mutateAsync({
        path: "/api/pos/installments",
        method: "POST",
        body: {
          bookingId: selectedBooking.id,
          requestKey: collectionKey,
          amount: String(instAmountNum),
          method: installmentMethod,
          tendered: instTenderedNum > 0 ? instTenderedNum : instAmountNum,
        },
      })) as {
        ok?: boolean;
        receipt?: ReceiptData;
      };

      if (result?.receipt) {
        setReceiptData(result.receipt);
        setReceiptOpen(true);
      }

      setCollectionKey(crypto.randomUUID());
      setInstallmentAmount("");
      setInstallmentTendered("");
      setBannerMessage(
        `Recorded ${formatMoney(instAmountNum)} for booking #${selectedBooking.id.slice(0, 8)}. A different user must approve it in Payments.`,
      );
      setTimeout(() => setBannerMessage(null), 5000);
    } catch {}
  };

  // Refund Sale Handler
  const handleRefundSale = async (s: PosSaleRecord) => {
    if (
      !window.confirm(
        `Refund ${formatMoney(
          s.total,
        )} and return all product items back to inventory? This will also reverse physical stock issues in accounts.`,
      )
    )
      return;

    try {
      const result = (await mutation.mutateAsync({
        path: `/api/pos/sales/${s.id}/refund`,
        method: "POST",
      })) as {
        refundReceipt?: ReceiptData;
      };

      if (result?.refundReceipt) {
        setReceiptData(result.refundReceipt);
        setReceiptOpen(true);
      }

      setBannerMessage("Sale refunded and stock returned to inventory.");
      setTimeout(() => setBannerMessage(null), 5000);
    } catch {}
  };

  // Quick Catalog Save Handler
  const handleSaveEdit = async () => {
    if (!editItem) return;
    try {
      await mutation.mutateAsync({
        path: `/api/pos/catalog/${editItem.id}`,
        method: "PATCH",
        body: {
          salePrice: editPrice,
          quantity: editItem.kind === "product" ? Number(editStock) : 0,
        },
      });
      setEditItem(null);
      setBannerMessage(`Updated ${editItem.name} successfully.`);
      setTimeout(() => setBannerMessage(null), 4000);
    } catch {}
  };

  // Calculate POS Stats
  const totalProducts = items.filter((i) => i.kind === "product").length;
  const totalServices = items.filter((i) => i.kind === "service").length;
  const totalPaidSales = salesList.filter((s) => s.status === "paid");
  const posRevenue = totalPaidSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const totalInstallmentRevenue = installmentList.filter(p => p.status === "approved").reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );

  const terminalContent = (
    <div
      className={
        isFullscreen
          ? "pos-fullscreen-active fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5"
          : "space-y-6"
      }
    >
      {/* Fullscreen Mode Indicator & Quick Exit */}
      {isFullscreen && (
        <div className="flex items-center justify-between rounded-xl border border-teal-500/30 bg-teal-50/90 px-4 py-2.5 text-xs text-teal-900 shadow-xs dark:border-teal-500/20 dark:bg-navy-900/90 dark:text-teal-200">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
            <strong className="font-bold">Focused Cashier Terminal Mode</strong>
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
              — Distraction-free full screen layout for rapid counter transactions
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-7 text-xs gap-1.5 text-teal-800 hover:text-teal-950 dark:text-teal-300 dark:hover:text-white"
          >
            <Minimize2 size={13} />
            Collapse (Esc)
          </Button>
        </div>
      )}

      {/* Header & Quick Action Links */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShoppingBag className="text-teal-600 dark:text-teal-400" size={26} />
            Point of Sale (POS) & Counter Collections
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Rapid checkout for pilgrim travel merchandise, baggage supplies, and instant booking
            installment collections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Full Screen / Collapse Focus Toggle */}
          <Button
            type="button"
            variant={isFullscreen ? "default" : "outline"}
            size="sm"
            onClick={toggleFullscreen}
            className={`gap-1.5 h-8.5 text-xs font-medium transition-all ${
              isFullscreen
                ? "bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 shadow-xs ring-2 ring-teal-500/30"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-navy-800 dark:text-slate-200 dark:hover:bg-navy-700"
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 size={14} className="text-white" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <Maximize2 size={14} className="text-teal-600 dark:text-teal-400" />
                <span>Full Screen</span>
              </>
            )}
          </Button>

          {can("stock", "view") && (
            <Link
              href="/dashboard/accounts/stock"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-navy-800 dark:text-slate-200 dark:hover:bg-navy-700"
            >
              <Boxes size={14} className="text-teal-500" />
              Manage Stock
            </Link>
          )}
          {can("refunds", "view") && (
            <Link
              href="/dashboard/refunds"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-navy-800 dark:text-slate-200 dark:hover:bg-navy-700"
            >
              <RotateCcw size={14} className="text-purple-500" />
              Booking Refunds
            </Link>
          )}
          {can("pos", "full") && (
            <Button
              size="sm"
              onClick={() => setAddItemOpen(true)}
              className="gap-1.5 h-8.5 bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              <Plus size={16} />
              Add Product / Service
            </Button>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-navy-700 pb-2">
        <button
          type="button"
          onClick={() => setTerminalMode("retail")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            terminalMode === "retail"
              ? "bg-teal-600 text-white shadow-md dark:bg-teal-500"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800"
          }`}
        >
          <ShoppingBag size={16} />
          <span>Retail & Supplies Checkout</span>
        </button>

        <button
          type="button"
          onClick={() => setTerminalMode("installments")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            terminalMode === "installments"
              ? "bg-teal-600 text-white shadow-md dark:bg-teal-500"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800"
          }`}
        >
          <CreditCard size={16} />
          <span>Booking Installment Collections</span>
        </button>
      </div>

      {/* Notifications & Status */}
      {mutation.isError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle size={17} className="shrink-0 text-rose-600" />
          <span>{mutation.error.message}</span>
        </div>
      )}

      {bannerMessage && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-teal-200 bg-teal-50 p-3.5 text-sm text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-200 animate-in fade-in duration-300"
        >
          <CheckCircle2 size={17} className="shrink-0 text-teal-600 dark:text-teal-400" />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Counter Merchandise Sales"
          value={formatMoney(posRevenue)}
          hint={`${totalPaidSales.length} retail transactions recorded`}
        />
        <StatCard
          label="Counter Installment Collections"
          value={formatMoney(totalInstallmentRevenue)}
          hint={`${installmentList.length} installment payments taken`}
        />
        <StatCard
          label="Products In Inventory"
          value={String(totalProducts)}
          hint={`${items.filter((i) => i.kind === "product" && i.quantity > 0).length} in stock`}
        />
        <StatCard
          label="Active Bookings in System"
          value={String(bookingsList.length)}
          hint="Available for counter collections"
        />
      </div>

      {/* MODE 1: RETAIL & SUPPLIES POS TERMINAL */}
      {terminalMode === "retail" && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Panel: Catalog Browser */}
          <div className="space-y-4 lg:col-span-7 xl:col-span-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <Input
                  placeholder="Quick search supplies, ihram, sim, wheelchair…"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "product", label: "Products" },
                    { id: "service", label: "Services" },
                    { id: "in_stock", label: "In Stock" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      categoryFilter === tab.id
                        ? "bg-teal-600 text-white dark:bg-teal-500"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Cards Grid */}
            {filteredCatalogItems.length === 0 ? (
              <div className="py-16 text-center space-y-2 rounded-2xl border border-dashed border-slate-200 dark:border-navy-700">
                <Package size={36} className="mx-auto text-slate-300 dark:text-navy-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No catalog items found
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try adjusting your search query or category filter.
                </p>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCatalogItems.map((item) => {
                  const inCartQty = cart[item.id] ?? 0;
                  const isOutOfStock = item.kind === "product" && item.quantity <= 0;
                  const isMaxCart = item.kind === "product" && inCartQty >= item.quantity;

                  return (
                    <Card
                      key={item.id}
                      className={`relative flex flex-col justify-between p-4 transition-all duration-200 hover:shadow-md ${
                        inCartQty > 0
                          ? "ring-2 ring-teal-500/80 dark:ring-teal-400/80 bg-teal-50/20 dark:bg-navy-800"
                          : ""
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              item.kind === "product"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                            }`}
                          >
                            {item.kind}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {item.kind === "product" && (
                              <span
                                className={`text-[11px] font-semibold tabular-nums ${
                                  item.quantity <= 3
                                    ? "text-rose-600 dark:text-rose-400 font-bold"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {item.quantity > 0 ? `${item.quantity} in stock` : "Out of stock"}
                              </span>
                            )}
                            {can("pos", "edit") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditItem(item);
                                  setEditPrice(item.salePrice);
                                  setEditStock(String(item.quantity));
                                }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title="Edit Price / Stock"
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {item.name}
                        </h3>

                        <div className="mt-1 flex items-baseline gap-1 text-teal-700 dark:text-teal-300">
                          <span className="text-lg font-black tabular-nums">
                            {formatMoney(item.salePrice)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">/ unit</span>
                        </div>
                      </div>

                      {/* Card Action Steppers */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-navy-700/80 flex items-center justify-between">
                        {inCartQty > 0 ? (
                          <div className="flex items-center gap-2 w-full justify-between">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDecrementCart(item)}
                                className="h-7 w-7 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-navy-700 dark:text-white flex items-center justify-center transition"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-6 text-center text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                                {inCartQty}
                              </span>
                              <button
                                type="button"
                                disabled={isMaxCart}
                                onClick={() => handleAddToCart(item)}
                                className="h-7 w-7 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/15 dark:bg-navy-700 dark:text-white flex items-center justify-center transition"
                              >
                                <Plus size={13} />
                              </button>
                            </div>

                            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 tabular-nums">
                              {formatMoney(Number(item.salePrice) * inCartQty)}
                            </span>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isOutOfStock}
                            onClick={() => handleAddToCart(item)}
                            className="w-full text-xs font-semibold h-8 rounded-lg border-teal-600/30 text-teal-700 hover:bg-teal-50 dark:border-teal-500/40 dark:text-teal-300 dark:hover:bg-navy-700"
                          >
                            <Plus size={14} />
                            {isOutOfStock ? "Unavailable" : "Add to Cart"}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Active Order Cart */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
            <Card className="p-5 shadow-lg space-y-4 border-teal-600/20 dark:border-navy-700">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-navy-700">
                <div className="flex items-center gap-2">
                  <Receipt className="text-teal-600 dark:text-teal-400" size={18} />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Current Order Cart
                  </h2>
                  {totalItemCount > 0 && (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {totalItemCount}
                    </span>
                  )}
                </div>
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium"
                  >
                    Clear cart
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              {selectedItems.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <ShoppingBag size={34} className="mx-auto text-slate-300 dark:text-navy-600" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Cart is empty
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Click items in the catalog to add to this counter sale.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-navy-700/80 max-h-[220px] overflow-y-auto pr-1">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatMoney(item.salePrice)} each
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDecrementCart(item)}
                          className="h-6 w-6 rounded border border-slate-200 bg-white text-slate-700 dark:border-white/15 dark:bg-navy-700 dark:text-white flex items-center justify-center"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-5 text-center text-xs font-bold tabular-nums">
                          {item.cartQty}
                        </span>
                        <button
                          type="button"
                          disabled={item.kind === "product" && item.cartQty >= item.quantity}
                          onClick={() => handleAddToCart(item)}
                          className="h-6 w-6 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40 dark:border-white/15 dark:bg-navy-700 dark:text-white flex items-center justify-center"
                        >
                          <Plus size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="h-6 w-6 text-slate-400 hover:text-rose-600 ml-1 flex items-center justify-center"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="text-right shrink-0 min-w-[60px]">
                        <span className="text-xs font-bold tabular-nums">
                          {formatMoney(item.lineTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Checkout Form */}
              {selectedItems.length > 0 && (
                <div className="space-y-3.5 border-t border-slate-100 pt-3 dark:border-navy-700">
                  {/* Customer Info (Optional) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">Pilgrim / Customer</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Walk-in Pilgrim"
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Contact Phone</Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 017..."
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <Label className="text-[11px]">Payment Method</Label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium dark:border-navy-600 dark:bg-navy-700 dark:text-white mt-1"
                    >
                      <option value="Cash">Cash (Counter Tender)</option>
                      <option value="Card Terminal">Card (POS Terminal)</option>
                      <option value="bKash">bKash (Merchant)</option>
                      <option value="Nagad">Nagad (Merchant)</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  {/* Grand Total */}
                  <div className="flex items-baseline justify-between rounded-xl bg-slate-50 p-3 dark:bg-navy-900/80">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Grand Total
                    </span>
                    <span className="text-xl font-black text-teal-700 dark:text-teal-300 tabular-nums">
                      {formatMoney(totalAmount)}
                    </span>
                  </div>

                  {/* Cash Tendered & Change Due */}
                  {paymentMethod === "Cash" && (
                    <div className="space-y-1.5 rounded-xl border border-slate-200/80 p-2.5 bg-white dark:border-navy-700 dark:bg-navy-800/80">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Cash Tendered</span>
                        {tenderedNum > 0 && (
                          <span
                            className={`font-bold tabular-nums ${
                              changeDue >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {changeDue >= 0
                              ? `Change: ${formatMoney(changeDue)}`
                              : `Short: ${formatMoney(Math.abs(changeDue))}`}
                          </span>
                        )}
                      </div>

                      <Input
                        type="number"
                        min="0"
                        placeholder="Enter cash given by customer…"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="h-8 text-xs font-semibold tabular-nums"
                      />

                      {/* Denomination buttons */}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setCashTendered(String(totalAmount))}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold hover:bg-slate-100 dark:border-white/15 dark:bg-navy-700 dark:text-slate-200"
                        >
                          Exact
                        </button>
                        {[500, 1000, 2000, 5000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setCashTendered(String(amt))}
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold hover:bg-slate-100 dark:border-white/15 dark:bg-navy-700 dark:text-slate-200"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Checkout Button */}
                  <Button
                    type="button"
                    size="lg"
                    disabled={
                      !selectedItems.length ||
                      mutation.isPending ||
                      !can("pos", "edit") ||
                      totalAmount <= 0
                    }
                    onClick={handleCheckout}
                    className="w-full justify-center h-11 text-sm font-bold gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-md active:scale-[0.99] dark:bg-teal-500"
                  >
                    {mutation.isPending ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Recording Sale & Deducting Stock…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Complete Sale & Print Receipt ({formatMoney(totalAmount)})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* MODE 2: BOOKING INSTALLMENT COLLECTIONS */}
      {terminalMode === "installments" && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Panel: Booking Lookup & Installment Schedule */}
          <div className="space-y-4 lg:col-span-7 xl:col-span-8">
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck size={18} className="text-teal-600 dark:text-teal-400" />
                  Select Pilgrim Booking for Counter Collection
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Search by pilgrim full name, passport number, or booking reference to view open
                  installments.
                </p>
              </div>

              {/* Autocomplete Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <Input
                  placeholder="Search pilgrim name, passport #, booking ID…"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Booking Quick Selector Cards */}
              <div className="grid gap-2 sm:grid-cols-2 max-h-[260px] overflow-y-auto pr-1">
                {filteredBookings.map((b) => {
                  const isSelected = selectedBookingId === b.id;
                  const nextDue = b.nextOpenInstallment
                    ? Math.max(
                        0,
                        Number(b.nextOpenInstallment.amountDue) -
                          Number(b.nextOpenInstallment.amountPaid) -
                          Number(b.nextOpenInstallment.amountWaived ?? 0),
                      )
                    : 0;

                  return (
                    <div
                      key={b.id}
                      data-testid="pos-booking-card"
                      onClick={() => {
                        setSelectedBookingId(b.id);
                        const defaultAmount =
                          nextDue > 0
                            ? nextDue
                            : Number(b.remainingBalance) > 0
                            ? Math.min(50000, Number(b.remainingBalance))
                            : 10000;
                        setInstallmentAmount(String(defaultAmount));
                        setInstallmentTendered(String(defaultAmount));
                      }}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all text-xs ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/50 dark:bg-navy-800 ring-2 ring-teal-500"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-navy-700 dark:bg-navy-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 dark:text-white font-bold truncate">
                          {b.primaryPilgrim}
                        </strong>
                        <span
                          className={`rounded-full px-2 py-0.2 text-[10px] font-bold uppercase ${
                            b.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <p className="text-slate-500 text-[11px] truncate mt-0.5">
                        {b.packageName} ({b.tierName})
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-navy-700 flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Balance:</span>
                        <strong className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                          {formatMoney(b.remainingBalance)}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Selected Booking Deep-Dive & Installment Schedule */}
            {selectedBooking && (
              <Card className="p-5 space-y-4 border-teal-500/40">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 dark:border-navy-700">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedBooking.primaryPilgrim || "Valued Pilgrim"} (
                      {selectedBooking.pilgrims?.length ?? 1} Pilgrims)
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedBooking.packageName} · {selectedBooking.tierName}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    ID: #{selectedBooking.id.slice(0, 12)}
                  </span>
                </div>

                {/* Balance Metrics */}
                <div className="grid gap-3 grid-cols-3 text-center">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-navy-700 dark:bg-navy-900">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Total Price
                    </span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(selectedBooking.frozenPrice)}
                    </strong>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-navy-700 dark:bg-navy-900">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Total Received
                    </span>
                    <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatMoney(selectedBooking.amountReceived)}
                    </strong>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-navy-700 dark:bg-navy-900">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Remaining Due
                    </span>
                    <strong className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatMoney(selectedBooking.remainingBalance)}
                    </strong>
                  </div>
                </div>

                {/* Installment Timeline Table */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Calendar size={13} />
                    Scheduled Installments
                  </h4>

                  <div className="divide-y divide-slate-100 dark:divide-navy-700 rounded-xl border border-slate-200 dark:border-navy-700 overflow-hidden text-xs">
                    {(selectedBooking.installments ?? []).length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs">
                        No scheduled installment breakdown found. Direct counter installment collection is enabled below.
                      </div>
                    ) : (
                      (selectedBooking.installments ?? []).map((inst) => {
                      const isPaid = inst.status === "paid";
                      const due = Number(inst.amountDue);
                      const paid = Number(inst.amountPaid);
                      const balance = Math.max(0, due - paid - Number(inst.amountWaived ?? 0));

                      return (
                        <div
                          key={inst.id}
                          className={`p-3 flex items-center justify-between gap-3 ${
                            isPaid
                              ? "bg-slate-50/60 dark:bg-navy-900/40 opacity-70"
                              : "bg-white dark:bg-navy-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {inst.sequence + 1}
                            </span>
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Due {inst.dueDate ? inst.dueDate.slice(0, 10) : "Upcoming"}
                              </span>
                              <span className="text-[11px] text-slate-400 block">
                                Amount: {formatMoney(inst.amountDue)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {isPaid ? "Paid in full" : `Due ${formatMoney(balance)}`}
                            </span>
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => setInstallmentAmount(String(balance))}
                                className="text-[10px] text-teal-600 dark:text-teal-400 underline block mt-0.5 hover:text-teal-700"
                              >
                                Set this amount
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Panel: Installment Collection Tender Form */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
            <Card className="p-5 shadow-lg space-y-4 border-teal-600/20 dark:border-navy-700">
              <div className="border-b border-slate-100 pb-3 dark:border-navy-700">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Coins className="text-teal-600 dark:text-teal-400" size={18} />
                  Collect Installment Payment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record cash received and print an acknowledgment. A different user must approve the payment before booking balances and seats change.
                </p>
              </div>

              {!selectedBooking ? (
                <div className="py-12 text-center space-y-2">
                  <UserCheck size={36} className="mx-auto text-slate-300 dark:text-navy-600" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No booking selected
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Select a pilgrim booking on the left to collect installment money.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Quick Payment Presets */}
                  <div>
                    <Label className="text-xs">Select Collection Amount</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {nextDueAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => setInstallmentAmount(String(nextDueAmount))}
                          className="rounded-xl border border-teal-600/30 bg-teal-50/60 p-2 text-left hover:bg-teal-50 dark:border-teal-500/30 dark:bg-navy-900"
                        >
                          <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-300 block">
                            Next Due Installment
                          </span>
                          <strong className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatMoney(nextDueAmount)}
                          </strong>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setInstallmentAmount(String(Number(selectedBooking.remainingBalance)))
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-left hover:bg-slate-100 dark:border-navy-700 dark:bg-navy-900"
                      >
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Full Remaining Balance
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatMoney(selectedBooking.remainingBalance)}
                        </strong>
                      </button>
                    </div>
                  </div>

                  {/* Custom Amount Input */}
                  <div>
                    <Label className="text-xs">Amount to Collect (BDT)</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 50000"
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value)}
                      className="h-10 text-sm font-bold tabular-nums mt-1"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <Label className="text-xs">Payment Method</Label>
                    <select
                      value={installmentMethod}
                      onChange={(e) => setInstallmentMethod(e.target.value as any)}
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium dark:border-navy-600 dark:bg-navy-700 dark:text-white mt-1"
                    >
                      <option value="cash">Cash (Counter Tender)</option>
                      <option value="card">Card (POS Terminal)</option>
                      <option value="bkash">bKash (Merchant)</option>
                      <option value="nagad">Nagad (Merchant)</option>
                      <option value="bank_transfer">Bank Transfer / Deposit</option>
                    </select>
                  </div>

                  {/* Cash Tendered & Change */}
                  {installmentMethod === "cash" && (
                    <div className="space-y-1.5 rounded-xl border border-slate-200/80 p-3 bg-white dark:border-navy-700 dark:bg-navy-800/80">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Cash Tendered</span>
                        {instTenderedNum > 0 && (
                          <span
                            className={`font-bold tabular-nums ${
                              instChangeDue >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {instChangeDue >= 0
                              ? `Change: ${formatMoney(instChangeDue)}`
                              : `Short: ${formatMoney(Math.abs(instChangeDue))}`}
                          </span>
                        )}
                      </div>

                      <Input
                        type="number"
                        min="0"
                        placeholder="Enter cash given by pilgrim…"
                        value={installmentTendered}
                        onChange={(e) => setInstallmentTendered(e.target.value)}
                        className="h-8 text-xs font-semibold tabular-nums"
                      />

                      <div className="flex flex-wrap gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setInstallmentTendered(String(instAmountNum))}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold hover:bg-slate-100 dark:border-white/15 dark:bg-navy-700 dark:text-slate-200"
                        >
                          Exact
                        </button>
                        {[5000, 10000, 20000, 50000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setInstallmentTendered(String(amt))}
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold hover:bg-slate-100 dark:border-white/15 dark:bg-navy-700 dark:text-slate-200"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="button"
                    size="lg"
                    disabled={instAmountNum <= 0 || mutation.isPending || !can("pos", "edit")}
                    onClick={handleCollectInstallment}
                    className="w-full justify-center h-11 text-sm font-bold gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-md active:scale-[0.99] dark:bg-teal-500"
                  >
                    {mutation.isPending ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Processing Installment…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Collect & Print Receipt ({formatMoney(instAmountNum)})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TRANSACTION AUDIT LEDGERS & RECEIPT RE-PRINT SECTION */}
      <div className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-navy-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt size={18} className="text-teal-600 dark:text-teal-400" />
              Counter Transactions & Printable Receipts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit trail of counter sales, installment collections, and refunds with instant
              re-printing support.
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 dark:border-navy-700 dark:bg-navy-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setHistoryTab("sales")}
              className={`rounded-lg px-3 py-1.5 transition ${
                historyTab === "sales"
                  ? "bg-teal-600 text-white shadow-xs dark:bg-teal-500"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-navy-700"
              }`}
            >
              Retail Sales ({salesList.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab("installments")}
              className={`rounded-lg px-3 py-1.5 transition ${
                historyTab === "installments"
                  ? "bg-teal-600 text-white shadow-xs dark:bg-teal-500"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-navy-700"
              }`}
            >
              Installments ({installmentList.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Sales & Refunds Table */}
        {historyTab === "sales" && (
          <ManagedTable<PosSaleRecord>
            rows={salesList}
            searchKeys={["id", "requestKey"]}
            searchPlaceholder="Search sale ID, key…"
            defaultPageSize={10}
            columns={[
              {
                key: "id",
                header: "Receipt #",
                render: (s) => (
                  <span className="font-mono text-xs font-semibold text-slate-700 dark:text-navy-100">
                    POS-{s.id.slice(0, 8).toUpperCase()}
                  </span>
                ),
              },
              {
                key: "lines",
                header: "Items Sold",
                render: (s) => (
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {s.lines?.map((line, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-navy-700 dark:text-slate-200"
                      >
                        {line.name} × {line.quantity}
                      </span>
                    ))}
                  </div>
                ),
              },
              {
                key: "total",
                header: "Total",
                render: (s) => (
                  <strong className="font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatMoney(s.total)}
                  </strong>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (s) => (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      s.status === "paid"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    {s.status}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (s) => (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const saved = s.status === "refunded" ? s.refundReceipt : s.receipt;
                        if (!saved) { setBannerMessage("No saved receipt is available for this legacy sale."); return; }
                        setReceiptData(saved);
                        setReceiptOpen(true);
                      }}
                      className="h-7 text-xs gap-1 text-slate-600 hover:text-teal-600 dark:text-slate-300"
                    >
                      <Eye size={12} />
                      View Receipt
                    </Button>

                    {s.status === "paid" && can("pos", "full") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={mutation.isPending}
                        onClick={() => handleRefundSale(s)}
                        className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                      >
                        <RotateCcw size={12} />
                        Refund
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            empty="No counter sales recorded yet."
          />
        )}

        {/* Tab 2: Installments Table */}
        {historyTab === "installments" && (
          <ManagedTable<InstallmentPaymentRecord>
            rows={installmentList}
            searchKeys={["tranId", "amount"]}
            searchPlaceholder="Search transaction ID, amount…"
            defaultPageSize={10}
            columns={[
              {
                key: "tranId",
                header: "Transaction Ref",
                render: (p) => (
                  <span className="font-mono text-xs font-semibold text-slate-700 dark:text-navy-100">
                    {p.tranId || `POS-INST-${p.id.slice(0, 8)}`}
                  </span>
                ),
              },
              {
                key: "booking",
                header: "Booking Ref",
                render: (p) => (
                  <span className="font-mono text-xs text-slate-500">
                    #{p.booking?.id ? p.booking.id.slice(0, 8) : "—"}
                  </span>
                ),
              },
              {
                key: "amount",
                header: "Amount Collected",
                render: (p) => (
                  <strong className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatMoney(p.amount)}
                  </strong>
                ),
              },
              {
                key: "status",
                header: "Approval",
                render: (p) => <Badge>{p.status ?? "approved"}</Badge>,
              },
              {
                key: "gatewaySlug",
                header: "Method",
                render: (p) => (
                  <span className="capitalize font-semibold text-xs text-slate-700 dark:text-slate-300">
                    {p.gatewaySlug || "Cash"}
                  </span>
                ),
              },
              {
                key: "createdAt",
                header: "Date Collected",
                render: (p) => (
                  <span className="text-xs text-slate-500">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-BD") : "—"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (p) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (!p.receipt) { setBannerMessage("No saved receipt is available for this collection."); return; }
                      setReceiptData(p.receipt);
                      setReceiptOpen(true);
                    }}
                    className="h-7 text-xs gap-1 text-slate-600 hover:text-teal-600 dark:text-slate-300"
                  >
                    <Eye size={12} />
                    View Receipt
                  </Button>
                ),
              },
            ]}
            empty="No installment payments recorded at counter yet."
          />
        )}
      </div>

      {/* Printable Receipt Dialog */}
      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        data={receiptData}
      />

      {/* Add New Product or Service Modal */}
      <Dialog
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        title="Add Product or Service"
        description="Register a new retail product or counter service to your agency's catalog."
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const kind = form.get("kind") as "product" | "service";
            const name = String(form.get("name") ?? "");
            const salePrice = String(form.get("price") ?? "");
            const quantity = kind === "product" ? Number(form.get("quantity") ?? 0) : 0;

            try {
              await mutation.mutateAsync({
                path: "/api/pos/catalog",
                method: "POST",
                body: { name, kind, salePrice, quantity },
              });
              setAddItemOpen(false);
              setBannerMessage(`Added "${name}" to POS catalog.`);
              setTimeout(() => setBannerMessage(null), 4000);
            } catch {}
          }}
        >
          <div>
            <Label>Item Name</Label>
            <Input name="name" placeholder="e.g. Ihram Belt, VIP Wheelchair, Sim Card" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Item Type</Label>
              <select
                name="kind"
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              >
                <option value="product">Product (Inventory)</option>
                <option value="service">Service (On-Demand)</option>
              </select>
            </div>

            <div>
              <Label>Selling Price (BDT)</Label>
              <Input
                name="price"
                type="number"
                min="1"
                step="1"
                placeholder="1500"
                required
              />
            </div>
          </div>

          <div>
            <Label>Initial Stock Quantity</Label>
            <Input
              name="quantity"
              type="number"
              min="0"
              step="1"
              defaultValue="10"
              placeholder="Number of units on hand (Products only)"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Services are always available and do not require physical stock tracking.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAddItemOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Item"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Quick Edit Price & Stock Modal */}
      {editItem && (
        <Dialog
          open={true}
          onClose={() => setEditItem(null)}
          title={`Edit ${editItem.name}`}
          description={`Update the selling price and stock on hand for this ${editItem.kind}.`}
        >
          <div className="space-y-4">
            <div>
              <Label>Selling Price (BDT)</Label>
              <Input
                type="number"
                min="0.01"
                step="1"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                required
              />
            </div>

            {editItem.kind === "product" && (
              <div>
                <Label>Stock on Hand (Units)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditItem(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={mutation.isPending} onClick={handleSaveEdit}>
                {mutation.isPending ? "Updating…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );

  if (isFullscreen && typeof window !== "undefined") {
    return createPortal(terminalContent, document.body);
  }

  return terminalContent;
}
