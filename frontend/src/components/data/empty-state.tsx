import { Inbox } from "lucide-react";
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-navy-700 dark:bg-navy-800"><span className="mb-4 rounded-2xl bg-surface p-4 text-teal-500 dark:bg-navy-700"><Inbox size={26} strokeWidth={1.5} /></span><h3 className="text-base font-semibold">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{body ?? "Records will appear here as you add them to your workspace."}</p></div>;
}
