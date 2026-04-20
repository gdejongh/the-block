import { describe, expect, it } from "vitest";
import { getEffectiveBid, MIN_BID_INCREMENT, type UserBid } from "./bids";
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

function makeBid(overrides: Partial<UserBid> & { amount: number }): UserBid {
  return {
    vehicleId: "v1",
    placedAt: "2026-04-20T12:05:00.000Z",
    type: "bid",
    ...overrides,
  };
}

describe("getEffectiveBid", () => {
  it("returns zero state when there are no seed or user bids", () => {
    const v = makeVehicle();
    const result = getEffectiveBid(v, []);
    expect(result.currentBid).toBe(0);
    expect(result.bidCount).toBe(0);
    expect(result.minNextBid).toBe(v.starting_bid);
    expect(result.myLastBid).toBeNull();
    expect(result.wonByBuyNow).toBe(false);
    expect(result.isTopBidder).toBe(false);
    expect(result.maxBid).toBeNull();
  });

  it("uses the seed current_bid when the user has not bid", () => {
    const v = makeVehicle({ current_bid: 22000, bid_count: 3 });
    const result = getEffectiveBid(v, []);
    expect(result.currentBid).toBe(22000);
    expect(result.bidCount).toBe(3);
    expect(result.minNextBid).toBe(22000 + MIN_BID_INCREMENT);
    expect(result.isTopBidder).toBe(false);
  });

  it("layers a higher user bid over the seed and marks the user top bidder", () => {
    const v = makeVehicle({ current_bid: 22000, bid_count: 3 });
    const result = getEffectiveBid(v, [makeBid({ amount: 22500 })]);
    expect(result.currentBid).toBe(22500);
    expect(result.bidCount).toBe(4);
    expect(result.minNextBid).toBe(22500 + MIN_BID_INCREMENT);
    expect(result.isTopBidder).toBe(true);
  });

  it("does not mark the user top bidder when their bid is below the seed", () => {
    const v = makeVehicle({ current_bid: 22000, bid_count: 3 });
    const result = getEffectiveBid(v, [makeBid({ amount: 21000 })]);
    expect(result.currentBid).toBe(22000);
    expect(result.isTopBidder).toBe(false);
  });

  it("returns the most recent user bid as myLastBid and the max as currentBid", () => {
    const v = makeVehicle();
    const bids = [
      makeBid({ amount: 21000, placedAt: "2026-04-20T12:00:00Z" }),
      makeBid({ amount: 22500, placedAt: "2026-04-20T12:01:00Z" }),
      makeBid({ amount: 22100, placedAt: "2026-04-20T12:02:00Z" }),
    ];
    const result = getEffectiveBid(v, bids);
    expect(result.currentBid).toBe(22500);
    expect(result.myLastBid?.amount).toBe(22100);
    expect(result.myBids).toHaveLength(3);
  });

  it("flags wonByBuyNow when a buy_now bid exists", () => {
    const v = makeVehicle({ buy_now_price: 30000 });
    const bids = [makeBid({ amount: 30000, type: "buy_now" })];
    const result = getEffectiveBid(v, bids);
    expect(result.wonByBuyNow).toBe(true);
    expect(result.buyNowBid?.amount).toBe(30000);
  });

  it("ignores bids for other vehicles", () => {
    const v = makeVehicle();
    const bids = [
      makeBid({ vehicleId: "other", amount: 99999 }),
      makeBid({ amount: 21000 }),
    ];
    const result = getEffectiveBid(v, bids);
    expect(result.currentBid).toBe(21000);
    expect(result.bidCount).toBe(1);
  });

  it("surfaces a max bid from the userMaxBids map", () => {
    const v = makeVehicle({ current_bid: 22000 });
    const result = getEffectiveBid(
      v,
      [],
      { v1: { vehicleId: "v1", amount: 25000, setAt: "2026-04-20T12:00:00Z" } },
    );
    expect(result.maxBid?.amount).toBe(25000);
  });

  it("treats a null current_bid as zero", () => {
    const v = makeVehicle({ current_bid: null, starting_bid: 15000 });
    const result = getEffectiveBid(v, []);
    expect(result.currentBid).toBe(0);
    expect(result.minNextBid).toBe(15000);
  });
});
