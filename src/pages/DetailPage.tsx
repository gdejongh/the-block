import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  formatDuration,
  getAuctionTimes,
  useNow,
  type AuctionTimes,
} from "../auction";
import { getEffectiveBid, MIN_BID_INCREMENT, useBids } from "../bids";
import { getVehicleById } from "../data";
import { currencyFmt, kmFmt } from "../format";
import type { Vehicle } from "../types";

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const vehicle = id ? getVehicleById(id) : undefined;

  if (!vehicle) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-lg font-semibold">Vehicle not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Back to listings
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
              ← The Block
            </Link>
            <DetailMyBidsLink />
          </div>
          <span className="text-xs text-slate-500">Lot {vehicle.lot}</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 lg:row-start-1">
            <Gallery images={vehicle.images} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />

            <div className="mt-6">
              <h1 className="text-2xl font-semibold tracking-tight">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-slate-600">{vehicle.trim}</p>
              <p className="mt-1 text-sm text-slate-500">
                {vehicle.city}, {vehicle.province} · Sold by {vehicle.selling_dealership}
              </p>
            </div>
          </section>

          <aside className="lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <AuctionPanel vehicle={vehicle} />
          </aside>

          <section className="lg:col-span-2 lg:row-start-2">
            <Specs vehicle={vehicle} />
            <Condition vehicle={vehicle} />
          </section>
        </div>
      </main>
    </div>
  );
}

