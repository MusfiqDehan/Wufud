"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CursorPaginationProps = {
  /** Whether there is a previous page available */
  hasPrevious?: boolean;
  /** Whether there is a next page available */
  hasNext?: boolean;
  /** Callback triggered when user clicks Previous */
  onPrevious?: () => void;
  /** Callback triggered when user clicks Next */
  onNext?: () => void;
  /** Optional callback to jump to the very first page */
  onFirst?: () => void;
  /** Optional callback to jump to the last page */
  onLast?: () => void;

  /** Current 1-based page number */
  currentPage?: number;
  /** Total number of pages if known */
  totalPages?: number;

  /** Number of items per page */
  pageSize: number;
  /** Callback when user changes items per page */
  onPageSizeChange?: (newSize: number) => void;
  /** Available page size choices (default: [10, 25, 50, 100]) */
  pageSizeOptions?: number[];

  /** Total records count if known */
  totalRecords?: number;
  /** 1-based start index of currently visible items */
  fromRecord?: number;
  /** 1-based end index of currently visible items */
  toRecord?: number;

  /** Optional styling class */
  className?: string;
  /** Compact mode (hides labels, useful for tight spaces) */
  compact?: boolean;
};

export function CursorPagination({
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
  onFirst,
  onLast,
  currentPage = 1,
  totalPages,
  pageSize = 10,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  totalRecords,
  fromRecord,
  toRecord,
  className,
  compact = false,
}: CursorPaginationProps) {
  const isFirstDisabled = !hasPrevious || currentPage <= 1;
  const isLastDisabled = !hasNext || (totalPages !== undefined && currentPage >= totalPages);

  const buttonBase =
    "inline-flex items-center justify-center font-medium rounded-lg text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400";
  const buttonActive =
    "border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 " +
    "dark:border-white/15 dark:bg-navy-700 dark:text-slate-100 dark:shadow-md dark:hover:border-teal-400/60 dark:hover:bg-navy-700/90 dark:hover:text-teal-200";
  const buttonDisabled =
    "border border-slate-100 bg-slate-50/50 text-slate-400 opacity-40 cursor-not-allowed " +
    "dark:border-white/5 dark:bg-navy-900/40 dark:text-slate-500 dark:opacity-30";

  return (
    <nav
      role="navigation"
      aria-label="Table pagination"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-xs text-slate-600 transition-colors " +
          "dark:border-navy-700 dark:bg-navy-800 dark:text-slate-200 sm:flex-row sm:items-center sm:justify-between shadow-xs",
        className,
      )}
    >
      {/* Record counter & Range */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {totalRecords !== undefined ? (
            <>
              Showing{" "}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {totalRecords === 0 ? 0 : fromRecord ?? 1}
              </strong>
              {" – "}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {totalRecords === 0 ? 0 : toRecord ?? Math.min(pageSize, totalRecords)}
              </strong>{" "}
              of{" "}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {totalRecords}
              </strong>{" "}
              records
            </>
          ) : (
            <>
              Showing{" "}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {fromRecord ?? 1}
              </strong>
              {" – "}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {toRecord ?? pageSize}
              </strong>
            </>
          )}
        </span>
      </div>

      {/* Controls: Page size selector & Navigation buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        {/* Page size selector */}
        {onPageSizeChange ? (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="hidden sm:inline font-medium">Rows per page:</span>
            <select
              aria-label="Select rows per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs transition hover:border-slate-300 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-white/15 dark:bg-navy-700 dark:text-white dark:hover:border-teal-400"
            >
              {pageSizeOptions.map((opt) => (
                <option
                  key={opt}
                  value={opt}
                  className="bg-white text-slate-900 dark:bg-navy-900 dark:text-white"
                >
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Page indicator pill */}
        <div className="inline-flex items-center rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1 font-medium text-slate-600 dark:border-white/10 dark:bg-navy-900/90 dark:text-slate-300">
          Page{" "}
          <strong className="mx-1.5 font-bold text-slate-900 dark:text-teal-300">
            {currentPage}
          </strong>
          {totalPages ? (
            <>
              of{" "}
              <span className="ml-1 text-slate-500 dark:text-slate-300 font-medium">
                {totalPages}
              </span>
            </>
          ) : null}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1.5">
          {onFirst ? (
            <button
              type="button"
              disabled={isFirstDisabled}
              onClick={onFirst}
              aria-label="Go to first page"
              title="First page"
              className={cn(buttonBase, "h-8 w-8", isFirstDisabled ? buttonDisabled : buttonActive)}
            >
              <ChevronsLeft size={15} />
            </button>
          ) : null}

          <button
            type="button"
            disabled={isFirstDisabled}
            onClick={onPrevious}
            aria-label="Go to previous page"
            title="Previous page"
            className={cn(
              buttonBase,
              "h-8 gap-1.5 px-3",
              isFirstDisabled ? buttonDisabled : buttonActive,
            )}
          >
            <ChevronLeft size={15} />
            {!compact ? <span className="hidden sm:inline font-medium">Previous</span> : null}
          </button>

          <button
            type="button"
            disabled={isLastDisabled}
            onClick={onNext}
            aria-label="Go to next page"
            title="Next page"
            className={cn(
              buttonBase,
              "h-8 gap-1.5 px-3",
              isLastDisabled ? buttonDisabled : buttonActive,
            )}
          >
            {!compact ? <span className="hidden sm:inline font-medium">Next</span> : null}
            <ChevronRight size={15} />
          </button>

          {onLast && totalPages ? (
            <button
              type="button"
              disabled={isLastDisabled}
              onClick={onLast}
              aria-label="Go to last page"
              title="Last page"
              className={cn(buttonBase, "h-8 w-8", isLastDisabled ? buttonDisabled : buttonActive)}
            >
              <ChevronsRight size={15} />
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
