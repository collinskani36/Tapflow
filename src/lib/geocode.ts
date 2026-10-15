export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    // If Nominatim is slow/down, fall back to raw coordinates rather than blocking checkout
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}