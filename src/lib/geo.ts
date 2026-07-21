export const LOUNGE_COORDS = {
  lat: 0.5351720249891072,
  lng: 35.28819631379321,
};

// Haversine — straight-line distance in km between two lat/lng points
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

// Tiers — checked in order, first match wins
const DELIVERY_TIERS = [
  { maxKm: 5, fee: 50 },
  { maxKm: 10, fee: 100 },
  { maxKm: 15, fee: 150 },
];

// Returns fee in KSh, or null if outside delivery range (caller should fall back to manual dropdown)
export function calculateDeliveryFee(distanceKm: number): number | null {
  for (const tier of DELIVERY_TIERS) {
    if (distanceKm <= tier.maxKm) return tier.fee;
  }
  return null;
}

export function distanceFromLounge(lat: number, lng: number): number {
  return haversineDistance(LOUNGE_COORDS.lat, LOUNGE_COORDS.lng, lat, lng);
}