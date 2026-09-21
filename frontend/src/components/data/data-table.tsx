import { EmptyState } from "./empty-state";

export type Column<T> = { key: string; header: string; render?: (row: T) => React.ReactNode };

export function DataTable<T>({
  columns,
  rows,
  empty = "No records yet.",
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
}) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <div tabIndex={0} role="region" aria-label="Records table, scroll horizontally to see all columns" className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-navy-700">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left dark:bg-navy-800">
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c.key} className="px-4 py-3 font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={((row as Record<string, unknown>).id as string) ?? i} className="border-t border-slate-100 dark:border-navy-700">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3">
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
