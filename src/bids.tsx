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

export interface UserBid {
  vehicleId: string;
  amount: number;
  placedAt: string;
}

export const MIN_BID_INCREMENT = 100;

interface BidsContextValue {
  userBids: UserBid[];
  placeBid: (vehicleId: string, amount: number) => void;
}

const BidsContext = createContext<BidsContextValue | null>(null);
const STORAGE_KEY = "the-block:bids";

function loadFromStorage(): UserBid[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as UserBid[];
  } catch {
    return [];
  }
}

export function BidsProvider({ children }: { children: ReactNode }) {
  const [userBids, setUserBids] = useState<UserBid[]>(loadFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userBids));
    } catch {
      // quota exceeded, private mode, etc. — safe to ignore for a prototype
    }
  }, [userBids]);

  const placeBid = useCallback((vehicleId: string, amount: number) => {
    setUserBids((prev) => [
      ...prev,
      { vehicleId, amount, placedAt: new Date().toISOString() },
    ]);
  }, []);

  const value = useMemo(() => ({ userBids, placeBid }), [userBids, placeBid]);

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
}

export function getEffectiveBid(
  vehicle: Vehicle,
  userBids: UserBid[],
): EffectiveBid {
  const myBids = userBids.filter((b) => b.vehicleId === vehicle.id);
  const myHighest = myBids.reduce((max, b) => Math.max(max, b.amount), 0);
  const currentBid = Math.max(vehicle.current_bid, myHighest);
  const bidCount = vehicle.bid_count + myBids.length;
  const minNextBid =
    currentBid > 0
      ? currentBid + MIN_BID_INCREMENT
      : vehicle.starting_bid;
  const myLastBid = myBids.length > 0 ? myBids[myBids.length - 1] : null;
  return { currentBid, bidCount, minNextBid, myBids, myLastBid };
}
