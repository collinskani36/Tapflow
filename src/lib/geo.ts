export const LOUNGE_COORDS = {
  lat: 0.5351720249891072,
  lng: 35.28819631379321,
};

export interface DeliveryTier {
  max_km: number;
  fee: number;
}

export interface DeliveryPricing {
  road_distance_factor: number;
  tiers: DeliveryTier[];
}

// Haversine — straight-line distance in km between two lat/lng points.
// This alone underestimates real (on-road) delivery distance, which is
// why callers should multiply by road_distance_factor from delivery_pricing
// before resolving a fee. This function stays a pure geometric primitive.
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function distanceFromLounge(lat: number, lng: number): number {
  return haversineDistance(LOUNGE_COORDS.lat, LOUNGE_COORDS.lng, lat, lng);
}

// Applies the admin-set road distance factor to convert straight-line
// distance into an approximate on-road distance.
export function estimateRoadDistance(straightLineKm: number, factor: number): number {
  return straightLineKm * factor;
}

// Tiers are checked in ascending max_km order, first match wins.
// Returns fee in KSh, or null if outside delivery range (caller should
// fall back to the manual dropdown).
//
// NOTE: This is a CLIENT-SIDE PREVIEW ONLY. The actual charge is always
// determined by the calculate-delivery-fee Edge Function, which redoes
// this same calculation server-side from raw lat/lng so it can't be
// spoofed via devtools. Never treat the return value of this function as
// the authoritative fee at checkout.
export function calculateDeliveryFee(
  roadDistanceKm: number,
  tiers: DeliveryTier[]
): number | null {
  const sorted = [...tiers].sort((a, b) => a.max_km - b.max_km);
  for (const tier of sorted) {
    if (roadDistanceKm <= tier.max_km) return tier.fee;
  }
  return null;
}

// Fallback pricing used only if delivery_pricing hasn't loaded yet (e.g.
// the brief moment before the initial Supabase fetch resolves). Mirrors
// the previous hardcoded defaults so behavior doesn't regress while
// waiting on the network.
export const DEFAULT_DELIVERY_PRICING: DeliveryPricing = {
  road_distance_factor: 1.5,
  tiers: [
    { max_km: 5, fee: 50 },
    { max_km: 10, fee: 100 },
    { max_km: 15, fee: 150 },
  ],
};