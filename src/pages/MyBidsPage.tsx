import { useEffect } from "react";
import { Link } from "react-router-dom";
import { getAuctionTimes, useNow } from "../auction";
import { getEffectiveBid, useBids, type MaxBidMap, type UserBid } from "../bids";
import { getVehicleById } from "../data";
import { currencyFmt } from "../format";
import type { Vehicle } from "../types";

interface Entry {
  vehicle: Vehicle;
  myBids: UserBid[];
  latest: UserBid;
}

function groupByVehicle(userBids: UserBid[]): Entry[] {
  const groups = new Map<string, UserBid[]>();
  for (const bid of userBids) {
    const list = groups.get(bid.vehicleId);
    if (list) list.push(bid);
    else groups.set(bid.vehicleId, [bid]);
  }
  const entries: Entry[] = [];
  for (const [vehicleId, myBids] of groups) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) continue;
    const latest = myBids[myBids.length - 1];
    entries.push({ vehicle, myBids, latest });
  }
  entries.sort((a, b) => b.latest.placedAt.localeCompare(a.latest.placedAt));
  return entries;
}

export default function MyBidsPage() {
  const { userBids, userMaxBids } = useBids();
  const entries = groupByVehicle(userBids);
  const now = useNow(1000);

  useEffect(() => {
    document.title = "My bids — The Block";
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
            ← The Block
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">My bids</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
            <p className="text-sm text-slate-600">
              You haven't placed any bids yet.
            </p>
            <Link
              to="/"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              Browse listings →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <BidRow
                key={entry.vehicle.id}
                entry={entry}
                allBids={userBids}
                allMaxBids={userMaxBids}
                now={now}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

type Outcome =
  | { kind: "bought" }
  | { kind: "won" }
  | { kind: "lost" }
  | { kind: "leading" }
  | { kind: "outbid" };

function resolveOutcome(
  state: "upcoming" | "live" | "ended",
  wonByBuyNow: boolean,
  isTopBidder: boolean,
): Outcome {
  if (wonByBuyNow) return { kind: "bought" };
  if (state === "ended") return isTopBidder ? { kind: "won" } : { kind: "lost" };
  return isTopBidder ? { kind: "leading" } : { kind: "outbid" };
}

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const styles: Record<Outcome["kind"], { className: string; label: string }> = {
    bought: {
      className: "bg-emerald-100 text-emerald-800",
      label: "Bought",
    },
    won: {
      className: "bg-emerald-100 text-emerald-800",
      label: "Won",
    },
    leading: {
      className: "bg-emerald-50 text-emerald-700",
      label: "High bidder",
    },
    outbid: {
      className: "bg-amber-50 text-amber-700",
      label: "Outbid",
    },
    lost: {
      className: "bg-slate-100 text-slate-600",
      label: "Auction ended",
    },
  };
  const { className, label } = styles[outcome.kind];
  return (
    <span
      className={
        "ml-auto rounded-full px-2 py-0.5 text-xs font-medium " + className
      }
    >
      {label}
    </span>
  );
}

function BidRow({
  entry,
  allBids,
  allMaxBids,
  now,
}: {
  entry: Entry;
  allBids: UserBid[];
  allMaxBids: MaxBidMap;
  now: number;
}) {
  const { vehicle, myBids, latest } = entry;
  const { bidCount, wonByBuyNow, maxBid, isTopBidder } = getEffectiveBid(
    vehicle,
    allBids,
    allMaxBids,
  );
  const myHighest = myBids.reduce((max, b) => Math.max(max, b.amount), 0);
  const { state } = getAuctionTimes(vehicle, now);
  const outcome = resolveOutcome(state, wonByBuyNow, isTopBidder);

  return (
    <li>
      <Link
        to={`/vehicles/${vehicle.id}`}
        className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
      >
        <img
          src={vehicle.images[0]}
          alt=""
          className="hidden h-16 w-24 shrink-0 rounded-md border border-slate-200 bg-slate-100 object-cover sm:block"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="truncate font-medium">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h2>
            <span className="shrink-0 text-xs text-slate-500">
              Lot {vehicle.lot}
            </span>
          </div>
          <p className="truncate text-sm text-slate-600">{vehicle.trim}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>
              Your bid:{" "}
              <span className="font-semibold text-slate-900">
                {currencyFmt.format(myHighest)}
              </span>
            </span>
            <span>·</span>
            <span>
              Placed {new Date(latest.placedAt).toLocaleString()}
            </span>
            <span>·</span>
            <span>
              {bidCount} total {bidCount === 1 ? "bid" : "bids"}
            </span>
            {maxBid && !wonByBuyNow && (
              <>
                <span>·</span>
                <span>
                  Max:{" "}
                  <span className="font-semibold text-slate-900">
                    {currencyFmt.format(maxBid.amount)}
                  </span>
                </span>
              </>
            )}
            <OutcomeBadge outcome={outcome} />
          </div>
        </div>
        <span aria-hidden className="hidden text-slate-400 sm:block">
          →
        </span>
      </Link>
    </li>
  );
}
