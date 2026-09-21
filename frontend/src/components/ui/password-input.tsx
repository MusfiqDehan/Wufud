"use client";

import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-teal-300 focus:ring-2 dark:border-navy-700 dark:bg-navy-800";

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function PasswordInput({ className, id: idProp, autoComplete, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const id = idProp ?? autoId;
  const toggleId = `${id}-toggle`;

  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        id={id}
        type={visible ? "text" : "password"}
        data-password-input=""
        autoComplete={autoComplete ?? "current-password"}
        className={cn(fieldClass, "pr-11", className)}
      />
      <button
        id={toggleId}
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 dark:hover:text-slate-200"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff size={18} strokeWidth={1.75} aria-hidden /> : <Eye size={18} strokeWidth={1.75} aria-hidden />}
      </button>
    </div>
  );
});
