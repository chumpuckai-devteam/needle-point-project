import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Store } from "../types";

type Props = {
  stores: Store[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  label?: string;
  help?: string;
  testId?: string;
};

function matchesQuery(store: Store, q: string): boolean {
  if (!q) return true;
  const hay = `${store.name} ${store.handle} ${store.city ?? ""} ${store.region ?? ""}`.toLowerCase();
  return hay.includes(q);
}

/**
 * Searchable multi-select for Available-at stores.
 * Type to filter; pick chips; search again to add more.
 */
export function StoreSearchMultiSelect({
  stores,
  selectedIds,
  onChange,
  label = "Available at (stores)",
  help = "Search by shop name or @handle. Select multiple — search again after each pick.",
  testId = "store-search-multi",
}: Props) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => {
    const set = new Set(selectedIds);
    return stores.filter((s) => set.has(s.id));
  }, [stores, selectedIds]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return stores
      .filter((s) => !selectedSet.has(s.id))
      .filter((s) => matchesQuery(s, q))
      .slice(0, q ? 12 : 8);
  }, [stores, selectedIds, q]);

  function add(id: string) {
    if (selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
    setQuery("");
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className="full-field store-picker store-search-multi" data-testid={testId}>
      <span className="field-label">{label}</span>

      {selected.length > 0 ? (
        <ul className="store-search-chips" aria-label="Selected stores">
          {selected.map((store) => (
            <li key={store.id}>
              <button
                type="button"
                className="store-search-chip"
                onClick={() => remove(store.id)}
                aria-label={`Remove ${store.name}`}
              >
                <span className="store-search-chip-name">{store.name}</span>
                <span className="store-search-chip-handle">@{store.handle}</span>
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="store-search-input-wrap" htmlFor={`${testId}-input`}>
        <Search size={16} aria-hidden className="store-search-icon" />
        <input
          id={`${testId}-input`}
          type="search"
          className="store-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shops by name or @handle…"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      <div className="store-search-results" role="listbox" aria-label="Matching shops">
        {results.length === 0 ? (
          <p className="store-search-empty">
            {q ? `No shops match “${query.trim()}”.` : "Start typing a shop name to add stores."}
          </p>
        ) : (
          results.map((store) => (
            <button
              key={store.id}
              type="button"
              role="option"
              className="store-search-result"
              onClick={() => add(store.id)}
            >
              <span className="store-search-result-name">{store.name}</span>
              <span className="store-search-result-meta">
                @{store.handle}
                {store.city ? ` · ${store.city}` : ""}
                {store.storeType === "online" ? " · Online" : store.shipsNationwide ? " · Ships" : ""}
              </span>
            </button>
          ))
        )}
      </div>

      {help ? <p className="field-help">{help}</p> : null}
    </div>
  );
}
