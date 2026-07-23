import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { Locate } from 'lucide-react';
import {
  LOUNGE_COORDS,
  distanceFromLounge,
  estimateRoadDistance,
  calculateDeliveryFee,
  DEFAULT_DELIVERY_PRICING,
  DeliveryPricing,
} from '@/lib/geo';
import { reverseGeocode } from '@/lib/geocode';
import { supabase } from '@/lib/supabase';

// Fix default marker icon (breaks otherwise when bundled)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationPickerProps {
  // NOTE: `fee` here is a client-side ESTIMATE for display only. The caller
  // (CheckoutPage) must re-verify the real fee via the calculate-delivery-fee
  // Edge Function using `lat`/`lng` before charging anything — never trust
  // this value directly for payment.
  onConfirm: (data: { lat: number; lng: number; address: string; distanceKm: number; fee: number | null }) => void;
  // Optional external position (e.g. a saved location the customer just
  // selected). When this changes, the pin jumps there and the existing
  // distance/fee/geocode effect (keyed on `position`) recalculates
  // automatically — no separate wiring needed for that part.
  focusPosition?: [number, number] | null;
}

// Forces Leaflet to recompute its tile grid once the container has its final
// size. Without this, maps rendered inside cards/flex layouts (which have
// zero height on first paint) end up with a broken checkerboard of tiles
// that only fixes itself if the window is resized.
function MapSizeFix() {
  const map = useMap();

  useEffect(() => {
    const timers = [100, 300, 600].map((ms) =>
      setTimeout(() => map.invalidateSize(), ms)
    );

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(map.getContainer());

    return () => {
      timers.forEach(clearTimeout);
      resizeObserver.disconnect();
    };
  }, [map]);

  return null;
}

function RecenterOnChange({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
}

function DraggableMarker({ position, setPosition }: { position: [number, number]; setPosition: (p: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition([pos.lat, pos.lng]);
        },
      }}
    />
  );
}

