import raw from "../data/vehicles.json";
import type { Vehicle } from "./types";

export const vehicles = raw as unknown as Vehicle[];

const vehiclesById = new Map(vehicles.map((v) => [v.id, v]));

export function getVehicleById(id: string): Vehicle | undefined {
  return vehiclesById.get(id);
}
