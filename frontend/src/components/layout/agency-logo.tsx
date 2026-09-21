import { Compass } from "lucide-react";
export function AgencyLogo({ name, compact = false }: { name: string; compact?: boolean }) {
  return <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-600/40 bg-amber-50 text-amber-800"><Compass size={25} strokeWidth={1.3} /></span><div><p className="font-serif text-xl font-semibold leading-tight">{name}</p>{!compact && <p className="mt-1 text-[9px] uppercase tracking-[.2em] text-amber-700 dark:text-amber-300">Hajj · Umrah · Ziyarah</p>}</div></div>;
}