const LocationPicker = ({ onConfirm, focusPosition }: LocationPickerProps) => {
  const [position, setPosition] = useState<[number, number]>([LOUNGE_COORDS.lat, LOUNGE_COORDS.lng]);
  const [address, setAddress] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);
  const [fee, setFee] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const hasRequestedRef = useRef(false);
  const [hasLocated, setHasLocated] = useState(false);

  // When the parent hands us a new focusPosition (e.g. the customer picked
  // a saved location), jump the pin there. Guarded so it only fires on an
  // actual change — otherwise every re-render with the same focusPosition
  // value would re-trigger the position effect below for no reason.
  useEffect(() => {
    if (!focusPosition) return;
    const [lat, lng] = focusPosition;
    setPosition((prev) => (prev[0] === lat && prev[1] === lng ? prev : [lat, lng]));
    setHasLocated(true);
  }, [focusPosition]);

  // Admin-configured factor + tiers, used only for the live drag preview.
  // Falls back to DEFAULT_DELIVERY_PRICING if the fetch hasn't resolved yet
  // or fails — this keeps the preview usable even if Supabase is briefly
  // unreachable. The real fee is always re-verified server-side at checkout.
  const [pricing, setPricing] = useState<DeliveryPricing>(DEFAULT_DELIVERY_PRICING);

  useEffect(() => {
    let cancelled = false;
    const loadPricing = async () => {
      const { data, error } = await supabase
        .from('delivery_pricing')
        .select('road_distance_factor, tiers')
        .limit(1)
        .single();

      if (!cancelled && !error && data) {
        setPricing({
          road_distance_factor: Number(data.road_distance_factor),
          tiers: data.tiers,
        });
      }
      // On error, silently keep DEFAULT_DELIVERY_PRICING — this is only a
      // preview, so it's fine to show a slightly-stale estimate rather than
      // blocking the map from being usable.
    };
    loadPricing();
    return () => {
      cancelled = true;
    };
  }, []);

  // Check browser permission state before attempting to access location
  const checkWebPermission = async (): Promise<PermissionState> => {
    if (!navigator.permissions) return 'prompt'; // Fallback if Permissions API unavailable

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch {
      return 'prompt'; // Fallback on error
    }
  };

  // Retries getCurrentPosition once with relaxed accuracy/timeout if the
  // first (high-accuracy) attempt times out or fails to get a fix. GPS-only
  // high-accuracy fixes are frequently slow/unavailable indoors, so falling
  // back to network-based positioning with a longer timeout meaningfully
  // improves success rate instead of just reporting "denied".
  const getPositionWithFallback = async () => {
    try {
      return await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
    } catch (err: any) {
      // PERMISSION_DENIED (code 1) should never be retried — bail immediately.
      if (err?.code === 1) throw err;

      // Otherwise (timeout / position unavailable) retry once with a longer
      // timeout and lower accuracy requirement.
      return await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 20000,
      });
    }
  };

  const locateUser = async () => {
    setLocating(true);
    setPermissionDenied(false);
    setLocateError(null);

    // Native (Android/iOS): requestPermissions() shows a real OS dialog and
    // its result is trustworthy, so gate on it before asking for a position.
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await Geolocation.requestPermissions().catch(() => null);
        if (perm && perm.location === 'denied') {
          setPermissionDenied(true);
          setLocating(false);
          return;
        }

        const coords = await getPositionWithFallback();
        setPosition([coords.coords.latitude, coords.coords.longitude]);
        setHasLocated(true);
      } catch (error: any) {
        if (error?.code === 1) {
          setPermissionDenied(true);
        } else {
          setLocateError("Couldn't get a location fix — try again, or drag the pin manually.");
        }
      } finally {
        setLocating(false);
      }
      return;
    }

    // Web: Check actual permission state before attempting to get position.
    try {
      const permissionState = await checkWebPermission();

      if (permissionState === 'denied') {
        setPermissionDenied(true);
        setLocating(false);
        return;
      }

      const coords = await getPositionWithFallback();
      setPosition([coords.coords.latitude, coords.coords.longitude]);
      setHasLocated(true);
    } catch (error: any) {
      if (error?.code === 1) {
        setPermissionDenied(true);
      } else {
        setLocateError("Couldn't get a location fix — try again, or drag the pin manually.");
      }
    } finally {
      setLocating(false);
    }
  };

  // Auto-request only inside the native Android/iOS app.
  useEffect(() => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    if (Capacitor.isNativePlatform()) {
      locateUser();
    }
  }, []);

  // Recalculate estimated road distance/fee whenever pin moves or pricing
  // config loads, debounce the geocode call.
  useEffect(() => {
    const [lat, lng] = position;
    const straightLineKm = distanceFromLounge(lat, lng);
    const roadKm = estimateRoadDistance(straightLineKm, pricing.road_distance_factor);
    setDistanceKm(roadKm);
    setFee(calculateDeliveryFee(roadKm, pricing.tiers));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      setGeocoding(false);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [position, pricing]);

  const handleConfirm = () => {
    // fee/distanceKm passed here are ESTIMATES for immediate UI feedback.
    // CheckoutPage re-verifies the real fee server-side before payment.
    onConfirm({ lat: position[0], lng: position[1], address, distanceKm, fee });
  };

  return (
    <div className="space-y-3 isolate relative z-0">
      {permissionDenied && (
        <div className="text-xs text-muted-foreground bg-secondary/60 rounded-lg px-3 py-2">
          Location access was denied — tap or drag the pin below to set your delivery spot manually.
        </div>
      )}

      {locateError && !permissionDenied && (
        <div className="text-xs text-muted-foreground bg-secondary/60 rounded-lg px-3 py-2">
          {locateError}
        </div>
      )}

      {!permissionDenied && !locateError && !hasLocated && !locating && !Capacitor.isNativePlatform() && (
        <div className="text-xs text-muted-foreground bg-secondary/60 rounded-lg px-3 py-2">
          Tap "Use my location" below to auto-fill your delivery spot, or drag the pin manually.
        </div>
      )}

      <div className="relative rounded-lg overflow-hidden border border-border" style={{ height: '280px', width: '100%' }}>
        <MapContainer
          center={position}
          zoom={14}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <DraggableMarker position={position} setPosition={setPosition} />
          <RecenterOnChange position={position} />
          <MapSizeFix />
        </MapContainer>

        <button
          type="button"
          onClick={locateUser}
          disabled={locating}
          className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background border border-border text-sm shadow-md hover:bg-secondary"
        >
          <Locate className="w-4 h-4" />
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tap or drag the pin to your exact delivery spot.
      </p>

      <div className="glass-card rounded-lg p-3 space-y-1 text-sm">
        <p className="text-foreground">{geocoding ? 'Finding address…' : address}</p>
        <p className="text-muted-foreground text-xs">~{distanceKm.toFixed(1)} km by road from Cheers Lounge (estimated)</p>
      </div>

      {fee === null ? (
        <p className="text-sm text-destructive">
          That's outside our delivery range. Please select a location from the list below instead.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-2.5 rounded-lg gold-gradient text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          Confirm this location — est. KSh {fee}
        </button>
      )}
    </div>
  );
};

export default LocationPicker;