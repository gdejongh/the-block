import { useState } from "react";
import { Link, useParams } from "react-router-dom";
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
            ← The Block
          </Link>
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

function AuctionPanel({ vehicle }: { vehicle: Vehicle }) {
  const { userBids, placeBid } = useBids();
  const { currentBid, bidCount, minNextBid, myLastBid } = getEffectiveBid(
    vehicle,
    userBids,
  );
  const reserveMet = currentBid >= vehicle.reserve_price;

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid bid amount.");
      return;
    }
    if (amount < minNextBid) {
      setError(`Minimum next bid is ${currencyFmt.format(minNextBid)}.`);
      return;
    }
    setError(null);
    placeBid(vehicle.id, amount);
    setDraft("");
  }

  return (
    <div className="sticky top-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {bidCount === 0 ? "Opening bid" : "Current bid"}
        </p>
        <p className="text-3xl font-semibold">
          {currencyFmt.format(
            bidCount === 0 ? vehicle.starting_bid : currentBid,
          )}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {bidCount === 0
            ? "No bids yet"
            : `${bidCount} ${bidCount === 1 ? "bid" : "bids"} · Starting ${currencyFmt.format(vehicle.starting_bid)}`}
        </p>
        <p
          className={
            "mt-1 text-xs font-medium " +
            (reserveMet ? "text-emerald-700" : "text-slate-500")
          }
        >
          {reserveMet ? "Reserve met" : "Reserve not yet met"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-4">
        <label className="block text-xs font-medium text-slate-600">
          Your bid
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            type="number"
            inputMode="numeric"
            step={MIN_BID_INCREMENT}
            min={minNextBid}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Min ${currencyFmt.format(minNextBid)}`}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            aria-invalid={error ? true : undefined}
          />
          <button
            type="submit"
            className="shrink-0 whitespace-nowrap rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Place bid
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {!error && myLastBid && (
          <p className="mt-2 text-xs text-emerald-700">
            Your last bid: {currencyFmt.format(myLastBid.amount)} at{" "}
            {new Date(myLastBid.placedAt).toLocaleTimeString()}
          </p>
        )}
      </form>

      <dl className="mt-4 space-y-1 text-sm">
        <Row label="Reserve" value={currencyFmt.format(vehicle.reserve_price)} />
        {vehicle.buy_now_price != null && (
          <Row label="Buy now" value={currencyFmt.format(vehicle.buy_now_price)} />
        )}
        <Row label="Auction start" value={new Date(vehicle.auction_start).toLocaleString()} />
      </dl>
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
