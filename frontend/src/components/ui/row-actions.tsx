"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-700"
        >
          <MoreVertical size={17} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-navy-700 dark:bg-navy-800"
        >
          {actions.map((a) => (
            <DropdownMenu.Item
              key={a.label}
              disabled={a.disabled}
              title={a.hint}
              onSelect={() => a.onSelect()}
              className={cn(
                "flex w-full cursor-default items-center justify-between gap-2 px-4 py-2.5 text-left text-sm outline-none transition select-none hover:bg-slate-50 focus:bg-slate-50 dark:hover:bg-navy-700 dark:focus:bg-navy-700",
                a.danger ? "text-red-600" : "text-slate-700 dark:text-slate-200",
                a.disabled && "pointer-events-none opacity-40",
              )}
            >
              <span>{a.label}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
