"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/format";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface Props {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  fields: FilterField[];
  sort: string;
  sortOptions: FilterOption[];
  onSort: (value: string) => void;
  resultCount: number;
  onReset: () => void;
  canReset: boolean;
}

/**
 * Presentational search + filter + sort controls. It owns no state – the
 * parent (PlayerExplorer) decides what the filters mean – so it can be reused
 * for any list later (teams, auction history, ...).
 */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = "Search by name…",
  fields,
  sort,
  sortOptions,
  onSort,
  resultCount,
  onReset,
  canReset,
}: Props) {
  const [open, setOpen] = useState(false);
  const active = fields.filter((f) => f.value !== "").length;

  return (
    <section aria-label="Search and filters" className="card mb-6 p-3 sm:p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="player-search" className="sr-only">Search players</label>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="player-search"
            type="search"
            inputMode="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="input pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="filter-fields"
          className={cn("btn-outline shrink-0 lg:hidden", (open || active > 0) && "border-primary/60 text-primary")}
        >
          <Icon name="filter" className="h-4 w-4" />
          Filters{active > 0 ? ` (${active})` : ""}
        </button>
      </div>

      <div id="filter-fields" className={cn("mt-3 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid lg:auto-cols-fr lg:grid-flow-col", open ? "grid" : "hidden")}>
        {fields.map((field) => (
          <div key={field.id}>
            <label htmlFor={`filter-${field.id}`} className="label">{field.label}</label>
            <select
              id={`filter-${field.id}`}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className={cn("input", field.value !== "" && "border-primary/60 bg-primary/5")}
            >
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ))}

        <div>
          <label htmlFor="filter-sort" className="label">Sort by</label>
          <select id="filter-sort" value={sort} onChange={(e) => onSort(e.target.value)} className="input">
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm text-muted">
        <p aria-live="polite">
          Showing <span className="font-semibold text-foreground">{resultCount}</span> player{resultCount === 1 ? "" : "s"}
        </p>
        {canReset && (
          <button type="button" onClick={onReset} className="font-semibold text-primary hover:underline">
            Clear all
          </button>
        )}
      </div>
    </section>
  );
}
