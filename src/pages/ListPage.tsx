import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  formatDuration,
  getAuctionTimes,
  useNow,
  type AuctionTimes,
} from "../auction";
import { useBids, getEffectiveBid, type UserBid } from "../bids";
import { vehicles } from "../data";
import { colorFamily, colorSwatch, currencyFmt, kmFmt, onImageError } from "../format";
import type { Vehicle } from "../types";

const SORT_OPTIONS = [
  { value: "default", label: "Sort: Lot order" },
  { value: "name-asc", label: "Make & model (A–Z)" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "mileage-asc", label: "Mileage: low to high" },
  { value: "mileage-desc", label: "Mileage: high to low" },
  { value: "year-desc", label: "Year: newest first" },
  { value: "year-asc", label: "Year: oldest first" },
  { value: "auction-asc", label: "Auction: soonest" },
  { value: "auction-desc", label: "Auction: latest" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

function isValidSort(s: string): s is SortKey {
  return SORT_OPTIONS.some((o) => o.value === s);
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Starting soon" },
  { value: "ended", label: "Ended" },
] as const;

type StatusKey = (typeof STATUS_OPTIONS)[number]["value"];

function isValidStatus(s: string): s is StatusKey {
  return STATUS_OPTIONS.some((o) => o.value === s);
}

function gradePillClasses(grade: number): string {
  if (grade >= 4) return "bg-emerald-50 text-emerald-700";
  if (grade >= 3) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

const GRADE_THRESHOLDS = [
  { value: 0, label: "Any" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
  { value: 4.5, label: "4.5+" },
] as const;

interface Filters {
  makes: string[];
  bodies: string[];
  colors: string[];
  gradeMin: number;
  priceMin: number;
  priceMax: number;
  yearMin: number;
  yearMax: number;
}

const FILTER_KEYS = [
  "make",
  "body",
  "color",
  "grade",
  "price_min",
  "price_max",
  "year_min",
  "year_max",
] as const;

function parseFilters(sp: URLSearchParams): Filters {
  const list = (key: string) =>
    (sp.get(key) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  const num = (key: string) => {
    const v = Number(sp.get(key));
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  return {
    makes: list("make"),
    bodies: list("body"),
    colors: list("color"),
    gradeMin: num("grade"),
    priceMin: num("price_min"),
    priceMax: num("price_max"),
    yearMin: num("year_min"),
    yearMax: num("year_max"),
  };
}

// Treats an inverted range (min > max) as if the user meant the two bounds
// swapped. Normalizing at compare time instead of parse time keeps the input
// values stable while the user is still typing.
function rangePair(lo: number, hi: number): [number, number] {
  return lo > 0 && hi > 0 && lo > hi ? [hi, lo] : [lo, hi];
}

function passesFilters(v: Vehicle, f: Filters, effectivePrice: number): boolean {
  if (f.makes.length && !f.makes.includes(v.make)) return false;
  if (f.bodies.length && !f.bodies.includes(v.body_style)) return false;
  if (f.colors.length && !f.colors.includes(colorFamily(v.exterior_color)))
    return false;
  if (f.gradeMin > 0 && v.condition_grade < f.gradeMin) return false;
  const [priceMin, priceMax] = rangePair(f.priceMin, f.priceMax);
  if (priceMin > 0 && effectivePrice < priceMin) return false;
  if (priceMax > 0 && effectivePrice > priceMax) return false;
  const [yearMin, yearMax] = rangePair(f.yearMin, f.yearMax);
  if (yearMin > 0 && v.year < yearMin) return false;
  if (yearMax > 0 && v.year > yearMax) return false;
  return true;
}

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.makes.length) n++;
  if (f.bodies.length) n++;
  if (f.colors.length) n++;
  if (f.gradeMin > 0) n++;
  if (f.priceMin > 0 || f.priceMax > 0) n++;
  if (f.yearMin > 0 || f.yearMax > 0) n++;
  return n;
}

function haystack(v: Vehicle) {
  return [
    String(v.year),
    v.make,
    v.model,
    v.trim,
    v.body_style,
    v.vin,
    v.lot,
    v.selling_dealership,
    v.city,
    v.province,
    v.exterior_color,
    v.interior_color,
    v.fuel_type,
  ]
    .join(" ")
    .toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesQuery(hay: string, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => new RegExp(`\\b${escapeRegex(t)}`).test(hay));
}

function displayPrice(v: Vehicle, userBids: UserBid[]): number {
  const { currentBid, bidCount } = getEffectiveBid(v, userBids);
  return bidCount === 0 ? v.starting_bid : currentBid;
}

function sortVehicles(
  list: Vehicle[],
  sort: SortKey,
  userBids: UserBid[],
): Vehicle[] {
  if (sort === "default") return list;
  const copy = [...list];
  switch (sort) {
    case "name-asc":
      copy.sort((a, b) =>
        `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`),
      );
      break;
    case "price-asc":
      copy.sort((a, b) => displayPrice(a, userBids) - displayPrice(b, userBids));
      break;
    case "price-desc":
      copy.sort((a, b) => displayPrice(b, userBids) - displayPrice(a, userBids));
      break;
    case "mileage-asc":
      copy.sort((a, b) => a.odometer_km - b.odometer_km);
      break;
    case "mileage-desc":
      copy.sort((a, b) => b.odometer_km - a.odometer_km);
      break;
    case "year-desc":
      copy.sort((a, b) => b.year - a.year);
      break;
    case "year-asc":
      copy.sort((a, b) => a.year - b.year);
      break;
    case "auction-asc":
      copy.sort((a, b) => a.auction_start.localeCompare(b.auction_start));
      break;
    case "auction-desc":
      copy.sort((a, b) => b.auction_start.localeCompare(a.auction_start));
      break;
  }
  return copy;
}

export default function ListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const sortParam = searchParams.get("sort") ?? "default";
  const sort: SortKey = isValidSort(sortParam) ? sortParam : "default";
  const statusParam = searchParams.get("status") ?? "all";
  const status: StatusKey = isValidStatus(statusParam) ? statusParam : "all";
  const { userBids, userMaxBids } = useBids();
  const now = useNow(1000);
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const activeFilterCount = countActiveFilters(filters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    document.title = "The Block - Vehicle Auctions";
  }, []);

  const makeOptions = useMemo(
    () => [...new Set(vehicles.map((v) => v.make))].sort(),
    [],
  );
  const bodyOptions = useMemo(
    () => [...new Set(vehicles.map((v) => v.body_style))].sort(),
    [],
  );
  const colorOptions = useMemo(
    () => [...new Set(vehicles.map((v) => colorFamily(v.exterior_color)))].sort(),
    [],
  );
  const yearBounds = useMemo(() => {
    const years = vehicles.map((v) => v.year);
    return { min: Math.min(...years), max: Math.max(...years) };
  }, []);

  const searched = useMemo(() => {
    if (!q.trim()) return vehicles;
    return vehicles.filter((v) => matchesQuery(haystack(v), q));
  }, [q]);

  const customFiltered = useMemo(
    () =>
      searched.filter((v) =>
        passesFilters(v, filters, displayPrice(v, userBids)),
      ),
    [searched, filters, userBids],
  );

  const statusCounts = useMemo(() => {
    const counts = { all: customFiltered.length, live: 0, upcoming: 0, ended: 0 };
    for (const v of customFiltered) {
      counts[getAuctionTimes(v, now).state]++;
    }
    return counts;
  }, [customFiltered, now]);

  const filtered = useMemo(() => {
    if (status === "all") return customFiltered;
    return customFiltered.filter(
      (v) => getAuctionTimes(v, now).state === status,
    );
  }, [customFiltered, status, now]);

  const sorted = useMemo(
    () => sortVehicles(filtered, sort, userBids),
    [filtered, sort, userBids],
  );

  function updateParam(
    key: "q" | "sort" | "status",
    next: string,
    empty: string,
  ) {
    const params = new URLSearchParams(searchParams);
    if (next && next !== empty) params.set(key, next);
    else params.delete(key);
    setSearchParams(params, { replace: true });
  }

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    setSearchParams(params, { replace: true });
  }

  function toggleMulti(key: "make" | "body" | "color", value: string) {
    const field =
      key === "make" ? "makes" : key === "body" ? "bodies" : "colors";
    const current = filters[field];
    const next = current.includes(value)
      ? current.filter((x) => x !== value)
      : [...current, value];
    updateParams({ [key]: next.length ? next.join(",") : null });
  }

  function clearAllFilters() {
    const patch: Record<string, null> = {};
    for (const k of FILTER_KEYS) patch[k] = null;
    updateParams(patch);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight">The Block</h1>
            <MyBidsLink count={new Set(userBids.map((b) => b.vehicleId)).size} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="relative block w-full sm:w-80">
              <span className="sr-only">Search vehicles</span>
              <input
                type="search"
                value={q}
                onChange={(e) => updateParam("q", e.target.value, "")}
                placeholder="Search make, model, VIN, lot, city…"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <label className="block w-full sm:w-auto">
              <span className="sr-only">Sort vehicles</span>
              <select
                value={sort}
                onChange={(e) => updateParam("sort", e.target.value, "default")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:w-auto"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-controls="filters-panel"
              className={
                "inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition sm:w-auto " +
                (activeFilterCount > 0
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400")
              }
            >
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-slate-900">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pb-3">
          {STATUS_OPTIONS.map((o) => {
            const active = status === o.value;
            const count = statusCounts[o.value];
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => updateParam("status", o.value, "all")}
                aria-pressed={active}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition " +
                  (active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400")
                }
              >
                {o.value === "live" && (
                  <span
                    className={
                      "inline-block h-1.5 w-1.5 rounded-full " +
                      (active ? "bg-emerald-300" : "bg-emerald-500")
                    }
                  />
                )}
                {o.label}
                <span
                  className={
                    "text-[11px] " + (active ? "text-slate-300" : "text-slate-500")
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
          <span className="ml-auto text-xs text-slate-500">
            {sorted.length === vehicles.length
              ? `${vehicles.length} vehicles available`
              : `${sorted.length} of ${vehicles.length} vehicles match`}
          </span>
        </div>
        {filtersOpen && (
          <FilterPanel
            filters={filters}
            makeOptions={makeOptions}
            bodyOptions={bodyOptions}
            colorOptions={colorOptions}
            yearBounds={yearBounds}
            activeCount={activeFilterCount}
            onToggle={toggleMulti}
            onUpdate={updateParams}
            onClearAll={clearAllFilters}
          />
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {sorted.length === 0 ? (
          <EmptyState
            query={q}
            status={status}
            activeFilterCount={activeFilterCount}
            onClearQuery={() => updateParam("q", "", "")}
            onClearStatus={() => updateParam("status", "all", "all")}
            onClearFilters={clearAllFilters}
          />
        ) : (
          <ul className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((v) => {
              const { currentBid, bidCount, myLastBid, wonByBuyNow, maxBid } =
                getEffectiveBid(v, userBids, userMaxBids);
              const times = getAuctionTimes(v, now);
              const reserveMet =
                v.reserve_price != null && currentBid >= v.reserve_price;
              const showReservePill = times.state === "live" && reserveMet;
              return (
                <li key={v.id}>
                  <Link
                    to={`/vehicles/${v.id}`}
                    className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
                  >
                    <div className="-mx-4 -mt-4 mb-3 overflow-hidden rounded-t-lg bg-slate-100">
                      <img
                        src={v.images[0]}
                        alt=""
                        loading="lazy"
                        onError={onImageError}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="font-medium">
                        {v.year} {v.make} {v.model}
                      </h2>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={
                            "rounded-full px-1.5 py-0.5 text-[11px] font-medium " +
                            gradePillClasses(v.condition_grade)
                          }
                          title={`Condition grade ${v.condition_grade.toFixed(1)} of 5`}
                        >
                          {v.condition_grade.toFixed(1)}
                          <span className="opacity-60">/5</span>
                        </span>
                        <span className="text-xs text-slate-500">
                          Lot {v.lot}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">{v.trim}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                      <span
                        aria-hidden
                        className="inline-block h-3 w-3 shrink-0 rounded-full border border-slate-300 shadow-inner"
                        style={{ backgroundColor: colorSwatch(v.exterior_color) }}
                      />
                      <span>{v.exterior_color}</span>
                      <span aria-hidden>·</span>
                      <span>{kmFmt.format(v.odometer_km)} km</span>
                      <span aria-hidden>·</span>
                      <span>
                        {v.city}, {v.province}
                      </span>
                    </p>
                    <div className="mt-auto flex items-baseline justify-between border-t border-slate-100 pt-3">
                      {bidCount === 0 ? (
                        <>
                          <span className="text-lg font-semibold">
                            {currencyFmt.format(v.starting_bid)}
                          </span>
                          <span className="text-xs text-slate-500">
                            No bids yet
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-semibold">
                            {currencyFmt.format(currentBid)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {bidCount} {bidCount === 1 ? "bid" : "bids"}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <AuctionLabel times={times} wonByBuyNow={wonByBuyNow} />
                      {showReservePill && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          Reserve met
                        </span>
                      )}
                    </div>
                    {wonByBuyNow ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        You bought this
                      </p>
                    ) : maxBid ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Max set · {currencyFmt.format(maxBid.amount)}
                      </p>
                    ) : (
                      myLastBid && (
                        <p className="mt-1 text-xs font-medium text-emerald-700">
                          You bid {currencyFmt.format(myLastBid.amount)}
                        </p>
                      )
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function AuctionLabel({
  times,
  wonByBuyNow,
}: {
  times: AuctionTimes;
  wonByBuyNow: boolean;
}) {
  if (wonByBuyNow) {
    return (
      <p className="text-xs font-medium text-emerald-700">
        Sold · Buy now
      </p>
    );
  }
  if (times.state === "live") {
    return (
      <p className="text-xs font-medium text-emerald-700">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
        Live · Ends in {formatDuration(times.msUntilEnd)}
      </p>
    );
  }
  if (times.state === "upcoming") {
    return (
      <p className="text-xs font-medium text-slate-600">
        Starts in {formatDuration(times.msUntilStart)}
      </p>
    );
  }
  return <p className="mt-2 text-xs font-medium text-slate-400">Ended</p>;
}

function FilterPanel({
  filters,
  makeOptions,
  bodyOptions,
  colorOptions,
  yearBounds,
  activeCount,
  onToggle,
  onUpdate,
  onClearAll,
}: {
  filters: Filters;
  makeOptions: string[];
  bodyOptions: string[];
  colorOptions: string[];
  yearBounds: { min: number; max: number };
  activeCount: number;
  onToggle: (key: "make" | "body" | "color", value: string) => void;
  onUpdate: (patch: Record<string, string | null>) => void;
  onClearAll: () => void;
}) {
  return (
    <section
      id="filters-panel"
      className="mx-auto max-w-6xl border-t border-slate-200 bg-slate-50 px-4 py-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FilterGroup label="Make">
          {makeOptions.map((m) => (
            <ChipToggle
              key={m}
              active={filters.makes.includes(m)}
              onClick={() => onToggle("make", m)}
            >
              {m}
            </ChipToggle>
          ))}
        </FilterGroup>

        <FilterGroup label="Body style">
          {bodyOptions.map((b) => (
            <ChipToggle
              key={b}
              active={filters.bodies.includes(b)}
              onClick={() => onToggle("body", b)}
            >
              <span className="capitalize">{b}</span>
            </ChipToggle>
          ))}
        </FilterGroup>

        <FilterGroup label="Color">
          {colorOptions.map((c) => (
            <ChipToggle
              key={c}
              active={filters.colors.includes(c)}
              onClick={() => onToggle("color", c)}
            >
              <span
                aria-hidden
                className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-slate-300 align-middle"
                style={{ backgroundColor: colorSwatch(c) }}
              />
              {c}
            </ChipToggle>
          ))}
        </FilterGroup>

        <FilterGroup label="Condition grade">
          {GRADE_THRESHOLDS.map((g) => (
            <ChipToggle
              key={g.value}
              active={filters.gradeMin === g.value}
              onClick={() =>
                onUpdate({ grade: g.value > 0 ? String(g.value) : null })
              }
            >
              {g.label}
            </ChipToggle>
          ))}
        </FilterGroup>

        <FilterGroup label="Price (CAD)">
          <RangeInputs
            minValue={filters.priceMin}
            maxValue={filters.priceMax}
            minPlaceholder="Min"
            maxPlaceholder="Max"
            step={500}
            onChange={(min, max) =>
              onUpdate({
                price_min: min > 0 ? String(min) : null,
                price_max: max > 0 ? String(max) : null,
              })
            }
          />
        </FilterGroup>

        <FilterGroup label="Year">
          <RangeInputs
            minValue={filters.yearMin}
            maxValue={filters.yearMax}
            minPlaceholder={String(yearBounds.min)}
            maxPlaceholder={String(yearBounds.max)}
            step={1}
            min={yearBounds.min}
            max={yearBounds.max}
            onChange={(min, max) =>
              onUpdate({
                year_min: min > 0 ? String(min) : null,
                year_max: max > 0 ? String(max) : null,
              })
            }
          />
        </FilterGroup>
      </div>

      {activeCount > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </section>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition " +
        (active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400")
      }
    >
      {children}
    </button>
  );
}

function RangeInputs({
  minValue,
  maxValue,
  minPlaceholder,
  maxPlaceholder,
  step,
  min,
  max,
  onChange,
}: {
  minValue: number;
  maxValue: number;
  minPlaceholder: string;
  maxPlaceholder: string;
  step: number;
  min?: number;
  max?: number;
  onChange: (min: number, max: number) => void;
}) {
  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
  const lo = min ?? 0;
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={lo}
        max={max}
        step={step}
        placeholder={minPlaceholder}
        value={minValue || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0, maxValue)}
        className={inputClass}
      />
      <span aria-hidden className="text-xs text-slate-400">
        –
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={lo}
        max={max}
        step={step}
        placeholder={maxPlaceholder}
        value={maxValue || ""}
        onChange={(e) => onChange(minValue, Number(e.target.value) || 0)}
        className={inputClass}
      />
    </div>
  );
}

function MyBidsLink({ count }: { count: number }) {
  return (
    <Link
      to="/my-bids"
      className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
    >
      My bids
      {count > 0 && (
        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-xs font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

function EmptyState({
  query,
  status,
  activeFilterCount,
  onClearQuery,
  onClearStatus,
  onClearFilters,
}: {
  query: string;
  status: StatusKey;
  activeFilterCount: number;
  onClearQuery: () => void;
  onClearStatus: () => void;
  onClearFilters: () => void;
}) {
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "";
  const hasQuery = query.trim().length > 0;
  const hasStatus = status !== "all";
  const hasFilters = activeFilterCount > 0;

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
      <p className="text-sm text-slate-600">
        {hasQuery && hasFilters ? (
          <>
            No vehicles match <span className="font-medium">“{query}”</span>{" "}
            with the current filters.
          </>
        ) : hasQuery && hasStatus ? (
          <>
            No <span className="font-medium">{statusLabel.toLowerCase()}</span>{" "}
            vehicles match <span className="font-medium">“{query}”</span>.
          </>
        ) : hasQuery ? (
          <>
            No vehicles match <span className="font-medium">“{query}”</span>.
          </>
        ) : hasFilters && hasStatus ? (
          <>
            No{" "}
            <span className="font-medium">{statusLabel.toLowerCase()}</span>{" "}
            vehicles match the current filters.
          </>
        ) : hasFilters ? (
          <>No vehicles match the current filters.</>
        ) : hasStatus ? (
          <>
            No vehicles are{" "}
            <span className="font-medium">{statusLabel.toLowerCase()}</span>{" "}
            right now.
          </>
        ) : (
          <>No vehicles available.</>
        )}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm">
        {hasQuery && (
          <button
            type="button"
            onClick={onClearQuery}
            className="text-blue-600 hover:underline"
          >
            Clear search
          </button>
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
        {hasStatus && (
          <button
            type="button"
            onClick={onClearStatus}
            className="text-blue-600 hover:underline"
          >
            Show all statuses
          </button>
        )}
      </div>
    </div>
  );
}
