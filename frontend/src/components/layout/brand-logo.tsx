import { cn } from "@/lib/utils";

export function BrandLogo({
  variant = "full",
  className,
}: {
  variant?: "mark" | "full" | "glow";
  className?: string;
}) {
  const mark = (
    <img
      src="/logo-mark.png"
      alt="Wufud"
      width={40}
      height={40}
      className={cn(
        "h-10 w-10 object-contain shrink-0",
        variant === "glow" && "drop-shadow-[0_0_12px_#14B89A]",
        className
      )}
    />
  );

  if (variant === "mark") return mark;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {mark}
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight leading-none text-navy-900 dark:text-white">
          Wufud
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 mt-1">
          Journeys, connected
        </span>
      </div>
    </div>
  );
}
