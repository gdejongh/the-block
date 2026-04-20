import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  formatDuration,
  getAuctionTimes,
  useNow,
  type AuctionTimes,
} from "../auction";
import { useBids, getEffectiveBid, type UserBid } from "../bids";
import { vehicles } from "../data";
import { colorSwatch, currencyFmt, kmFmt } from "../format";
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

  useEffect(() => {
    document.title = "The Block — Vehicle Auctions";
  }, []);

  const searched = useMemo(() => {
    if (!q.trim()) return vehicles;
    return vehicles.filter((v) => matchesQuery(haystack(v), q));
  }, [q]);

  const statusCounts = useMemo(() => {
    const counts = { all: searched.length, live: 0, upcoming: 0, ended: 0 };
    for (const v of searched) {
      counts[getAuctionTimes(v, now).state]++;
    }
    return counts;
  }, [searched, now]);

  const filtered = useMemo(() => {
    if (status === "all") return searched;
    return searched.filter((v) => getAuctionTimes(v, now).state === status);
  }, [searched, status, now]);

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
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {sorted.length === 0 ? (
          <EmptyState
            query={q}
            status={status}
            onClearQuery={() => updateParam("q", "", "")}
            onClearStatus={() => updateParam("status", "all", "all")}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    <div className="mt-3 flex items-baseline justify-between">
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
  onClearQuery,
  onClearStatus,
}: {
  query: string;
  status: StatusKey;
  onClearQuery: () => void;
  onClearStatus: () => void;
}) {
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "";
  const hasQuery = query.trim().length > 0;
  const hasStatus = status !== "all";

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
      <p className="text-sm text-slate-600">
        {hasQuery && hasStatus ? (
          <>
            No <span className="font-medium">{statusLabel.toLowerCase()}</span>{" "}
            vehicles match <span className="font-medium">“{query}”</span>.
          </>
        ) : hasQuery ? (
          <>
            No vehicles match <span className="font-medium">“{query}”</span>.
          </>
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
      <div className="mt-3 flex justify-center gap-4 text-sm">
        {hasQuery && (
          <button
            type="button"
            onClick={onClearQuery}
            className="text-blue-600 hover:underline"
          >
            Clear search
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