function DetailMyBidsLink() {
  const { userBids } = useBids();
  const count = new Set(userBids.map((b) => b.vehicleId)).size;
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

function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [hero, ...rest] = images;
  return (
    <div>
      <img
        src={hero}
        alt={alt}
        className="aspect-[4/3] w-full rounded-lg border border-slate-200 bg-slate-100 object-cover"
      />
      {rest.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {rest.slice(0, 4).map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${alt} thumbnail ${i + 2}`}
              className="aspect-[4/3] w-full rounded-md border border-slate-200 bg-slate-100 object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Specs({ vehicle }: { vehicle: Vehicle }) {
  const rows: Array<[string, string]> = [
    ["VIN", vehicle.vin],
    ["Body style", vehicle.body_style],
    ["Engine", vehicle.engine],
    ["Transmission", vehicle.transmission],
    ["Drivetrain", vehicle.drivetrain],
    ["Fuel", vehicle.fuel_type],
    ["Odometer", `${kmFmt.format(vehicle.odometer_km)} km`],
    ["Exterior", vehicle.exterior_color],
    ["Interior", vehicle.interior_color],
    ["Title", vehicle.title_status],
  ];
  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Specs</h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-1 last:border-none">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-medium capitalize">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Condition({ vehicle }: { vehicle: Vehicle }) {
  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Condition</h2>
        <span className="text-sm">
          Grade <span className="font-semibold">{vehicle.condition_grade.toFixed(1)}</span> / 5.0
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{vehicle.condition_report}</p>
      {vehicle.damage_notes.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {vehicle.damage_notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

type BidMode = "bid" | "max";

function AuctionPanel({ vehicle }: { vehicle: Vehicle }) {
  const { userBids, userMaxBids, placeBid, buyNow, setMaxBid, clearMaxBid } =
    useBids();
  const {
    currentBid,
    bidCount,
    minNextBid,
    myLastBid,
    wonByBuyNow,
    buyNowBid,
    maxBid,
    isTopBidder,
  } = getEffectiveBid(vehicle, userBids, userMaxBids);
  const reserveMet = currentBid >= vehicle.reserve_price;
  const now = useNow(1000);
  const times = getAuctionTimes(vehicle, now);
  const canBid = times.state === "live" && !wonByBuyNow;
  const canBuyNow =
    times.state === "live" &&
    !wonByBuyNow &&
    vehicle.buy_now_price != null &&
    currentBid < vehicle.buy_now_price;

  const [mode, setMode] = useState<BidMode>("bid");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canBid) return;
    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (amount < minNextBid) {
      setError(`Minimum is ${currencyFmt.format(minNextBid)}.`);
      return;
    }
    setError(null);
    if (mode === "bid") {
      placeBid(vehicle.id, amount);
    } else {
      // Proxy bid: record the ceiling, place the minimum needed to be top.
      // If already top, just record the max without an extra bid.
      const placeAt = isTopBidder ? undefined : Math.min(amount, minNextBid);
      setMaxBid(vehicle.id, amount, placeAt);
    }
    setDraft("");
  }

  function onBuyNow() {
    if (!canBuyNow || vehicle.buy_now_price == null) return;
    const ok = window.confirm(
      `Buy now for ${currencyFmt.format(vehicle.buy_now_price)}? This ends the auction for you.`,
    );
    if (!ok) return;
    buyNow(vehicle.id, vehicle.buy_now_price);
    setDraft("");
    setError(null);
  }

  return (
    <div className="sticky top-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <AuctionStatusBanner times={times} wonByBuyNow={wonByBuyNow} />

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {wonByBuyNow
            ? "Sold to you"
            : bidCount === 0
              ? "Opening bid"
              : "Current bid"}
        </p>
        <p className="text-3xl font-semibold">
          {currencyFmt.format(
            wonByBuyNow && buyNowBid
              ? buyNowBid.amount
              : bidCount === 0
                ? vehicle.starting_bid
                : currentBid,
          )}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {bidCount === 0
            ? "No bids yet"
            : `${bidCount} ${bidCount === 1 ? "bid" : "bids"} · Starting ${currencyFmt.format(vehicle.starting_bid)}`}
        </p>
        {!wonByBuyNow && (
          <p
            className={
              "mt-1 text-xs font-medium " +
              (reserveMet ? "text-emerald-700" : "text-slate-500")
            }
          >
            {reserveMet ? "Reserve met" : "Reserve not yet met"}
          </p>
        )}
      </div>

      {wonByBuyNow ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p className="font-medium">You bought this vehicle.</p>
          {buyNowBid && (
            <p className="mt-0.5 text-xs text-emerald-700">
              Purchased at {new Date(buyNowBid.placedAt).toLocaleString()}
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4">
          <div
            role="tablist"
            aria-label="Bid mode"
            className="mb-2 inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium"
          >
            {(["bid", "max"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                disabled={!canBid}
                className={
                  "rounded px-3 py-1 transition " +
                  (mode === m
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900") +
                  " disabled:cursor-not-allowed"
                }
              >
                {m === "bid" ? "Bid now" : "Max bid"}
              </button>
            ))}
          </div>
          <label className="block text-xs font-medium text-slate-600">
            {mode === "bid" ? "Your bid" : "Your maximum"}
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              type="number"
              inputMode="numeric"
              step={MIN_BID_INCREMENT}
              min={minNextBid}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                mode === "bid"
                  ? `Min ${currencyFmt.format(minNextBid)}`
                  : `At least ${currencyFmt.format(minNextBid)}`
              }
              disabled={!canBid}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
              aria-invalid={error ? true : undefined}
            />
            <button
              type="submit"
              disabled={!canBid}
              className="shrink-0 whitespace-nowrap rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {mode === "bid" ? "Place bid" : "Set max"}
            </button>
          </div>
          {mode === "max" && canBid && (
            <p className="mt-1 text-xs text-slate-500">
              We'll bid the minimum on your behalf and raise up to your max as
              others bid.
            </p>
          )}
          {canBuyNow && vehicle.buy_now_price != null && (
            <button
              type="button"
              onClick={onBuyNow}
              className="mt-2 w-full rounded-md border border-emerald-600 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Buy now for {currencyFmt.format(vehicle.buy_now_price)}
            </button>
          )}
          {!canBid && (
            <p className="mt-2 text-xs text-slate-500">
              {times.state === "upcoming"
                ? `Bidding opens in ${formatDuration(times.msUntilStart)}.`
                : "This auction has ended."}
            </p>
          )}
          {canBid && error && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
          {canBid && !error && maxBid && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-slate-800">
                  Max bid set · {currencyFmt.format(maxBid.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => clearMaxBid(vehicle.id)}
                  className="text-slate-500 hover:text-slate-900"
                >
                  Clear
                </button>
              </div>
              <p className="mt-0.5 text-slate-600">
                Currently bidding {currencyFmt.format(currentBid)}.
              </p>
            </div>
          )}
          {canBid && !error && !maxBid && myLastBid && (
            <p className="mt-2 text-xs text-emerald-700">
              Your last bid: {currencyFmt.format(myLastBid.amount)} at{" "}
              {new Date(myLastBid.placedAt).toLocaleTimeString()}
            </p>
          )}
        </form>
      )}

      <dl className="mt-4 space-y-1 text-sm">
        <Row label="Reserve" value={currencyFmt.format(vehicle.reserve_price)} />
        {vehicle.buy_now_price != null && (
          <Row label="Buy now" value={currencyFmt.format(vehicle.buy_now_price)} />
        )}
        <Row label="Starts" value={times.start.toLocaleString()} />
        <Row label="Ends" value={times.end.toLocaleString()} />
      </dl>
    </div>
  );
}

function AuctionStatusBanner({
  times,
  wonByBuyNow,
}: {
  times: AuctionTimes;
  wonByBuyNow: boolean;
}) {
  if (wonByBuyNow) {
    return (
      <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
        Sold to you via Buy now
      </div>
    );
  }
  if (times.state === "live") {
    return (
      <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />
        Live · Ends in {formatDuration(times.msUntilEnd)}
      </div>
    );
  }
  if (times.state === "upcoming") {
    return (
      <div className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
        Starts in {formatDuration(times.msUntilStart)}
      </div>
    );
  }
  return (
    <div className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500">
      Auction ended
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
