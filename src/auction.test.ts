import { describe, expect, it } from "vitest";
import {
  AUCTION_DURATION_MS,
  formatDuration,
  getAuctionTimes,
} from "./auction";
import type { Vehicle } from "./types";

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "v1",
    vin: "VIN0000000000001",
    year: 2023,
    make: "Mazda",
    model: "CX-5",
    trim: "GT",
    body_style: "suv",
    exterior_color: "Rapid Red",
    interior_color: "Black",
    engine: "2.5L I4",
    transmission: "automatic",
    drivetrain: "AWD",
    odometer_km: 40000,
    fuel_type: "gasoline",
    condition_grade: 4,
    condition_report: "",
    damage_notes: [],
    title_status: "clean",
    province: "Ontario",
    city: "Toronto",
    auction_start: "2026-04-20T12:00:00",
    starting_bid: 20000,
    reserve_price: null,
    buy_now_price: null,
    images: [],
    selling_dealership: "Test Motors",
    lot: "A-0001",
    current_bid: null,
    bid_count: 0,
    ...overrides,
  };
}

describe("getAuctionTimes", () => {
  // SHIFT_MS is a module-level constant computed at import time, so we derive
  // the effective start/end from a probe call rather than hard-coding offsets.
  const v = makeVehicle();
  const probe = getAuctionTimes(v, 0);
  const startMs = probe.start.getTime();
  const endMs = probe.end.getTime();

  it("spans exactly AUCTION_DURATION_MS from start to end", () => {
    expect(endMs - startMs).toBe(AUCTION_DURATION_MS);
  });

  it("is upcoming one ms before start", () => {
    const t = getAuctionTimes(v, startMs - 1);
    expect(t.state).toBe("upcoming");
    expect(t.msUntilStart).toBe(1);
  });

  it("is live at exactly startMs", () => {
    const t = getAuctionTimes(v, startMs);
    expect(t.state).toBe("live");
    expect(t.msUntilStart).toBe(0);
    expect(t.msUntilEnd).toBe(AUCTION_DURATION_MS);
  });

  it("is live one ms before end", () => {
    const t = getAuctionTimes(v, endMs - 1);
    expect(t.state).toBe("live");
    expect(t.msUntilEnd).toBe(1);
  });

  it("is ended at exactly endMs", () => {
    const t = getAuctionTimes(v, endMs);
    expect(t.state).toBe("ended");
    expect(t.msUntilEnd).toBe(0);
  });

  it("reports negative msUntilStart once live", () => {
    const t = getAuctionTimes(v, startMs + 1000);
    expect(t.msUntilStart).toBe(-1000);
  });
});

describe("formatDuration", () => {
  it("formats sub-minute durations as seconds", () => {
    expect(formatDuration(45 * 1000)).toBe("45s");
  });

  it("formats minutes-and-seconds when under an hour", () => {
    expect(formatDuration(5 * 60 * 1000 + 12 * 1000)).toBe("5m 12s");
  });

  it("formats hours-and-minutes when under a day", () => {
    expect(formatDuration(3 * 3600 * 1000 + 15 * 60 * 1000)).toBe("3h 15m");
  });

  it("formats days-and-hours when over a day", () => {
    expect(formatDuration(2 * 86400 * 1000 + 4 * 3600 * 1000)).toBe("2d 4h");
  });

  it("clamps negative durations to 0s", () => {
    expect(formatDuration(-5000)).toBe("0s");
  });

  it("returns 0s for exactly zero", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});
