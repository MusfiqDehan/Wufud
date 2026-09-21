"use client";

import { useMemo, useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "./data-table";
import { CursorPagination } from "./cursor-pagination";
import type { Pagination as ServerPagination } from "@wufud/contracts";

/**
 * Single-purpose table shell: search + add-button toolbar + responsive table + cursor pagination.
 * Filtering lives in the page-level stat cards above the table (via `initialFilter`)
 * so there is exactly one stat/filter row per table — never two.
 */
export function ManagedTable<T extends Record<string, unknown>>({
  rows,
  columns,
  searchKeys = [],
  searchPlaceholder = "Search records…",
  onAdd,
  addLabel = "Add new",
  empty = "No records yet.",
  initialFilter,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  pagination: serverPagination,
  onCursorChange,
  disablePagination = false,
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T & string)[];
  searchPlaceholder?: string;
  onAdd?: () => void;
  addLabel?: string;
  empty?: string;
  initialFilter?: (row: T) => boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  pagination?: ServerPagination;
  onCursorChange?: (cursor?: string, direction?: "next" | "prev") => void;
  disablePagination?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Reset to page 1 whenever the search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (initialFilter && !initialFilter(row)) return false;
      if (!q) return true;
      if (searchKeys.length) {
        return searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q));
      }
      return Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [rows, query, searchKeys, initialFilter]);

  // Adjust page if filtered records shrunk
  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Slice rows for pagination unless disabled or handled server-side
  const isServerPaginated = Boolean(serverPagination && onCursorChange);

  const paginatedRows = useMemo(() => {
    if (disablePagination || isServerPaginated) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, disablePagination, isServerPaginated, currentPage, pageSize]);

  // The 3-dot row menu column always gets a visible "Actions" header.
  const labeled = columns.map((c) =>
    c.header === "" && /action/i.test(c.key) ? { ...c, header: "Actions" } : c,
  );

  const fromRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-navy-700 dark:bg-navy-800 sm:flex-row sm:items-center sm:p-4">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search table"
            className="pl-9"
          />
        </label>
        {onAdd ? (
          <Button size="sm" onClick={onAdd} className="h-11 px-4 sm:w-auto">
            <Plus size={16} /> {addLabel}
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
        <p role="status">
          {query ? (
            <>
              Found <strong className="text-slate-700 dark:text-white">{filtered.length}</strong> matching records out of {rows.length} total
            </>
          ) : (
            <>
              Total records: <strong className="text-slate-700 dark:text-white">{rows.length}</strong>
            </>
          )}
        </p>
        {query ? (
          <button className="underline underline-offset-4 text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200" onClick={() => setQuery("")}>
            Clear search
          </button>
        ) : null}
      </div>

      <DataTable rows={paginatedRows} columns={labeled} empty={empty} />

      {!disablePagination ? (
        <CursorPagination
          hasPrevious={isServerPaginated ? Boolean(serverPagination?.has_previous) : currentPage > 1}
          hasNext={isServerPaginated ? Boolean(serverPagination?.has_next) : currentPage < totalPages}
          onPrevious={
            isServerPaginated
              ? () => onCursorChange?.(serverPagination?.previous_cursor, "prev")
              : () => setCurrentPage((p) => Math.max(1, p - 1))
          }
          onNext={
            isServerPaginated
              ? () => onCursorChange?.(serverPagination?.next_cursor, "next")
              : () => setCurrentPage((p) => Math.min(totalPages, p + 1))
          }
          onFirst={!isServerPaginated ? () => setCurrentPage(1) : undefined}
          onLast={!isServerPaginated ? () => setCurrentPage(totalPages) : undefined}
          currentPage={currentPage}
          totalPages={!isServerPaginated ? totalPages : undefined}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={pageSizeOptions}
          totalRecords={totalRecords}
          fromRecord={fromRecord}
          toRecord={toRecord}
        />
      ) : null}
    </div>
  );
}

