"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
};

export function RowActions({ actions, label = "Open row actions" }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open ]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-700"
      >
        <MoreVertical size={17} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-navy-700 dark:bg-navy-800"
        >
          {actions.map((a) => (
            <button
              key={a.label}
              role="menuitem"
              disabled={a.disabled}
              title={a.hint}
              onClick={() => {
                setOpen(false);
                a.onSelect();
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-navy-700",
                a.danger ? "text-red-600" : "text-slate-700 dark:text-slate-200",
                a.disabled && "cursor-not-allowed opacity-40",
              )}
            >
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
