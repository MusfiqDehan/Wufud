"use client";

import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  title,
  body,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-navy-800">
        <h3 className="text-lg font-semibold">{title}</h3>
        {body ? <p className="mt-2 text-sm text-slate-500">{body}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}
