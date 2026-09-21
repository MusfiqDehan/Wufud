import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  onClick,
  active,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
  active?: boolean;
  icon?: React.ReactNode;
}) {
  const inner = (
    <Card
      className={cn(
        "relative overflow-hidden p-5 shadow-none transition sm:p-6",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        active && "border-teal-500 ring-2 ring-teal-300",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[.12em] text-slate-500 dark:text-slate-300">{label}</span>
        {icon ?? <Activity size={16} className="shrink-0 text-teal-500" />}
      </div>
      <div className="mt-4 break-words text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</div>
      {hint ? <div className="mt-2 truncate text-xs text-slate-500">{hint}</div> : null}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-400/25" />
    </Card>
  );
  if (!onClick) return inner;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="text-left">
      {inner}
    </button>
  );
}

/* Tiny dependency-free charts (SVG/divs) for dashboards */

export function BarChart({
  data,
  height = 148,
  ariaLabel,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  ariaLabel: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div role="img" aria-label={ariaLabel} className="flex items-end gap-2 overflow-x-auto pb-1" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex min-w-10 flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end rounded-lg bg-slate-100 dark:bg-navy-700" style={{ height: height - 28 }}>
            <div
              title={`${d.label}: ${d.value}`}
              className="w-full rounded-lg transition-all"
              style={{
                height: `${Math.max(4, Math.round((d.value / max) * 100))}%`,
                background: d.color ?? "#0e8f86",
              }}
            />
          </div>
          <span className="max-w-full truncate text-[10px] text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  segments,
  size = 132,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 132 132" role="img" aria-label={centerLabel ?? "Distribution chart"}>
        <circle cx="66" cy="66" r={r} fill="none" strokeWidth="16" className="stroke-slate-100 dark:stroke-navy-700" />
        {segments.map((s) => {
          const frac = s.value / total;
          const dash = `${frac * c} ${c}`;
          const offset = -(acc / total) * c;
          acc += s.value;
          return (
            <circle
              key={s.label}
              cx="66"
              cy="66"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={dash}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              transform="rotate(-90 66 66)"
            >
              <title>
                {s.label}: {s.value}
              </title>
            </circle>
          );
        })}
        <text x="66" y="66" textAnchor="middle" dominantBaseline="central" className="fill-slate-700 text-sm font-semibold dark:fill-white">
          {centerLabel ?? String(total)}
        </text>
      </svg>
      <ul className="min-w-32 space-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({ points, width = 160, height = 44 }: { points: number[]; width?: number; height?: number }) {
  const max = Math.max(1, ...points);
  const min = Math.min(...points, 0);
  const span = Math.max(1, max - min);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - 4 - ((p - min) / span) * (height - 10)).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend sparkline" className="overflow-visible">
      <path d={d} fill="none" stroke="#0e8f86" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
