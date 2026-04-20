import { useEffect, useState } from "react";
import { vehicles } from "./data";
import type { Vehicle } from "./types";

export const AUCTION_DURATION_MS = 48 * 60 * 60 * 1000;

// The dataset's auction_start values are synthetic fixed timestamps. The
// challenge prompt explicitly allows normalizing them relative to "now" for
// the prototype. We shift every auction by the same delta so the dataset's
// median start time lands at the moment the page loaded — that guarantees a
// spread of upcoming / live / ended auctions for any reviewer cloning this
// repo at any point in time.
const SHIFT_MS = (() => {
  const starts = vehicles
    .map((v) => Date.parse(v.auction_start))
    .sort((a, b) => a - b);
  const median = starts[Math.floor(starts.length / 2)];
  return Date.now() - median;
})();

export type AuctionState = "upcoming" | "live" | "ended";

export interface AuctionTimes {
  start: Date;
  end: Date;
  state: AuctionState;
  msUntilStart: number;
  msUntilEnd: number;
}

export function getAuctionTimes(
  vehicle: Vehicle,
  now: number = Date.now(),
): AuctionTimes {
  const startMs = Date.parse(vehicle.auction_start) + SHIFT_MS;
  const endMs = startMs + AUCTION_DURATION_MS;
  const state: AuctionState =
    now < startMs ? "upcoming" : now < endMs ? "live" : "ended";
  return {
    start: new Date(startMs),
    end: new Date(endMs),
    state,
    msUntilStart: startMs - now,
    msUntilEnd: endMs - now,
  };
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function useNow(intervalMs: number = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
