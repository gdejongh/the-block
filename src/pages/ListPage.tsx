import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useBids, getEffectiveBid } from "../bids";
import { vehicles } from "../data";
import { currencyFmt, kmFmt } from "../format";
import type { Vehicle } from "../types";

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
  ]
    .join(" ")
    .toLowerCase();
}

export default function ListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { userBids } = useBids();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return vehicles;
    return vehicles.filter((v) => haystack(v).includes(needle));
  }, [q]);

  function updateQuery(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("q", next);
    else params.delete("q");
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold tracking-tight">The Block</h1>
          <div className="flex items-center gap-3">
            <label className="relative block w-full sm:w-80">
              <span className="sr-only">Search vehicles</span>
              <input
                type="search"
                value={q}
                onChange={(e) => updateQuery(e.target.value)}
                placeholder="Search make, model, VIN, lot, city…"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 text-xs text-slate-500">
          {filtered.length === vehicles.length
            ? `${vehicles.length} vehicles live`
            : `${filtered.length} of ${vehicles.length} vehicles match`}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {filtered.length === 0 ? (
          <EmptyState query={q} onClear={() => updateQuery("")} />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => {
              const { currentBid, bidCount, myLastBid } = getEffectiveBid(
                v,
                userBids,
              );
              return (
                <li key={v.id}>
                  <Link
                    to={`/vehicles/${v.id}`}
                    className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
                  >
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-medium">
                        {v.year} {v.make} {v.model}
                      </h2>
                      <span className="text-xs text-slate-500">Lot {v.lot}</span>
                    </div>
                    <p className="text-sm text-slate-600">{v.trim}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {kmFmt.format(v.odometer_km)} km · {v.city}, {v.province}
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
                    {myLastBid && (
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        You bid {currencyFmt.format(myLastBid.amount)}
                      </p>
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

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
      <p className="text-sm text-slate-600">
        No vehicles match <span className="font-medium">“{query}”</span>.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-3 text-sm text-blue-600 hover:underline"
      >
        Clear search
      </button>
    </div>
  );
}
