import { cn } from "@/lib/utils";

export function BrandLogo({
  variant = "full",
  className,
}: {
  variant?: "mark" | "full" | "glow";
  className?: string;
}) {
  const mark = (
    <svg viewBox="0 0 64 72" className={cn("h-10 w-9", variant === "glow" && "drop-shadow-[0_0_12px_#77bda5]", className)} aria-hidden>
      <path
        d="M32 4c10 8 22 14 22 32 0 16-10 26-22 32C22 62 10 52 10 36 10 18 22 12 32 4z"
        fill="none"
        stroke="#77bda5"
        strokeWidth="4"
      />
      <path d="M20 44c6-10 10-16 12-28 2 12 6 18 12 28" fill="none" stroke="#14B89A" strokeWidth="3.5" />
      <path d="M32 18v16" stroke="#0E8F86" strokeWidth="3" />
      <path d="M32 14l-4 6h8z" fill="#77bda5" />
    </svg>
  );
  if (variant === "mark") return mark;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {mark}
      <div>
        <div className="text-xl font-semibold tracking-tight">Wufud</div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-teal-500">Journeys, connected</div>
      </div>
    </div>
  );
}
