"use client";

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
  return (
    <section aria-label="Search and filters" className="card mb-6 p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(4,1fr)]">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="player-search" className="label">Search</label>
          <input
            id="player-search"
            type="search"
            inputMode="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="input"
          />
        </div>

        {fields.map((field) => (
          <div key={field.id}>
            <label htmlFor={`filter-${field.id}`} className="label">{field.label}</label>
            <select
              id={`filter-${field.id}`}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="input"
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

      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <p aria-live="polite">
          Showing <span className="font-semibold text-foreground">{resultCount}</span> player{resultCount === 1 ? "" : "s"}
        </p>
        {canReset && (
          <button type="button" onClick={onReset} className="font-semibold text-primary hover:underline">
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}
