import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Vehicle } from "./types";

export type UserBidType = "bid" | "buy_now";

export interface UserBid {
  vehicleId: string;
  amount: number;
  placedAt: string;
  type?: UserBidType;
}

export interface UserMaxBid {
  vehicleId: string;
  amount: number;
  setAt: string;
}

export type MaxBidMap = Record<string, UserMaxBid>;

export const MIN_BID_INCREMENT = 100;

interface BidsContextValue {
  userBids: UserBid[];
  userMaxBids: MaxBidMap;
  placeBid: (vehicleId: string, amount: number) => void;
  buyNow: (vehicleId: string, amount: number) => void;
  setMaxBid: (vehicleId: string, amount: number, alsoPlace?: number) => void;
  clearMaxBid: (vehicleId: string) => void;
}

const BidsContext = createContext<BidsContextValue | null>(null);
const BIDS_KEY = "the-block:bids";
const MAX_BIDS_KEY = "the-block:max-bids";

function loadBidsFromStorage(): UserBid[] {
  try {
    const raw = localStorage.getItem(BIDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as UserBid[];
  } catch {
    return [];
  }
}

function loadMaxBidsFromStorage(): MaxBidMap {
  try {
    const raw = localStorage.getItem(MAX_BIDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as MaxBidMap;
  } catch {
    return {};
  }
}

export function BidsProvider({ children }: { children: ReactNode }) {
  const [userBids, setUserBids] = useState<UserBid[]>(loadBidsFromStorage);
  const [userMaxBids, setUserMaxBids] = useState<MaxBidMap>(loadMaxBidsFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(BIDS_KEY, JSON.stringify(userBids));
    } catch {
      // quota exceeded, private mode, etc. — safe to ignore for a prototype
    }
  }, [userBids]);

  useEffect(() => {
    try {
      localStorage.setItem(MAX_BIDS_KEY, JSON.stringify(userMaxBids));
    } catch {
      // as above
    }
  }, [userMaxBids]);

  const placeBid = useCallback((vehicleId: string, amount: number) => {
    setUserBids((prev) => [
      ...prev,
      { vehicleId, amount, placedAt: new Date().toISOString(), type: "bid" },
    ]);
  }, []);

  const buyNow = useCallback((vehicleId: string, amount: number) => {
    setUserBids((prev) => [
      ...prev,
      { vehicleId, amount, placedAt: new Date().toISOString(), type: "buy_now" },
    ]);
  }, []);

  const setMaxBid = useCallback(
    (vehicleId: string, amount: number, alsoPlace?: number) => {
      const now = new Date().toISOString();
      setUserMaxBids((prev) => ({
        ...prev,
        [vehicleId]: { vehicleId, amount, setAt: now },
      }));
      if (alsoPlace != null && alsoPlace > 0) {
        setUserBids((prev) => [
          ...prev,
          { vehicleId, amount: alsoPlace, placedAt: now, type: "bid" },
        ]);
      }
    },
    [],
  );

  const clearMaxBid = useCallback((vehicleId: string) => {
    setUserMaxBids((prev) => {
      if (!(vehicleId in prev)) return prev;
      const next = { ...prev };
      delete next[vehicleId];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ userBids, userMaxBids, placeBid, buyNow, setMaxBid, clearMaxBid }),
    [userBids, userMaxBids, placeBid, buyNow, setMaxBid, clearMaxBid],
  );

  return <BidsContext.Provider value={value}>{children}</BidsContext.Provider>;
}

export function useBids() {
  const ctx = useContext(BidsContext);
  if (!ctx) throw new Error("useBids must be used within BidsProvider");
  return ctx;
}

export interface EffectiveBid {
  currentBid: number;
  bidCount: number;
  minNextBid: number;
  myBids: UserBid[];
  myLastBid: UserBid | null;
  wonByBuyNow: boolean;
  buyNowBid: UserBid | null;
  maxBid: UserMaxBid | null;
  isTopBidder: boolean;
}

export function getEffectiveBid(
  vehicle: Vehicle,
  userBids: UserBid[],
  userMaxBids: MaxBidMap = {},
): EffectiveBid {
  const myBids = userBids.filter((b) => b.vehicleId === vehicle.id);
  const myHighest = myBids.reduce((max, b) => Math.max(max, b.amount), 0);
  const currentBid = Math.max(vehicle.current_bid ?? 0, myHighest);
  const bidCount = vehicle.bid_count + myBids.length;
  const minNextBid =
    currentBid > 0
      ? currentBid + MIN_BID_INCREMENT
      : vehicle.starting_bid;
  const myLastBid = myBids.length > 0 ? myBids[myBids.length - 1] : null;
  const buyNowBid = myBids.find((b) => b.type === "buy_now") ?? null;
  const maxBid = userMaxBids[vehicle.id] ?? null;
  const isTopBidder = myHighest > 0 && myHighest >= currentBid;
  return {
    currentBid,
    bidCount,
    minNextBid,
    myBids,
    myLastBid,
    wonByBuyNow: buyNowBid !== null,
    buyNowBid,
    maxBid,
    isTopBidder,
  };
}
