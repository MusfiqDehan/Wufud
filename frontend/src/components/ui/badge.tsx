import { cn } from "@/lib/utils";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-600 dark:bg-teal-600/20 dark:text-teal-200", className)}>
      {children}
    </span>
  );
}
