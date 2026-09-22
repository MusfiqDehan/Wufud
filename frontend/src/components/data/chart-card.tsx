import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex min-w-0 flex-col p-5 shadow-none sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {children}
      </div>
    </Card>
  );
}
