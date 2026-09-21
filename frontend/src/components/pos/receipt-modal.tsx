"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Printer, X, Receipt, RotateCcw, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReceiptData =
  | {
      type: "sale";
      receiptNumber: string;
      saleId: string;
      createdAt: string;
      cashierName: string;
      customerName?: string;
      customerPhone?: string;
      paymentMethod: string;
      total: string;
      amountTendered: number;
      changeDue: string;
      items: {
        itemId: string;
        name: string;
        kind: string;
        quantity: number;
        unitPrice: string;
      }[];
    }
  | {
      type: "installment";
      approvalStatus?: string;
      receiptNumber: string;
      bookingId: string;
      tranId: string;
      createdAt: string;
      cashierName: string;
      pilgrimName: string;
      pilgrimsCount?: number;
      packageName: string;
      amountPaid: string;
      amountTendered: number;
      changeDue: string;
      previousReceived: string;
      totalReceived: string;
      totalPrice: string;
      remainingBalance: string;
      bookingStatus: string;
      paymentMethod: string;
      installments?: {
        sequence: number;
        dueDate: string;
        amountDue: string;
        amountPaid: string;
        status: string;
      }[];
    }
  | {
      type: "refund";
      receiptNumber: string;
      saleId: string;
      createdAt: string;
      cashierName: string;
      amountRefunded: string;
      originalSaleTotal: string;
      status: string;
      items: {
        name: string;
        quantity: number;
        unitPrice: string;
      }[];
    };

const formatMoney = (val?: string | number) => {
  if (val === undefined || val === null || val === "") return "—";
  const num = Number(val);
  if (isNaN(num)) return "—";
  return `${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(num)} BDT`;
};

const formatDateSafe = (d?: string) => {
  if (!d) return "Just now";
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "Just now" : dt.toLocaleString("en-BD");
  } catch {
    return "Just now";
  }
};

export function ReceiptModal({
  open,
  onClose,
  data,
  agencyName = "E2E Travels / Wufud",
}: {
  open: boolean;
  onClose: () => void;
  data: ReceiptData | null;
  agencyName?: string;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const isSale = data.type === "sale";
  const isInstallment = data.type === "installment";
  const isRefund = data.type === "refund";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-navy-900/60 p-4 backdrop-blur-[3px] print:p-0 print:bg-white print:static"
      onClick={onClose}
      role="presentation"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #pos-printable-receipt,
              #pos-printable-receipt * {
                visibility: visible;
              }
              #pos-printable-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 20px;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `,
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Transaction Receipt"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-navy-700 dark:bg-navy-800 print:border-none print:shadow-none print:max-w-none"
      >
        {/* Top Dialog Action Bar (Hidden in print) */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-navy-700 no-print">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isRefund
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
              }`}
            >
              {isRefund ? <RotateCcw size={16} /> : <Receipt size={16} />}
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isRefund
                  ? "Refund Voucher"
                  : isInstallment
                  ? "Installment Receipt"
                  : "Sales Receipt"}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">{data.receiptNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500"
            >
              <Printer size={14} />
              Print
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div
          id="pos-printable-receipt"
          ref={receiptRef}
          className="p-6 sm:p-7 space-y-5 text-slate-800 dark:text-slate-200 print:text-black"
        >
          {/* Header Branding */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300 dark:border-navy-600 print:border-black">
            <div className="flex items-center justify-center gap-2 text-[#153e35] dark:text-emerald-400 font-serif font-black text-xl tracking-tight print:text-black">
              <Building2 size={20} />
              <span>{agencyName}</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 print:text-gray-600 uppercase tracking-wider">
              Pilgrim Travel Services & POS Terminal
            </p>
            <div className="pt-2">
              <span
                className={`inline-block rounded-md px-3 py-0.5 text-xs font-bold tracking-wider uppercase ${
                  isRefund
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : isInstallment
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                } print:border print:border-black`}
              >
                {isRefund
                  ? "Official Refund Voucher"
                  : isInstallment
                  ? "Booking Installment Receipt"
                  : "Retail Sales Receipt"}
              </span>
            </div>
          </div>

          {isInstallment && data.approvalStatus && <p role="status" className="my-3 rounded border border-amber-300 p-3 text-sm font-semibold">
            Approval: {data.approvalStatus}. {data.approvalStatus === "pending" ? "Cash received is awaiting approval by a different user. Booking balance and seat status are unchanged." : ""}
          </p>}
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Receipt Number
              </span>
              <strong className="font-mono text-slate-900 dark:text-white print:text-black">
                {data.receiptNumber}
              </strong>
            </div>

            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Date & Time
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300 print:text-black">
                {formatDateSafe(data.createdAt)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Cashier / Agent
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                {data.cashierName}
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Payment Method
              </span>
              <span className="font-semibold capitalize text-slate-800 dark:text-slate-200 print:text-black">
                {isRefund ? "Refunded via Original Method" : data.paymentMethod}
              </span>
            </div>

            {isSale && data.customerName && (
              <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-navy-700 print:border-gray-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Customer / Pilgrim
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                  {data.customerName}
                  {data.customerPhone ? ` · ${data.customerPhone}` : ""}
                </span>
              </div>
            )}

            {isInstallment && (
              <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-navy-700 print:border-gray-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Pilgrim Name</span>
                  <strong className="text-slate-900 dark:text-white print:text-black">
                    {data.pilgrimName}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Package & Tier</span>
                  <span className="text-slate-700 dark:text-slate-300 print:text-black font-medium">
                    {data.packageName}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Booking Reference</span>
                  <span className="text-slate-600 dark:text-slate-400 print:text-black">
                    #{data.bookingId.slice(0, 10)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Line Items Table (For Sales & Refunds) */}
          {(isSale || isRefund) && (
            <div className="border-t border-b border-dashed border-slate-300 dark:border-navy-600 py-3 print:border-black space-y-2">
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 print:text-black">
                <span>Description</span>
                <span>Qty × Unit</span>
                <span className="text-right">Total</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-navy-700/60 print:divide-gray-200 text-xs">
                {(data.items ?? []).map((line, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black block truncate">
                        {line.name}
                      </span>
                    </div>
                    <div className="text-slate-500 tabular-nums shrink-0">
                      {line.quantity} × {formatMoney(line.unitPrice)}
                    </div>
                    <div className="text-right font-bold tabular-nums shrink-0 min-w-[65px]">
                      {formatMoney(Number(line.unitPrice) * line.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Installment Payment Breakdown */}
          {isInstallment && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-navy-700 dark:bg-navy-900/60 space-y-2 text-xs print:bg-white print:border-black">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Booking Price</span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white print:text-black">
                  {formatMoney(data.totalPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Previously Received</span>
                <span className="tabular-nums text-slate-700 dark:text-slate-300 print:text-black">
                  {formatMoney(data.previousReceived)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-navy-700 print:border-black text-emerald-700 dark:text-emerald-400 font-bold">
                <span>Payment Collected Now</span>
                <span className="text-sm tabular-nums">{formatMoney(data.amountPaid)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-dashed border-slate-300 dark:border-navy-700">
                <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
                  Remaining Balance Due
                </span>
                <strong className="text-sm font-black text-slate-900 dark:text-white print:text-black tabular-nums">
                  {formatMoney(data.remainingBalance)}
                </strong>
              </div>
            </div>
          )}

          {/* Payment & Change Totals */}
          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex justify-between text-base font-black">
              <span className="text-slate-900 dark:text-white print:text-black">
                {isRefund ? "Total Refunded" : "Total Amount"}
              </span>
              <span className="text-teal-700 dark:text-teal-400 print:text-black tabular-nums">
                {formatMoney(isRefund ? data.amountRefunded : isSale ? data.total : data.amountPaid)}
              </span>
            </div>

            {!isRefund && (
              <>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Cash Tendered</span>
                  <span className="tabular-nums font-semibold">
                    {formatMoney(data.amountTendered)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Change Given</span>
                  <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 print:text-black">
                    {formatMoney(data.changeDue)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Footer Barcode / Gratitude */}
          <div className="text-center pt-4 border-t border-dashed border-slate-300 dark:border-navy-600 print:border-black space-y-2">
            <div className="font-mono text-[10px] tracking-widest text-slate-400">
              ||| | ||||| ||| |||| |||| | |||
            </div>
            <p className="text-xs font-serif italic text-slate-700 dark:text-slate-300 print:text-black">
              Jazakallahu Khair for choosing {agencyName}.
            </p>
            <p className="text-[10px] text-slate-400">
              Official computer-generated receipt. Please retain for your pilgrimage records.
            </p>
          </div>
        </div>

        {/* Bottom Actions (Hidden in print) */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-navy-700 no-print">
          <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer size={14} />
            Print Receipt
          </Button>
          <Button type="button" size="sm" onClick={onClose} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            Start Next Sale
          </Button>
        </div>
      </div>
    </div>
  );
}
